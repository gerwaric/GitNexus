# Debug: GitHub clone returns HTML instead of git protocol

## What you see

When you pick **GitHub URL**, paste a public repo URL, and start the clone, the UI shows:

```text
Remote did not reply using the "smart" HTTP protocol. Expected "001e# service=git-upload-pack" but received: <!doctype html> <html lang="en"> ... <title>GitNexus</title> ...
```

So the **first git request** (e.g. `info/refs?service=git-upload-pack`) is getting the **GitNexus app’s index.html** instead of the git protocol response from GitHub.

---

## Root cause (how the flow works)

1. **Git clone** is done in the browser with **isomorphic-git** in `gitnexus-web/src/services/git-clone.ts`.
2. To avoid CORS, all git HTTP requests go through a **proxy**. The HTTP client is built by `createProxiedHttp()`:
   - **On localhost** (`window.location.hostname === 'localhost'`): proxy URL is **`https://gitnexus.vercel.app/api/proxy`** (hosted).
   - **Otherwise (production)**: proxy URL is **`/api/proxy`** (same origin).
3. So the browser requests e.g.  
   `GET <proxyBase>?url=https://github.com/owner/repo.git/info/refs?service=git-upload-pack`  
   and the proxy is supposed to fetch that URL from GitHub and return the response.
4. The **proxy implementation** lives in **`gitnexus-web/api/proxy.ts`** and is a **Vercel serverless function**. It only runs when the app is deployed on **Vercel** (or a host that runs that serverless API).

If the app is **not** served from Vercel (or the proxy route isn’t deployed), then **`/api/proxy` does not exist**. Many static/SPA hosts then **fall back to `index.html`** for unknown paths. So the browser asks for `/api/proxy?url=...`, gets the GitNexus SPA’s HTML, and isomorphic-git fails with the “Expected … git-upload-pack … but received: <!doctype html>…” error.

---

## Hypotheses

| # | Hypothesis | How it matches the error |
|---|------------|---------------------------|
| **H1** | App is served from a host that **does not run** `/api/proxy` (e.g. static hosting, or different backend). | Requests to `/api/proxy?url=...` hit the SPA fallback and return `index.html`. |
| **H2** | App is served under a **subpath** (e.g. `https://example.com/gitnexus/`) but the code uses `/api/proxy`. | Browser requests `https://example.com/api/proxy`, not `https://example.com/gitnexus/api/proxy`; the former may 404 or serve the main site’s HTML. |
| **H3** | You’re on **localhost** but the **hosted proxy** (gitnexus.vercel.app) is down or returns an error page. | Less likely, because the snippet you see is the **app’s** `<title>GitNexus</title>`, not Vercel’s error page. |
| **H4** | **CORS or redirect**: something redirects the proxy request to the app root. | Possible if the host rewrites or redirects `/api/*` to `/`. |
| **H5** | App is opened via the **GitNexus backend** (e.g. `GITNEXUS_WEB_ROOT` at `http://127.0.0.1:4747`). | Backend has **no** `/api/proxy` route; it only serves the SPA with a catch-all, so `/api/proxy` returns `index.html`. Also, hostname is `127.0.0.1`, not `localhost`, so the code uses `/api/proxy` (same origin) instead of the hosted Vercel proxy. |

---

## Concrete steps to confirm or reject

### 1. Confirm where you’re opening the app

- Note the **exact URL** in the address bar (e.g. `http://localhost:5173`, `https://gitnexus.vercel.app`, `https://something.fly.dev`, etc.).

**Interpretation:**

- **localhost** → code uses `https://gitnexus.vercel.app/api/proxy`. If you still get GitNexus HTML, then either the request is not actually going to Vercel (e.g. typo, env override) or something else is wrong (see step 3).
- **Vercel (e.g. gitnexus.vercel.app)** → `/api/proxy` should be the serverless function. If you get HTML, the function may be missing or misconfigured (see step 2).
- **Any other host** → **H1** is very likely: that host probably doesn’t serve `/api/proxy`, so you get SPA fallback (HTML).
- **Backend serving the web app** (e.g. `http://127.0.0.1:4747` with `GITNEXUS_WEB_ROOT`) → **H5**: hostname is not `localhost`, so the app uses `/api/proxy` on the backend, which has no such route → you get index.html.

---

### 2. Check if `/api/proxy` exists on your host

In the **same origin** as the app (same tab or a new tab):

