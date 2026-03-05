#!/usr/bin/env node
/**
 * AI Cost Eval: run LAPACK test queries through Gemini + GitNexus backend and record token usage.
 * Use to fill docs/final-submission/ai-cost-analysis.md (dev/test row and production assumptions).
 *
 * Prerequisites: Backend running with LAPACK indexed; Gemini API key.
 *
 * Usage:
 *   BACKEND_URL=https://gitnexus.smallcatlabs.com GEMINI_API_KEY=... node scripts/ai-cost-eval.mjs
 *   BACKEND_URL=http://127.0.0.1:4747 REPO=lapack node scripts/ai-cost-eval.mjs [--output report.json] [--queries 5]
 *
 *   --scenarios  Use the 10 queries from docs/testing-scenarios.md; report includes full answer content so you can fill the Outcomes table from one run.
 *   BACKEND_URL=... GEMINI_API_KEY=... node scripts/ai-cost-eval.mjs --scenarios --output docs/final-submission/scenarios-report.json
 *
 * Env: DELAY_BETWEEN_TURNS_MS=2000 (default) — wait before each LLM turn within a query (reduces 429s). 0 to disable.
 *      DELAY_BETWEEN_QUERIES_MS=0 — wait after each query before the next (app uses 15000). Set to 15000 to match app.
 *      RETRY_AFTER_429_MS=15000 — message hint when 429 is returned (script does not auto-retry).
 *
 * Output: Total prompt tokens, total completion tokens, estimated $ (Gemini pricing), optional JSON report.
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:4747';
const REPO = process.env.REPO || 'lapack';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
/** Delay before each LLM turn (within a query), to reduce 429s. Matches gitnexus-web EVAL_DELAY_BETWEEN_TURNS_MS. Set to 0 to disable. */
const DELAY_BETWEEN_TURNS_MS = parseInt(process.env.DELAY_BETWEEN_TURNS_MS || '2000', 10) || 0;
/** Delay after each query before starting the next. Matches app DELAY_BETWEEN_QUERIES_MS. Set to 0 to disable. */
const DELAY_BETWEEN_QUERIES_MS = parseInt(process.env.DELAY_BETWEEN_QUERIES_MS || '0', 10) || 0;

// Same query set as lapack-test-queries-performance.mjs / test-queries.md
const QUERIES = [
  { id: 'ce-1', query: 'What does the routine dgemm do?', feature: 'Code Explanation', expectedToFail: false },
  { id: 'ce-2', query: 'Explain what the dsyev subroutine does and where it is defined.', feature: 'Code Explanation', expectedToFail: false },
  { id: 'ce-3', query: 'What does the routine dgetrf do?', feature: 'Code Explanation', expectedToFail: false },
  { id: 'ce-4', query: 'Explain what dpotrf does and how it relates to Cholesky factorization.', feature: 'Code Explanation', expectedToFail: false },
  { id: 'dm-1', query: 'What are the dependencies of the module or routine that computes eigenvalues?', feature: 'Dependency Mapping', expectedToFail: false },
  { id: 'dm-2', query: 'What BLAS routines does LAPACK call for matrix multiplication?', feature: 'Dependency Mapping', expectedToFail: false },
  { id: 'dm-3', query: 'What does the dgesvd routine call internally?', feature: 'Dependency Mapping', expectedToFail: false },
  { id: 'dm-4', query: 'What routines does dgetrs depend on?', feature: 'Dependency Mapping', expectedToFail: false },
  { id: 'ia-1', query: 'What would be affected if I change routine dgetrf?', feature: 'Impact Analysis', expectedToFail: false },
  { id: 'ia-2', query: 'What would break if I modify dpotrf?', feature: 'Impact Analysis', expectedToFail: false },
  { id: 'ia-3', query: 'What depends on the SVD routine dgesvd?', feature: 'Impact Analysis', expectedToFail: false },
  { id: 'ia-4', query: 'Who calls dgetrs?', feature: 'Impact Analysis', expectedToFail: false },
  { id: 'pd-1', query: 'Show me error handling patterns in this codebase.', feature: 'Pattern Detection', expectedToFail: false },
  { id: 'pd-2', query: 'Where does LAPACK check INFO before continuing?', feature: 'Pattern Detection', expectedToFail: false },
  { id: 'pd-3', query: 'Find routines that allocate workspace with LWORK.', feature: 'Pattern Detection', expectedToFail: false },
  { id: 'pd-4', query: 'Where are Householder reflectors used?', feature: 'Pattern Detection', expectedToFail: false },
  { id: 'fail-1', query: 'What business rules govern interest calculation?', feature: 'Expected to fail', expectedToFail: true },
];

