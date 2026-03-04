# Cypher "Database not ready" — evidence-gathering options

When you select a repo from the backend (e.g. fortran-test-repo), the graph is loaded via HTTP into React state only. The Cypher Query FAB uses the **worker**'s `isDatabaseReady()` and `runQuery()`, which only check/use **in-browser KuzuDB**. That DB is never populated when the graph comes from the server, so you always see "Database not ready. Please wait for loading to complete."

Below are **concrete ways to collect hard evidence** (no guessing) so you can confirm the cause and then fix it.

---

## Option 1: Backend API (curl) — prove the server can run Cypher

**Goal:** Confirm the GitNexus server can execute Cypher for the selected repo.

**Steps:**

```bash
# From your machine (server must be running)
curl -s -X POST http://localhost:4747/api/query \
  -H "Content-Type: application/json" \
  -d '{"cypher":"MATCH (n) RETURN n.id AS id LIMIT 5","repo":"fortran-test-repo"}'
```

**Interpretation:**

- If you get JSON with a `result` array (or array of rows): backend Cypher works; the problem is the **frontend never calling this** when a backend repo is selected.
- If you get an error (4xx/5xx or `error` in body): note the message; the issue may be server-side or wrong `repo` name.

---

## Option 2: Frontend — log what the Cypher FAB uses

**Goal:** See the exact values at the moment you click Run: whether we're in "backend repo" mode and what `isDatabaseReady()` returns.

**Where:** `gitnexus-web/src/components/QueryFAB.tsx`, inside `handleRunQuery`, right before the `isDatabaseReady` check.

**Add:**

```ts
// Temporary diagnostic — remove after debugging
const ready = await isDatabaseReady();
console.log('[Cypher FAB] isDatabaseReady:', ready, 'graph:', !!graph, 'graph nodes:', graph?.nodes?.length);
if (!ready) {
  setError('Database not ready. Please wait for loading to complete.');
  return;
}
```

**Interpretation:**

- If you see `isDatabaseReady: false` with a non-null `graph` and `graph nodes: 1` (or similar): the UI has a graph from the backend but the worker’s DB is not considered ready — supports the “Cypher path doesn’t use backend” hypothesis.

---

## Option 3: Frontend — log backend vs in-browser source

**Goal:** Know whether the current graph came from the server or from the in-browser pipeline (ZIP / GitHub).

**Where:** `gitnexus-web/src/hooks/useAppState.tsx`. The app has `serverBaseUrl` (set when you connect to a server) but no single “graph source” flag. You can log:

- In the same place as Option 2, or in a `useEffect` that runs when `graph` or `serverBaseUrl` changes:
  - `serverBaseUrl` (if set, current session used “server” at some point).
  - Whether the graph was set by `switchRepo` / `handleServerConnect` (server) vs `handleFileSelect` / `handleGitClone` (in-browser).

**Minimal addition:** In `QueryFAB.tsx`, get `serverBaseUrl` from `useAppState()` and log it next to the Option 2 line:

```ts
const { ..., serverBaseUrl } = useAppState();
// in handleRunQuery:
console.log('[Cypher FAB] serverBaseUrl:', serverBaseUrl, 'isDatabaseReady:', ready);
```

**Interpretation:**

- If `serverBaseUrl` is set and `isDatabaseReady` is false: we’re in “backend repo” mode but the FAB is still using the worker’s readiness/query path.

---

## Option 4: Worker — log inside the ingestion worker

**Goal:** Confirm that when you click Run, the worker’s `isReady()` is false and that `runQuery` is never invoked (because the FAB returns early).

**Where:** `gitnexus-web/src/workers/ingestion.worker.ts`.

**In `isReady()` (around line 226):**

```ts
async isReady(): Promise<boolean> {
  try {
    const kuzu = await getKuzuAdapter();
    const ready = kuzu.isKuzuReady();
    if (import.meta.env.DEV) console.log('[ingestion.worker] isReady:', ready);
    return ready;
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[ingestion.worker] isReady error', e);
    return false;
  }
}
```

**In `runQuery()` (around line 215):**

