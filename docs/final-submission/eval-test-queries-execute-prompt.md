# Prompt: Execute the Eval Test Queries UI Plan

Use this prompt in a **new chat session** to have an agent implement the Run test queries feature from the implementation plan.

---

Execute the **implementation plan** in `docs/final-submission/eval-test-queries-implementation-plan.md` to add the Eval Test Queries UI to the GitNexus Browser Client.

**Context:** The feature is described in `docs/final-submission/eval-test-queries-feature.md`. It allows users to run the 17 LAPACK test queries (same as in `docs/final-submission/test-queries.md`) one at a time through the Nexus AI agent and download the collected responses as JSON.

**Instructions**

1. **Read the plan and feature doc.** Open `docs/final-submission/eval-test-queries-implementation-plan.md` and `docs/final-submission/eval-test-queries-feature.md`. Use them as the source of truth for steps and file paths.

2. **Implement in order.** Work through §1 (Worker) → §2 (Query list) → §3 (useAppState) → §4 (UI) → §5 (Verification). For §2, copy the 17 query entries from `scripts/lapack-test-queries-performance.mjs` (the `QUERIES` array) so ids, query text, feature, and expectedToFail match.

3. **Keep the UI minimal.** A "Run test queries" button, progress text (e.g. "3 / 17"), optional short result list, and "Download results" button are enough. Place the block in the right panel (e.g. a collapsible "Test queries" section below or beside the chat). Do not add server upload or extra controls unless the plan specifies them.

4. **Verification.** Run `cd gitnexus-web && npm run build` and fix any type or build errors. If you can, briefly note how to manually test (connect to backend, configure LLM, run test queries, download JSON).

5. **When done,** list what was implemented (files added/changed) and any follow-ups for the user (e.g. "Run the app and use Test queries to generate a report").

Do not duplicate the full plan in your reply; work from the files and report progress as you go.
