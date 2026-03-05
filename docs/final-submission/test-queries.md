# LAPACK Test Queries

Test queries for the GitNexus RAG system against the LAPACK (Fortran) codebase. Designed to cover **four** required code-understanding features from the project definition, with 3–5 queries per feature plus one query expected to fail (to capture failure modes).

**Reference:** [docs/project-definition.md](../project-definition.md) — Code Understanding Features.

---

## Feature Coverage

| Feature | Description | Queries |
|--------|-------------|---------|
| **Code Explanation** | Explain what a function/section does in plain English | 4 |
| **Dependency Mapping** | Show what calls what, data flow between modules | 4 |
| **Impact Analysis** | What would be affected if this code changes? | 4 |
| **Pattern Detection** | Find similar code patterns across the codebase | 4 |
| **Expected to fail** | Query designed to produce poor/irrelevant results | 1 |

---

## Queries by Feature

### Code Explanation

| # | Query | Notes |
|---|-------|-------|
| 1 | What does the routine `dgemm` do? | BLAS general matrix-matrix multiply |
| 2 | Explain what the `dsyev` subroutine does and where it is defined. | Symmetric eigenvalue driver |
| 3 | What does the routine `dgetrf` do? | LU factorization |
| 4 | Explain what `dpotrf` does and how it relates to Cholesky factorization. | Cholesky factor routine |

### Dependency Mapping

| # | Query | Notes |
|---|-------|-------|
| 5 | What are the dependencies of the module or routine that computes eigenvalues? | e.g. dsyev, drivers, internal routines |
| 6 | What BLAS routines does LAPACK call for matrix multiplication? | e.g. dgemm, dsymm |
| 7 | What does the `dgesvd` routine call internally? | SVD driver dependencies |
| 8 | What routines does `dgetrs` depend on? | Triangular solve after LU |

### Impact Analysis

| # | Query | Notes |
|---|-------|-------|
| 9 | What would be affected if I change routine `dgetrf`? | Callers and dependents of LU factorization |
| 10 | What would break if I modify `dpotrf`? | Cholesky callers |
| 11 | What depends on the SVD routine `dgesvd`? | SVD callers and call chains |
| 12 | Who calls `dgetrs`? | Triangular solve callers |

### Pattern Detection

| # | Query | Notes |
|---|-------|-------|
| 13 | Show me error handling patterns in this codebase. | INFO checks, error returns |
| 14 | Where does LAPACK check INFO before continuing? | Error-check idiom |
| 15 | Find routines that allocate workspace with LWORK. | Workspace allocation pattern |
| 16 | Where are Householder reflectors used? | Common numerical pattern |

### Expected to Fail

| # | Query | Notes |
|---|-------|-------|
| 17 | What business rules govern interest calculation? | COBOL/banking concept; LAPACK has no such logic. Expected to return irrelevant or empty results. |

---

## Performance Recording

Run the dedicated script:

```bash
BACKEND_URL=https://gitnexus.smallcatlabs.com REPO=<repo-name> node scripts/lapack-test-queries-performance.mjs [--output report.json]
```

Or against a local backend:

```bash
BACKEND_URL=http://127.0.0.1:4747 node scripts/lapack-test-queries-performance.mjs [--output report.json]
```

The script calls `POST /api/search` for each query, records latency and success/failure, and writes a JSON summary. Use the report to fill RAG doc §6 and document failure modes.

---

## Full agent run (optional)

To run the same 17 queries through the **Nexus AI agent** (tool calls + LLM synthesis) and download the full responses, use the **Eval Test Queries UI** in the GitNexus Browser Client:

- **Feature:** [eval-test-queries-feature.md](./eval-test-queries-feature.md)
- **Implementation plan:** [eval-test-queries-implementation-plan.md](./eval-test-queries-implementation-plan.md)
- **Execute in a new chat:** [eval-test-queries-execute-prompt.md](./eval-test-queries-execute-prompt.md)

After implementation, open the app → connect to backend and configure LLM → use the "Test queries" section → Run test queries → Download results.

---

## Outcomes (to be filled after runs)

After running the script, document 1–2 sentence outcomes per feature in the table below.

| Feature | Outcome |
|---------|---------|
| Code Explanation | _TBD_ |
| Dependency Mapping | _TBD_ |
| Impact Analysis | _TBD_ |
| Pattern Detection | _TBD_ |
| Expected to fail | _TBD_ (confirm poor/irrelevant results) |