// 10 scenarios from docs/testing-scenarios.md (for --scenarios mode; report includes full content for Outcomes table)
const SCENARIOS = [
  { id: 1, query: 'Where is the main entry point of this program?', label: 'Main entry point' },
  { id: 2, query: 'What does the routine dgemm do?', label: 'dgemm' },
  { id: 3, query: 'What are the dependencies of the module or routine that computes eigenvalues?', label: 'Eigenvalue dependencies' },
  { id: 4, query: 'Where is the Cholesky factorization implemented?', label: 'Cholesky' },
  { id: 5, query: 'Find all file I/O operations in the codebase.', label: 'File I/O' },
  { id: 6, query: 'Show me error handling patterns in this codebase.', label: 'Error handling' },
  { id: 7, query: 'What BLAS routines does LAPACK call for matrix multiplication?', label: 'BLAS matrix mult' },
  { id: 8, query: 'Where is the singular value decomposition (SVD) implemented?', label: 'SVD' },
  { id: 9, query: 'What would be affected if I change routine dgetrf?', label: 'Impact dgetrf' },
  { id: 10, query: 'Explain what the dsyev subroutine does and where it is defined.', label: 'dsyev' },
];

// Pricing per 1M tokens (input, output). Source: https://ai.google.dev/gemini-api/docs/pricing
const PRICING = {
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.5-flash': { input: 0.30, output: 2.50 },
  'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-1.5-pro-002': { input: 1.25, output: 5.00 },
};

const TOOL_DECLARATIONS = [
  {
    name: 'search',
    description: 'Hybrid search over the codebase (BM25 + semantic). Returns matching symbols/processes with context.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language or keyword search query' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
    },
  },
  {
    name: 'query',
    description: 'Natural language query over the graph. Returns processes and symbols with optional content.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The user question or task' },
        limit: { type: 'number', description: 'Max results' },
        include_content: { type: 'boolean', description: 'Include code snippets' },
      },
    },
  },
  {
    name: 'cypher',
    description: 'Run a Cypher query against the code graph. Use for dependencies, call graphs, validation.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Cypher query string' },
      },
    },
  },
  {
    name: 'context',
    description: 'Get detailed context for a symbol (by name, uid, or file_path).',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Symbol name' },
        file_path: { type: 'string', description: 'File path' },
        include_content: { type: 'boolean', description: 'Include code' },
      },
    },
  },
  {
    name: 'impact',
    description: 'Impact analysis: what is affected if the given target (symbol/file) is changed.',
    parameters: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Symbol name or file path' },
        direction: { type: 'string', enum: ['downstream', 'upstream', 'both'], description: 'Direction of impact' },
      },
    },
  },
  {
    name: 'read',
    description: 'Read raw file content by path. Use after search/query to see full source.',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path relative to repo root' },
      },
    },
  },
];

const SYSTEM_INSTRUCTION = `You are Nexus, a Code Analysis Agent. Answer the user's question about the codebase using the tools.
- Use search or query first, then read/context for details. Use cypher to validate dependencies.
- Cite sources with [[file:line]]. Be concise; end with a TL;DR.`;

async function callBackend(path, method = 'POST', body = null, query = null) {
  const url = new URL(path, BACKEND_URL.replace(/\/$/, '') + '/');
  if (query) Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString(), {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 2000) };
  }
  if (!res.ok) {
    return { error: `HTTP ${res.status}`, ...data };
  }
  return data;
}