- **If on localhost (Vite):**  
  Open:  
  `http://localhost:5173/api/proxy?url=https://github.com/github/gitignore/info/refs?service=git-upload-pack`  
  (Replace port if yours is different.)

- **If on production:**  
  Open:  
  `https://<your-app-origin>/api/proxy?url=https://github.com/github/gitignore/info/refs?service=git-upload-pack`

**Interpretation:**

- **You see plain text** starting with something like `001e# service=git-upload-pack` → proxy works; the bug is elsewhere (e.g. how the URL is built or passed).
- **You see GitNexus HTML** (e.g. `<!doctype html>`, `<title>GitNexus</title>`) → **H1** (or H2/H4): this host does not serve the proxy; you’re getting SPA fallback or wrong path.
- **You see 403/404/5xx** → proxy route missing or failing; check deployment config (e.g. Vercel project, `api/` folder, serverless entry for `api/proxy`).

---

### 3. (If on localhost) Confirm the proxy URL the app uses

- Open DevTools → **Network** tab.
- Trigger the GitHub URL clone again.
- Find the **first** request that has `git-upload-pack` or `info/refs` in the URL (or the first request to `proxy`).

Check:

- **Request URL**:  
  - If it’s `https://gitnexus.vercel.app/api/proxy?url=...` → hosted proxy is used; if the response is still GitNexus HTML, then either the hosted proxy is returning that (unlikely) or there’s a redirect/cache issue.  
  - If it’s `http://localhost:5173/api/proxy?url=...` → then “production” path is being used on localhost (e.g. hostname check is wrong), and your Vite dev server doesn’t have `/api/proxy`, so you get index.html → **explains the error**.

---

### 4. (If deployed) Check base path

- If the app is deployed under a subpath (e.g. `https://example.com/gitnexus/`), then `/api/proxy` resolves to `https://example.com/api/proxy`, **not** under `/gitnexus/`. So the proxy is never hit → **H2**.

**Fix direction:** use a base path when building (e.g. Vite `base`) and ensure the proxy URL is **relative to that base** (e.g. `<base>/api/proxy`) or use an absolute URL to a known proxy.

---

## Summary

| If this is true | Conclusion |
|-----------------|------------|
| App is on a host that doesn’t run `api/proxy.ts` | **H1**: Use a host that supports the proxy (e.g. Vercel) or deploy the proxy elsewhere and point the app to it (e.g. env var for proxy URL). |
| App is under a subpath and proxy is requested at site root | **H2**: Use a base path and request the proxy at `<base>/api/proxy`, or use an absolute proxy URL. |
| On localhost but request goes to `localhost/api/proxy` | Hostname detection is wrong; requests hit the SPA and return HTML. Fix: ensure localhost uses the hosted proxy URL (or run a local proxy that forwards to GitHub). |
| App opened at `127.0.0.1:4747` (backend with GITNEXUS_WEB_ROOT) | **H5**: Use the hosted proxy on non-localhost origins: e.g. treat `127.0.0.1` like localhost in `createProxiedHttp`, or add a `/api/proxy` handler to the backend that forwards to GitHub (or to the Vercel proxy). |

---

## Next steps (code-side)

1. **Configurable proxy URL**  
   Add an env var (e.g. `VITE_GIT_PROXY_URL`) so that in any environment you can point to a working proxy (e.g. `https://gitnexus.vercel.app/api/proxy`) even when the app is not on Vercel.

2. **Optional runtime check**  
   Before starting the clone, `fetch(proxyUrl + '?url=' + encodeURIComponent(testGitUrl))` and check that the response is not HTML (e.g. check `Content-Type` or first bytes). If it’s HTML, show a clear message: “Git proxy is not available at …” and suggest checking deployment or using the env override.

3. **Base path**  
   If you deploy under a subpath, set Vite `base` and use it when building the proxy URL (e.g. `base + 'api/proxy'`) so the request goes to the same host and path where the proxy is actually served.

4. **Backend-served UI (H5)**  
   If you run the app via the GitNexus backend (`GITNEXUS_WEB_ROOT`), either:
   - Treat `127.0.0.1` like localhost in `createProxiedHttp` so the hosted Vercel proxy is used, or
   - Add a `/api/proxy` route to the backend that forwards to `https://gitnexus.vercel.app/api/proxy` or to GitHub (same logic as `gitnexus-web/api/proxy.ts`).
