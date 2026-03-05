import { useState, useCallback, useEffect } from 'react';
import { Play, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import { LAPACK_TEST_QUERIES, type TestQueryItem } from '../data/lapack-test-queries';

/** Delay between each query to reduce rate-limit (429) risk. Simulates a human pausing to read. */
const DELAY_BETWEEN_QUERIES_MS = 15000;
/** Extra delay after every N queries ("round") to give the API a breather. */
const ROUND_SIZE = 4;
const ROUND_DELAY_MS = 2000;
/** Wait before retrying a request that returned 429. */
const RETRY_AFTER_429_MS = 15000;

export interface EvalResultRow {
  id: string;
  query: string;
  feature: string;
  expectedToFail: boolean;
  content: string;
  latencyMs: number;
  error?: string;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function EvalTestQueriesPanel() {
  const { runQueryForEval, isAgentReady, currentServerRepoName, serverBaseUrl } = useAppState();
  const [evalResults, setEvalResults] = useState<EvalResultRow[]>([]);
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalProgress, setEvalProgress] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const [tabWasBackgrounded, setTabWasBackgrounded] = useState(false);

  useEffect(() => {
    if (!evalRunning) return;
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        setTabWasBackgrounded(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [evalRunning]);

  const handleRunTestQueries = useCallback(async () => {
    if (evalRunning || !isAgentReady) return;
    setEvalRunning(true);
    setEvalResults([]);
    setEvalProgress('0 / 17');
    setTabWasBackgrounded(false);

    const results: EvalResultRow[] = [];
    const total = LAPACK_TEST_QUERIES.length;

    for (let i = 0; i < total; i++) {
      const item: TestQueryItem = LAPACK_TEST_QUERIES[i];
      setEvalProgress(`${i + 1} / ${total}`);

      let result = await runQueryForEval(item.query);
      if (result.error && result.error.includes('429')) {
        setEvalProgress(`${i + 1} / ${total} (rate limited, retrying in ${RETRY_AFTER_429_MS / 1000}s…)`);
        await delay(RETRY_AFTER_429_MS);
        result = await runQueryForEval(item.query);
      }

      results.push({
        ...item,
        content: result.content,
        latencyMs: result.latencyMs,
        error: result.error,
      });
      setEvalResults([...results]);

      if (i < total - 1) {
        await delay(DELAY_BETWEEN_QUERIES_MS);
        // Extra buffer after every N queries to reduce 429s
        if ((i + 1) % ROUND_SIZE === 0) {
          await delay(ROUND_DELAY_MS);
        }
      }
    }

    setEvalProgress('');
    setEvalRunning(false);
  }, [evalRunning, isAgentReady, runQueryForEval]);

  const handleDownloadResults = useCallback(() => {
    if (evalResults.length === 0) return;
    const report = {
      ranAt: new Date().toISOString(),
      ...(currentServerRepoName && { repoName: currentServerRepoName }),
      ...(serverBaseUrl && { backendUrl: serverBaseUrl }),
      results: evalResults,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gitnexus-eval-report.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [evalResults, currentServerRepoName, serverBaseUrl]);

  return (
    <div className="border-t border-border-subtle">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-text-primary hover:bg-hover transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>Test queries</span>
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {!isAgentReady ? (
            <p className="text-xs text-text-muted">
              Configure an LLM provider and connect to a repo to run test queries.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunTestQueries}
                  disabled={evalRunning || !isAgentReady}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-accent text-white hover:bg-accent-dim disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-3 h-3" />
                  Run test queries
                </button>
                <button
                  type="button"
                  onClick={handleDownloadResults}
                  disabled={evalResults.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-elevated border border-border-subtle text-text-primary hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-3 h-3" />
                  Download results
                </button>
              </div>
              {evalRunning && (
                <p className="text-xs text-text-secondary">
                  Running test queries… {evalProgress}
                </p>
              )}
              {evalRunning && (
                <p className="text-xs text-amber-200/90">
                  Keep this tab active to avoid delays. Browsers throttle background tabs.
                </p>
              )}
              {evalRunning && tabWasBackgrounded && (
                <p className="text-xs text-accent">
                  Tab was in background — run may resume now.
                </p>
              )}
              {evalResults.length > 0 && !evalRunning && (
                <ul className="max-h-32 overflow-y-auto scrollbar-thin space-y-1 text-xs">
                  {evalResults.map((r) => (
                    <li key={r.id} className="flex items-center gap-2 truncate">
                      <span className="text-text-muted shrink-0 w-8">{r.id}</span>
                      <span className="truncate text-text-secondary" title={r.query}>
                        {r.query.slice(0, 40)}…
                      </span>
                      <span className="shrink-0 text-text-muted">
                        {r.error ? '✗' : '✓'} {Math.round(r.latencyMs)}ms
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
