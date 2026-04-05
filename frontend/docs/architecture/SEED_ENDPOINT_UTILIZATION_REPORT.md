# Seed Stocks Service — Endpoint Utilization Report (Frontend)

This report lists **every operation** in the OpenAPI document shipped with this repo and how the React app calls it.

## Metadata

| Field | Value |
|-------|--------|
| **OpenAPI snapshot (repo)** | `frontend/docs/configuration/seed-openapi.json` |
| **Prod discovery URL** | `http://203.57.85.201:8182/openapi.json` (Swagger: `/docs`) |
| **Operations counted** | 125 (HTTP methods on paths; excludes webhook-only definitions) |
| **Report generated** | 2026-04-04 (UTC date) |
| **Frontend scope** | `frontend/src/**` |

### Status legend

| Status | Meaning |
|--------|---------|
| **USED** | Request is issued from a `frontend/src/services/*` client (and typically surfaced in UI or Seed Ops). |

## Summary

| Metric | Count |
|--------|-------|
| **Total OpenAPI operations** | 125 |
| **USED (client in repo)** | 125 |
| **NOT_INTEGRATED** | 0 |

All listed paths have a matching call in `frontend/src/services`. **GET /** uses `seedDashboardService.getRoot()` (Seed Ops → Utilities).

### Primary surfaces

- **Trader UI**: Home, Dashboard (`/seed-dashboard`), Positions (`/positions`), movers, ML Learning, Investing, Universe manager, Arm manager, Observability, Settings.
- **Seed Ops** (`/seed-ops`): Monitoring, rate limits, data quality, regime, learning governance, execution, portfolio risk, analytics, system optimization, Yahoo tier, backtesting helpers, **Utilities** (root, settings, overview, charges, export URL).
- **Backtesting** (`/backtesting`): `SeedBacktestingService`.

---

## Advanced Monitoring

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/monitoring/alerts` | Get active alerts | `SeedAdvancedMonitoringService` | Seed Ops → Advanced Monitoring |
| POST | `/api/v2/monitoring/alerts/{alert_id}/acknowledge` | Acknowledge an alert | `SeedAdvancedMonitoringService` | Seed Ops → Advanced Monitoring |
| POST | `/api/v2/monitoring/alerts/{alert_id}/resolve` | Resolve an alert | `SeedAdvancedMonitoringService` | Seed Ops → Advanced Monitoring |
| GET | `/api/v2/monitoring/monitoring-dashboard` | Monitoring dashboard data | `SeedAdvancedMonitoringService` | Seed Ops → Advanced Monitoring |
| GET | `/api/v2/monitoring/performance-metrics` | Real-time performance metrics | `SeedAdvancedMonitoringService` | Seed Ops → Advanced Monitoring |
| GET | `/api/v2/monitoring/system-health` | Comprehensive system health check | `SeedAdvancedMonitoringService` | Seed Ops → Advanced Monitoring |

---

## Analysis

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/analysis/performance` | Get Performance Analysis | `SeedDashboardService` | `MLLearningPage`, dashboard-related views |

---

## Backtesting

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/backtesting/compare-strategies` | Compare multiple strategies | `SeedBacktestingService` | `Backtesting` page + Seed Ops |
| GET | `/api/v2/backtesting/quick/{days}` | Quick backtest for last N days | `SeedBacktestingService` | `Backtesting` page + Seed Ops |
| POST | `/api/v2/backtesting/run` | Run historical backtest | `SeedBacktestingService` | `Backtesting` page + Seed Ops |

---

## Batch Operations

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| POST | `/api/v2/batch/analyze-symbols` | Bulk Symbol Analysis | `SeedDashboardService` | `PositionsTab`, exports, `SeedAllEndpointsTab` |
| POST | `/api/v2/batch/close-positions` | Batch Close Positions | `SeedDashboardService` | `PositionsTab`, exports, `SeedAllEndpointsTab` |
| GET | `/api/v2/batch/data-statistics` | Data Statistics | `SeedDashboardService` | `PositionsTab`, exports, `SeedAllEndpointsTab` |

---

## Candidates

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/candidates` | List candidate stocks | `SeedDashboardService` + `SeedCandidatesService` | `UniverseManagerPage` / candidates v2 |
| GET | `/api/v2/candidates/{symbol}` | Candidate detail with fundamentals history | `SeedDashboardService` + `SeedCandidatesService` | `UniverseManagerPage` / candidates v2 |
| PUT | `/api/v2/candidates/{symbol}/match` | Link Chartink / canonical symbol to Kite instrument | `SeedDashboardService` + `SeedCandidatesService` | `UniverseManagerPage` / candidates v2 |
| PUT | `/api/v2/candidates/{symbol}/status` | Update candidate status | `SeedDashboardService` + `SeedCandidatesService` | `UniverseManagerPage` / candidates v2 |
| GET | `/api/v2/candidates/observability/coverage` | Candidate sync coverage and freshness | `SeedDashboardService` + `SeedCandidatesService` | `UniverseManagerPage` / candidates v2 |
| GET | `/api/v2/candidates/observability/kite-gap` | Candidates missing Kite instrument_token | `SeedDashboardService` + `SeedCandidatesService` | `UniverseManagerPage` / candidates v2 |
| POST | `/api/v2/candidates/sync` | Force a candidate sync now | `SeedDashboardService` + `SeedCandidatesService` | `UniverseManagerPage` / candidates v2 |

---

## capital

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/dashboard/capital-summary` | Capital Summary | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/charges-calculator` | Charges Calculator | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/pnl-timeline` | Pnl Timeline | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/portfolio-risk` | Portfolio Risk | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/profit-protection-status` | Profit Protection Status | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |

---

## Comprehensive Dashboard

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/dashboard/overview` | Dashboard Overview | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/watchlist` | Position Watchlist | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |

---

## Dashboard

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/dashboard/arm-performance` | Arm Performance | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/daily-summary` | Daily Summary | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/learning-status` | Learning Status | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/market-movers` | Market Movers | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/market-trends` | Market Trends | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/performance-timeline` | Performance Timeline | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/positions` | Universal Positions | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/dashboard/universe-health` | Universe Health | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |

---

## Data Export

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/export/market-context.csv` | Export Market Context Csv | `SeedDashboardService` | `PositionsTab`, exports, `SeedAllEndpointsTab` |
| GET | `/api/v2/export/outcomes.json` | Export Outcomes Json | `SeedDashboardService` | `PositionsTab`, exports, `SeedAllEndpointsTab` |
| GET | `/api/v2/export/positions.csv` | Export Positions Csv | `SeedDashboardService` | `PositionsTab`, exports, `SeedAllEndpointsTab` |
| GET | `/api/v2/export/search/positions` | Search Positions | `SeedDashboardService` | `PositionsTab`, exports, `SeedAllEndpointsTab` |

---

## Data Quality

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/data-quality/assessment` | Comprehensive data quality assessment | `SeedDataQualityService` | Seed Ops (module tab) |
| GET | `/api/v2/data-quality/dashboard` | Data quality monitoring dashboard | `SeedDataQualityService` | Seed Ops (module tab) |
| GET | `/api/v2/data-quality/dimension-analysis/{dimension}` | Analysis by data quality dimension | `SeedDataQualityService` | Seed Ops (module tab) |
| GET | `/api/v2/data-quality/table-report/{table_name}` | Detailed quality report for specific table | `SeedDataQualityService` | Seed Ops (module tab) |
| GET | `/api/v2/data-quality/trends` | Data quality trends over time | `SeedDataQualityService` | Seed Ops (module tab) |

---

## Execution Quality

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/execution/batch-liquidity` | Batch liquidity analysis for multiple symbols | `SeedExecutionQualityService` | Seed Ops (module tab) |
| GET | `/api/v2/execution/liquidity-analysis/{symbol}` | Real-time liquidity analysis for symbol | `SeedExecutionQualityService` | Seed Ops (module tab) |
| GET | `/api/v2/execution/quality-report` | Execution quality analysis | `SeedExecutionQualityService` | Seed Ops (module tab) |
| GET | `/api/v2/execution/slippage-analysis` | Historical slippage analysis | `SeedExecutionQualityService` | Seed Ops (module tab) |

---

## Learning Governance

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/learning/arm-performance` | ARM performance analysis | `SeedLearningGovernanceService` | Seed Ops (module tab) |
| POST | `/api/v2/learning/evaluate-performance` | Trigger learning performance evaluation | `SeedLearningGovernanceService` | Seed Ops (module tab) |
| POST | `/api/v2/learning/force-rollback` | Force rollback to previous learning state | `SeedLearningGovernanceService` | Seed Ops (module tab) |
| GET | `/api/v2/learning/governance-status` | Learning governance system status | `SeedLearningGovernanceService` | Seed Ops (module tab) |
| GET | `/api/v2/learning/learning-health` | Comprehensive learning system health check | `SeedLearningGovernanceService` | Seed Ops (module tab) |

---

## Observability

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/arms/observability/execution-timeline` | Execution Timeline | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |
| GET | `/api/v2/arms/observability/learning` | Learning Observability | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |
| GET | `/api/v2/arms/observability/recent-runs` | Recent Runs | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |
| GET | `/api/v2/arms/observability/run/{pipeline_run_id}` | Run Summary | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |
| GET | `/api/v2/arms/observability/utilization` | Utilization | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |
| GET | `/api/v2/monitor/arm-leaderboard` | Arm Leaderboard | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/monitor/data-health` | Data Health | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/monitor/learning-insights` | Learning Insights | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/monitor/live-positions` | Live Positions | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/monitor/market-pulse` | Market Pulse | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/monitor/performance-pulse` | Performance Pulse | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/monitor/quick-stats` | Quick Stats | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/monitor/system-alerts` | System Alerts | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/monitor/top-performers-today` | Top Performers Today | `SeedDashboardService` | Home, Dashboard, widgets, `DetailedPositionsPage`, `ObservabilityPage`, `SeedAllEndpointsTab` |
| GET | `/api/v2/observability/endpoints` | All registered API routes | `SeedDashboardService` | `ObservabilityPage` / tools |
| GET | `/api/v2/observability/performance` | API endpoint latency statistics | `SeedDashboardService` | `ObservabilityPage` / tools |
| GET | `/api/v2/observability/performance/external` | External service call latency | `SeedDashboardService` | `ObservabilityPage` / tools |
| GET | `/api/v2/registry/stats` | Get Registry Stats | `SeedDashboardService` | Shared consumers |

---

## Performance Attribution

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/analytics/arm-performance-breakdown` | Detailed ARM performance analysis | `SeedAttributionAnalyticsService` | Seed Ops (module tab) |
| POST | `/api/v2/analytics/attribution-analysis` | Comprehensive performance attribution analysis | `SeedAttributionAnalyticsService` | Seed Ops (module tab) |
| GET | `/api/v2/analytics/attribution-summary` | Quick attribution summary | `SeedAttributionAnalyticsService` | Seed Ops (module tab) |

---

## Portfolio Risk

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| POST | `/api/v2/portfolio/risk-check` | Check if a position would violate risk limits | `SeedPortfolioRiskService` | Seed Ops (module tab) |
| GET | `/api/v2/portfolio/risk-status` | Portfolio risk metrics and utilization | `SeedPortfolioRiskService` | Seed Ops (module tab) |

---

## Rate Limiting

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/rate-limiting/health` | Rate limiting system health check | `SeedRateLimitingService` | Seed Ops (module tab) |
| POST | `/api/v2/rate-limiting/initialize` | Initialize or reinitialize rate limiting system | `SeedRateLimitingService` | Seed Ops (module tab) |
| GET | `/api/v2/rate-limiting/limits` | Get configured rate limits for all services | `SeedRateLimitingService` | Seed Ops (module tab) |
| POST | `/api/v2/rate-limiting/reset-service/{service_name}` | Reset rate limiting state for a service | `SeedRateLimitingService` | Seed Ops (module tab) |
| GET | `/api/v2/rate-limiting/service/{service_name}` | Get rate limiting status for specific service | `SeedRateLimitingService` | Seed Ops (module tab) |
| POST | `/api/v2/rate-limiting/shutdown` | Shutdown rate limiting system | `SeedRateLimitingService` | Seed Ops (module tab) |
| GET | `/api/v2/rate-limiting/status` | Get comprehensive rate limiting status | `SeedRateLimitingService` | Seed Ops (module tab) |
| GET | `/api/v2/rate-limiting/usage-report` | Generate rate limiting usage report | `SeedRateLimitingService` | Seed Ops (module tab) |

---

## recommendations-v2

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/v2/health/pipeline` | Get Pipeline Health | `SeedDashboardService` / `RecommendationV2Service` | Shared consumers |
| GET | `/v2/learning/performance` | Get Performance | `SeedDashboardService` / `RecommendationV2Service` | Shared consumers |
| GET | `/v2/learning/score-bin-performance` | Get Score Bin Performance | `SeedDashboardService` / `RecommendationV2Service` | Shared consumers |
| GET | `/v2/observability/db` | Get Observability Db | `SeedDashboardService` / `RecommendationV2Service` | Shared consumers |
| GET | `/v2/observability/regime-scoring` | Get Regime Scoring Observability | `SeedDashboardService` / `RecommendationV2Service` | Shared consumers |
| GET | `/v2/position-status` | Get Position Status | `SeedPositionService` | `RecommendationTable` / positions |
| GET | `/v2/recommendations` | Get Recommendations | `RecommendationV2Service` / `RecommendationAPIService` | Recommendations UI |

---

## Regime Analysis

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/regime/current-regime` | Current market regime detection | `SeedRegimeService` | Seed Ops (module tab) |
| GET | `/api/v2/regime/regime-analysis` | Comprehensive regime analysis | `SeedRegimeService` | Seed Ops (module tab) |
| GET | `/api/v2/regime/regime-performance` | Performance analysis by market regime | `SeedRegimeService` | Seed Ops (module tab) |
| GET | `/api/v2/regime/regime-signals` | Real-time regime detection signals | `SeedRegimeService` | Seed Ops (module tab) |

---

## Registry — ARMs

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/arms` | List Arms | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |
| POST | `/api/v2/arms` | Create Arm | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |
| GET | `/api/v2/arms/{arm_name}` | Get Arm | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |
| PUT | `/api/v2/arms/{arm_name}` | Update Arm | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |
| GET | `/api/v2/arms/scenarios` | List Scenarios | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |
| POST | `/api/v2/arms/verify-query` | Verify Query | `SeedArmService` (+ `SeedArmsService` legacy) | `ArmManagerPage` |

---

## Settings (UI)

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/settings` | Get All Settings | `SeedDashboardService` | `SystemSettingsPage` / editors |
| GET | `/api/v2/settings/system` | Get System | `SeedDashboardService` | `SystemSettingsPage` / editors |
| PUT | `/api/v2/settings/system` | Put System | `SeedDashboardService` | `SystemSettingsPage` / editors |
| GET | `/api/v2/settings/system/form` | Get System Form | `SeedDashboardService` | `SystemSettingsPage` / editors |
| GET | `/api/v2/settings/system/schema` | Get System Schema | `SeedDashboardService` | `SystemSettingsPage` / editors |
| GET | `/api/v2/settings/trading` | Get Trading | `SeedDashboardService` | `SystemSettingsPage` / editors |
| PUT | `/api/v2/settings/trading` | Put Trading | `SeedDashboardService` | `SystemSettingsPage` / editors |
| GET | `/api/v2/settings/trading/form` | Get Trading Form | `SeedDashboardService` | `SystemSettingsPage` / editors |
| GET | `/api/v2/settings/trading/schema` | Get Trading Schema | `SeedDashboardService` | `SystemSettingsPage` / editors |

---

## System Optimization

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/api/v2/system/cpu-utilization/{duration_seconds}` | Monitor CPU utilization over time | `SeedSystemOptimizationService` | Seed Ops (module tab) |
| GET | `/api/v2/system/health` | Check system optimization health | `SeedSystemOptimizationService` | Seed Ops (module tab) |
| GET | `/api/v2/system/metrics` | Get current system performance metrics | `SeedSystemOptimizationService` | Seed Ops (module tab) |
| GET | `/api/v2/system/optimize/{workload_type}` | Get optimization recommendations for workload type | `SeedSystemOptimizationService` | Seed Ops (module tab) |
| POST | `/api/v2/system/parallel-execution` | Execute parallel processing task | `SeedSystemOptimizationService` | Seed Ops (module tab) |
| POST | `/api/v2/system/shutdown` | Shutdown CPU optimizer | `SeedSystemOptimizationService` | Seed Ops (module tab) |
| POST | `/api/v2/system/tune` | Apply system tuning optimizations | `SeedSystemOptimizationService` | Seed Ops (module tab) |

---

## Untagged

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/` | Root | `SeedDashboardService` (`getRoot`) | Seed Ops → Utilities |
| GET | `/health` | Health | `RecommendationAPIService` / `RecommendationV2Service` | Service health checks |

---

## WebSocket Streaming

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| GET | `/ws/stream/connections` | Active Connections Info | `SeedObservabilityService` | Observability / streaming diagnostics |

---

## Yahoo Free Tier

| Method | Path | OpenAPI summary | Client module | Primary UI |
|---|---|---|---|---|
| POST | `/api/v2/yahoo-free-tier/clear-cache` | Clear Yahoo Finance cache | `SeedYahooFreeTierService` | Seed Ops (module tab) |
| GET | `/api/v2/yahoo-free-tier/optimization-report` | Get Yahoo free tier optimization report | `SeedYahooFreeTierService` | Seed Ops (module tab) |
| GET | `/api/v2/yahoo-free-tier/quota-check` | Check if Yahoo quota is available for requests | `SeedYahooFreeTierService` | Seed Ops (module tab) |
| POST | `/api/v2/yahoo-free-tier/reset-daily-counter` | Reset daily request counter (admin only) | `SeedYahooFreeTierService` | Seed Ops (module tab) |
| GET | `/api/v2/yahoo-free-tier/usage` | Get Yahoo Finance free tier usage statistics | `SeedYahooFreeTierService` | Seed Ops (module tab) |

---

## Not in OpenAPI but used by the frontend

| Kind | Path | Where used |
|------|------|------------|
| REST | `POST /v2/positions` | `SeedPositionService.openPosition` |
| REST | `POST /v2/positions/close` | `SeedPositionService.closePosition` |
| REST | `GET /v2/recommendations/all` | `SeedPositionService.getAllRecommendations` (may 404 in prod) |
| WS | `/ws/positions` | `SeedWebSocketService` |
| WS | `/ws/system-health` | `SeedWebSocketService` |

---

## Canonical / overlap notes

- **Portfolio risk**: `GET /api/v2/dashboard/portfolio-risk` vs `GET /api/v2/portfolio/risk-status` (Seed Ops).
- **Alerts**: `GET /api/v2/monitor/system-alerts` vs `GET /api/v2/monitoring/alerts`.
- **Learning**: `GET /v2/learning/*` (dashboard) vs `GET /api/v2/learning/*` (governance / Seed Ops).

---

## Refreshing this report

1. `curl -sS "http://203.57.85.201:8182/openapi.json" -o frontend/docs/configuration/seed-openapi.json`
2. Regenerate this file (same structure): adjust the generator in repo history or extend `clientModule` / `uiSurface` heuristics for new prefixes.

