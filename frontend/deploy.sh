#!/bin/bash
# Local Docker deploy. For GCP: use scripts/deploy-from-git.sh [stage|prod]
set -e
cd "$(dirname "$0")"
docker-compose down 2>/dev/null || true
docker build --build-arg BUILD_ENV="${1:-prod}" -t algodiscovery-frontend .
docker-compose up -d
echo "Frontend: http://localhost/health"
