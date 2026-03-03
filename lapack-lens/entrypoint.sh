#!/bin/bash
set -e

# Start GitNexus server in background (same HOME so it finds /app/.gitnexus/registry.json)
node /app/gitnexus/dist/cli/index.js serve --host 0.0.0.0 &
SERVER_PID=$!

# Wait for server to be ready
for i in $(seq 1 60); do
  if curl -sf http://127.0.0.1:4747/api/repos > /dev/null; then
    break
  fi
  if ! kill -0 $SERVER_PID 2>/dev/null; then
    echo "GitNexus server exited unexpectedly"
    exit 1
  fi
  sleep 2
done

# Verify we got a response
if ! curl -sf http://127.0.0.1:4747/api/repos > /dev/null; then
  echo "GitNexus server did not become ready in time"
  exit 1
fi

# Run Streamlit (exec so it receives signals)
export GITNEXUS_URL="${GITNEXUS_URL:-http://127.0.0.1:4747}"
exec python3 -m streamlit run app/app.py --server.address=0.0.0.0 --server.port=8501
