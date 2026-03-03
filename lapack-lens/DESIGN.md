# Lapack Lens — Design Document

## Overview

**Lapack Lens** is a minimal, deployable chat application that lets users ask natural-language questions about the LAPACK codebase. It runs as a single Docker container suitable for local testing and production deployment on Fly.io.

- **App name (Fly):** `lapack-lens`
- **LLM:** OpenAI
- **Code intelligence:** GitNexus server with the Reference-LAPACK repo indexed
- **UI:** Streamlit (text chat only)
- **Deployment:** Single container; same image for local and Fly.io

---

## Goals

1. **Single container** — GitNexus server + Streamlit chat in one image, runnable locally with `docker compose up` or `docker run` and deployable to Fly.io without change.
2. **Natural language over LAPACK** — Users type questions (e.g. “Where is matrix inversion implemented?”); an LLM uses GitNexus tools (query, context, cypher) to answer.
3. **Simple to run and troubleshoot** — One entrypoint, clear env vars, 4GB RAM so the app runs well while alive.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Single container (lapack-lens)                                  │
│                                                                  │
│  ┌──────────────────────┐    ┌────────────────────────────────┐ │
│  │  GitNexus server     │    │  Streamlit                      │ │
│  │  (gitnexus serve     │    │  - Chat UI                      │ │
│  │   --host 0.0.0.0)   │◄───│  - Calls OpenAI                  │ │
│  │  Port: 4747         │    │  - Calls backend REST tools       │ │
│  │  - LAPACK indexed   │    │  Port: 8501 (exposed)            │ │
│  │  - /api/repos       │    └────────────────────────────────┘ │
│  │  - /api/tools/query │                                         │
│  │  - /api/tools/context│                                        │
│  │  - /api/mcp (MCP)   │                                         │
│  └──────────────────────┘                                         │
│                                                                  │
│  Index: Reference-LAPACK repo, indexed at Docker build time      │
└─────────────────────────────────────────────────────────────────┘
```

- **Internal:** Streamlit talks to GitNexus at `http://127.0.0.1:4747`.
- **External:** Fly (or local) exposes only Streamlit port 8501.

---

## Components

### 1. GitNexus server

- **What:** Existing `gitnexus serve` (from this repo’s `gitnexus` package).
- **Role:** Serves the LAPACK index (graph, search, tools). Runs with `--host 0.0.0.0` so it is reachable from within the container (Streamlit → localhost:4747).
- **Additions:** New REST endpoints that mirror MCP tool behavior so Streamlit can use plain HTTP:
  - `POST /api/tools/query` — body: `{ query, repo?, limit?, max_symbols?, ... }` → same as MCP `query` tool.
  - `POST /api/tools/context` — body: `{ name, uid?, file_path?, repo?, ... }` → same as MCP `context` tool.
  - Optional: `POST /api/tools/cypher` if we want the LLM to run Cypher from the chat.
- **Implementation:** In `gitnexus/src/server/api.ts`, add routes that call `backend.callTool('query', req.body)` (and same for `context` / `cypher`), return JSON. No change to MCP or indexing logic.

### 2. LAPACK index

- **Source:** Clone `https://github.com/Reference-LAPACK/lapack.git` during Docker build.
- **When:** In the Dockerfile, after cloning: run `npx gitnexus analyze` (or equivalent) inside the cloned repo so the index is created under that repo’s `.gitnexus/` and the global registry (`~/.gitnexus/registry.json`) points at it.
- **Where:** Index lives inside the image; no Fly volume required for the index. Same paths used at runtime so the server finds the repo by name (e.g. `lapack`).
- **Trade-off:** Build is slow and image is large; startup is fast and deployment is simple.

### 3. Streamlit app

- **Location:** New directory in this repo, e.g. `lapack-lens/app/` (or `lapack-lens/streamlit_app/`), containing:
  - `app.py` — chat UI (messages, input, send).
  - Optional: small module to call backend tools (e.g. `tools.py`) and build LLM messages with tool results.
