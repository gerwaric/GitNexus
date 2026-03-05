# Eval Test Queries UI — Feature Document

This document describes the **Run test queries** feature in the GitNexus Browser Client: a simple UI that runs the LAPACK test queries one at a time through the Nexus AI agent (as if the user had typed each in chat), collects the full synthesized responses, and lets the user download the results as JSON.

---

## Goals

- **Capture full agent responses** — Not just retrieval (/api/search) but the complete flow: tool calls + LLM synthesis. Matches what the user sees when they ask a question in Nexus AI chat.
- **Repeatable** — Same 17 LAPACK test queries as in [docs/final-submission/test-queries.md](./test-queries.md) and [scripts/lapack-test-queries-performance.mjs](../../scripts/lapack-test-queries-performance.mjs), run in order.
- **Simple** — One UI control to run, one to download. No server-side agent endpoint; the existing worker + agent run in the browser.
- **Download-only** — Results are collected in memory and downloaded as a JSON file. Optional future: POST to a backend endpoint to write the report to disk (see test-queries.md).

---

## Context

- **Existing script** (`scripts/lapack-test-queries-performance.mjs`) calls `POST /api/search` only; it measures retrieval latency and raw search results. It does **not** run the agent or LLM.
- **Agent flow** — The Nexus AI agent runs in a web worker. It uses backend tools (search, cypher, context, impact, etc.) and an LLM (Gemini, OpenAI, etc.) configured in the browser. The full response (reasoning, tool calls, final answer) is only available when the agent runs in that worker.
- **This feature** — Runs the same agent non-streaming (one query at a time), collects the final assistant text and latency per query, and exposes a way to download the collected results.

---

## Architecture

| Layer | Responsibility |
|-------|----------------|
| **Query list** | A constant array in the frontend (same 17 items as test-queries.md: id, query, feature, expectedToFail). Single source for the UI; script can stay separate or later share this list. |
| **Worker** | New method `runQueryForEval(userMessage: string)` that calls `invokeAgent(currentAgent, [{ role: 'user', content: userMessage }])` (non-streaming), measures latency, and returns `{ content, latencyMs, error? }`. Does not update chat state. |
| **useAppState** | Exposes `runQueryForEval(query: string)` that forwards to the worker. |
| **UI** | A small block in the right panel (chat area): "Run test queries" button, progress (e.g. "3 / 17"), optional result list, "Download results" button. Runs the loop in the frontend and builds the report JSON for download. |

---

## Behavior

1. User has connected to a backend (or loaded a repo locally) and configured an LLM provider. Agent is ready.
2. User opens the "Test queries" section in the right panel and clicks **Run test queries**.
3. The app loops over the 17 queries. For each: calls `runQueryForEval(query)`, appends `{ id, query, feature, expectedToFail, content, latencyMs, error? }` to results, updates progress.
4. When the loop finishes, **Download results** is enabled. Clicking it downloads a JSON file (e.g. `gitnexus-eval-report.json`) containing `ranAt`, optional `backendUrl`/`repoName`, and the `results` array.
5. If the agent is not ready, the Run button is disabled or shows a short message ("Configure LLM and connect to a repo first").

---

## Notes

### Tab visibility

Browsers throttle background tabs (timers, workers, and network can be delayed). If you switch away during a run, progress may appear to hang until you focus the tab again. The UI shows "Keep this tab active to avoid delays" while running, and "Tab was in background — run may resume now" when you return.

### Rate limits (429)

LLM APIs may return 429 (Too Many Requests). The runner:

- **Delay between turns** — When running eval (Run test queries), a `preModelHook` in the agent waits **2 seconds** before each LLM turn (each time the model is invoked within a single query). Normal chat is unchanged. Configured by `EVAL_DELAY_BETWEEN_TURNS_MS` in `gitnexus-web/src/workers/ingestion.worker.ts`.
- Waits **15 seconds** between each of the 17 queries (like a human pausing to read the UI) to reduce burst load.
- After every **4 queries**, waits an extra **2 seconds** (“round” buffer) to give the API a breather.
- On a 429 response, waits **15 seconds** then retries that query once; the result (or second error) is recorded.

To adjust: turn delay is `EVAL_DELAY_BETWEEN_TURNS_MS` in the worker; query/round delays are in `gitnexus-web/src/components/EvalTestQueriesPanel.tsx` (`DELAY_BETWEEN_QUERIES_MS`, `ROUND_SIZE`, `ROUND_DELAY_MS`, `RETRY_AFTER_429_MS`). If 429s persist, increase the delays or use an LLM provider with higher limits.

---

## Out of scope (current)

- Writing results to the server via an API (can be added later; see test-queries.md).
- Running without the UI (e.g. headless); the script remains the way to measure retrieval-only from the server.
- Editing the query list from the UI; the list is fixed in code.

---

## References

| Doc / asset | Purpose |
|-------------|---------|
| [docs/final-submission/test-queries.md](./test-queries.md) | LAPACK test query set (17 queries), performance script usage, outcomes table. |
| [scripts/lapack-test-queries-performance.mjs](../../scripts/lapack-test-queries-performance.mjs) | Backend-only script: /api/search latency + raw results; no agent. |
| [docs/final-submission/eval-test-queries-implementation-plan.md](./eval-test-queries-implementation-plan.md) | Step-by-step implementation plan. |
| [docs/final-submission/eval-test-queries-execute-prompt.md](./eval-test-queries-execute-prompt.md) | Prompt to run the implementation plan in a new chat. |
