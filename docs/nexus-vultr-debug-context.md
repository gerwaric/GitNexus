# GitNexus on Vultr — context for next session

Use this file when continuing debugging or adding features for the **Vultr deployment** of GitNexus (backend + gitnexus-web).

## Current state

- **Deployment:** GitNexus backend + gitnexus-web runs on a Vultr VPS (Ubuntu 22.04).
- **Setup:** `scripts/vultr-setup-server.sh` installs Node 20, clones repo, builds both projects, runs under systemd as `gitnexus` on port **8080**.
- **Single process:** One Node server serves both the static web UI and the API (`/api/*`) on the same port (8080).
- **Site:** The web app is reachable at `http://YOUR_VPS_IP:8080`. User connects to “local” server by entering `http://YOUR_VPS_IP:8080` in the Server field (same origin = same port).
- **Fork:** Deployed from `gerwaric/GitNexus` (main branch).

## Fixes already applied (this session)

1. **Nexus AI backend mode** — When graph is loaded from backend, use `initializeBackendAgent` and pass backend context from `handleServerConnect` / `switchRepo` so “Initializing AI agent” and “Database not ready” go away and repo switch uses correct repo.
2. **Backend static serving** — `GITNEXUS_WEB_ROOT` lets the server serve the built gitnexus-web; CORS allows any origin when `servingOwnWeb` so same-host asset requests don’t get 500.
3. **Vultr setup script** — Swap + `NODE_OPTIONS=--max-old-space-size=2048` for web build; systemd unit; service user `gitnexus`.
4. **Git “dubious ownership”** — Pull/rebuild as `gitnexus`:  
   `sudo -u gitnexus git -C /opt/gitnexus pull --ff-only` then  
   `sudo -u gitnexus bash -c 'cd /opt/gitnexus/gitnexus && npm run build'` then  
   `sudo systemctl restart gitnexus`.

## Key paths (on VPS)

| What              | Path |
|-------------------|------|
| App root          | `/opt/gitnexus` |
| Backend (run dir) | `/opt/gitnexus/gitnexus` |
| Web build output  | `/opt/gitnexus/gitnexus-web/dist` |
| systemd unit      | `/etc/systemd/system/gitnexus.service` |
| Env (web root)    | `GITNEXUS_WEB_ROOT=/opt/gitnexus/gitnexus-web/dist` |

## Useful commands (VPS)

```bash
# Status and logs
sudo systemctl status gitnexus
journalctl -u gitnexus -f -n 100

# Update app (pull, rebuild backend, restart)
sudo -u gitnexus git -C /opt/gitnexus pull --ff-only
sudo -u gitnexus bash -c 'cd /opt/gitnexus/gitnexus && npm run build'
sudo systemctl restart gitnexus
```

## What to do in the new session

1. **Paste the exact debugging errors** you’re seeing (browser console, `journalctl`, or UI behavior).
2. **Say where** they appear (e.g. “when I connect to server”, “when I open Nexus AI”, “when I run Cypher”).
3. If it’s backend-related, include the last 30–50 lines of `journalctl -u gitnexus --no-pager` after reproducing the error.

## "Server returned 404: Not Found" when connecting

This usually means **no repository is indexed** on the server. The setup script does **not** run `gitnexus analyze`. Fix:

1. **SSH into the VPS** and index the repo:

   ```bash
   sudo -u gitnexus env HOME=/var/lib/gitnexus bash -c \
     'cd /opt/gitnexus && node /opt/gitnexus/gitnexus/dist/cli/index.js analyze'
   ```

   The registered repo name will be the **directory name** (e.g. `GitNexus` for `/opt/gitnexus`).

2. No restart needed; the server reads the registry on each request.

3. In the web app use server address **http://YOUR_VPS_IP:8080**. The app fetches `/api/repos` first and uses the first indexed repo.

## Indexing another repo (e.g. LAPACK) on the VPS

To index a different repo (e.g. [Reference-LAPACK/lapack](https://github.com/Reference-LAPACK/lapack)) so it appears in the web app:

1. **Clone the repo** under `/opt` (or anywhere the `gitnexus` user can read). Use the directory name you want as the “repo name” in GitNexus (e.g. `lapack`):

   ```bash
   sudo git clone --depth 1 https://github.com/Reference-LAPACK/lapack.git /opt/lapack
   sudo chown -R gitnexus:gitnexus /opt/lapack
   ```

2. **Run `gitnexus analyze` as the service user** so the registry goes into the same `~/.gitnexus` the server uses. The setup script sets `HOME=/var/lib/gitnexus` for the service, so use that when running the CLI:

   ```bash
   sudo -u gitnexus env HOME=/var/lib/gitnexus bash -c \
     'cd /opt/lapack && node /opt/gitnexus/gitnexus/dist/cli/index.js analyze'
   ```

   (If you already ran the updated setup script, the service has `HOME=/var/lib/gitnexus`. If your server was set up before that change, create the dir first: `sudo mkdir -p /var/lib/gitnexus && sudo chown gitnexus:gitnexus /var/lib/gitnexus`, and add `Environment=HOME=/var/lib/gitnexus` to the `[Service]` section of `/etc/systemd/system/gitnexus.service`, then `sudo systemctl daemon-reload && sudo systemctl restart gitnexus` so the server uses the same registry.)

3. No restart needed. Open the web app, connect to `http://YOUR_VPS_IP:8080`; the app will list and use the first repo (e.g. `lapack` if it’s the only one, or pick from the header dropdown if you have multiple).

**Repo root:** Use a path like `/opt/lapack` so the repo name in the UI is `lapack`. The backend uses the directory basename as the registered name.

## Relevant code areas

- **Backend CORS / static serve:** `gitnexus/src/server/api.ts` (CORS when `GITNEXUS_WEB_ROOT`, `express.static`, SPA fallback).
- **Nexus AI backend init:** `gitnexus-web/src/hooks/useAppState.tsx` (`initializeAgent` with `backendContextOverride`, `serverBaseUrl`/`currentServerRepoName`).
- **Server connect / repo switch:** `gitnexus-web/src/App.tsx` (`handleServerConnect(result, serverUrl)`), `useAppState` `switchRepo`.
- **Vultr setup:** `scripts/vultr-setup-server.sh`, `docs/vultr-deploy.md`.

## Repo and deploy

- **Remote:** `gerwaric/GitNexus` (GitHub).
- **Fly.io:** Attempted earlier; native addon / platform issues led to moving to Vultr. Root `Dockerfile` and `fly.toml` remain for reference.
