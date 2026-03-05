# Eval Test Queries UI — Implementation Plan

This plan implements the feature described in [docs/final-submission/eval-test-queries-feature.md](./eval-test-queries-feature.md). Execute the steps in order; each step lists the file(s) to change and the done criteria.

---

## 1. Worker: run one query and return result (no chat UI)

**Goal:** Add a method that runs a single user message through the agent (non-streaming), returns the final assistant content and latency, and does not update chat state.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 1.1 | Import `invokeAgent` from `../core/llm/agent` in the ingestion worker. | `gitnexus-web/src/workers/ingestion.worker.ts` |
| 1.2 | On `workerApi`, add `async runQueryForEval(userMessage: string): Promise<{ content: string; latencyMs: number; error?: string }>`. If `currentAgent` is null, return `{ content: '', latencyMs: 0, error: 'Agent not initialized' }`. | `gitnexus-web/src/workers/ingestion.worker.ts` |
| 1.3 | In `runQueryForEval`: build `messages = [{ role: 'user', content: userMessage }]`. Call `const start = performance.now()`, then `await invokeAgent(currentAgent, messages)`, then compute `latencyMs = performance.now() - start`. Return `{ content: result, latencyMs }`. Wrap in try/catch; on throw return `{ content: '', latencyMs: 0, error: err.message }`. | Same file |

**Done:** Worker exposes `runQueryForEval`; calling it with a string runs the agent once and returns `{ content, latencyMs, error? }` without touching chat messages.

---

## 2. Test query list in the frontend

**Goal:** Single source for the 17 LAPACK test queries so the UI can iterate over them.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 2.1 | Create `gitnexus-web/src/data/lapack-test-queries.ts`. Export interface `TestQueryItem { id: string; query: string; feature: string; expectedToFail: boolean }` and constant `LAPACK_TEST_QUERIES: TestQueryItem[]`. | New file |
| 2.2 | Populate `LAPACK_TEST_QUERIES` with the same 17 entries as in `scripts/lapack-test-queries-performance.mjs` (ids ce-1..ce-4, dm-1..dm-4, ia-1..ia-4, pd-1..pd-4, fail-1; same query text, feature, expectedToFail). | Same file |

**Done:** Importing `LAPACK_TEST_QUERIES` from `../data/lapack-test-queries` gives the 17 items for the UI loop.

---

## 3. useAppState: expose eval runner

**Goal:** The UI can call a function that runs one query through the worker and returns the result.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 3.1 | In `useAppState`, add a callback `runQueryForEval(query: string): Promise<{ content: string; latencyMs: number; error?: string }>`. Implementation: get `api = apiRef.current`; if !api throw or return a rejected promise with a clear message; otherwise `return api.runQueryForEval(query)`. | `gitnexus-web/src/hooks/useAppState.tsx` |
| 3.2 | Add `runQueryForEval` to the `AppState` interface and to the value provided by `AppStateProvider`. | Same file |

**Done:** Any component that uses `useAppState()` can call `runQueryForEval(query)` and receive `{ content, latencyMs, error? }`.

---

## 4. UI: Run test queries + progress + download

**Goal:** A small block in the right panel with Run button, progress text, optional result list, and Download button.

| Step | Action | Location / reference |
|------|--------|----------------------|
| 4.1 | Create a component (e.g. `EvalTestQueriesPanel` or a section inside RightPanel) that uses `useAppState()` for `runQueryForEval`, `isAgentReady`, and optionally `currentServerRepoName` / server URL for the report. State: `evalResults: Array<{ id, query, feature, expectedToFail, content, latencyMs, error? }>`, `evalRunning: boolean`, `evalProgress: string` (e.g. "3 / 17"). | New file e.g. `gitnexus-web/src/components/EvalTestQueriesPanel.tsx`, or a named block inside `RightPanel.tsx` |
| 4.2 | "Run test queries" button: disabled when `evalRunning` or when `!isAgentReady`. On click: set `evalRunning = true`, clear `evalResults`, then loop over `LAPACK_TEST_QUERIES`; for each item call `await runQueryForEval(item.query)`, push `{ ...item, ...result }` to `evalResults`, update `evalProgress` to `"i / 17"`, re-render. After loop set `evalRunning = false`. | Same component |
| 4.3 | "Download results" button: enabled when `evalResults.length > 0`. On click build object `{ ranAt: new Date().toISOString(), results: evalResults }` (optionally add `repoName`, `backendUrl` from app state if available). `JSON.stringify(..., null, 2)`, create `Blob`, trigger download with filename `gitnexus-eval-report.json`. | Same component |
| 4.4 | While running, show progress text (e.g. "Running test queries… 3 / 17"). Optional: compact list of rows (query snippet, latency, success/error) after run. If agent not ready, show short message (e.g. "Configure an LLM provider and connect to a repo to run test queries."). | Same component |
| 4.5 | Mount the new component or section in the right panel (e.g. in `RightPanel.tsx` below the chat or in a collapsible "Test queries" section). Ensure it only shows when in exploring mode with a loaded repo (same as chat). | `gitnexus-web/src/components/RightPanel.tsx` (or layout that contains RightPanel) |

**Done:** User can click Run test queries, see progress, then Download results and get a JSON file with full agent responses and latency per query.

---

## 5. Verification

| Step | Action |
|------|--------|
| 5.1 | Build: `cd gitnexus-web && npm run build` — must succeed. |
| 5.2 | Manual check: Load the app, connect to a backend (or load a repo), configure LLM. Open the Test queries section, click Run test queries; wait for all 17 to complete; click Download results and confirm the JSON contains `ranAt`, `results` with 17 entries each having `content`, `latencyMs`, and query metadata. |

---

## Summary

| Section | Deliverable |
|---------|-------------|
| §1 | Worker method `runQueryForEval(userMessage)` using `invokeAgent`, returns `{ content, latencyMs, error? }`. |
| §2 | `gitnexus-web/src/data/lapack-test-queries.ts` with `LAPACK_TEST_QUERIES` (17 items). |
| §3 | `runQueryForEval` exposed from useAppState. |
| §4 | UI: Run button, progress, Download button, optional result list; mounted in right panel. |
| §5 | Build passes; manual run + download produces expected JSON. |
