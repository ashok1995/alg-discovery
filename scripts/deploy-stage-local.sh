#!/bin/bash
#
# Stage deployment: develop branch only, local machine.
# Same process as prod: build image, Docker, port 8080.
# Use this to validate develop before merging to main.
# For quick test/debug on other branches (no Docker), use run-quick-test.sh.
#
# Usage: ./scripts/deploy-stage-local.sh
# Repo: ALGODISCOVERY_REPO_DIR or $HOME/alg-discovery
#
set -e

REPO_DIR="${ALGODISCOVERY_REPO_DIR:-$HOME/alg-discovery}"
FRONTEND_DIR="${REPO_DIR}/frontend"
LOG_DIR="${REPO_DIR}/logs"
LOG_FILE="${LOG_DIR}/deploy-stage-local-$(date +%Y%m%d-%H%M%S).log"

IMAGE_NAME="algodiscovery-frontend-stage"
CONTAINER_NAME="algodiscovery-frontend-stage"
HOST_PORT="8080"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }
fail() { log "${RED}ERROR: $*${NC}"; exit 1; }

mkdir -p "$LOG_DIR"

log "=== Stage (local) — develop branch only, full Docker process ==="
log "Repo: $REPO_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
  fail "Repo not found at $REPO_DIR. Set ALGODISCOVERY_REPO_DIR or run from repo root."
fi

cd "$REPO_DIR"

log "Fetching origin..."
git fetch origin

log "Checking out develop and resetting to origin/develop..."
git checkout develop
git reset --hard origin/develop
git pull origin develop 2>/dev/null || true

log "Deployed commit: $(git rev-parse --short HEAD)"

cd "$FRONTEND_DIR"
log "Installing dependencies..."
npm ci

log "Building stage (envs/env.stage)..."
npm run build:stage

log "Building Docker image..."
docker build --build-arg BUILD_ENV=stage -t "$IMAGE_NAME" .

log "Stopping existing container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

log "Starting container on port $HOST_PORT..."
docker run -d --add-host=host.docker.internal:host-gateway -p "${HOST_PORT}:80" --name "$CONTAINER_NAME" --restart unless-stopped "$IMAGE_NAME"

sleep 5
HEALTH_URL="http://localhost:${HOST_PORT}/health"
if curl -sf "$HEALTH_URL" >/dev/null; then
  log "${GREEN}Deploy successful. Health check passed at $HEALTH_URL${NC}"
else
  log "${YELLOW}Health check failed - verify container manually.${NC}"
fi

log "Log: $LOG_FILE"