- **Flow:**
  1. User sends a message.
  2. App calls OpenAI with a system prompt that describes the tools (query LAPACK, get symbol context, optional cypher).
  3. If the model returns tool-use requests, the app calls `POST /api/tools/query` (or context/cypher) with the requested args, then sends the tool results back to the model.
  4. Repeat until the model returns a final answer; display in the chat.
- **Agent proficiency:** Define OpenAI tool schemas using the same descriptions and parameter docs as the MCP tools so the LLM uses the REST tools the same way it would use MCP (see implementation plan Phase 2.3).
- **Config:** Backend URL from env (e.g. `GITNEXUS_URL=http://127.0.0.1:4747`); OpenAI API key from env (`OPENAI_API_KEY`). No secrets in the image.

### 4. Docker

- **Dockerfile** (in `lapack-lens/` or repo root as appropriate):
  - Base: Node 20 (for GitNexus) + Python (for Streamlit). Multi-stage or single stage with both installed.
  - Clone Reference-LAPACK into a fixed path (e.g. `/app/lapack`).
  - Build and install GitNexus (from `./gitnexus`), run `gitnexus analyze` inside `/app/lapack`, ensure registry is written (e.g. under `/root/.gitnexus` or a dedicated user home).
  - Install Python deps (Streamlit, openai, requests).
  - Copy Streamlit app into the image.
  - **Entrypoint:** Start GitNexus server in the background (or via a small script), wait until healthy (e.g. `GET /api/repos` returns 200), then start Streamlit with `--server.address=0.0.0.0` and `--server.port=8501`. Expose port 8501.
- **docker-compose.yml** (for local testing):
  - Build the same Dockerfile; expose 8501; pass `OPENAI_API_KEY` from env file or host env. Backend URL fixed to `http://127.0.0.1:4747` inside the container.

### 5. Fly.io

- **App name:** `lapack-lens`.
- **Config:** `fly.toml` (or equivalent) in the repo:
  - Build: Dockerfile in the chosen path.
  - Internal port: 8501 (Streamlit).
  - **VM:** 4GB RAM (e.g. `vm.size = "4gb"` or equivalent in Fly’s config).
  - Env: `GITNEXUS_URL=http://127.0.0.1:4747` (optional if hardcoded in app for single-container). Secrets: `OPENAI_API_KEY` set via `fly secrets set`.
- **No volume** for the index (index is in the image).

---

## Decisions

| Topic | Decision |
|-------|----------|
| LLM provider | OpenAI |
| LAPACK source | Clone Reference-LAPACK repo from GitHub during Docker build |
| Fly app name | `lapack-lens` |
| VM size | 4GB RAM (short-lived app; prioritize performance while alive) |
| Index location | Built at Docker build time; no Fly volume |
| Streamlit ↔ backend | REST (`/api/tools/query`, `/api/tools/context`) instead of MCP client in Python |

---

## Assumptions

- Same Docker image is used for local runs and for Fly deployment.
- Only one indexed repo in the container (LAPACK); optional `repo` param can default to `lapack`.
- OpenAI API key is provided at runtime via environment (secret on Fly).
- GitNexus server is the existing one from this repo; only new code is the REST tool endpoints and the Streamlit app.
- No authentication on the Streamlit UI or GitNexus in this first version (Fly can put the app behind a custom domain / optional auth later if needed).

---

## Out of scope (for this design)

- Multiple repos or re-indexing at runtime.
- Persistent chat history across restarts.
- User auth or rate limiting.
- Using a Fly volume for the index (could be a future option if we want to update LAPACK without rebuilding the image).

---

## References

- GitNexus server: `gitnexus/src/server/api.ts`, `gitnexus/src/mcp/local/local-backend.ts` (`callTool`).
- Eval-server (same tool semantics): `gitnexus/src/cli/eval-server.ts` (POST /tool/query, etc.).
- Reference-LAPACK: https://github.com/Reference-LAPACK/lapack
