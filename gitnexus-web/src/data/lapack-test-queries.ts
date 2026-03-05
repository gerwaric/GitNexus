/**
 * LAPACK test query set for eval. Same 17 entries as scripts/lapack-test-queries-performance.mjs
 * and docs/final-submission/test-queries.md.
 */

export interface TestQueryItem {
  id: string;
  query: string;
  feature: string;
  expectedToFail: boolean;
}

export const LAPACK_TEST_QUERIES: TestQueryItem[] = [
  // Code Explanation (4)
  { id: 'ce-1', query: 'What does the routine dgemm do?', feature: 'Code Explanation', expectedToFail: false },
  { id: 'ce-2', query: 'Explain what the dsyev subroutine does and where it is defined.', feature: 'Code Explanation', expectedToFail: false },
  { id: 'ce-3', query: 'What does the routine dgetrf do?', feature: 'Code Explanation', expectedToFail: false },
  { id: 'ce-4', query: 'Explain what dpotrf does and how it relates to Cholesky factorization.', feature: 'Code Explanation', expectedToFail: false },
  // Dependency Mapping (4)
  { id: 'dm-1', query: 'What are the dependencies of the module or routine that computes eigenvalues?', feature: 'Dependency Mapping', expectedToFail: false },
  { id: 'dm-2', query: 'What BLAS routines does LAPACK call for matrix multiplication?', feature: 'Dependency Mapping', expectedToFail: false },
  { id: 'dm-3', query: 'What does the dgesvd routine call internally?', feature: 'Dependency Mapping', expectedToFail: false },
  { id: 'dm-4', query: 'What routines does dgetrs depend on?', feature: 'Dependency Mapping', expectedToFail: false },
  // Impact Analysis (4)
  { id: 'ia-1', query: 'What would be affected if I change routine dgetrf?', feature: 'Impact Analysis', expectedToFail: false },
  { id: 'ia-2', query: 'What would break if I modify dpotrf?', feature: 'Impact Analysis', expectedToFail: false },
  { id: 'ia-3', query: 'What depends on the SVD routine dgesvd?', feature: 'Impact Analysis', expectedToFail: false },
  { id: 'ia-4', query: 'Who calls dgetrs?', feature: 'Impact Analysis', expectedToFail: false },
  // Pattern Detection (4)
  { id: 'pd-1', query: 'Show me error handling patterns in this codebase.', feature: 'Pattern Detection', expectedToFail: false },
  { id: 'pd-2', query: 'Where does LAPACK check INFO before continuing?', feature: 'Pattern Detection', expectedToFail: false },
  { id: 'pd-3', query: 'Find routines that allocate workspace with LWORK.', feature: 'Pattern Detection', expectedToFail: false },
  { id: 'pd-4', query: 'Where are Householder reflectors used?', feature: 'Pattern Detection', expectedToFail: false },
  // Expected to fail (1)
  { id: 'fail-1', query: 'What business rules govern interest calculation?', feature: 'Expected to fail', expectedToFail: true },
];
