#!/bin/bash
# Deploy from GHCR on current machine (VM). No build. Called by remote.sh or directly on VM.
# Usage: ./scripts/deploy/from-ghcr.sh [stage|prod]
set -e

DEPLOY_ENV="${1:-prod}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_DIR="${SCRIPT_DIR}/../.."
LOG_DIR="${REPO_DIR}/logs"
LOG_FILE="${LOG_DIR}/deploy-ghcr-${DEPLOY_ENV}-$(date +%Y%m%d-%H%M%S).log"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG_FILE"; }
fail() { log "${RED}ERROR: $*${NC}"; exit 1; }

mkdir -p "$LOG_DIR"

if [ "$DEPLOY_ENV" = "stage" ]; then
  IMAGE_TAG="develop"
  CONTAINER_NAME="algodiscovery-frontend-stage"
  HOST_PORT="8080"
else
  IMAGE_TAG="main"
  CONTAINER_NAME="algodiscovery-frontend-prod"
  HOST_PORT="80"
fi

GITHUB_OWNER="${GITHUB_OWNER:-}"
if [ -z "$GITHUB_OWNER" ] && [ -d "$REPO_DIR/.git" ]; then
  REMOTE=$(git -C "$REPO_DIR" remote get-url origin 2>/dev/null || true)
  if [[ "$REMOTE" =~ github.com[:/]([^/]+)/ ]]; then
    GITHUB_OWNER="${BASH_REMATCH[1]}"
  fi
fi
if [ -z "$GITHUB_OWNER" ]; then
  fail "Set GITHUB_OWNER or ensure git remote origin points to GitHub."
fi

IMAGE_FULL="ghcr.io/${GITHUB_OWNER}/algodiscovery-frontend:${IMAGE_TAG}"

log "=== Deploy from GHCR: $DEPLOY_ENV ==="
log "Image: $IMAGE_FULL"

if [ -n "${GHCR_TOKEN:-}" ]; then
  log "Logging in to ghcr.io..."
  echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_OWNER" --password-stdin
fi

log "Pulling image..."
docker pull "$IMAGE_FULL"

log "Stopping existing container..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

log "Starting container on port $HOST_PORT..."
if [ "$DEPLOY_ENV" = "prod" ]; then
  docker run -d --add-host=host.docker.internal:host-gateway -p 80:80 -p 443:443 --name "$CONTAINER_NAME" --restart unless-stopped "$IMAGE_FULL"
else
  docker run -d --add-host=host.docker.internal:host-gateway -p "${HOST_PORT}:80" --name "$CONTAINER_NAME" --restart unless-stopped "$IMAGE_FULL"
fi

sleep 5
HEALTH_URL="http://localhost:${HOST_PORT}/health"
if curl -sf "$HEALTH_URL" >/dev/null; then
  log "${GREEN}Deploy successful. Health check passed at $HEALTH_URL${NC}"
else
  log "${YELLOW}Health check failed - verify container manually.${NC}"
fi

log "Log: $LOG_FILE"
