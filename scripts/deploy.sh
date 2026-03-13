#!/bin/bash
#
# Single entry point for all deploys.
# Usage: ./scripts/deploy.sh <command>
#
#   prod         Deploy prod to GCP (GHCR, SSH). Merge to main first.
#   stage        Deploy stage to GCP (GHCR, SSH). Push develop first.
#   stage-local  Deploy stage locally (build from git, Docker on 8080).
#   quick-test   Build stage on current branch, serve on 3002, no Docker.
#
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
CMD="${1:-}"

case "$CMD" in
  prod)
    exec "$SCRIPT_DIR/deploy/remote.sh" prod
    ;;
  stage)
    exec "$SCRIPT_DIR/deploy/remote.sh" stage
    ;;
  stage-local)
    exec "$SCRIPT_DIR/deploy/stage-local.sh"
    ;;
  quick-test)
    exec "$SCRIPT_DIR/deploy/quick-test.sh"
    ;;
  "")
    echo "Usage: $0 {prod|stage|stage-local|quick-test}"
    echo "  prod         Deploy prod to GCP (GHCR)"
    echo "  stage        Deploy stage to GCP (GHCR)"
    echo "  stage-local  Stage locally (build + Docker, 8080)"
    echo "  quick-test   Stage build, serve 3002, no Docker"
    exit 1
    ;;
  *)
    echo "Unknown command: $CMD"
    echo "Usage: $0 {prod|stage|stage-local|quick-test}"
    exit 1
    ;;
esac
