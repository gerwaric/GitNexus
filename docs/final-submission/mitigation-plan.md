# Mitigation Plan: GitNexus + GitNexus Browser Client vs LegacyLens G4

This document is a **step-by-step mitigation plan** to close the gaps identified in [docs/final-submission/gap-analysis.md](./gap-analysis.md) and meet the **LegacyLens G4 submission requirements** in [docs/project-definition.md](../project-definition.md). It is organized by the same categories as the gap analysis summary (§14) and is intended for a developer or future agent to execute without duplicating the full analysis. **Demo video** and **social post** are **out of scope** (author will deliver); this plan covers documentation, query interface, code-understanding, testing/performance, and the deployed link only.

**How to use this plan:** Work through sections in order; "Prerequisites / order of work" below indicates dependencies. Each step is concrete (file paths or doc references). Keep changes simple to meet requirements without over-delivering.

---

## Prerequisites / order of work

- **Documentation** (RAG doc, chunking, AI Cost Analysis, README link) can be done in parallel with **Query interface** and **Code-understanding** work.
- **Testing and performance** depends on having the app and backend stable; run scenarios and measurements after UI/docs changes, then fill RAG §6 and testing-scenarios Outcomes.
- **Demo video and social post** are out of scope for this plan (author will deliver).

---

## 1. Documentation

### 1.1 RAG Architecture doc: client name and §6 performance

**Rationale:** Per gap analysis §12, the RAG doc still says "Lapack Lens" and §6 has no measured latency/ingestion numbers.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 1.1.1 | Replace "Lapack Lens" and "gitnexus-web" with **GitNexus Browser Client** in title, §4 query flow, and any other mentions so the doc reflects the current deployment. | `docs/rag-architecture.md` |
| 1.1.2 | After running performance measurements (see §4 below), fill **§6 Performance results** with: (a) a short summary of query latency (e.g. p50/p95 or min/max for a small set of queries), (b) LAPACK ingestion time, (c) optional note on retrieval precision if spot-checked. Add a reference to the report or script output if one exists. | `docs/rag-architecture.md` §6 |

### 1.2 Chunking: mapping to assignment strategies

**Rationale:** Per gap analysis §5, add an explicit mapping so graders see the requirement addressed.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 1.2.1 | Add a short subsection under **§3 Chunking approach** (or a small table) that maps to the assignment’s chunking strategies: e.g. "Function-level → one node per subroutine/function; Hierarchical → file → symbol." No new pipeline; documentation only. | `docs/rag-architecture.md` §3 |

### 1.3 AI Cost Analysis (required deliverable)

**Rationale:** Per gap analysis §11, the AI Cost Analysis document is missing (dev spend + production projections). **LLM provider:** Google Gemini; use usage data from that platform (CLI, API, or manual export with direction) to fill dev costs.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 1.3.1 | Obtain dev/test usage from **Google Gemini** (e.g. Gemini API/console export, CLI, or manual with direction). Use it to populate the dev spend breakdown. | — |
| 1.3.2 | Create `docs/final-submission/ai-cost-analysis.md` (or `docs/ai-cost-analysis.md`) with: (1) **Development & testing:** embedding API costs (tokens embedded), **LLM (Gemini)** API costs, vector DB/hosting if any, total breakdown; (2) **Production projections:** table for 100 / 1K / 10K / 100K users per month with $/month and assumptions (queries per user per day, tokens per query, embedding/model costs, hosting). | New file; template in `docs/project-definition.md` "AI Cost Analysis" |

### 1.4 Deployed link in README

**Rationale:** Per gap analysis §13, graders need an explicit deployed URL.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 1.4.1 | Add a clear "Deployed demo" or "Try it" section (or line) in the root README with the URL **https://lapack.smallcatlabs.com**, and a short note to update when the subdomain changes. | `README.md` |

---

## 2. Query interface

### 2.1 Relevance scores for retrieved results

**Rationale:** Per gap analysis §8.1, confidence/relevance scores are required; the backend returns scores (e.g. hybrid search RRF) but they are not shown in the UI. **Keep it simple:** show score in the Code Inspector (code references panel) only.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 2.1.1 | Extend `CodeReference` to include an optional `score?: number` (or `relevance?: number`). When parsing tool results that include search/query output, pass the score through to `addCodeReference` where available. | `gitnexus-web/src/hooks/useAppState.tsx` (interface `CodeReference`; call sites that add refs from tool output, e.g. around line 821/850 and any tool_call handling that adds refs) |
| 2.1.2 | Ensure backend mode / HTTP search tool exposes score in the response so the web app can pass it when creating code refs. If the agent only gets scores in the tool result text, consider parsing that or extending the backend response schema to include score per result. | `gitnexus-web/src/workers/ingestion.worker.ts` (`createHttpHybridSearch`, `createHttpExecuteQuery`); backend `gitnexus/src/server/api.ts` (query/search response shape) |
| 2.1.3 | In `CodeReferencesPanel` (Code Inspector), display the score for each reference (e.g. "Relevance: 0.85" or a small badge). Use a consistent format (e.g. 0–1 or percentage). | `gitnexus-web/src/components/CodeReferencesPanel.tsx` |

### 2.2 Fortran syntax highlighting in Code Inspector

**Rationale:** Per gap analysis §8.1, add Fortran syntax highlighting for Fortran code sections in the **Code Inspector panel only**; do not change any other aspect of the panel's appearance or behavior.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 2.2.1 | In `CodeReferencesPanel`, ensure the snippet uses `react-syntax-highlighter` (or Prism) with `language="fortran"` (or the alias supported by the highlighter) when the code reference is for a Fortran file. Derive language from `filePath` (e.g. `.f`, `.f90`) or ref metadata. No other panel changes. | `gitnexus-web/src/components/CodeReferencesPanel.tsx` (SyntaxHighlighter `language` prop) |

