#!/bin/bash
#
# Quick test on current branch — no Docker.
# Use on feature/other branches for debug and fix. Build + serve only.
# Stage (develop + Docker) must use deploy-stage-local.sh only.
#
# Usage: ./scripts/run-quick-test.sh
# Serves build on port 3002. Stop with Ctrl+C or kill process on 3002.
# Repo: ALGODISCOVERY_REPO_DIR or $HOME/alg-discovery
#
set -e

REPO_DIR="${ALGODISCOVERY_REPO_DIR:-$HOME/alg-discovery}"
FRONTEND_DIR="${REPO_DIR}/frontend"
QUICK_TEST_PORT="${QUICK_TEST_PORT:-3002}"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log() { echo "[$(date +%H:%M:%S)] $*"; }
fail() { echo "${RED}ERROR: $*${NC}"; exit 1; }

log "=== Quick test (current branch, no Docker) on port $QUICK_TEST_PORT ==="
log "Repo: $REPO_DIR"

if [ ! -d "$REPO_DIR/.git" ]; then
  fail "Repo not found. Set ALGODISCOVERY_REPO_DIR or run from repo root."
fi

cd "$FRONTEND_DIR"
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
log "Branch: $CURRENT_BRANCH"

log "Installing dependencies..."
npm ci

log "Building (env.stage)..."
npm run build:stage

log "${GREEN}Serving build at http://localhost:${QUICK_TEST_PORT} (Ctrl+C to stop)${NC}"
exec npx serve -s build -l "$QUICK_TEST_PORT"
