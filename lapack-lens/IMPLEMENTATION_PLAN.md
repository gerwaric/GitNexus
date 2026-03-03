# Lapack Lens — Implementation Plan

Use this as a checklist when implementing in another session. Tasks are ordered by dependency; complete in order unless noted.

---

## Phase 1: Backend REST tool endpoints

**Goal:** Expose GitNexus `query` and `context` (and optionally `cypher`) as REST endpoints so Streamlit can call them with plain HTTP.

### 1.1 Add `POST /api/tools/query`

- **File:** `gitnexus/src/server/api.ts`
- **Action:** Add a route `app.post('/api/tools/query', ...)` that:
  - Reads JSON body: `{ query, repo?, limit?, max_symbols?, include_content?, task_context?, goal? }`.
  - Calls `backend.callTool('query', body)`.
  - Returns `res.json(result)` (same shape as MCP query tool).
  - Handles errors (400 for missing query, 500 with message on backend failure).
- **Reference:** `local-backend.ts` `query` params; `eval-server.ts` POST /tool/query body.

### 1.2 Add `POST /api/tools/context`

- **File:** `gitnexus/src/server/api.ts`
- **Action:** Add `app.post('/api/tools/context', ...)` that:
  - Reads body: `{ name?, uid?, file_path?, repo?, include_content? }`.
  - Calls `backend.callTool('context', body)`.
  - Returns `res.json(result)`.
  - Handles errors.

### 1.3 (Optional) Add `POST /api/tools/cypher`

- **File:** `gitnexus/src/server/api.ts`
- **Action:** Add `app.post('/api/tools/cypher', ...)` that:
  - Reads body: `{ query, repo? }`.
  - Calls `backend.callTool('cypher', body)`.
  - Returns JSON (or markdown if backend returns formatted text).
- **Note:** Can be skipped initially and added later if the LLM needs raw Cypher.

### 1.4 Verify locally

- From repo root: build and run GitNexus server (`npm run build` in `gitnexus`, then `node dist/cli/index.js serve` or `npx gitnexus serve`), with at least one repo indexed (e.g. a small test repo).
- `curl -X POST http://127.0.0.1:4747/api/tools/query -H "Content-Type: application/json" -d '{"query":"test","repo":"<name>"}'` → 200 and JSON.
- Same for `/api/tools/context` with a known symbol name.

---

## Phase 2: Streamlit app

**Goal:** Minimal chat UI that sends user messages to OpenAI and uses the new tool endpoints when the model requests tool use.

### 2.1 Create app directory and dependencies

- **Directory:** `lapack-lens/app/` (or `lapack-lens/streamlit_app/`).
- **Files:**
  - `requirements.txt`: `streamlit`, `openai`, `requests` (and any other deps).
- **Config:** Backend base URL from env `GITNEXUS_URL` (default `http://127.0.0.1:4747`). OpenAI key from `OPENAI_API_KEY`.

### 2.2 Implement backend client

- **File:** e.g. `lapack-lens/app/tools.py` (or inline in `app.py`).
- **Actions:**
  - Function `call_query(query: str, repo: str = "lapack", limit: int = 5, ...)` → POST to `{GITNEXUS_URL}/api/tools/query`, return parsed JSON or error string.
  - Function `call_context(name: str, repo: str = "lapack", ...)` → POST to `{GITNEXUS_URL}/api/tools/context`, return parsed JSON or error string.
  - Handle connection errors and non-2xx responses; return a short error message for the LLM.

### 2.3 Implement OpenAI tool loop

- **File:** `lapack-lens/app/app.py` (or single `app.py`).
- **Actions:**
  - Define OpenAI tool schemas for “query_lapack” (and optionally “context”, “cypher”) matching the backend params. **Use the same descriptions and parameter docs as the MCP tools** so the agent uses GitNexus proficiently (see `user-gitnexus` MCP tool descriptors or GitNexus server tool definitions for wording).
  - In the chat handler: call OpenAI Chat Completions with the conversation history and tools. If the response includes `tool_calls`, for each tool call:
    - Parse args, call the corresponding backend client function.
    - Append tool result to the conversation and call the API again until the model returns a final text response.
  - **System prompt:** Tell the model it answers questions about the LAPACK codebase using GitNexus; use the query tool for natural-language search, context for symbol details; default repo is `lapack`.
  - Stream or final-message display as preferred (simplest: wait for final answer then append to chat).

