#!/bin/bash
# Run once on a fresh Ubuntu 24.04 server as root.
# Usage: bash setup-server.sh <git-repo-url>
# Example: bash setup-server.sh https://github.com/youruser/video-processor.git

set -e

REPO_URL="${1:-}"

echo "==> Installing Docker..."
curl -fsSL https://get.docker.com | sh

echo "==> Installing Caddy..."
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update && apt-get install -y caddy

mkdir -p /app
cd /app

if [ -n "$REPO_URL" ]; then
  echo "==> Cloning $REPO_URL..."
  git clone "$REPO_URL" video-processor
else
  echo "==> No repo URL provided — assuming code is already at /app/video-processor"
fi

cd /app/video-processor

echo "==> Creating .env..."
cp .env.example .env
SECRET=$(openssl rand -hex 32)
sed -i "s/replace-with-a-random-secret/$SECRET/" .env
echo "Generated CLEANUP_SECRET: $SECRET"

echo "==> Starting services..."
docker compose up -d --build

echo "==> Installing Caddyfile..."
cp Caddyfile /etc/caddy/Caddyfile
systemctl enable caddy

echo ""
echo "============================================"
echo "Done! Two manual steps remain:"
echo "  1. Edit /etc/caddy/Caddyfile"
echo "     Replace 'yourdomain.com' with your domain"
echo "  2. Point your domain DNS A record to: $(curl -s ifconfig.me)"
echo "  3. systemctl restart caddy"
echo ""
echo "For auto-deploy, add these GitHub secrets:"
echo "  SERVER_HOST = $(curl -s ifconfig.me)"
echo "  SERVER_USER = root"
echo "  SERVER_SSH_KEY = (paste your private key)"
echo "============================================"
