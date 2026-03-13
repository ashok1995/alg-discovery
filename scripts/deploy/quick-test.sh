#!/bin/bash
# Quick test: build stage on current branch, serve on 3002, no Docker.
# Usage: ./scripts/deploy/quick-test.sh
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
REPO_DIR="${SCRIPT_DIR}/../.."
FRONTEND_DIR="${REPO_DIR}/frontend"
QUICK_TEST_PORT="${QUICK_TEST_PORT:-3002}"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo "[$(date +%H:%M:%S)] $*"; }
fail() { echo -e "${RED}ERROR: $*${NC}"; exit 1; }

log "=== Quick test (current branch, no Docker) on port $QUICK_TEST_PORT ==="

if [ ! -d "$REPO_DIR/.git" ]; then
  fail "Repo not found at $REPO_DIR."
fi

cd "$FRONTEND_DIR"
log "Branch: $(git rev-parse --abbrev-ref HEAD)"
log "Installing dependencies..."
npm ci
log "Building (env.stage)..."
npm run build:stage
log "${GREEN}Serving at http://localhost:${QUICK_TEST_PORT} (Ctrl+C to stop)${NC}"
exec npx serve -s build -l "$QUICK_TEST_PORT"
