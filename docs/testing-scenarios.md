# Testing Scenarios (LAPACK-tailored)

Natural-language queries for validating Lapack Lens and the performance script. Adapted for the LAPACK (Fortran) codebase.

## Scenarios

| # | Query | Expected outcome (1–2 sentences) |
|---|--------|-----------------------------------|
| 1 | Where is the main entry point of this program? | Returns main program(s) and top-level drivers; identifies entry points. |
| 2 | What does the routine `dgemm` do? | Explains BLAS double-precision general matrix-matrix multiply; file/line and role. |
| 3 | What are the dependencies of the module or routine that computes eigenvalues? | Lists routines/modules involved in eigenvalue computation (e.g. `dsyev`, drivers, dependencies). |
| 4 | Where is the Cholesky factorization implemented? | Points to Cholesky routines (e.g. `dpotrf`, `spotrf`) with file paths and line ranges. |
| 5 | Find all file I/O operations in the codebase. | Returns routines or files that perform read/write or open/close. |
| 6 | Show me error handling patterns in this codebase. | Returns error-handling idioms (e.g. `info` checks, error returns) with examples. |
| 7 | What BLAS routines does LAPACK call for matrix multiplication? | Lists BLAS calls (e.g. `dgemm`, `dsymm`) used by LAPACK with context. |
| 8 | Where is the singular value decomposition (SVD) implemented? | Points to SVD drivers and computational routines (e.g. `dgesvd`) with locations. |
| 9 | What would be affected if I change routine `dgetrf`? | Impact analysis: callers and dependents of the LU factorization routine. |
| 10 | Explain what the `dsyev` subroutine does and where it is defined. | Explains symmetric eigenvalue routine; cites file path and line range; optional code snippet. |

## Usage

- **Manual / demo:** Run these queries in the GitNexus Browser Client at [https://gitnexus.smallcatlabs.com](https://gitnexus.smallcatlabs.com) or against a local backend + client.
- **Performance script:** A minimal script that runs a fixed set of queries against the backend (and optionally the LLM loop) can be added to the repo to record latency and regenerate outcomes; see §4.2 of the mitigation plan. Until then, run scenarios manually and fill outcomes below.
- **Backend-only latency:** Run `BACKEND_URL=https://gitnexus.smallcatlabs.com node scripts/performance-query-latency.mjs [--all] [--output report.json]` to measure `/api/search` latency (no LLM). Use the report to fill RAG doc §6 and optionally refine Outcomes.

## Outcomes

After running the performance script or manual tests, document 1–2 sentence outcomes per scenario in the **Outcomes** table below. *To be filled after running tests — run the 10 scenarios against the deployed app or local backend and record results.*

### Outcomes (to be filled after running tests)

| # | Query | Outcome |
|---|--------|---------|
| 1 | Main entry point | _TBD_ |
| 2 | `dgemm` | _TBD_ |
| 3 | Eigenvalue dependencies | _TBD_ |
| 4 | Cholesky | _TBD_ |
| 5 | File I/O | _TBD_ |
| 6 | Error handling | _TBD_ |
| 7 | BLAS matrix mult | _TBD_ |
| 8 | SVD | _TBD_ |
| 9 | Impact of `dgetrf` | _TBD_ |
| 10 | `dsyev` | _TBD_ |
