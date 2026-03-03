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

- **Manual / demo:** Run these in the Lapack Lens chat at https://lapack-lens.fly.dev or locally.
- **Performance script:** The script in `lapack-lens/scripts/run_performance_tests.py` uses these (or a derived list) as the default query set.

## Outcomes

After running the performance script or manual tests, document 1–2 sentence outcomes per scenario in the **Outcomes** section below (see §5.2 of the gap mitigation plan).

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
