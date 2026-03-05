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

- **Manual / demo:** Run these queries in the GitNexus Browser Client at [https://gitnexus.smallcatlabs.com](https://gitnexus.smallcatlabs.com) or against a local backend + client. For each scenario, note the outcome in 1–2 sentences and fill the **Outcomes** table below.
- **Script (full agent, recommended):** Run the 10 scenarios through the agent and get a single report with full answers, then fill Outcomes from the report:
  ```bash
  BACKEND_URL=https://gitnexus.smallcatlabs.com GEMINI_API_KEY=your_key node scripts/ai-cost-eval.mjs --scenarios --output docs/final-submission/scenarios-report.json
  ```
  Open `scenarios-report.json`; each entry in `results` has `id` (1–10), `query`, `content` (the agent’s answer), and `error` (if any). Use that to write the 1–2 sentence outcome per row in the Outcomes table.
- **Backend-only latency:** Run `BACKEND_URL=https://gitnexus.smallcatlabs.com node scripts/performance-query-latency.mjs [--all] [--output report.json]` to measure `/api/search` latency (no LLM). Use the report to fill RAG doc §6 and optionally refine Outcomes.

## Outcomes

After running the performance script or manual tests, document 1–2 sentence outcomes per scenario in the **Outcomes** table below. *Filled from full 10-scenario run in `docs/final-submission/scenario-report.json`.*

### Outcomes

| # | Query | Outcome |
|---|--------|---------|
| 1 | Main entry point | Agent did not identify LAPACK entry points; responded as if the codebase were Python and asked for more context. |
| 2 | `dgemm` | Succeeded; explains double-precision general matrix multiply (C = alpha·op(A)·op(B) + beta·C), function signature, and cites CBLAS header. |
| 3 | Eigenvalue dependencies | Failed; agent could not determine dependencies of the eigenvalue routine (e.g. dsyevr) or read the source file from the graph. |
| 4 | Cholesky | Succeeded; points to Cholesky routines (*potf2, *pbtf2, spptrf) with file paths for general, banded, and packed matrices. |
| 5 | File I/O | Failed; agent searched for Python file I/O and did not return Fortran read/write or open/close operations. |
| 6 | Error handling | Succeeded; returns XERBLA-based error handling with code example from BLAS/SRC/xerbla.f (SRNAME, INFO, print and STOP). |
| 7 | BLAS matrix mult | Succeeded; lists _GEMM and _GEMMTR BLAS routines with data-type prefixes (d, s, z, c) used by LAPACK. |
| 8 | SVD | Succeeded; points to SVD implementations in SRC/ (dgesvj, sgesvj, dgejsv, sgejsv, cgesvj, zgesvj). |
| 9 | Impact of `dgetrf` | Failed; agent reported it could not find dgetrf in the codebase and did not perform impact analysis. |
| 10 | `dsyev` | Succeeded; explains symmetric eigenvalue routine and cites definition in SRC/dsyev.f. |