### 2.4 Build Streamlit UI

- **File:** Same `app.py`.
- **Actions:**
  - Use `st.chat_message` and `st.chat_input` (or equivalent) for a simple chat layout.
  - Store messages in `st.session_state`; on send, run the tool loop and append assistant message.
  - Show errors (e.g. missing API key, backend unreachable) in the UI.
  - Optional: show “Thinking…” or tool calls in an expander for debugging.

### 2.5 Test Streamlit locally (without Docker)

- Ensure GitNexus server is running with an indexed repo (e.g. LAPACK or a small repo).
- Set `OPENAI_API_KEY` and optionally `GITNEXUS_URL`; run `streamlit run app/app.py --server.address=0.0.0.0`.
- Open browser; send a natural-language question about the codebase; confirm the LLM uses tools and returns a sensible answer.

---

## Phase 3: Docker

**Goal:** Single image that includes GitNexus, LAPACK index, and Streamlit; runnable locally for verification.

### 3.1 Dockerfile

- **Location:** `lapack-lens/Dockerfile` (or repo root if you prefer).
- **Build context:** Use **repo root** as build context so you can `COPY gitnexus/` and `COPY lapack-lens/app/` (e.g. `docker build -f lapack-lens/Dockerfile .` or in docker-compose: `context: .` with `dockerfile: lapack-lens/Dockerfile`).
- **Contents (conceptual):**
  1. Use a base with Node 20 and Python 3 (e.g. `node:20-bookworm` and install Python + pip, or use a Python image and install Node; or multi-stage).
  2. Clone Reference-LAPACK into `/app/lapack`: `RUN git clone --depth 1 https://github.com/Reference-LAPACK/lapack.git /app/lapack`.
  3. Build GitNexus: copy `gitnexus/`, run `npm ci` and `npm run build`, then `npx gitnexus analyze` inside `/app/lapack`. Ensure the global registry is written (e.g. run as user that owns `~/.gitnexus` or set `HOME` so registry path is consistent).
  4. Install Python deps for the Streamlit app (copy `lapack-lens/app/` and run `pip install -r requirements.txt`).
  5. **Entrypoint script:** Start `gitnexus serve --host 0.0.0.0` in the background; loop until `curl -s http://127.0.0.1:4747/api/repos` returns 200 (or similar); then `exec streamlit run app/app.py --server.address=0.0.0.0 --server.port=8501`. Ensure the path to `app.py` matches where you copied the app (e.g. `COPY lapack-lens/app/ /app/app/` and `WORKDIR /app`).
  6. `EXPOSE 8501`.

- **Details to confirm:** Node and Python in one image (slim as possible); correct working directory and paths so `gitnexus analyze` sees `/app/lapack` and writes to a path the server will read at runtime (e.g. same `HOME` or same registry path).

### 3.2 Entrypoint script

- **File:** `lapack-lens/entrypoint.sh` (or inline in Dockerfile with CMD).
- **Actions:** Start GitNexus server in background; wait for health (e.g. `/api/repos`); then start Streamlit. Use `exec` for Streamlit so it receives signals. Make script executable in Dockerfile.

### 3.3 docker-compose for local testing

- **File:** `lapack-lens/docker-compose.yml`.
- **Contents:**
  - One service, build from `lapack-lens/Dockerfile` (or context repo root if Dockerfile is there).
  - Ports: `8501:8501`.
  - Env: `GITNEXUS_URL=http://127.0.0.1:4747` (optional). Env file or env for `OPENAI_API_KEY` (e.g. `env_file: .env` with `OPENAI_API_KEY` in `.env`).
  - No volume required for index (index in image).

