#!/usr/bin/env bash
# GitNexus server setup for Ubuntu 22.04 (e.g. Vultr VPS)
# Run as root or with sudo. Usage:
#   sudo REPO_URL=https://github.com/YOUR_USER/GitNexus.git ./vultr-setup-server.sh
#   sudo ./vultr-setup-server.sh   # uses default repo
set -e

REPO_URL="${REPO_URL:-https://github.com/gerwaric/GitNexus.git}"
BRANCH="${BRANCH:-main}"
APP_DIR="${APP_DIR:-/opt/gitnexus}"
SERVICE_USER="${SERVICE_USER:-gitnexus}"

echo "[1/6] Installing Node.js 20 and git..."
apt-get update -qq
apt-get install -y ca-certificates curl gnupg git

mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
apt-get update -qq
apt-get install -y nodejs

echo "[2/6] Cloning repository..."
if [[ -d "$APP_DIR" ]]; then
  (cd "$APP_DIR" && git fetch origin && git checkout "$BRANCH" && git pull --ff-only)
else
  git clone --depth 1 -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

echo "[3/6] Building backend (gitnexus)..."
export ONNXRUNTIME_NODE_INSTALL=skip
cd "$APP_DIR/gitnexus"
npm install
npm run build

echo "[4/6] Building web (gitnexus-web)..."
cd "$APP_DIR/gitnexus-web"
npm ci
npm run build

echo "[5/6] Creating service user and systemd unit..."
id "$SERVICE_USER" 2>/dev/null || useradd -r -s /bin/false "$SERVICE_USER"
chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"

cat > /etc/systemd/system/gitnexus.service << EOF
[Unit]
Description=GitNexus server (backend + web)
After=network.target

[Service]
Type=simple
User=$SERVICE_USER
WorkingDirectory=$APP_DIR/gitnexus
Environment=NODE_ENV=production
Environment=GITNEXUS_WEB_ROOT=$APP_DIR/gitnexus-web/dist
Environment=HOST=0.0.0.0
Environment=PORT=8080
ExecStart=/usr/bin/node dist/cli/index.js serve --host 0.0.0.0 --port 8080
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

echo "[6/6] Enabling and starting service..."
systemctl daemon-reload
systemctl enable gitnexus
systemctl restart gitnexus
systemctl status gitnexus --no-pager

echo ""
echo "GitNexus is running on http://0.0.0.0:8080"
echo "From the server: curl -sI http://127.0.0.1:8080/"
echo "From outside:    http://YOUR_VPS_IP:8080"
echo "Logs: journalctl -u gitnexus -f"
