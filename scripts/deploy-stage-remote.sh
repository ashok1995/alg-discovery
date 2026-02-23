#!/bin/bash
#
# Remote stage deploy: pull develop branch on GCP and run deploy-from-git.sh stage.
# Stage runs on port 8080. Prod stays on main (use deploy-prod-remote.sh).
#
# Usage: ./scripts/deploy-stage-remote.sh
# Prereq: Push develop first (git push origin develop)
#
set -e

SSH_HOST="${GCP_SSH_HOST:-gcp-stocks-vm}"

echo "Connecting to GCP via SSH: $SSH_HOST"
echo "Stage deploy will pull origin/develop and build on port 8080."

ssh "$SSH_HOST" << 'REMOTE'
  set -e
  echo "Executing stage deploy on remote server..."

  for path in /opt/alg-discovery "$HOME/alg-discovery" /home/akm551995/alg-discovery; do
    if [ -d "$path" ]; then
      REPO_PATH="$path"
      break
    fi
  done

  if [ -z "$REPO_PATH" ]; then
    echo "ERROR: alg-discovery repository not found."
    exit 1
  fi

  echo "Found repository at: $REPO_PATH"
  cd "$REPO_PATH"

  echo "Fetching and pulling origin/develop..."
  git fetch origin
  git checkout develop
  git reset --hard origin/develop
  git pull origin develop 2>/dev/null || true

  echo "Running stage deployment (develop → port 8080)..."
  ./scripts/deploy-from-git.sh stage

  echo "Verifying health check..."
  if curl -sf http://localhost:8080/health >/dev/null; then
    echo "Stage deploy successful. Health check passed at http://localhost:8080/health"
  else
    echo "Health check failed - verify container manually."
  fi

  echo "Remote stage deploy finished."
REMOTE

echo "SSH session finished. Stage available at http://<gcp-ip>:8080"