```ts
async runQuery(cypher: string): Promise<any[]> {
  if (import.meta.env.DEV) console.log('[ingestion.worker] runQuery called', cypher.slice(0, 50));
  const kuzu = await getKuzuAdapter();
  // ...
}
```

**Interpretation:**

- With a backend-loaded repo, you should see `[ingestion.worker] isReady: false` when you click Run, and **no** `runQuery called` log (because the FAB returns early). That proves the FAB is gating on worker readiness and never sending Cypher to the backend.

---

## Option 5: Network tab — see if `/api/query` is ever called

**Goal:** Confirm with browser tools that when you use the Cypher FAB with a backend repo, the frontend does **not** call the backend.

**Steps:**

1. Open DevTools → Network.
2. Filter by “query” or “Fetch/XHR”.
3. Select fortran-test-repo (or any backend repo), open Cypher FAB, enter a query, click Run.

**Interpretation:**

- If there is **no** request to `http://localhost:4747/api/query` (or your backend URL): the Cypher path is not using the backend; it’s only using the worker (which then reports “not ready”). This is strong evidence that the FAB needs to call `runCypherQuery(repo, cypher)` from `services/backend.ts` when a backend repo is active.

---

## Summary

| Option | What it proves |
|--------|-----------------|
| 1 – curl | Backend can run Cypher for `fortran-test-repo`. |
| 2 – log in FAB | `isDatabaseReady` is false even when `graph` exists. |
| 3 – log serverBaseUrl | Current session is in “backend” mode while FAB still uses worker. |
| 4 – worker logs | Worker `isReady()` is false; `runQuery` is never called from FAB in this scenario. |
| 5 – Network | No request to `/api/query` when running Cypher with a backend repo. |

**Recommended order:** Run **Option 1** first (backend works). Then **Option 5** (no `/api/query` from FAB). Then **Option 2** (and optionally 3 and 4) to see exact state and worker behavior. That gives you hard evidence that the bug is “Cypher FAB always uses worker; when graph is from backend, worker DB is not loaded, so we should use backend `runCypherQuery` and a backend-based readiness check instead.”

---

## Findings (observed evidence)

**Option 1 — Backend:** Confirmed.
`curl -X POST http://localhost:4747/api/query` with `repo=fortran-test-repo` returns `{"result":[{"id":"File:hello.f90"}]}`. The server can run Cypher for the selected repo.

**Repo switch — Console:** When selecting a repo from the Header dropdown:
- `Embeddings auto-start failed: Error: Database not ready. Please load a repository first.` at `startEmbeddingPipeline` (ingestion.worker.ts), called from `switchRepo` then `startEmbeddings()` in useAppState (after loading graph).
- So after switching to a backend repo, the app loads the graph via HTTP then tries to start the **worker** embedding pipeline; the worker's KuzuDB was never loaded, so "Database not ready". Same root cause as the Cypher FAB: backend repo path never touches the worker's DB.

**Repo switch — Network:** When selecting a repo, only these backend calls appear:
- `GET /api/repo?repo=fortran-test-repo`
- `GET /api/graph?repo=fortran-test-repo`
- (plus blob: worker-related requests)
- **No `POST /api/query`** when selecting a repo or when running a Cypher from the FAB.

**Deductions:**
1. Backend Cypher works; the FAB simply never calls it.
2. For a backend repo, the graph is loaded only via `/api/repo` and `/api/graph`; the worker's KuzuDB is never populated.
3. Any feature that uses the worker's `runQuery` / `isDatabaseReady` (Cypher FAB, embeddings auto-start) will fail for backend repos until we either (a) route those features to the backend when `serverBaseUrl` + selected repo are set, or (b) load the graph into the worker after fetching from the server (heavier and likely unnecessary).
4. **Fix direction:** When the current session is "backend mode" (e.g. `serverBaseUrl` set and graph came from `switchRepo`), the Cypher FAB should call `runCypherQuery(selectedRepo, cypher)` and treat "ready" as "backend connected and repo selected," instead of using the worker's `isDatabaseReady()` and `runQuery()`.
