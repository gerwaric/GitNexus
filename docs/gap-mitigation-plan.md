# Gap Mitigation Plan

This plan addresses gaps identified in the [gap analysis](./gap-analysis-legacylens.md). Decisions are recorded in [gap-mitigation-prereqs.md](./gap-mitigation-prereqs.md).

---

## Resolved decisions (summary)

| Area | Decision |
|------|----------|
| **RAG Architecture doc** | Detailed specifics; include discussion of why GitNexus might have chosen each design (embedding model, storage, chunking, etc.). |
| **Query interface** | Start with (B): minimum to pass — file/line in assistant message + markdown code blocks with ` ```fortran `. Implement (A) — full snippets, scores, drill-down — later if other requirements are met and time allows. |
| **Four code-understanding features** | Add **impact** and **wiki** (REST + tool defs). Claim five: Code explanation, Dependency mapping, Impact analysis, Pattern detection (query), Documentation generation (wiki). *(Plan uses (A): impact + wiki.)* |
| **Performance & evaluation** | Use a **script that simulates the chat** and runs test cases to collect performance data programmatically (latency, results). |
| **Testing scenarios** | Create a set of testing scenarios **tailored for LAPACK** (not only the generic assignment examples). |
| **Deployed link** | Add **https://lapack-lens.fly.dev** to the README. |
| **Social post** | Author will write the social post at submission; plan does not assign it. |

---

## 1. RAG Architecture document

**Goal:** Produce a 1–2 page RAG Architecture document that satisfies the assignment template and describes GitNexus’s retrieval pipeline in detail, with design rationale.

### Tasks

| # | Task | Done criteria |
|---|------|----------------|
| 1.1 | **Investigate GitNexus** — Trace where embeddings are generated, which model(s), how BM25/semantic/RRF are used, where vectors live in KuzuDB, and how the query/context/cypher tools consume them. | Notes or outline covering: embedding source, vector storage, hybrid search flow, tool → backend flow. |
| 1.2 | **Write `docs/rag-architecture.md`** — Document: (1) Vector DB / graph store selection (KuzuDB) and rationale. (2) Embedding strategy (model, what is embedded, why). (3) Chunking approach (symbol-level; map to assignment terms). (4) Retrieval pipeline (query flow, re-ranking, context assembly). (5) Failure modes (no results, timeouts, backend unreachable). (6) Performance results (see §4; can reference “see Performance script” or embed summary). | 1–2 pages; all six template sections present; full mapping to assignment terms. |
| 1.3 | **Add design rationale** — For each major choice (storage, embeddings, symbol-level “chunking,” hybrid search), add a short discussion of why GitNexus might have chosen it (e.g. structural code search, single graph for dependencies and search, no chunk-boundary ambiguity). | Each section includes 1–3 sentences of rationale where applicable. |

### Dependencies

- None; can start immediately. Performance numbers (if measured by script) can be filled in when script is run.

---

## 2. Query interface (minimum viable)

**Goal:** Meet minimum “query interface” requirements: file/line references and code snippets via markdown code blocks. Defer full (A) to later if time.

### Tasks

| # | Task | Done criteria |
|---|------|----------------|
| 2.1 | **System prompt / tool behavior** — Ensure the system prompt instructs the model to cite file paths and line ranges (e.g. `path:start-end`) and to use markdown code blocks with ` ```fortran ` when showing code. Optionally surface `include_content` when the user asks for code. | Model responses consistently include file/line and code in ```fortran blocks when relevant. |
| 2.2 | **Verify in UI** — Confirm that Streamlit renders markdown code blocks with language tag (built-in behavior). No new dependencies. | Manual check: ask a question that should return code; confirm display. |
| 2.3 | **(Later, if time)** — Consider implementing (A): dedicated snippet component, file/line per result card, relevance scores, drill-down to full file. | Out of scope for initial plan; add as follow-up task if other items complete. |

### Dependencies

- None.

---

## 3. Four code-understanding features: add Impact and Wiki

**Goal:** Expose GitNexus’s `impact` tool and **wiki** (documentation generation) via REST and add both to the Lapack Lens tool set. Claim five features: Code explanation, Dependency mapping, Impact analysis, Pattern detection (query), Documentation generation (wiki).

**Plan uses (A):** impact + wiki. Both are existing GitNexus capabilities (impact = MCP tool; wiki = CLI command). We add REST wrappers and Lapack Lens tool definitions for both.

### Tasks

| # | Task | Done criteria |
|---|------|----------------|
| 3.1 | **Add `POST /api/tools/impact`** — In `gitnexus/src/server/api.ts`, add a route that accepts body `{ target, direction?, repo?, ... }` (same params as MCP impact tool), calls `backend.callTool('impact', body)`, returns JSON. Handle errors. | `curl -X POST .../api/tools/impact` returns 200 with impact result for a known symbol. |
| 3.2 | **Lapack Lens: impact client and tool def** — In `lapack-lens/app/tools.py`, add `call_impact(...)`. In `app.py`, add OpenAI tool definition for `impact` (name, description, parameters matching MCP). In the tool loop, handle `impact` and call `call_impact`. | User can ask “What would be affected if I change routine X?“ and the model can call impact and summarize. |
| 3.3 | **Add `POST /api/tools/wiki`** — In `gitnexus/src/server/api.ts`, add a route that triggers wiki generation for the given repo (body: `{ repo? }`). Reuse GitNexus wiki pipeline (resolve repo storage path from registry, run `WikiGenerator` from `core/wiki/generator.js` with resolved LLM config). Document: long-running (e.g. 1–5+ min); use long timeout or return job id + poll if async. Return status and path or URL to generated wiki output when done. | `POST .../api/tools/wiki` triggers generation; returns 200 with status/path when complete (or 202 + job id if async). |
| 3.4 | **Lapack Lens: wiki client and tool def** — In `lapack-lens/app/tools.py`, add `call_wiki(...)` (long timeout). In `app.py`, add OpenAI tool definition for `wiki`: e.g. “Generate repository documentation (wiki) from the knowledge graph. Use when the user asks for generated docs or a module overview. Warning: may take 1–5 minutes.“ In the tool loop, handle `wiki` and call `call_wiki`. | User can ask “Generate documentation for this codebase“ and the model can call wiki and summarize or link to the result. |
| 3.5 | **Feature → tool mapping** — Add a short table (in README or RAG doc): Code explanation → context + LLM; Dependency mapping → context / cypher; Impact analysis → impact; Pattern detection → query; Documentation generation → wiki. | Table present and linked from README or docs. |

### Dependencies

- None. Can run in parallel with §1 and §2.

---

## 4. Performance data via test script

**Goal:** Collect performance data programmatically by running a script that simulates the chat and runs test cases (e.g. LAPACK-tailored scenarios).

### Tasks

| # | Task | Done criteria |
|---|------|----------------|
| 4.1 | **Design script interface** — Script should: (1) Take a list of natural-language queries (e.g. from a YAML/JSON file or inline). (2) For each query, call the same path as the chat: GitNexus tools (query/context/cypher/impact; optionally wiki once) + OpenAI to get an answer. (3) Record end-to-end latency per query and optionally per tool call. (4) Output a structured report (e.g. JSON or markdown): query, latency_s, success, optional excerpt of answer. | Design doc or inline comments describing: input format, how backend is called (direct HTTP to GitNexus + OpenAI, or headless Streamlit not required), output format. |
| 4.2 | **Implement script** — Implement in Python (e.g. `lapack-lens/scripts/run_performance_tests.py` or `lapack-lens/app/run_tests.py`). Use `requests` to hit GitNexus REST API and `openai` for the LLM; replicate the tool loop in simplified form. Read queries from a config file. | Script runs without Streamlit; produces a report file (e.g. `performance_report.json` or `.md`). |
| 4.3 | **Run and record** — Run the script against a live backend (local Docker or Fly). Record: (1) End-to-end latency per query (target &lt;3 s). (2) Optional: ingestion time for LAPACK (from Docker build log or one-off `gitnexus analyze` run). | Report includes latency for each test query and one ingestion time number. |
| 4.4 | **Document in RAG doc** — Add a “Performance results” subsection to `docs/rag-architecture.md` (or reference the report): summarize latency (e.g. p50/p95 or min/max), ingestion time, and that evaluation was done via the automated script. | RAG doc contains performance results; script is documented in lapack-lens (README or script docstring). |

### Dependencies

- Backend (GitNexus + indexed LAPACK) and OpenAI API key. Test queries can come from §5 (LAPACK testing scenarios) once defined.

---

## 5. Testing scenarios (LAPACK-tailored)

**Goal:** Create a set of testing scenarios tailored for LAPACK and use them for the performance script and for manual/demo validation.

### Tasks

| # | Task | Done criteria |
|---|------|----------------|
| 5.1 | **Define scenarios** — Create a list of 6–10 natural-language queries tailored to LAPACK, e.g.: main entry point, BLAS/LAPACK routine roles, dependencies of a named module, where a specific operation (e.g. Cholesky, eigenvalue) is implemented, file I/O or error handling if present. Optionally include the 6 assignment-style queries adapted to Fortran/LAPACK. | File (e.g. `lapack-lens/test_scenarios.yaml` or section in `docs/testing-scenarios.md`) with query text and optional expected outcome (1–2 sentences). |
| 5.2 | **Document outcomes** — After running the script or manual tests, add 1–2 sentence outcomes per scenario (e.g. “Returns main program and top-level drivers; latency 2.1 s”). | `docs/testing-scenarios.md` (or equivalent) contains scenarios and outcomes. |
| 5.3 | **Wire into performance script** — Use these scenarios as the default query list for the performance script (§4). | Script reads from the same scenario file or from a dedicated performance query list derived from it. |

### Dependencies

- None for 5.1. 5.2 depends on running tests. 5.3 depends on §4 script design.

---

## 6. README: deployed link

**Goal:** Add the live app URL to the README so submission and users have an explicit deployed link.

### Tasks

| # | Task | Done criteria |
|---|------|----------------|
| 6.1 | **Add https://lapack-lens.fly.dev to README** — In `lapack-lens/README.md`, add a prominent link to the deployed app (e.g. under the first paragraph or in a “Live app” line). | README contains a clickable or copy-paste URL: https://lapack-lens.fly.dev |

### Dependencies

- None.

---

## 7. Other deliverables (no plan tasks)

| Deliverable | Owner / plan |
|-------------|--------------|
| **Pre-Search** | Done; see [docs/pre-search.md](./pre-search.md) (historical). |
| **AI Cost Analysis** | Later; pull usage data from OpenAI when ready. |
| **Demo video** | Author to do after technical work; 3–5 min. |
| **Social post** | Author to write at submission. |

---

## 8. Suggested order of work

1. **Parallel:** §1 (RAG doc investigation + write), §3 (impact + wiki REST + Lapack Lens tools), §5.1 (define LAPACK test scenarios), §6.1 (README link).
2. **Then:** §4.1–4.2 (design and implement performance script); §5.3 (wire scenarios into script).
3. **Then:** §4.3–4.4 (run script, record results, document in RAG doc); §5.2 (document outcomes).
4. **Then:** §2.1–2.2 (prompt/tool behavior and verify markdown code blocks).

Optional follow-up when time allows: §2.3 (full query interface (A)).

---

## 9. Done criteria checklist (per work item)

- [ ] **1.1** GitNexus investigation notes/outline (embeddings, storage, search, tools).
- [ ] **1.2** `docs/rag-architecture.md` written; 1–2 pages; all 6 template sections; full mapping to assignment.
- [ ] **1.3** Design rationale in RAG doc for storage, embeddings, chunking, hybrid search.
- [ ] **2.1** System prompt / tool behavior ensure file/line + ```fortran code in answers.
- [ ] **2.2** Verified in UI (markdown code blocks render).
- [ ] **3.1** `POST /api/tools/impact` implemented and verified.
- [ ] **3.2** Lapack Lens: `call_impact`, tool def, tool loop handles impact.
- [ ] **3.3** `POST /api/tools/wiki` implemented (triggers wiki generation; long timeout or async).
- [ ] **3.4** Lapack Lens: `call_wiki`, tool def, tool loop handles wiki.
- [ ] **3.5** Feature → tool mapping table in README or RAG doc (includes impact + wiki).
- [ ] **4.1** Performance script design (input, output, how backend is called).
- [ ] **4.2** Script implemented and producing a report.
- [ ] **4.3** Script run; latency and ingestion time recorded.
- [ ] **4.4** RAG doc updated with performance results; script documented.
- [ ] **5.1** LAPACK test scenarios defined (6–10 queries in file or doc).
- [ ] **5.2** Outcomes documented per scenario.
- [ ] **5.3** Scenarios wired into performance script.
- [ ] **6.1** README includes https://lapack-lens.fly.dev .
