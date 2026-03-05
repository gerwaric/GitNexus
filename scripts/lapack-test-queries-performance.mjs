#!/usr/bin/env node
/**
 * Run LAPACK test queries against GitNexus backend and record performance.
 * Calls POST /api/search for each query. Use to fill docs/final-submission/test-queries.md
 * outcomes and docs/rag-architecture.md §6.
 *
 * Usage:
 *   BACKEND_URL=https://gitnexus.smallcatlabs.com REPO=<repo-name> node scripts/lapack-test-queries-performance.mjs
 *   BACKEND_URL=http://127.0.0.1:4747 node scripts/lapack-test-queries-performance.mjs [--output report.json]
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:4747';
const REPO = process.env.REPO || '';

const QUERIES = [
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

async function runOneQuery(query, limit = 5) {
  const url = `${BACKEND_URL.replace(/\/$/, '')}/api/search`;
  const start = performance.now();
  let success = false;
  let error = null;
  let response = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit, repo: REPO || undefined }),
    });
    const body = await res.json().catch(() => ({}));
    success = res.ok;
    if (!res.ok) {
      error = `HTTP ${res.status}: ${JSON.stringify(body).slice(0, 200)}`;
    } else {
      response = body;
    }
  } catch (e) {
    error = e.message || String(e);
  }
  const latencyMs = performance.now() - start;
  return { latencyMs: Math.round(latencyMs * 100) / 100, success, error, response };
}

async function main() {
  const outIdx = process.argv.indexOf('--output');
  const outputPath = outIdx >= 0 && process.argv[outIdx + 1] ? process.argv[outIdx + 1] : null;

  console.log(`Backend: ${BACKEND_URL}${REPO ? ` repo=${REPO}` : ''}`);
  console.log(`Queries: ${QUERIES.length}\n`);

  const results = [];
  for (let i = 0; i < QUERIES.length; i++) {
    const q = QUERIES[i];
    const label = q.expectedToFail ? ' [expect fail]' : '';
    process.stdout.write(`  [${i + 1}/${QUERIES.length}] ${q.query.slice(0, 50)}...${label} `);
    const r = await runOneQuery(q.query);
    const hitCount = r.response?.results?.length ?? 0;
    results.push({
      id: q.id,
      query: q.query,
      feature: q.feature,
      expectedToFail: q.expectedToFail,
      latencyMs: r.latencyMs,
      success: r.success,
      error: r.error || undefined,
      response: r.response ?? undefined,
    });
    console.log(`${r.latencyMs}ms ${r.success ? '✓' : '✗'} ${r.success ? `(${hitCount} results)` : (r.error || '')}`);
  }

  const ok = results.filter((r) => r.success);
  const latencies = ok.map((r) => r.latencyMs / 1000);
  const summary = {
    backend: BACKEND_URL,
    repo: REPO || null,
    queries_run: results.length,
    success_count: ok.length,
    latency_s: latencies.length
      ? { min: Math.min(...latencies), max: Math.max(...latencies), avg: latencies.reduce((a, b) => a + b, 0) / latencies.length }
      : null,
    by_feature: Object.fromEntries(
      [...new Set(results.map((r) => r.feature))].map((f) => [
        f,
        results.filter((r) => r.feature === f).map((r) => ({ id: r.id, success: r.success, latencyMs: r.latencyMs })),
      ])
    ),
    results,
  };

  console.log('\nSummary:');
  console.log(`  Success: ${summary.success_count}/${summary.queries_run}`);
  if (summary.latency_s) {
    console.log(`  Latency (s): min=${summary.latency_s.min.toFixed(2)} max=${summary.latency_s.max.toFixed(2)} avg=${summary.latency_s.avg.toFixed(2)}`);
  }
  const expectFail = results.find((r) => r.expectedToFail);
  if (expectFail) {
    console.log(`  Expected-to-fail (${expectFail.id}): success=${expectFail.success} latencyMs=${expectFail.latencyMs}`);
  }

  if (outputPath) {
    const fs = await import('fs');
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`\nWrote ${outputPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
