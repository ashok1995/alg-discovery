# Seed Stocks Service Integration

Production API: **http://203.57.85.201:8182** ([Swagger UI](http://203.57.85.201:8182/docs))

## OpenAPI spec and curl

- **Canonical OpenAPI (JSON):** `frontend/docs/configuration/seed-openapi.json` — captured from prod improved Seed (v2.0.0). Use for codegen, types, or client validation.
- **Curl prod and save responses:** `./scripts/seed-prod-curl.sh [base_url]` — writes `logs/seed-prod-responses/*.json` (daily-summary, quick-stats, live-positions, positions, capital-summary, **market-movers**, overview, watchlist, settings, learning, recommendations, and `openapi.json`). Use to debug response shapes and compare with frontend types.

## Config

- **api.ts**: `SEED_API_BASE_URL` / `REACT_APP_SEED_API_BASE_URL` — prod default `http://203.57.85.201:8182`
- **openai.json**: `environments.production.recommendationsV2.baseUrl` = `http://203.57.85.201:8182`
- **env.prod**: `REACT_APP_SEED_API_BASE_URL=http://203.57.85.201:8182`
- **nginx.conf**: `upstream seed-service { server 203.57.85.201:8182; }`

## API verification (curl)

```bash
# Health
curl -s http://203.57.85.201:8182/health

# Recommendations (trade_type required; optional min_score, limit — risk_level removed from API)
curl -s "http://203.57.85.201:8182/v2/recommendations?trade_type=swing_buy&limit=2"
curl -s "http://203.57.85.201:8182/v2/recommendations?trade_type=swing_buy&limit=5&min_score=60"

# Position status
curl -s "http://203.57.85.201:8182/v2/position-status?symbol=RELIANCE&trade_type=swing_buy"

# Learning performance (group_by=score_bin|source_arm|outcome_type, horizon_type=time|event|all)
curl -s "http://203.57.85.201:8182/v2/learning/performance?group_by=score_bin&days=14"

# Score bin performance (optional from_date, to_date)
curl -s "http://203.57.85.201:8182/v2/learning/score-bin-performance?days=30"
curl -s "http://203.57.85.201:8182/v2/learning/score-bin-performance?trade_type=swing_buy&days=7"

# Dashboard daily summary
curl -s "http://203.57.85.201:8182/api/v2/dashboard/daily-summary?days=1"

# OpenAPI spec
curl -s http://203.57.85.201:8182/openapi.json
```

## Wire format (GET /v2/recommendations)

**Query (OpenAPI):** `trade_type` (required), `limit`, `min_score`. **No `risk_level`** — frontend does not send it.

Response: `RecommendationsResponse` — `trade_type`, `count`, `recommendations: RankedStockResponse[]`, `generated_at`, and (when applicable) `recommendation_source`, `min_score_applied`, `market_regime`.  
Frontend maps this to `SeedRecommendationResponse` via `mapRecommendationsResponseToSeedRecommendation` in `recommendationTransformers.ts`.

**UI ↔ all REST paths:** see **`SEED_UI_ENDPOINT_COVERAGE.md`** (includes Seed API hub tab on Dashboard).

## All endpoints (OpenAPI) and frontend integration

| Path | Method | Service / method | Used in |
|------|--------|------------------|--------|
| `/` | GET | — | Root health (load balancer) |
| `/health` | GET | RecommendationAPIService.getSeedServiceHealth | Health checks |
| `/v2/recommendations` | GET | RecommendationV2Service.fetchV2Recommendations | Recommendations flow |
| `/v2/position-status` | GET | SeedPositionService.getPositionStatus | RecommendationTable (position status) |
| `/v2/positions` | POST | SeedPositionService.openPosition | RecommendationTable (open position) |
| `/v2/positions/close` | POST | SeedPositionService.closePosition | RecommendationTable (close position) |
| `/v2/health/pipeline` | GET | SeedDashboardService.getPipelineHealth | SystemControl |
| `/v2/observability/db` | GET | SeedDashboardService.getObservabilityDb | SystemControl |
| `/v2/learning/score-bin-performance` | GET | SeedDashboardService.getScoreBinPerformance (opts: days, trade_type, from_date, to_date) | Dashboard → ML/Learning tab |
| `/v2/learning/performance` | GET | SeedDashboardService.getLearningPerformance (group_by, trade_type, horizon_type, days, from_date, to_date) | Dashboard → Performance tab |
| `/api/v2/dashboard/daily-summary` | GET | SeedDashboardService.getDailySummary | Dashboard, Home |
| `/api/v2/dashboard/positions` | GET | SeedDashboardService.getPositions | Dashboard (Positions tab), Home |
| `/api/v2/dashboard/universe-health` | GET | SeedDashboardService.getUniverseHealth | Dashboard (Universe tab) |
| `/api/v2/dashboard/market-trends` | GET | SeedDashboardService.getMarketTrends | Dashboard (Market Trends tab) |
| `/api/v2/dashboard/arm-performance` | GET | SeedDashboardService.getArmPerformance | Dashboard (Performance tab) |
| `/api/v2/dashboard/learning-status` | GET | SeedDashboardService.getLearningStatus | Dashboard (ML/Learning tab) |
| `/api/v2/dashboard/performance-timeline` | GET | SeedDashboardService.getPerformanceTimeline | Dashboard (Performance tab) |
| `/api/v2/dashboard/market-movers` | GET | SeedDashboardService.getMarketMovers (mover_type=gainers\|losers\|traded); getTopGainers/getTopLosers/getTopTraded wrap it | Dashboard (Market Movers), Home |
| `/api/v2/analysis/performance` | GET | SeedDashboardService.getAnalysisPerformance | Dashboard (Performance tab) |
| `/api/v2/registry/stats` | GET | SeedDashboardService.getRegistryStats | SystemControl |

**Note:** `/v2/recommendations/all` is **not** in the prod API (404). Use per–trade-type calls instead.

**Note:** `GET /api/v2/dashboard/market-trends` requires `points >= 5`. SeedDashboardService enforces this.

## Dashboard data sync and deviations

If dashboard shows inconsistent numbers (e.g. Open Positions 13 vs 29, Win Rate 0% vs 24%, or Live Positions with missing LTP/Return %):

1. **Curl prod and compare:** `./scripts/seed-prod-curl.sh` — writes `logs/seed-prod-responses/*.json`. Compare `daily-summary.positions.open`, `quick-stats.open_positions`, `live-positions.open_positions.count`.
2. **UI → endpoint mapping:** See **SEED_DASHBOARD_DATA_SYNC.md** (which UI element uses which endpoint).
3. **Backend requirements:** See **SEED_BACKEND_REQUIREMENTS.md** — hand-off for backend to align open/closed counts, win rate, and live position fields (e.g. `current_price`, `unrealized_return_pct`).