---

## 3. Code-understanding features

### 3.1 Confirm and document ≥4 features

**Rationale:** Per gap analysis §8.2, at least 4 code-understanding features are required; need an explicit list and where they live.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 3.1.1 | **Decision:** Count (1) Code explanation, (2) Dependency mapping (explore tool), (3) Impact analysis (impact tool / blast radius), and (4) either Pattern detection (search over symbols) or Documentation generation (if wiki is exposed). Document the chosen four in the README or submission. | — |
| 3.1.2 | Add a short "Code understanding features" subsection to the README (or `docs/project-definition.md`-oriented submission doc) listing the 4+ features and where to find them (e.g. "Nexus AI: search, explore, impact, …" and "Code references panel shows file/line; impact view shows blast radius"). | `README.md` or `docs/final-submission/` |

### 3.2 Wiki tool (optional fifth feature)

**Rationale:** Per gap analysis §8.2, server has `/api/tools/wiki`; GitNexus Browser Client does not expose it. Exposing it would make "Documentation generation" clearly one of the 4+.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 3.2.1 | **Decision needed:** Expose wiki in the Browser Client? Options: (A) Add a `wiki` tool in backend mode that calls `POST /api/tools/wiki` (note: long-running, 600s timeout per RAG doc); (B) Rely on the four features without wiki. If (A), add the tool and document it in the feature list. | — |
| 3.2.2 | If (A): In the backend-mode tool list, add a `wiki` tool that forwards to `gitnexus/src/server/api.ts` `/api/tools/wiki`. Handle long-running response (e.g. timeout message in UI). | `gitnexus-web/src/workers/ingestion.worker.ts` (tool definitions / `createHttpExecuteQuery` or equivalent); backend `gitnexus/src/server/api.ts` |

---

## 4. Testing and performance

### 4.1 Testing scenarios: run and fill Outcomes

**Rationale:** Per gap analysis §6, the Outcomes table in testing-scenarios.md is TBD; scenarios are already defined.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 4.1.1 | Run the 10 scenarios (or the 6 from the assignment) against https://lapack.smallcatlabs.com (or a local backend + GitNexus Browser Client). For each scenario, record 1–2 sentence outcome (e.g. "Returns main programs and top-level drivers; identifies entry points."). | `docs/testing-scenarios.md` |
| 4.1.2 | Fill the **Outcomes** table in `docs/testing-scenarios.md` with the recorded outcomes. Update the "Usage" section if the script URL or location changes (e.g. from `lapack-lens/scripts/run_performance_tests.py` to a GitNexus Browser Client/backend script). | `docs/testing-scenarios.md` |
| 4.1.3 | **Optional:** Add a small script (e.g. Node or Python) that runs a fixed set of queries against the backend (and optionally the LLM step) and outputs results so the Outcomes table can be regenerated or verified. | New script in repo; reference from `docs/testing-scenarios.md` |

### 4.2 Performance: measure and document

**Rationale:** Per gap analysis §7, query latency and ingestion time are unknown; RAG doc §6 requires a summary.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 4.2.1 | **Decision needed:** Use (A) the old Lapack Lens performance script adapted to the current backend + GitNexus Browser Client, or (B) a new minimal script that calls the backend (e.g. `/api/tools/query` or `/api/search`) and optionally the LLM loop, and records latency. | — |
| 4.2.2 | Measure (1) end-to-end query latency for a small set of queries (e.g. p50/p95 or min/max), (2) LAPACK ingestion time (from `gitnexus analyze` or Docker build). Optionally (3) spot-check retrieval precision for a few queries. | — |
| 4.2.3 | Update **§6 Performance results** in `docs/rag-architecture.md` with the summary (see step 1.1.2). Optionally add a "Performance & evaluation" section elsewhere if needed. | `docs/rag-architecture.md` §6 |

---

## 5. Submission artifacts (out of scope)

**Demo video** and **social post** are required by the assignment but **out of scope for this mitigation plan**; the author will record the demo video and publish the social post. No steps are listed here.

- **Demo video (3–5 min):** Queries, retrieval results, answer generation — author will create, host, and link.
- **Social post:** X or LinkedIn, description, features, demo/screenshots, @GauntletAI — author will publish.

---

## 6. Open decisions summary

Before or while implementing, resolve (only if needed):

| Topic | Options | Section |
|-------|---------|---------|
| Relevance score | Code Inspector only (recommended; keep simple) | §2.1 |
| Wiki in Browser Client | Expose `/api/tools/wiki` vs rely on 4 features | §3.2 |
| Performance script | Adapt old script vs new minimal script | §4.2 |

---

## 7. Reference checklist (G4)

For quick verification against [docs/project-definition.md](../project-definition.md):

- [ ] README: setup guide, architecture overview, **deployed link**
- [ ] **Demo video** (3–5 min): *out of scope for this plan* — author will deliver
- [ ] Pre-Search: [docs/pre-search.md](../pre-search.md) (already met)
- [ ] RAG Architecture doc: client name **GitNexus Browser Client**, **§6 performance filled**
- [ ] **AI Cost Analysis:** dev spend (Gemini usage) + 100/1K/10K/100K projections
- [ ] Deployed application: https://lapack.smallcatlabs.com
- [ ] **Social post:** *out of scope for this plan* — author will deliver

Query interface: NL input, snippets with file/line, **relevance scores** (Code Inspector), answer, drill-down (already implemented).  
Code understanding: **≥4 features** listed and reachable (explanation, dependency, impact, + pattern or doc).
