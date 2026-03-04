# Nexus AI sidebar — backend-mode context for troubleshooting

Use this file when debugging the **Nexus AI** (chat) panel when the current graph was **loaded from the GitNexus backend** (Server tab or repo switcher), e.g. "lapack", "fortran-test-repo".

## Symptoms

- At the **bottom** of the Nexus AI panel: text **"Initializing AI agent"** never goes away.
- At the **top** of the panel: red warning banner **"Database not ready. Please load a repository first."**

## What we already fixed (same root cause): Cypher Query FAB

For the **Cypher Query** FAB we had the same class of bug:

- When the user selects a repo from the **backend** (e.g. `fortran-test-repo`), the graph is loaded via **HTTP** into React state only (`/api/repo`, `/api/graph`). The **ingestion worker’s in-browser KuzuDB is never populated** for that repo.
- The Cypher FAB was using the **worker**’s `runQuery()` and `isDatabaseReady()`, which only check/use that in-browser DB, so we always got "Database not ready" and no Cypher ran.

**Fix we applied:** When the session is in "backend mode" (`serverBaseUrl` and `currentServerRepoName` are set), we:

- Treat **"database ready"** as true (backend can run Cypher).
- **Route Cypher** to the backend: `POST {serverBaseUrl}/query` with `{ cypher, repo: currentServerRepoName }` instead of calling the worker’s `runQuery()`.
- **Skip** calling the worker’s `startEmbeddings()` when loading a backend repo (server handles search/embeddings).

Relevant code:

- **State:** `useAppState`: `serverBaseUrl`, `currentServerRepoName`, `setCurrentServerRepoName`. Cleared when loading from ZIP/GitHub; set when connecting via Server tab or when switching repo in the header.
- **Cypher:** `useAppState`: `runQuery()` and `isDatabaseReady()` branch on `serverBaseUrl && currentServerRepoName` and use the backend when true.
- **Doc:** `docs/cypher-database-not-ready-debug.md` (evidence and findings).

## Why Nexus AI likely shows the same errors

The **Nexus AI** (chat) panel almost certainly uses the **same worker-centric path** for agent initialization:

- **Agent init** is done in **useAppState** via **`initializeAgent(overrideProjectName?)`**, which calls the **worker**’s **`initializeAgent(config, projectName)`**.
- In the **ingestion worker** (`gitnexus-web/src/workers/ingestion.worker.ts`), **`initializeAgent`** checks **`kuzu.isKuzuReady()`** and, if false, returns **`{ success: false, error: 'Database not ready. Please load a repository first.' }`**. So when the graph was loaded from the backend, the worker’s KuzuDB is never loaded → init "fails" → red banner shows that error, and the UI can stay in a state where it shows "Initializing AI agent" (or similar) because the agent never becomes ready.

So the **root cause** is the same: **backend-loaded repos never populate the worker’s KuzuDB**, but the **agent init path still uses the worker** and therefore sees "database not ready."

## Worker already has a backend-backed agent path

The ingestion worker exposes **`initializeBackendAgent`**, which uses **HTTP-backed tools** (Cypher, search) instead of the in-browser KuzuDB, so it does **not** require the worker’s DB to be loaded:

- **Signature (conceptually):** `initializeBackendAgent(config, backendUrl, repoName, fileContentsEntries, projectName?)`  
  (file contents are passed as `[string, string][]` because Comlink can’t transfer `Map`.)
- It builds codebase context and tools that call the backend (e.g. `createHttpExecuteQuery(backendUrl, repoName)` for Cypher, `createHttpHybridSearch` for search).

So the **fix** is likely: when **`serverBaseUrl && currentServerRepoName`**, call **`initializeBackendAgent`** (with backend URL, repo name, and file contents) instead of **`initializeAgent`**, and pass a backend base URL that does **not** include the `/api` suffix if the worker’s HTTP helpers expect the base (e.g. `http://localhost:4747`). Check how `createHttpExecuteQuery` etc. build URLs.

## Key files and what to look for

| Area | File | What to check |
|------|------|----------------|
| Nexus AI panel UI | `gitnexus-web/src/components/RightPanel.tsx` | Where "Initializing AI agent" and the red error banner are rendered (e.g. `agentError`, `isAgentReady`, `isAgentInitializing`). |
| Agent init (main thread) | `gitnexus-web/src/hooks/useAppState.tsx` | `initializeAgent(overrideProjectName?)`: currently calls `api.initializeAgent(config, effectiveProjectName)`. Add branching: if `serverBaseUrl && currentServerRepoName`, call worker’s **`initializeBackendAgent`** with backend URL, repo name, and file contents (as entries); otherwise keep current `initializeAgent` call. Ensure `setIsAgentReady(true)` and `setAgentError(null)` when backend init succeeds. |
| Worker agent init | `gitnexus-web/src/workers/ingestion.worker.ts` | **`initializeAgent`**: requires KuzuDB; returns "Database not ready" when `!kuzu.isKuzuReady()`. **`initializeBackendAgent`**: takes `(config, backendUrl, repoName, fileContentsEntries, projectName?)`; uses HTTP for Cypher/search; no KuzuDB needed. Use this when the repo was loaded from the backend. |
| Backend mode state | Same as Cypher fix | `serverBaseUrl`, `currentServerRepoName` in useAppState; set on server connect / repo switch; cleared on ZIP or GitHub load. |

## Backend URL shape

- **App state** stores **`serverBaseUrl`** in **normalized** form **with** `/api` (e.g. `http://localhost:4747/api`), because it’s used for fetchRepos, fetchGraph, etc.
- The worker’s **`createHttpExecuteQuery(backendUrl, repo)`** builds URLs like **`${backendUrl}/api/query`**. So when calling **`initializeBackendAgent`** from the app, pass a **base URL without** `/api` (e.g. `http://localhost:4747`) so the worker can correctly build `/api/query`, `/api/search`, etc. You can derive it as `serverBaseUrl.replace(/\/api\/?$/, '')` when calling the worker.

## Quick checklist for a fix

1. In **useAppState.initializeAgent**: if `serverBaseUrl && currentServerRepoName`, call the worker’s **initializeBackendAgent** with `config`, base URL (no `/api`), `currentServerRepoName`, file contents as `[...fileContents.entries()]`, and project name; otherwise call **initializeAgent** as today.
2. Ensure the worker’s **initializeBackendAgent** is exposed on the worker API (Comlink) and that the app passes the correct backend base URL and repo name.
3. After a successful backend init, set agent ready and clear error (same as for worker init) so the "Initializing AI agent" text and red banner go away.

This should resolve both the stuck "Initializing AI agent" and the "Database not ready" banner when using a backend-loaded repo.
