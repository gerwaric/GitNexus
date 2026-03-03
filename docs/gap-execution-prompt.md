# Gap execution prompt

I need you to implement the **Gap Mitigation Plan** for this project. The plan closes gaps between the current Lapack Lens app and the LegacyLens submission requirements.

**Context**
- **Repo:** GitNexus (codebase knowledge graph + MCP/server). Lapack Lens is a Streamlit chat app in `lapack-lens/` that talks to the GitNexus server via REST and uses OpenAI to answer questions about the LAPACK (Fortran) codebase.
- **Requirements:** See `docs/project-definition.md` (LegacyLens). Gaps are analyzed in `docs/gap-analysis-legacylens.md`. Decisions are in `docs/gap-mitigation-prereqs.md`.
- **Plan:** Read and follow **`docs/gap-mitigation-plan.md`** for the full task list, done criteria, and suggested order.

**What to implement (summary)**

1. **§1 RAG Architecture document** — Investigate GitNexus (embeddings, KuzuDB, BM25/semantic/RRF, tools). Write `docs/rag-architecture.md` (1–2 pages) with: Vector DB selection, Embedding strategy, Chunking approach, Retrieval pipeline, Failure modes, Performance results. Include design rationale (why GitNexus chose each approach).

2. **§2 Query interface (minimum)** — Update system prompt / tool behavior so the model cites file paths and line ranges and uses markdown code blocks with ` ```fortran ` when showing code. Verify Streamlit renders them. Defer full snippet UI (§2.3) for later.

3. **§3 Impact and Wiki** — (A) Add both:
   - **Impact:** `POST /api/tools/impact` in `gitnexus/src/server/api.ts` (same params as MCP impact). Lapack Lens: `call_impact()` in `tools.py`, impact tool def and tool loop in `app.py`.
   - **Wiki:** `POST /api/tools/wiki` in `gitnexus/src/server/api.ts` (trigger wiki generation for repo; long-running, long timeout or async). Lapack Lens: `call_wiki()` in `tools.py`, wiki tool def and tool loop in `app.py`.
   - **Feature → tool mapping:** Add table (README or RAG doc): Code explanation → context + LLM; Dependency mapping → context/cypher; Impact analysis → impact; Pattern detection → query; Documentation generation → wiki.

4. **§4 Performance script** — Design and implement a script that simulates the chat (HTTP to GitNexus + OpenAI tool loop), runs a list of test queries, records latency per query, and outputs a report (JSON or markdown). Document in RAG doc and in lapack-lens.

5. **§5 Testing scenarios** — Define 6–10 LAPACK-tailored natural-language queries (file or `docs/testing-scenarios.md`). Wire them into the performance script. After running, document outcomes per scenario.

6. **§6 README** — Ensure `lapack-lens/README.md` includes the deployed link **https://lapack-lens.fly.dev** (may already be done).

**Instructions**
- Start by reading `docs/gap-mitigation-plan.md` and `docs/gap-mitigation-prereqs.md`.
- Follow the **Suggested order of work** in §8 of the plan. You can do §1, §3, §5.1, §6.1 in parallel where it makes sense; then §4.1–4.2 and §5.3; then §4.3–4.4 and §5.2; then §2.1–2.2.
- For each task, satisfy the **Done criteria** in the plan. When a task is complete, mark it in the plan’s §9 checklist (or say “done” in chat).
- For GitNexus code: impact is already implemented in the backend (`callTool('impact', ...)`); add REST routes only. Wiki is a CLI command (`gitnexus wiki`); add a REST route that invokes the wiki pipeline (resolve repo path, run `WikiGenerator` from `core/wiki/generator.js` with LLM config; document long-running behavior).
- Do not change GitNexus core indexing/retrieval logic; only add REST wrappers and Lapack Lens tool wiring.
- If something is ambiguous, prefer the wording in `docs/gap-mitigation-plan.md`.

Implement the plan step by step and report what you completed.

---

## End of prompt
