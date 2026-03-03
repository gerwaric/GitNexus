# Current state of testing

This document describes the test suites and known issues as of the last full regression run.

## gitnexus (CLI / core)

- **Node:** Use Node 20 for gitnexus (see `.nvmrc`). The package declares `engines: { "node": "20.x" }`; other versions may work but are unsupported and can trigger native addon or engine warnings.

### Unit tests

- **Command:** `cd gitnexus && npm run test`
- **Runner:** Vitest (see `vitest.config.ts`), pool `forks`, `singleFork: true`.
- **Scope:** `test/unit/**/*.test.ts`
- **Status:** All unit tests pass (33 files, 758 tests). No known flakiness. Some tests intentionally trigger ENOENT or missing tools and log to stderr; that is expected.

### Integration tests

- **Command:** `cd gitnexus && npm run test:integration`
- **Scope:** `test/integration/**/*.test.ts`
- **Status:** Tests pass, with one **known unhandled error** after the run:
  - The worker process that runs **`test/integration/kuzu-pool.test.ts`** can exit unexpectedly during or after teardown (KuzuDB native addon cleanup in a forked process). Vitest reports:
    - “Worker exited unexpectedly”
    - “Timeout terminating forks worker for … kuzu-pool.test.ts”
  - The kuzu-pool tests themselves may all pass in a given run, or the worker may exit before all finish; the reported count can be 88–89 of 98 tests depending on timing.
  - **Config:** `vitest.config.ts` uses `dangerouslyIgnoreUnhandledErrors: true` and `singleFork: true` to limit impact, but Vitest still surfaces the worker exit as an error. Using `--pool=threads` instead of forks leads to segfaults when the KuzuDB native module is used, so threads are not a workaround.
- **Takeaway:** Treat the kuzu-pool worker exit as a known, environment-related issue rather than a test logic failure. CI may need to allow this single unhandled error or run kuzu-pool in a separate job if a clean exit is required.

### Build

- **Command:** `cd gitnexus && npm run build`
- **Status:** TypeScript build succeeds. The parse-worker is built to `dist/`; the pipeline only creates the worker pool when the compiled parse-worker exists, so integration tests do not hit `MODULE_NOT_FOUND` for the worker.

## gitnexus-web

- **Commands:** `cd gitnexus-web && npm install && npm run build`
- **Status:** Build completes successfully. Warnings only: `fs`/`path` externalized for browser compatibility (web-tree-sitter), chunk size suggestions, and dependency eval warning. No build errors.

## Fortran and vendored tree-sitter-fortran

- **Vendor script:** `gitnexus/scripts/vendor-tree-sitter-fortran.sh`. Run from the **gitnexus** directory (or repo root). Refreshes `vendor/tree-sitter-fortran` from upstream v0.1.0 and strips devDependencies so `npm install` does not pull in tree-sitter-cli. After running the script, run `npm install` in gitnexus to rebuild the tree-sitter-fortran native addon.
- **Pipeline:** Fortran load failures (e.g. ABI mismatch if a non-vendored tree-sitter-fortran is used) are caught and rethrown with an error that points to the Fortran/tree-sitter docs.
- **Manual check:** From gitnexus, `npx gitnexus analyze --force <path-to-git-repo-with-fortran>` should complete without Fortran ABI errors; Fortran files are parsed when the vendored grammar is used.

## Summary

| Suite / action        | Command / scope              | Result / note                          |
|-----------------------|------------------------------|----------------------------------------|
| Unit tests            | `npm run test` (gitnexus)    | All pass                               |
| Integration tests    | `npm run test:integration`   | Pass, plus known kuzu-pool worker exit |
| gitnexus build        | `npm run build` (gitnexus)   | Pass                                   |
| gitnexus-web build    | `npm install && npm run build` | Pass                                 |
| Fortran vendor refresh| `scripts/vendor-tree-sitter-fortran.sh` then `npm install` | Pass |
