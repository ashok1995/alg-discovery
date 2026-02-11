#!/bin/bash
#
# GIT-ONLY Deployment Script (GCP)
# Usage: ./scripts/deploy-from-git.sh [stage|prod]
# - Fetches main branch only for prod; stage may use staging branch
# - No file transfer (scp/rsync) - Git only
# Run ON the GCP instance (repo must already be cloned)
#
set -e

# Target environment: stage (port 8080) or prod (port 80/443)
DEPLOY_ENV="${1:-prod}"
REPO_DIR="${ALGODISCOVERY_REPO_DIR:-$HOME/alg-discovery}"
FRONTEND_DIR="${REPO_DIR}/frontend"
LOG_DIR="${REPO_DIR}/logs"
LOG_FILE="${LOG_DIR}/deploy-${DEPLOY_ENV}-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }
fail() { log "${RED}ERROR: $*${NC}"; exit 1; }

# Ensure logs dir exists
mkdir -p "$LOG_DIR"

log "=== GIT-ONLY Deploy: $DEPLOY_ENV ==="
log "Repo: $REPO_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
  fail "Repo not found at $REPO_DIR. Clone first: git clone <url> $REPO_DIR"
fi

cd "$REPO_DIR"

# 1. Fetch and switch to main only
log "Fetching origin..."
git fetch origin

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Current branch: $CURRENT_BRANCH"

log "Checking out main and resetting to origin/main..."
git checkout main
git reset --hard origin/main
git pull origin main 2>/dev/null || true

log "Deployed commit: $(git rev-parse --short HEAD)"

# 2. Build frontend
cd "$FRONTEND_DIR"
log "Installing dependencies..."
npm ci

# Avoid build failure on ESLint warnings (unused vars etc); fix lint in CI
export DISABLE_ESLINT_PLUGIN=true

if [ "$DEPLOY_ENV" = "stage" ]; then
  log "Building stage (envs/env.stage)..."
  npm run build:stage
  IMAGE_NAME="algodiscovery-frontend-stage"
  CONTAINER_NAME="algodiscovery-frontend-stage"
  HOST_PORT="8080"
else
  log "Building prod (envs/env.prod)..."
  npm run build:prod
  IMAGE_NAME="algodiscovery-frontend-prod"
  CONTAINER_NAME="algodiscovery-frontend-prod"
  HOST_PORT="80"
fi

# 3. Docker build and deploy
log "Building Docker image..."
BUILD_ARG=""
[ "$DEPLOY_ENV" = "stage" ] && BUILD_ARG="--build-arg BUILD_ENV=stage"
docker build $BUILD_ARG -t "$IMAGE_NAME" .

log "Stopping existing container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

log "Starting container on port $HOST_PORT..."
# On Linux Docker, host.docker.internal is not default; add host-gateway so nginx upstreams resolve
if [ "$DEPLOY_ENV" = "prod" ]; then
  docker run -d --add-host=host.docker.internal:host-gateway -p 80:80 -p 443:443 --name "$CONTAINER_NAME" --restart unless-stopped "$IMAGE_NAME"
else
  docker run -d --add-host=host.docker.internal:host-gateway -p "${HOST_PORT}:80" --name "$CONTAINER_NAME" --restart unless-stopped "$IMAGE_NAME"
fi

# 4. Health check
sleep 5
HEALTH_URL="http://localhost:${HOST_PORT}/health"
if curl -sf "$HEALTH_URL" >/dev/null; then
  log "${GREEN}Deploy successful. Health check passed at $HEALTH_URL${NC}"
else
  log "${YELLOW}Health check failed - verify container manually.${NC}"
fi

log "Log: $LOG_FILE"
