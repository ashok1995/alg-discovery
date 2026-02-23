#!/bin/bash
#
# Deploy prod on GCP by pulling image from GHCR (no build on VM).
# Prereq: CI has pushed image to ghcr.io on push to main.
# Usage: ./scripts/deploy-prod-remote-ghcr.sh
# Env:   GITHUB_OWNER, GHCR_TOKEN (for private images)
#
set -e

SSH_HOST="${GCP_SSH_HOST:-gcp-stocks-vm}"

echo "Connecting to GCP: $SSH_HOST"
echo "Will pull algodiscovery-frontend:main from GHCR and deploy."

ssh "$SSH_HOST" "GITHUB_OWNER='${GITHUB_OWNER:-}' GHCR_TOKEN='${GHCR_TOKEN:-}' bash -s" << 'REMOTE'
  set -e
  for path in /opt/alg-discovery "$HOME/alg-discovery" /home/akm551995/alg-discovery; do
    if [ -d "$path" ]; then REPO_PATH="$path"; break; fi
  done
  if [ -z "$REPO_PATH" ]; then echo "ERROR: alg-discovery repo not found."; exit 1; fi

  cd "$REPO_PATH"
  git fetch origin
  git checkout main
  git reset --hard origin/main
  git pull origin main 2>/dev/null || true

  [ -n "$GITHUB_OWNER" ] && export GITHUB_OWNER
  [ -n "$GHCR_TOKEN" ] && export GHCR_TOKEN
  echo "Running deploy-from-ghcr.sh prod..."
  ./scripts/deploy-from-ghcr.sh prod

  echo "Remote prod deploy from GHCR finished."
REMOTE

echo "Done. Prod at http://<gcp-ip>/"
