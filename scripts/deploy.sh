#!/usr/bin/env bash
# Deploy MediaVibe to the VM and rebuild changed containers.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_HOST="${SSH_HOST:-root@79.174.83.244}"
SSH_KEY="${SSH_KEY:-$ROOT/ssh-key-1766397340058/ssh-key-1766397340058}"
REMOTE_DIR="${REMOTE_DIR:-/opt/mediavibe}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "SSH key not found: $SSH_KEY" >&2
  exit 1
fi

echo "==> syncing sources to $SSH_HOST:$REMOTE_DIR"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.cache' \
  --exclude '.env' \
  --exclude 'ssh-key-*' \
  --exclude '.DS_Store' \
  -e "ssh -i $SSH_KEY" \
  "$ROOT/" "$SSH_HOST:$REMOTE_DIR/"

if ! ssh -i "$SSH_KEY" "$SSH_HOST" "test -f $REMOTE_DIR/.env"; then
  echo "Remote .env is missing. Copy it once:" >&2
  echo "  scp -i $SSH_KEY .env $SSH_HOST:$REMOTE_DIR/.env" >&2
  exit 1
fi

echo "==> building and starting containers"
ssh -i "$SSH_KEY" "$SSH_HOST" "cd $REMOTE_DIR && docker compose up -d --build"

echo "==> done: http://${SSH_HOST#*@}/"
