#!/bin/bash
#
# Curl production Seed API (seed-stocks-service) and save responses for comparison.
# Use to debug dashboard data deviation: compare daily-summary vs quick-stats vs live-positions.
#
# Prod base URL: http://203.57.85.201:8182 (from frontend/envs/env.prod REACT_APP_SEED_API_BASE_URL)
# Usage: ./scripts/seed-prod-curl.sh [base_url]
# Output: logs/seed-prod-responses/<endpoint-name>.json
#
set -e

BASE="${1:-http://203.57.85.201:8182}"
OUT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/../logs/seed-prod-responses"
mkdir -p "$OUT_DIR"

log() { echo "[$(date +%H:%M:%S)] $*"; }

log "Seed prod curl → $BASE"
log "Output dir: $OUT_DIR"

# Format: method|path|output-name (pipe separator so path can contain ? and =)
# Aligned with frontend/docs/configuration/seed-openapi.json (refresh: curl BASE/openapi.json -o that file).
ENDPOINTS=(
  "GET|/health|health"
  "GET|/v2/health/pipeline|pipeline-health"
  "GET|/v2/observability/db|observability-db"
  "GET|/api/v2/registry/stats|registry-stats"
  "GET|/api/v2/dashboard/daily-summary?days=7|daily-summary"
  "GET|/api/v2/dashboard/daily-summary?days=7&scenario=all|daily-summary-scenario"
  "GET|/api/v2/dashboard/overview?include_positions=true&include_learning=true|overview"
  "GET|/api/v2/monitor/quick-stats|quick-stats"
  "GET|/api/v2/monitor/quick-stats?scenario=all|quick-stats-scenario"
  "GET|/api/v2/monitor/live-positions?include_closed_hours=0|live-positions"
  "GET|/api/v2/monitor/market-pulse|market-pulse"
  "GET|/api/v2/monitor/system-alerts|system-alerts"
  "GET|/api/v2/monitor/performance-pulse|performance-pulse"
  "GET|/api/v2/monitor/arm-leaderboard?days=7|arm-leaderboard"
  "GET|/api/v2/monitor/learning-insights|learning-insights"
  "GET|/api/v2/monitor/top-performers-today?limit=5|top-performers-today"
  "GET|/api/v2/monitor/data-health|data-health"
  "GET|/api/v2/batch/data-statistics|data-statistics"
  "GET|/api/v2/dashboard/positions?days=30&limit=5&include=summary,list|positions-30d"
  "GET|/api/v2/dashboard/positions?days=30&limit=0&include=summary|positions-summary-only"
  "GET|/api/v2/dashboard/positions?trade_type=intraday_buy&days=30&limit=3|positions-intraday_buy"
  "GET|/api/v2/dashboard/positions?trade_type=long_term&days=30&limit=5|positions-long_term"
  "GET|/api/v2/dashboard/universe-health|universe-health"
  "GET|/api/v2/dashboard/capital-summary?days=7|capital-summary"
  "GET|/api/v2/dashboard/capital-summary?days=7&include=summary,timeline|capital-summary-include"
  "GET|/api/v2/dashboard/market-movers?mover_type=gainers&days=1&limit=10|market-movers-gainers"
  "GET|/api/v2/dashboard/market-movers?mover_type=losers&days=1&limit=10|market-movers-losers"
  "GET|/api/v2/dashboard/market-movers?mover_type=traded&days=1&limit=10|market-movers-traded"
  "GET|/api/v2/dashboard/watchlist?proximity_threshold=2|watchlist"
  "GET|/api/v2/dashboard/pnl-timeline?days=30|pnl-timeline"
  "GET|/api/v2/dashboard/arm-performance?days=7|arm-performance"
  "GET|/api/v2/dashboard/learning-status|learning-status"
  "GET|/api/v2/dashboard/portfolio-risk|portfolio-risk"
  "GET|/api/v2/dashboard/profit-protection-status|profit-protection-status"
  "GET|/api/v2/analysis/performance?days=30|analysis-performance"
  "GET|/api/v2/settings|settings-all"
  "GET|/api/v2/settings/trading|settings-trading"
  "GET|/api/v2/settings/trading/schema|settings-trading-schema"
  "GET|/api/v2/settings/trading/form|settings-trading-form"
  "GET|/api/v2/settings/system|settings-system"
  "GET|/api/v2/settings/system/schema|settings-system-schema"
  "GET|/api/v2/settings/system/form|settings-system-form"
  "GET|/api/v2/observability/endpoints|observability-endpoints"
  "GET|/api/v2/observability/performance|observability-performance"
  "GET|/api/v2/observability/performance/external|observability-performance-external"
  "GET|/v2/observability/regime-scoring|regime-scoring"
  "GET|/api/v2/arms/observability/learning|arms-observability-learning"
  "GET|/api/v2/arms/observability/utilization|arms-observability-utilization"
  "GET|/api/v2/candidates/observability/coverage|candidates-observability-coverage"
  "GET|/v2/learning/score-bin-performance?days=30|score-bin-performance"
  "GET|/v2/learning/performance?group_by=score_bin&days=14|learning-performance"
  "GET|/v2/recommendations?trade_type=swing_buy&limit=3|recommendations-swing"
  "GET|/api/v2/arms|arms-list"
  "GET|/api/v2/arms/scenarios|arms-scenarios"
  "GET|/api/v2/arms/observability/execution-timeline?days=7&limit=50|arms-exec-timeline"
)

for spec in "${ENDPOINTS[@]}"; do
  method="${spec%%|*}"
  rest="${spec#*|}"
  path="${rest%%|*}"
  name="${rest##*|}"
  url="${BASE}${path}"
  outfile="${OUT_DIR}/${name}.json"
  log "Fetching $method $path -> $outfile"
  if curl -sf -X "$method" "$url" -o "$outfile" 2>/dev/null; then
    log "  OK ($(wc -c < "$outfile") bytes)"
  else
    log "  FAILED or empty"
    echo "{}" > "$outfile"
  fi
done

log "Fetching OpenAPI spec..."
if curl -sf -X GET "${BASE}/openapi.json" -o "${OUT_DIR}/openapi.json" 2>/dev/null; then
  log "  OK openapi.json ($(wc -c < "${OUT_DIR}/openapi.json") bytes)"
  cp "${OUT_DIR}/openapi.json" "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)/../frontend/docs/configuration/seed-openapi.json"
  log "  Copied to frontend/docs/configuration/seed-openapi.json"
else
  log "  openapi.json FAILED"
fi

log "Done. Canonical spec: frontend/docs/configuration/seed-openapi.json"
