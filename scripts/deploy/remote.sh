#!/bin/bash
# Deploy on GCP VM from GHCR via SSH. Single source for remote deploy.
# Usage: ./scripts/deploy/remote.sh [stage|prod]
set -e

DEPLOY_ENV="${1:-prod}"
if [ "$DEPLOY_ENV" != "stage" ] && [ "$DEPLOY_ENV" != "prod" ]; then
  echo "Usage: $0 [stage|prod]"
  exit 1
fi

SSH_HOST="${GCP_SSH_HOST:-gcp-stocks-vm}"

echo "Connecting to GCP: $SSH_HOST"
echo "Deploy $DEPLOY_ENV from GHCR (algodiscovery-frontend:$([ "$DEPLOY_ENV" = "prod" ] && echo "main" || echo "develop"))."

ssh "$SSH_HOST" "GITHUB_OWNER='${GITHUB_OWNER:-}' GHCR_TOKEN='${GHCR_TOKEN:-}' bash -s" "$DEPLOY_ENV" << 'REMOTE'
  set -e
  DEPLOY_ENV="$1"
  for path in /opt/alg-discovery "$HOME/alg-discovery" /home/akm551995/alg-discovery; do
    if [ -d "$path" ]; then REPO_PATH="$path"; break; fi
  done
  if [ -z "${REPO_PATH:-}" ]; then echo "ERROR: alg-discovery repo not found."; exit 1; fi

  cd "$REPO_PATH"
  git fetch origin
  if [ "$DEPLOY_ENV" = "prod" ]; then
    git checkout main && git reset --hard origin/main && git pull origin main 2>/dev/null || true
  else
    git checkout develop && git reset --hard origin/develop && git pull origin develop 2>/dev/null || true
  fi

  [ -n "${GITHUB_OWNER:-}" ] && export GITHUB_OWNER
  [ -n "${GHCR_TOKEN:-}" ] && export GHCR_TOKEN
  if [ -f "./scripts/deploy/from-ghcr.sh" ]; then
    ./scripts/deploy/from-ghcr.sh "$DEPLOY_ENV"
  else
    ./scripts/deploy-from-ghcr.sh "$DEPLOY_ENV"
  fi
  echo "Remote $DEPLOY_ENV deploy from GHCR finished."
REMOTE

echo "Done. $([ "$DEPLOY_ENV" = "prod" ] && echo "Prod at http://<gcp-ip>/" || echo "Stage at http://<gcp-ip>:8080")"