async function runTool(name, args) {
  if (name === 'search') {
    return callBackend('/api/search', 'POST', { query: args.query || '', limit: args.limit ?? 10, repo: REPO });
  }
  if (name === 'query') {
    return callBackend('/api/tools/query', 'POST', {
      query: args.query || '',
      repo: REPO,
      limit: args.limit ?? 5,
      include_content: args.include_content ?? true,
    });
  }
  if (name === 'cypher') {
    return callBackend('/api/tools/cypher', 'POST', { query: args.query || '', repo: REPO });
  }
  if (name === 'context') {
    return callBackend('/api/tools/context', 'POST', {
      name: args.name,
      file_path: args.file_path,
      repo: REPO,
      include_content: args.include_content !== false,
    });
  }
  if (name === 'impact') {
    return callBackend('/api/tools/impact', 'POST', {
      target: args.target || '',
      direction: args.direction || 'downstream',
      repo: REPO,
    });
  }
  if (name === 'read') {
    return callBackend('/api/file', 'GET', null, { path: args.path || '' });
  }
  return { error: `Unknown tool: ${name}` };
}

function buildContents(messages) {
  return messages.map((m) => {
    if (m.role === 'user') {
      return { role: 'user', parts: [{ text: m.content }] };
    }
    if (m.role === 'model') {
      const parts = [];
      if (m.text) parts.push({ text: m.text });
      for (const fc of m.functionCalls || (m.functionCall ? [m.functionCall] : [])) {
        parts.push({
          functionCall: {
            name: fc.name,
            args: fc.args || {},
          },
        });
      }
      return { role: 'model', parts };
    }
    if (m.role === 'user-tool') {
      return {
        role: 'user',
        parts: m.parts.map((p) => ({
          functionResponse: { name: p.name, response: p.response },
        })),
      };
    }
    return { role: 'user', parts: [{ text: m.content || '' }] };
  });
}

async function generateContent(contents, usageAccumulator) {
  if (DELAY_BETWEEN_TURNS_MS > 0) {
    await new Promise((r) => setTimeout(r, DELAY_BETWEEN_TURNS_MS));
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents,
    tools: [{ functionDeclarations: TOOL_DECLARATIONS }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'text/plain',
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.usageMetadata) {
    usageAccumulator.promptTokens += data.usageMetadata.promptTokenCount || 0;
    usageAccumulator.completionTokens += data.usageMetadata.candidatesTokenCount || data.usageMetadata.completionTokenCount || 0;
    usageAccumulator.totalTokenCount += data.usageMetadata.totalTokenCount || 0;
  }
  if (!res.ok) {
    const err = data.error || { message: res.statusText };
    if (res.status === 429) {
      const retryMs = parseInt(process.env.RETRY_AFTER_429_MS || '15000', 10) || 15000;
      throw new Error(`Rate limited (429). Wait ${retryMs / 1000}s and retry, or set DELAY_BETWEEN_TURNS_MS=2000.`);
    }
    throw new Error(err.message || JSON.stringify(err));
  }
  const candidate = data.candidates?.[0];
  if (!candidate) throw new Error('No candidate in response');
  const content = candidate.content;
  if (!content?.parts) return { text: '', functionCalls: [] };
  let text = '';
  const functionCalls = [];
  for (const part of content.parts) {
    if (part.text) text += part.text;
    if (part.functionCall) {
      functionCalls.push({
        name: part.functionCall.name,
        args: typeof part.functionCall.args === 'string' ? JSON.parse(part.functionCall.args || '{}') : (part.functionCall.args || {}),
      });
    }
  }
  return { text, functionCalls };
}

const MAX_TURNS = 15;

async function runOneQuery(userQuery, usageAccumulator) {
  const messages = [{ role: 'user', content: userQuery }];
  let lastText = '';
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const contents = buildContents(messages);
    const { text, functionCalls } = await generateContent(contents, usageAccumulator);
    lastText = text;
    if (!functionCalls.length) break;
    const modelMsg = { role: 'model', content: text, text, functionCalls };
    messages.push(modelMsg);
    const parts = [];
    for (const fc of functionCalls) {
      let result;
      try {
        result = await runTool(fc.name, fc.args);
      } catch (e) {
        result = { error: e.message };
      }
      parts.push({
        name: fc.name,
        response: typeof result === 'object' ? result : { result: String(result).slice(0, 8000) },
      });
    }
    messages.push({ role: 'user-tool', content: '', parts });
  }
  return lastText;
}

