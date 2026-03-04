#!/usr/bin/env node
/**
 * Minimal performance script: measure query latency against GitNexus backend.
 * Calls POST /api/search for each query and records latency. Use to fill
 * docs/rag-architecture.md §6 and docs/testing-scenarios.md Outcomes.
 *
 * Usage:
 *   BACKEND_URL=https://gitnexus.smallcatlabs.com REPO=<repo-name> node scripts/performance-query-latency.mjs
 *   BACKEND_URL=http://127.0.0.1:4747 node scripts/performance-query-latency.mjs [--output report.json]
 *
 * Default queries match docs/testing-scenarios.md (first 3 for a quick run; use --all for all 10).
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:4747';
const REPO = process.env.REPO || '';

const QUERIES_FULL = [
  'Where is the main entry point of this program?',
  'What does the routine dgemm do?',
  'What are the dependencies of the module or routine that computes eigenvalues?',
  'Where is the Cholesky factorization implemented?',
  'Find all file I/O operations in the codebase.',
  'Show me error handling patterns in this codebase.',
  'What BLAS routines does LAPACK call for matrix multiplication?',
  'Where is the singular value decomposition (SVD) implemented?',
  'What would be affected if I change routine dgetrf?',
  'Explain what the dsyev subroutine does and where it is defined.',
];

async function runOneQuery(query, limit = 5) {
  const url = `${BACKEND_URL.replace(/\/$/, '')}/api/search`;
  const start = performance.now();
  let success = false;
  let error = null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit, repo: REPO || undefined }),
    });
    success = res.ok;
    if (!res.ok) {
      const t = await res.text();
      error = `HTTP ${res.status}: ${t.slice(0, 200)}`;
    }
  } catch (e) {
    error = e.message || String(e);
  }
  const latencyMs = performance.now() - start;
  return { query: query.slice(0, 60), latencyMs: Math.round(latencyMs * 100) / 100, success, error };
}

async function main() {
  const useAll = process.argv.includes('--all');
  const outIdx = process.argv.indexOf('--output');
  const outputPath = outIdx >= 0 && process.argv[outIdx + 1] ? process.argv[outIdx + 1] : null;
  const queries = useAll ? QUERIES_FULL : QUERIES_FULL.slice(0, 3);

  console.log(`Backend: ${BACKEND_URL}${REPO ? ` repo=${REPO}` : ''}`);
  console.log(`Queries: ${queries.length}\n`);

  const results = [];
  for (let i = 0; i < queries.length; i++) {
    process.stdout.write(`  [${i + 1}/${queries.length}] ${queries[i].slice(0, 50)}... `);
    const r = await runOneQuery(queries[i]);
    results.push({ ...r, query: queries[i] });
    console.log(`${r.latencyMs}ms ${r.success ? '✓' : '✗ ' + (r.error || '')}`);
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
    results,
  };

  console.log('\nSummary:');
  console.log(`  Success: ${summary.success_count}/${summary.queries_run}`);
  if (summary.latency_s) {
    console.log(`  Latency (s): min=${summary.latency_s.min.toFixed(2)} max=${summary.latency_s.max.toFixed(2)} avg=${summary.latency_s.avg.toFixed(2)}`);
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
