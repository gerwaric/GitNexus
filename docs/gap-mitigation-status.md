# Gap Mitigation Status

Status of work for the [Gap Mitigation Plan](./gap-mitigation-plan.md) (LegacyLens submission). Last updated after implementing §1–§3, §4.1–4.2, §5.1, §5.3, §6.1, §2.1.

---

## Completed (with git commits)

### §6.1 — README deployed link
- README already contained https://lapack-lens.fly.dev; checklist marked done.

### §5.1 — LAPACK test scenarios
- **`docs/testing-scenarios.md`** added with 10 LAPACK-tailored natural-language queries and an outcomes table placeholder.
- Commit: `68c88c5` — docs: add LAPACK-tailored testing scenarios (§5.1)

### §3 — Impact and Wiki
- **GitNexus:** `POST /api/tools/impact` and `POST /api/tools/wiki` in `gitnexus/src/server/api.ts` (wiki invokes WikiGenerator with resolved LLM config; long-running).
- **Lapack Lens:** `call_impact()` and `call_wiki()` in `tools.py`; impact and wiki tool definitions and tool loop in `app.py`.
- **Feature → tool mapping** table added to `lapack-lens/README.md`.
- Commit: `4f21af4` — feat: add Impact and Wiki REST + Lapack Lens tools (§3)

### §1 — RAG Architecture document
- **`docs/rag-architecture.md`** written (1–2 pages): KuzuDB selection, embedding strategy (Snowflake arctic-embed-xs, symbol-level), chunking (symbol-level), retrieval pipeline (query/context/cypher/impact/wiki, hybrid BM25+RRF), failure modes, performance section (placeholder for script results).
- Checklist §9 updated for §1, §3, §5.1, §6.1.
- Commit: `b8c3a2c` — docs: add RAG Architecture document (§1)

### §4.1–4.2 & §5.3 — Performance script and scenario wiring
- **`lapack-lens/scripts/run_performance_tests.py`** — Simulates chat (GitNexus REST + OpenAI tool loop), records latency per query, outputs JSON report and optional Markdown.
- **`lapack-lens/scripts/queries.json`** — Default 10 queries aligned with `docs/testing-scenarios.md`.
- README updated with how to run the script; RAG doc §6 references it.
- Checklist: 4.1, 4.2, 5.3 marked done.
- Commit: `852b2b6` — feat(lapack-lens): add performance test script (§4.1–4.2, §5.3)

### §2.1 — Query interface (minimum)
- System prompt updated so the model: cites file paths and line ranges (e.g. path:start-end), uses markdown code blocks with ` ```fortran ` when showing code, and uses `include_content: true` when the user asks for code.
- Commit: `c9ed297` — feat(lapack-lens): system prompt for file/line and fortran code blocks (§2.1)

---

## Remaining (require your action or a live run)

### §4.3 — Run the performance script
- With GitNexus + LAPACK running and `OPENAI_API_KEY` set:
  ```bash
  cd lapack-lens
  pip install -r app/requirements.txt   # or use your venv
  PYTHONPATH=app python3 scripts/run_performance_tests.py --output performance_report.json --md performance_report.md
  ```
- Optionally record **ingestion time** (e.g. from Docker build log or one-off `gitnexus analyze` for LAPACK).

### §4.4 — Fill performance results in RAG doc
- After the run, add a short “Performance results” summary to **`docs/rag-architecture.md`** §6 (e.g. latency min/max/avg, ingestion time, and that evaluation was done via the script).

### §5.2 — Document outcomes per scenario
- Using the same run (or manual tests), fill the **Outcomes** table in **`docs/testing-scenarios.md`** with 1–2 sentence outcomes per scenario.

### §2.2 — Verify in UI
- In the Streamlit app, ask a question that should return code (e.g. “What does routine dgemm do? Show me the code.”) and confirm that markdown code blocks with `fortran` render correctly (Streamlit’s default markdown supports this).

---

## Verification performed in-repo

- `npm run build` in `gitnexus` succeeds (api.ts compiles).
- Linting on changed files is clean.
- Performance script runs with `--help`; full run was not executed (no live backend/API key in automation).
