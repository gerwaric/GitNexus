# Deploy GitNexus (backend + web) on Vultr

Deploy using either the **Vultr dashboard** (no CLI) or the **Vultr CLI**. After the server is created, the same setup script runs on the VPS so the app builds and runs natively (no Docker). Same machine for build and run avoids the native-addon issues seen on Fly.

---

## Deploy without the CLI (dashboard only)

### Prerequisites

- Vultr account with billing set up
- (Optional) SSH key for password-free login — add it under [Settings → SSH Keys](https://my.vultr.com/settings/#settingssshkeys)

### 1. Create the server in the dashboard

1. Go to [my.vultr.com](https://my.vultr.com) and log in.
2. Click **+ Deploy New Server** (or **Products** → **+ Add**).
3. **Server type:** choose **Cloud Compute**.
4. **Location:** pick a region (e.g. Los Angeles, Newark, Amsterdam).
5. **Image:** choose **Ubuntu 22.04 LTS**.
6. **Server size:** pick a plan, e.g. **$6/mo** (1 vCPU, 1 GB RAM) — enough to build and run.
7. **SSH key (optional):** if you added a key, select it so you can log in without a password. If you skip this, Vultr will email the root password after the server is created.
8. **Server hostname / label:** e.g. `gitnexus`.
9. Click **Deploy Now**.

### 2. Get the server IP and log in

- On the **Products** page, open your new server. The **IP Address** is shown at the top.
- If you did **not** add an SSH key: check the email from Vultr for the root password. You can also use **View Console** in the dashboard to get a browser-based shell (no SSH needed).

**Option A — SSH from your machine:**

```bash
ssh root@YOUR_SERVER_IP
```

(Use the root password from the email if you didn't add an SSH key.)

**Option B — Browser console:**

In the Vultr dashboard, open the server → click **View Console**. Use the root password from the email to log in.

### 3. Run the setup script on the server

At the shell (SSH or View Console), run these commands. Use **your fork** if you want your own changes deployed (replace `YOUR_USER` with your GitHub username):

**Default repo (upstream GitNexus):**

```bash
curl -fsSL https://raw.githubusercontent.com/abhigyanpatwari/GitNexus/main/scripts/vultr-setup-server.sh -o /tmp/vultr-setup-server.sh
chmod +x /tmp/vultr-setup-server.sh
sudo /tmp/vultr-setup-server.sh
```

**Your fork:**

```bash
curl -fsSL https://raw.githubusercontent.com/abhigyanpatwari/GitNexus/main/scripts/vultr-setup-server.sh -o /tmp/vultr-setup-server.sh
chmod +x /tmp/vultr-setup-server.sh
sudo REPO_URL=https://github.com/YOUR_USER/GitNexus.git BRANCH=main /tmp/vultr-setup-server.sh
```

The script installs Node 20, clones the repo, builds backend and web, and starts the app on port **8080**. When it finishes, open **http://YOUR_SERVER_IP:8080** in your browser.

### 4. Open port 8080 (if the app doesn't load)

On the server:

```bash
sudo ufw allow 8080/tcp
sudo ufw status
sudo ufw enable
```

Try **http://YOUR_SERVER_IP:8080** again.

### 5. Optional: HTTPS with a domain

Point a domain's A record to your server IP, then on the server:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Configure Nginx to proxy to `http://127.0.0.1:8080` (certbot can set this up when you have a server block for the domain).

---

## Deploy with the Vultr CLI

### Prerequisites

- Vultr account with billing set up
- API key: [Vultr Account → API](https://my.vultr.com/settings/#settingsapi)
- (Optional) SSH key for password-free login

## 1. Install Vultr CLI

**macOS (Homebrew):**
```bash
brew tap vultr/vultr-cli
brew install vultr-cli
```

**Linux:**
```bash
curl -L https://github.com/vultr/vultr-cli/releases/latest/download/vultr-cli_linux_amd64.tar.gz | tar xz
sudo mv vultr-cli /usr/local/bin/
```

**Set your API key:**
```bash
export VULTR_API_KEY=your_api_key_here
# Or add to ~/.bashrc / ~/.zshrc for persistence
```

## 2. Get region, plan, and OS IDs

Pick a region close to you and a small plan (1 GB RAM is enough to build and run).

```bash
vultr-cli region list
vultr-cli plans list
vultr-cli os list
```

Typical choices:

- **Region:** e.g. `lax`, `ewr`, `sjc`, `ams`
- **Plan:** e.g. `vc2-1c-1gb` (1 vCPU, 1 GB RAM) or `vc2-2c-4gb` if you want more headroom
- **OS:** Ubuntu 22.04 — find the row with "Ubuntu 22" and note the `id` (e.g. `1743` or similar; use `vultr-cli os list` to confirm)

## 3. (Optional) Add your SSH key

So you can log in without a password:

```bash
# Use your public key (e.g. ~/.ssh/id_ed25519.pub or ~/.ssh/id_rsa.pub)
vultr-cli ssh-key create --name "my-laptop" --key "$(cat ~/.ssh/id_ed25519.pub)"
```

List keys to get the ID:

```bash
vultr-cli ssh-key list
```

Note the `id` (UUID) of the key you want on the server.

## 4. Create the server

Replace `REGION`, `PLAN`, `OS_ID`, and optionally `SSH_KEY_IDS` with the values from step 2 (and 3). If you skip SSH keys, Vultr will email the root password.

```bash
# Without SSH key (you’ll get root password by email)
vultr-cli instance create \
  --region=REGION \
  --plan=PLAN \
  --os=OS_ID \
  --label=gitnexus

# With SSH key (use the id from vultr-cli ssh-key list)
vultr-cli instance create \
  --region=REGION \
  --plan=PLAN \
  --os=OS_ID \
  --label=gitnexus \
  --ssh-keys=YOUR_SSH_KEY_ID
```

Example:

```bash
vultr-cli instance create \
  --region=lax \
  --plan=vc2-1c-1gb \
  --os=1743 \
  --label=gitnexus
```

Get the new instance IP:

```bash
vultr-cli instance list
```

Note the `main_ip` for your `gitnexus` instance.

## 5. SSH in and run the setup script

Wait a minute or two for the server to finish booting, then SSH as root (use the IP from step 4):

```bash
ssh root@YOUR_SERVER_IP
```

On the server, download and run the setup script. Use the **default repo** (upstream GitNexus):

```bash
curl -fsSL https://raw.githubusercontent.com/abhigyanpatwari/GitNexus/main/scripts/vultr-setup-server.sh -o /tmp/vultr-setup-server.sh
chmod +x /tmp/vultr-setup-server.sh
sudo /tmp/vultr-setup-server.sh
```

To deploy **your own fork** (e.g. with your Fly/Vultr fixes), set `REPO_URL` (and optionally `BRANCH`) before running:

```bash
curl -fsSL https://raw.githubusercontent.com/abhigyanpatwari/GitNexus/main/scripts/vultr-setup-server.sh -o /tmp/vultr-setup-server.sh
chmod +x /tmp/vultr-setup-server.sh
sudo REPO_URL=https://github.com/YOUR_USER/GitNexus.git BRANCH=main /tmp/vultr-setup-server.sh
```

The script will:

- Install Node.js 20
- Clone the repo (or pull if already present)
- Build `gitnexus` and `gitnexus-web` with `ONNXRUNTIME_NODE_INSTALL=skip`
- Create a systemd unit and start the app on port **8080**

When it finishes, the app is available at **http://YOUR_SERVER_IP:8080**.

## 6. Open port 8080 (firewall)

If you can’t reach the app, allow TCP 8080:

```bash
# On the server (Ubuntu with ufw)
sudo ufw allow 8080/tcp
sudo ufw status
sudo ufw enable   # if not already enabled
```

## 7. Optional: reverse proxy and HTTPS

For a domain and HTTPS, install Nginx and use Let’s Encrypt:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Then add a server block that proxies to `http://127.0.0.1:8080` (or use the existing default and set `proxy_pass http://127.0.0.1:8080`).

## Useful commands

| Task | Command |
|------|--------|
| App status | `sudo systemctl status gitnexus` |
| Logs | `journalctl -u gitnexus -f` |
| Restart | `sudo systemctl restart gitnexus` |
| List instances | `vultr-cli instance list` |
| Destroy instance | `vultr-cli instance delete INSTANCE_ID` |

## Updating the app

SSH in, then:

```bash
cd /opt/gitnexus
git pull --ff-only
export ONNXRUNTIME_NODE_INSTALL=skip
cd gitnexus && npm install && npm run build
cd ../gitnexus-web && npm ci && npm run build
sudo systemctl restart gitnexus
```

Or run the setup script again (it will pull and rebuild):

```bash
sudo /opt/gitnexus/scripts/vultr-setup-server.sh
```
