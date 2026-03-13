#!/bin/bash
# Optional: build on current machine (VM) from git. Not canonical; GHCR is canonical for VM.
# Usage: ./scripts/deploy/from-git.sh [stage|prod]
set -e

DEPLOY_ENV="${1:-prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_DIR="${SCRIPT_DIR}/../.."
FRONTEND_DIR="${REPO_DIR}/frontend"
LOG_DIR="${REPO_DIR}/logs"
LOG_FILE="${LOG_DIR}/deploy-${DEPLOY_ENV}-$(date +%Y%m%d-%H%M%S).log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }
fail() { log "${RED}ERROR: $*${NC}"; exit 1; }

mkdir -p "$LOG_DIR"

log "=== Deploy from Git: $DEPLOY_ENV ==="
log "Repo: $REPO_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
  fail "Repo not found. Clone first: git clone <url> $REPO_DIR"
fi

cd "$REPO_DIR"
log "Fetching origin..."
git fetch origin

if [ "$DEPLOY_ENV" = "stage" ]; then
  DEPLOY_BRANCH="develop"
else
  DEPLOY_BRANCH="main"
fi

log "Checking out $DEPLOY_BRANCH..."
git checkout "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"
git pull "origin" "$DEPLOY_BRANCH" 2>/dev/null || true

log "Deployed commit ($DEPLOY_BRANCH): $(git rev-parse --short HEAD)"

cd "$FRONTEND_DIR"
log "Installing dependencies..."
npm ci
export DISABLE_ESLINT_PLUGIN=true

if [ "$DEPLOY_ENV" = "stage" ]; then
  log "Building stage..."
  npm run build:stage
  IMAGE_NAME="algodiscovery-frontend-stage"
  CONTAINER_NAME="algodiscovery-frontend-stage"
  HOST_PORT="8080"
  BUILD_ARG="--build-arg BUILD_ENV=stage"
else
  log "Building prod..."
  npm run build:prod
  IMAGE_NAME="algodiscovery-frontend-prod"
  CONTAINER_NAME="algodiscovery-frontend-prod"
  HOST_PORT="80"
  BUILD_ARG=""
fi

log "Building Docker image..."
docker build $BUILD_ARG -t "$IMAGE_NAME" .

docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

log "Starting container on port $HOST_PORT..."
if [ "$DEPLOY_ENV" = "prod" ]; then
  docker run -d --add-host=host.docker.internal:host-gateway -p 80:80 -p 443:443 --name "$CONTAINER_NAME" --restart unless-stopped "$IMAGE_NAME"
else
  docker run -d --add-host=host.docker.internal:host-gateway -p "${HOST_PORT}:80" --name "$CONTAINER_NAME" --restart unless-stopped "$IMAGE_NAME"
fi

sleep 5
HEALTH_URL="http://localhost:${HOST_PORT}/health"
if curl -sf "$HEALTH_URL" >/dev/null; then
  log "${GREEN}Deploy successful. Health check passed at $HEALTH_URL${NC}"
else
  log "${YELLOW}Health check failed - verify container manually.${NC}"
fi

log "Log: $LOG_FILE"