### 3.4 .env.example and .gitignore

- **File:** `lapack-lens/.env.example`: `OPENAI_API_KEY=sk-...` (placeholder).
- **File:** `lapack-lens/.gitignore`: `.env` (so real key is not committed).
- **README or DESIGN:** Document that for local Docker run, create `.env` from `.env.example` and set a real key.

### 3.5 Local verification

- From repo root (or `lapack-lens/`): `docker compose -f lapack-lens/docker-compose.yml up --build`. First build will be long (clone + index LAPACK).
- Open `http://localhost:8501`; send a question about LAPACK; confirm the answer uses GitNexus and is sensible.

---

## Phase 4: Fly.io deployment

**Goal:** Deploy the same image to Fly as `lapack-lens` with 4GB RAM and secrets.

### 4.1 fly.toml

- **File:** `lapack-lens/fly.toml` (or repo root).
- **Contents:**
  - `app = "lapack-lens"`.
  - Build: Dockerfile path and context (e.g. context `..` if Dockerfile is in `lapack-lens/`).
  - `internal_port = 8501`, `protocol = "tcp"`.
  - `[vm]` or equivalent to set `size = "4gb"` (check Fly docs for exact key).
  - Env: `GITNEXUS_URL = "http://127.0.0.1:4747"` if needed.
  - No volume; no `mount_source` for index.

### 4.2 Set secrets

- Run: `fly secrets set OPENAI_API_KEY=<your-key>` for the `lapack-lens` app (from the directory that has `fly.toml` or with `-a lapack-lens`).

### 4.3 Deploy and verify

- `fly deploy` (from the same directory).
- After deploy, open `https://lapack-lens.fly.dev` (or the assigned URL); send a natural-language question; confirm the app responds and uses the LAPACK index.

### 4.4 Document in README

- **File:** `lapack-lens/README.md`.
- **Contents:** Short description; how to run locally with Docker Compose; how to deploy to Fly (prereqs: Fly CLI, paid account); that the first build is slow due to LAPACK indexing; link to DESIGN.md and IMPLEMENTATION_PLAN.md.

---

## Summary checklist

- [ ] **1.1** Add `POST /api/tools/query` in `gitnexus/src/server/api.ts`
- [ ] **1.2** Add `POST /api/tools/context` in `gitnexus/src/server/api.ts`
- [ ] **1.3** (Optional) Add `POST /api/tools/cypher`
- [ ] **1.4** Verify backend endpoints locally with curl
- [ ] **2.1** Create `lapack-lens/app/` and `requirements.txt`
- [ ] **2.2** Implement backend client (`tools.py` or equivalent)
- [ ] **2.3** Implement OpenAI tool loop in Streamlit
- [ ] **2.4** Build Streamlit chat UI
- [ ] **2.5** Test Streamlit locally (backend running separately)
- [ ] **3.1** Write Dockerfile (Node + Python, clone LAPACK, index, Streamlit)
- [ ] **3.2** Entrypoint script (start server, wait for health, run Streamlit)
- [ ] **3.3** docker-compose.yml for local run
- [ ] **3.4** .env.example and .gitignore
- [ ] **3.5** Local Docker verification
- [ ] **4.1** fly.toml (app name, 4GB, port 8501)
- [ ] **4.2** Set OPENAI_API_KEY secret on Fly
- [ ] **4.3** Deploy and verify on Fly
- [ ] **4.4** lapack-lens/README.md with run and deploy instructions

---

## Notes for implementer

- **Registry path:** When running `gitnexus analyze` in the Dockerfile, the registry is written to `$HOME/.gitnexus/registry.json`. At runtime, the server must use the same `HOME` (or the same effective registry path) so it finds the LAPACK repo. Use a consistent `WORKDIR` and optional `ENV HOME=/app` (or similar) in build and runtime.
- **First build time:** Indexing LAPACK can take 10–30+ minutes. Use a shallow clone and consider caching the clone step in CI if you add it later.
- **Image size:** Expect hundreds of MB to low GB; 4GB VM is for RAM, not disk.
