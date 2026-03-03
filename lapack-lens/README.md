# Lapack Lens

A minimal chat app that answers natural-language questions about the LAPACK codebase using GitNexus and OpenAI. Single Docker container for local testing and Fly.io deployment.

**Live app:** [https://lapack-lens.fly.dev](https://lapack-lens.fly.dev)

- **Design:** [DESIGN.md](./DESIGN.md) — architecture, components, decisions.
- **Implementation:** [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — ordered tasks and checklist.

---

## Run locally with Docker Compose

1. From the **repo root**, create env file and set your OpenAI key:
   ```bash
   cp lapack-lens/.env.example lapack-lens/.env
   # Edit lapack-lens/.env and set OPENAI_API_KEY=sk-...
   ```

2. Build and run (first build clones LAPACK and indexes it — can take 10–30+ minutes):
   ```bash
   docker compose -f lapack-lens/docker-compose.yml up --build
   ```

3. Open **http://localhost:8501** and ask a question about LAPACK (e.g. “Where is matrix multiplication implemented?”).

---

## Run Streamlit only (backend separate)

If the GitNexus server is already running (e.g. `npx gitnexus serve` from the repo root with an indexed repo):

```bash
cd lapack-lens/app
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
export OPENAI_API_KEY=sk-...
export GITNEXUS_URL=http://127.0.0.1:4747  # optional, this is the default
.venv/bin/streamlit run app.py --server.address=0.0.0.0 --server.port=8501
```

Then open http://localhost:8501.

---

## Deploy to Fly.io

**Prereqs:** [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/) and a Fly account (2GB is enough; paid plan for 4GB VM).

1. From the **repo root**, create the app if needed:
   ```bash
   fly apps create lapack-lens
   ```
   (Or `fly launch -a lapack-lens --no-deploy` using the root `fly.toml`.)

2. Set the OpenAI API key secret:
   ```bash
   fly secrets set OPENAI_API_KEY=sk-your-key -a lapack-lens
   ```

3. Deploy (build context is repo root; first build is slow due to LAPACK indexing):
   ```bash
   fly deploy -a lapack-lens
   ```
   Use the root `fly.toml` (repo root); it references `lapack-lens/Dockerfile`.

4. Open `https://lapack-lens.fly.dev` (or the app’s assigned URL) and verify the chat uses the LAPACK index.

---

## Notes

- **Registry path:** The GitNexus index is built at Docker image build time and stored under `$HOME/.gitnexus` in the container; no Fly volume is used.
- **VM size:** Default is 2GB RAM (works on free tier); set to 4GB in `fly.toml` if your Fly plan allows it.
