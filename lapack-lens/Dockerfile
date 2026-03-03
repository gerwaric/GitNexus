# Lapack Lens — single image: GitNexus + LAPACK index + Streamlit
# Build from repo root: docker build -f lapack-lens/Dockerfile .
# Uses Node 20 for GitNexus and Python 3 for Streamlit.

FROM node:20-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    git \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV HOME=/app
WORKDIR /app

# Clone Reference-LAPACK (shallow for faster build)
RUN git clone --depth 1 https://github.com/Reference-LAPACK/lapack.git /app/lapack

# Build GitNexus and index LAPACK (registry written to $HOME/.gitnexus)
COPY gitnexus /app/gitnexus
RUN cd /app/gitnexus && npm ci && npm run build
RUN cd /app/lapack && node /app/gitnexus/dist/cli/index.js analyze

# Streamlit app and Python deps
COPY lapack-lens/app /app/app
RUN pip3 install --break-system-packages --no-cache-dir -r /app/app/requirements.txt

# Entrypoint: start GitNexus server, wait for health, then run Streamlit
COPY lapack-lens/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 8501
ENTRYPOINT ["/app/entrypoint.sh"]
