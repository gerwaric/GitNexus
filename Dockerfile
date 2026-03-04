# GitNexus backend + gitnexus-web (single Fly app)
# Build from repo root: docker build -f Dockerfile .
# Deploy: fly deploy (or fly deploy -a lapack-lens)
# Force linux/amd64 so native addons (tree-sitter, kuzu, etc.) match Fly's VMs.
FROM --platform=linux/amd64 node:20-bookworm AS backend
WORKDIR /app/gitnexus
# Copy everything first so postinstall (patch-tree-sitter-swift.cjs) and npm run build have full tree
COPY gitnexus ./
# Skip onnxruntime-node GPU download (pulled in by MCP SDK). Use npm install for lockfile tolerance.
ENV ONNXRUNTIME_NODE_INSTALL=skip
RUN npm install
RUN npm run build

FROM --platform=linux/amd64 node:20-bookworm AS web
WORKDIR /app/gitnexus-web
COPY gitnexus-web/package.json gitnexus-web/package-lock.json ./
# Avoid onnxruntime-node downloading GPU binary (large, flaky in CI); CPU is enough for Vite build
ENV ONNXRUNTIME_NODE_INSTALL=skip
RUN npm ci
COPY gitnexus-web ./
RUN npm run build

# Run in the backend stage so native addons (tree-sitter, kuzu) run where they were built.
# Copy only the web static files into backend's tree; keep backend's node_modules in place.
FROM backend
ENV NODE_ENV=production
WORKDIR /app/gitnexus

COPY --from=web /app/gitnexus-web/dist /app/web/dist

ENV GITNEXUS_WEB_ROOT=/app/web/dist
ENV HOST=0.0.0.0
ENV PORT=8080
EXPOSE 8080

# Fly sets PORT at runtime. Use shell so we can substitute it and listen on 0.0.0.0.
CMD ["sh", "-c", "exec node dist/cli/index.js serve --host 0.0.0.0 --port ${PORT:-8080}"]