async function main() {
  const outIdx = process.argv.indexOf('--output');
  const outputPath = outIdx >= 0 && process.argv[outIdx + 1] ? process.argv[outIdx + 1] : null;
  const queriesArg = process.argv.indexOf('--queries');
  const limitQueries = queriesArg >= 0 ? parseInt(process.argv[queriesArg + 1], 10) : null;
  const useScenarios = process.argv.includes('--scenarios');
  const queryList = useScenarios
    ? SCENARIOS.map((s) => ({ id: String(s.id), query: s.query, feature: s.label, expectedToFail: false }))
    : limitQueries
      ? QUERIES.slice(0, limitQueries)
      : QUERIES;
  const includeContentInReport = useScenarios;

  if (!GEMINI_API_KEY) {
    console.error('Set GEMINI_API_KEY or GOOGLE_API_KEY');
    process.exit(1);
  }

  console.log(`Backend: ${BACKEND_URL}  Repo: ${REPO}  Model: ${MODEL}`);
  if (useScenarios) console.log('Mode: testing scenarios (10 queries from docs/testing-scenarios.md)');
  if (DELAY_BETWEEN_TURNS_MS > 0) console.log(`Delay: ${DELAY_BETWEEN_TURNS_MS}ms before each LLM turn`);
  if (DELAY_BETWEEN_QUERIES_MS > 0) console.log(`Delay: ${DELAY_BETWEEN_QUERIES_MS}ms between queries`);
  console.log(`Queries: ${queryList.length}\n`);

  const usageAccumulator = { promptTokens: 0, completionTokens: 0, totalTokenCount: 0 };
  const results = [];
  for (let i = 0; i < queryList.length; i++) {
    const q = queryList[i];
    process.stdout.write(`  [${i + 1}/${queryList.length}] ${q.query.slice(0, 45)}... `);
    try {
      const content = await runOneQuery(q.query, usageAccumulator);
      results.push({
        id: q.id,
        query: q.query,
        feature: q.feature,
        expectedToFail: q.expectedToFail,
        contentLength: content?.length ?? 0,
        ...(includeContentInReport && { content: content ?? '' }),
        error: null,
      });
      console.log('OK');
    } catch (e) {
      results.push({
        id: q.id,
        query: q.query,
        feature: q.feature,
        expectedToFail: q.expectedToFail,
        contentLength: 0,
        ...(includeContentInReport && { content: '' }),
        error: e.message,
      });
      console.log('ERR:', e.message.slice(0, 60));
    }
    if (DELAY_BETWEEN_QUERIES_MS > 0 && i < queryList.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_QUERIES_MS));
    }
  }

  const { promptTokens, completionTokens, totalTokenCount } = usageAccumulator;
  const price = PRICING[MODEL] || PRICING['gemini-2.0-flash'];
  const costInput = (promptTokens / 1e6) * price.input;
  const costOutput = (completionTokens / 1e6) * price.output;
  const costTotal = costInput + costOutput;

  console.log('\n--- Token usage ---');
  console.log(`  Prompt tokens:     ${promptTokens.toLocaleString()}`);
  console.log(`  Completion tokens: ${completionTokens.toLocaleString()}`);
  console.log(`  Total:             ${totalTokenCount.toLocaleString()}`);
  console.log('\n--- Estimated cost ---');
  console.log(`  Model: ${MODEL}`);
  console.log(`  Input:  $${price.input}/1M → $${costInput.toFixed(4)}`);
  console.log(`  Output: $${price.output}/1M → $${costOutput.toFixed(4)}`);
  console.log(`  Total:  $${costTotal.toFixed(4)}`);

  if (outputPath) {
    const fs = await import('fs');
    const report = {
      ranAt: new Date().toISOString(),
      backendUrl: BACKEND_URL,
      repo: REPO,
      model: MODEL,
      ...(useScenarios && { scenarios: true, note: '10 queries from docs/testing-scenarios.md; use results[].content to fill Outcomes table' }),
      usage: {
        promptTokens,
        completionTokens,
        totalTokenCount,
        costInput,
        costOutput,
        costTotal,
        pricingPer1M: price,
      },
      queriesRun: queryList.length,
      results,
    };
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\nWrote ${outputPath}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
