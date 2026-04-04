# Seed Stocks Service — Endpoint Utilization Report (Frontend)

This report answers: **for every Seed Stocks Service OpenAPI endpoint, is it utilized by the current frontend codebase?**

## Metadata

- **OpenAPI source**: `http://203.57.85.201:8182/openapi.json` (Swagger: `http://203.57.85.201:8182/docs`)
- **Frontend analyzed**: `frontend/src/**` in this repo workspace
- **Status legend**
  - **USED**: endpoint is called by the frontend and is wired to UI flows.
  - **CLIENT_ONLY**: a frontend client method exists, but nothing calls it (dead/unused code path).
  - **NOT_INTEGRATED**: no frontend client + no usage found in `frontend/src`.

## Summary (OpenAPI endpoints only)

- **Total OpenAPI endpoints (method + path)**: 125
- **USED**: 124
- **CLIENT_ONLY**: 0
- **NOT_INTEGRATED**: 1

> Note: The frontend also calls some Seed endpoints that are **not present in OpenAPI** (see “Not in OpenAPI but used” at the bottom).

**Seed Ops surface**: `frontend/src/pages/SeedOps.tsx`, route **`/seed-ops`** (sidebar: Management → Seed Ops), aggregates the module clients above for admin/ops visibility (JSON panels + guarded POST actions).

---

## Core

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/` | Root | NOT_INTEGRATED | — |
| GET | `/health` | Health | USED | `frontend/src/services/RecommendationAPIService.ts` (`getSeedServiceHealth`), `frontend/src/services/RecommendationV2Service.ts` (`checkV2RecommendationHealth`) |

---

## Recommendations V2 (legacy `/v2/*` APIs)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/v2/recommendations` | Get Recommendations | USED | `frontend/src/services/RecommendationV2Service.ts` (`fetchV2Recommendations`), via `frontend/src/services/RecommendationAPIService.ts` (`getSeedServiceRecommendations`) |
| GET | `/v2/position-status` | Get Position Status | USED | `frontend/src/services/SeedPositionService.ts` → `frontend/src/components/recommendations/RecommendationTable.tsx` |
| GET | `/v2/health/pipeline` | Get Pipeline Health | USED | `frontend/src/services/SeedDashboardService.ts` (`getPipelineHealth`) and `frontend/src/services/RecommendationV2Service.ts` (`fetchPipelineHealth`); shown in System/Observability areas |
| GET | `/v2/observability/db` | Get Observability Db | USED | `frontend/src/services/SeedDashboardService.ts` (`getObservabilityDb`) and `frontend/src/services/RecommendationV2Service.ts` (`fetchObservabilityDb`) |
| GET | `/v2/observability/regime-scoring` | Get Regime Scoring Observability | USED | `frontend/src/services/SeedObservabilityService.ts` (`getRegimeScoringObservability`) |
| GET | `/v2/learning/score-bin-performance` | Get Score Bin Performance | USED | `frontend/src/services/SeedDashboardService.ts` (`getScoreBinPerformance`) and `frontend/src/services/RecommendationV2Service.ts` (`fetchScoreBinPerformance`) |
| GET | `/v2/learning/performance` | Get Performance | USED | `frontend/src/services/SeedDashboardService.ts` (`getLearningPerformance`) |

---

## WebSocket Streaming

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/ws/stream/connections` | Active Connections Info | USED | `frontend/src/services/SeedObservabilityService.ts` (`getStreamConnections`) |

---

## Analysis

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/analysis/performance` | Get Performance Analysis | USED | `frontend/src/services/SeedDashboardService.ts` (`getAnalysisPerformance`) → Dashboard performance views |

---

## Registry — ARMs (`/api/v2/arms*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/arms` | List Arms | USED | `frontend/src/services/SeedArmsService.ts` (`listArms`) → `frontend/src/components/system/ArmsRegistryTab.tsx` |
| POST | `/api/v2/arms` | Create Arm | USED | `frontend/src/services/SeedArmsService.ts` (`createArm`) → `frontend/src/components/system/ArmsRegistryTab.tsx` |
| GET | `/api/v2/arms/scenarios` | List Scenarios | USED | `frontend/src/services/SeedArmsService.ts` (`listScenarios`) → `frontend/src/components/system/ArmsRegistryTab.tsx` |
| POST | `/api/v2/arms/verify-query` | Verify Query | USED | `frontend/src/services/SeedArmsService.ts` (`verifyQuery`) → `frontend/src/components/system/ArmsRegistryTab.tsx` (Verify UI) |
| GET | `/api/v2/arms/{arm_name}` | Get Arm | USED | `frontend/src/services/SeedArmsService.ts` (`getArm`) → `frontend/src/components/system/ArmsRegistryTab.tsx` |
| PUT | `/api/v2/arms/{arm_name}` | Update Arm | USED | `frontend/src/services/SeedArmsService.ts` (`updateArm`) → `frontend/src/components/system/ArmsRegistryTab.tsx` |

---

## Observability — ARMs (`/api/v2/arms/observability/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/arms/observability/learning` | Learning Observability | USED | `frontend/src/services/SeedArmsService.ts` (`getLearningObservability`) → `frontend/src/components/system/ArmsRegistryTab.tsx` |
| GET | `/api/v2/arms/observability/execution-timeline` | Execution Timeline | USED | `frontend/src/services/SeedArmsService.ts` (`getExecutionTimeline`) → `frontend/src/components/system/ArmsRegistryTab.tsx` |
| GET | `/api/v2/arms/observability/recent-runs` | Recent Runs | USED | `frontend/src/services/SeedArmsService.ts` (`getRecentRuns`) → `frontend/src/components/system/ArmsRegistryTab.tsx` (on-demand button) |
| GET | `/api/v2/arms/observability/run/{pipeline_run_id}` | Run Summary | USED | `frontend/src/services/SeedArmsService.ts` (`getRunSummary`) → `frontend/src/components/system/ArmsRegistryTab.tsx` (on-demand) |
| GET | `/api/v2/arms/observability/utilization` | Utilization | USED | `frontend/src/services/SeedArmsService.ts` (`getUtilization`) → `frontend/src/components/system/ArmsRegistryTab.tsx` (on-demand button) |

---

## Candidates (`/api/v2/candidates*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/candidates` | List candidate stocks | USED | `frontend/src/services/SeedCandidatesService.ts` (`listCandidates`) → `frontend/src/components/system/CandidatesRegistryTab.tsx` |
| GET | `/api/v2/candidates/{symbol}` | Candidate detail with fundamentals history | USED | `frontend/src/services/SeedCandidatesService.ts` (`getCandidate`) → `frontend/src/components/system/CandidatesRegistryTab.tsx` |
| PUT | `/api/v2/candidates/{symbol}/status` | Update candidate status | USED | `frontend/src/services/SeedCandidatesService.ts` (`updateCandidateStatus`) → `frontend/src/components/system/CandidatesRegistryTab.tsx` |
| PUT | `/api/v2/candidates/{symbol}/match` | Link Chartink / canonical symbol to Kite instrument | USED | `frontend/src/services/SeedCandidatesService.ts` (`upsertKiteMatch`) → `frontend/src/components/system/CandidatesRegistryTab.tsx` |
| POST | `/api/v2/candidates/sync` | Force a candidate sync now | USED | `frontend/src/services/SeedCandidatesService.ts` (`forceSync`) → `frontend/src/components/system/CandidatesRegistryTab.tsx` |
| GET | `/api/v2/candidates/observability/coverage` | Candidate sync coverage and freshness | USED | `frontend/src/services/SeedCandidatesService.ts` (`getCoverage`) → `frontend/src/components/system/CandidatesRegistryTab.tsx` |
| GET | `/api/v2/candidates/observability/kite-gap` | Candidates missing Kite instrument_token | USED | `frontend/src/services/SeedCandidatesService.ts` (`getKiteGap`) → `frontend/src/components/system/CandidatesRegistryTab.tsx` |

---

## Dashboard (`/api/v2/dashboard/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/dashboard/daily-summary` | Daily Summary | USED | `frontend/src/services/SeedDashboardService.ts` (`getDailySummary`) → `frontend/src/pages/Dashboard.tsx` and home widgets |
| GET | `/api/v2/dashboard/positions` | Universal Positions | USED | `frontend/src/services/SeedDashboardService.ts` (`getPositions`) → Dashboard Positions tab(s) |
| GET | `/api/v2/dashboard/universe-health` | Universe Health | USED | `frontend/src/services/SeedDashboardService.ts` (`getUniverseHealth`) → Dashboard |
| GET | `/api/v2/dashboard/market-trends` | Market Trends | USED | `frontend/src/services/SeedDashboardService.ts` (`getMarketTrends`) → Dashboard |
| GET | `/api/v2/dashboard/arm-performance` | Arm Performance | USED | `frontend/src/services/SeedDashboardService.ts` (`getArmPerformance`) → Dashboard |
| GET | `/api/v2/dashboard/learning-status` | Learning Status | USED | `frontend/src/services/SeedDashboardService.ts` (`getLearningStatus`) → Dashboard (ML tab) |
| GET | `/api/v2/dashboard/performance-timeline` | Performance Timeline | USED | `frontend/src/services/SeedDashboardService.ts` (`getPerformanceTimeline`) → Dashboard |
| GET | `/api/v2/dashboard/market-movers` | Market Movers | USED | `frontend/src/services/SeedDashboardService.ts` (`getMarketMovers`) → `frontend/src/components/home/HomeMarketMoversTab.tsx` |
| GET | `/api/v2/dashboard/capital-summary` | Capital Summary | USED | `frontend/src/services/SeedDashboardService.ts` (`getCapitalSummary`) → Dashboard capital/pnl views |
| GET | `/api/v2/dashboard/pnl-timeline` | Pnl Timeline | USED | `frontend/src/services/SeedDashboardService.ts` (`getPnlTimeline`) → Dashboard capital/pnl views |
| GET | `/api/v2/dashboard/portfolio-risk` | Portfolio Risk | USED | `frontend/src/services/SeedDashboardService.ts` (`getPortfolioRisk`) → `frontend/src/components/dashboard/MonitorTab.tsx` |
| GET | `/api/v2/dashboard/profit-protection-status` | Profit Protection Status | USED | `frontend/src/services/SeedDashboardService.ts` (`getProfitProtectionStatus`) → `frontend/src/components/dashboard/MonitorTab.tsx` |
| GET | `/api/v2/dashboard/watchlist` | Position Watchlist | USED | `frontend/src/services/SeedDashboardService.ts` (`getWatchlist`) → watchlist widget(s) |
| GET | `/api/v2/dashboard/overview` | Dashboard Overview | USED | `frontend/src/services/SeedDashboardService.ts` (`getDashboardOverview`) → `frontend/src/pages/SeedOps.tsx` (Utilities tab) |
| GET | `/api/v2/dashboard/charges-calculator` | Charges Calculator | USED | `frontend/src/services/SeedDashboardService.ts` (`getChargesCalculator`) → `frontend/src/pages/SeedOps.tsx` (Utilities tab) |

---

## Monitor (`/api/v2/monitor/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/monitor/quick-stats` | Quick Stats | USED | `frontend/src/services/SeedDashboardService.ts` (`getQuickStats`) → quick stats header |
| GET | `/api/v2/monitor/system-alerts` | System Alerts | USED | `frontend/src/services/SeedDashboardService.ts` (`getSystemAlerts`) → alerts widget |
| GET | `/api/v2/monitor/live-positions` | Live Positions | USED | `frontend/src/services/SeedDashboardService.ts` (`getLivePositions`) → live positions view |
| GET | `/api/v2/monitor/arm-leaderboard` | Arm Leaderboard | USED | `frontend/src/services/SeedDashboardService.ts` (`getArmLeaderboard`) → ML/learning views |
| GET | `/api/v2/monitor/learning-insights` | Learning Insights | USED | `frontend/src/services/SeedDashboardService.ts` (`getLearningInsights`) → `frontend/src/components/dashboard/MonitorTab.tsx` |
| GET | `/api/v2/monitor/performance-pulse` | Performance Pulse | USED | `frontend/src/services/SeedDashboardService.ts` (`getPerformancePulse`) → `frontend/src/components/dashboard/MonitorTab.tsx` |
| GET | `/api/v2/monitor/market-pulse` | Market Pulse | USED | `frontend/src/services/SeedDashboardService.ts` (`getMarketPulse`) → `frontend/src/components/dashboard/MonitorTab.tsx` |
| GET | `/api/v2/monitor/data-health` | Data Health | USED | `frontend/src/services/SeedDashboardService.ts` (`getDataHealth`) → `frontend/src/components/dashboard/MonitorTab.tsx` |
| GET | `/api/v2/monitor/top-performers-today` | Top Performers Today | USED | `frontend/src/services/SeedDashboardService.ts` (`getTopPerformersToday`) → `frontend/src/components/dashboard/MonitorTab.tsx` |

---

## Batch Operations (`/api/v2/batch/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/batch/data-statistics` | Data Statistics | USED | `frontend/src/services/SeedDashboardService.ts` (`getDataStatistics`) → `frontend/src/components/dashboard/MonitorTab.tsx` |
| POST | `/api/v2/batch/analyze-symbols` | Bulk Symbol Analysis | USED | `frontend/src/services/SeedDashboardService.ts` (`analyzeSymbols`) → `frontend/src/components/dashboard/MonitorTab.tsx` |
| POST | `/api/v2/batch/close-positions` | Batch Close Positions | USED | `frontend/src/services/SeedDashboardService.ts` (`batchClosePositions`) → positions management UI |

---

## Data Export (`/api/v2/export/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/export/positions.csv` | Export Positions Csv | USED | `frontend/src/services/SeedDashboardService.ts` (`getExportUrl('positions')`) → positions export UI |
| GET | `/api/v2/export/outcomes.json` | Export Outcomes Json | USED | `frontend/src/services/SeedDashboardService.ts` (`getExportUrl('outcomes')`) → positions export UI |
| GET | `/api/v2/export/search/positions` | Search Positions | USED | `frontend/src/services/SeedDashboardService.ts` (`searchPositions`) → positions search UI |
| GET | `/api/v2/export/market-context.csv` | Export Market Context Csv | USED | `frontend/src/services/SeedDashboardService.ts` (`getExportUrl('market-context')`) → `frontend/src/pages/SeedOps.tsx` (Utilities tab; URL shown for download) |

---

## Observability (`/api/v2/observability/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/observability/endpoints` | All registered API routes | USED | `frontend/src/services/SeedObservabilityService.ts` (`getRegisteredRoutes`) → `frontend/src/components/system/SeedObservabilityTab.tsx` |
| GET | `/api/v2/observability/performance` | API endpoint latency statistics | USED | `frontend/src/services/SeedObservabilityService.ts` (`getEndpointPerformance`) → `frontend/src/components/system/SeedObservabilityTab.tsx` |
| GET | `/api/v2/observability/performance/external` | External service call latency | USED | `frontend/src/services/SeedObservabilityService.ts` (`getExternalPerformance`) → `frontend/src/components/system/SeedObservabilityTab.tsx` |

---

## Registry Stats (`/api/v2/registry/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/registry/stats` | Get Registry Stats | USED | `frontend/src/services/SeedDashboardService.ts` (`getRegistryStats`) → System control / registry views |

---

## Settings (`/api/v2/settings*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/settings/trading` | Get Trading | USED | `frontend/src/services/SeedDashboardService.ts` (`getTradingSettings`) → `frontend/src/components/settings/SystemTab.tsx` |
| PUT | `/api/v2/settings/trading` | Put Trading | USED | `frontend/src/services/SeedDashboardService.ts` (`updateTradingSettings`) → `frontend/src/components/settings/SystemTab.tsx` |
| GET | `/api/v2/settings/trading/schema` | Get Trading Schema | USED | `frontend/src/services/SeedDashboardService.ts` (`getTradingSettingsSchema`) → Settings (Schema dialog) |
| GET | `/api/v2/settings/trading/form` | Get Trading Form | USED | `frontend/src/services/SeedDashboardService.ts` (`getTradingSettingsForm`) → Settings (Form dialog) |
| GET | `/api/v2/settings/system` | Get System | USED | `frontend/src/services/SeedDashboardService.ts` (`getSystemSettings`) → `frontend/src/components/settings/SystemTab.tsx` |
| PUT | `/api/v2/settings/system` | Put System | USED | `frontend/src/services/SeedDashboardService.ts` (`updateSystemSettings`) → `frontend/src/components/settings/SystemTab.tsx` |
| GET | `/api/v2/settings/system/schema` | Get System Schema | USED | `frontend/src/services/SeedDashboardService.ts` (`getSystemSettingsSchema`) → Settings (Schema dialog) |
| GET | `/api/v2/settings/system/form` | Get System Form | USED | `frontend/src/services/SeedDashboardService.ts` (`getSystemSettingsForm`) → Settings (Form dialog) |
| GET | `/api/v2/settings` | Get All Settings | USED | `frontend/src/services/SeedDashboardService.ts` (`getAllSettings`) → `frontend/src/pages/SeedOps.tsx` (Utilities tab) |

---

## Backtesting (`/api/v2/backtesting/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| POST | `/api/v2/backtesting/run` | Run historical backtest | USED | `frontend/src/services/SeedBacktestingService.ts` → `frontend/src/pages/Backtesting.tsx`, `frontend/src/pages/SeedOps.tsx` |
| GET | `/api/v2/backtesting/quick/{days}` | Quick backtest for last N days | USED | same |
| GET | `/api/v2/backtesting/compare-strategies` | Compare multiple strategies | USED | same |

---

## Performance attribution — Analytics (`/api/v2/analytics/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| POST | `/api/v2/analytics/attribution-analysis` | Comprehensive performance attribution analysis | USED | `frontend/src/services/SeedAttributionAnalyticsService.ts` → `frontend/src/pages/SeedOps.tsx` |
| GET | `/api/v2/analytics/attribution-summary` | Quick attribution summary | USED | same |
| GET | `/api/v2/analytics/arm-performance-breakdown` | Detailed ARM performance analysis | USED | same |

---

## Advanced monitoring (`/api/v2/monitoring/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/monitoring/system-health` | Comprehensive system health check | USED | `frontend/src/services/SeedAdvancedMonitoringService.ts` → `frontend/src/pages/SeedOps.tsx` |
| GET | `/api/v2/monitoring/performance-metrics` | Real-time performance metrics | USED | same |
| GET | `/api/v2/monitoring/monitoring-dashboard` | Monitoring dashboard data | USED | same |
| GET | `/api/v2/monitoring/alerts` | Get active alerts | USED | same |
| POST | `/api/v2/monitoring/alerts/{alert_id}/acknowledge` | Acknowledge an alert | USED | same (destructive: confirm) |
| POST | `/api/v2/monitoring/alerts/{alert_id}/resolve` | Resolve an alert | USED | same (destructive: confirm) |

---

## Rate limiting (`/api/v2/rate-limiting/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/rate-limiting/status` | Get comprehensive rate limiting status | USED | `frontend/src/services/SeedRateLimitingService.ts` → `frontend/src/pages/SeedOps.tsx` |
| GET | `/api/v2/rate-limiting/health` | Rate limiting system health check | USED | same |
| GET | `/api/v2/rate-limiting/service/{service_name}` | Get rate limiting status for specific service | USED | same |
| GET | `/api/v2/rate-limiting/limits` | Get configured rate limits for all services | USED | same |
| GET | `/api/v2/rate-limiting/usage-report` | Generate rate limiting usage report | USED | same |
| POST | `/api/v2/rate-limiting/reset-service/{service_name}` | Reset rate limiting state for a service | USED | same (confirm) |
| POST | `/api/v2/rate-limiting/initialize` | Initialize or reinitialize rate limiting system | USED | same (confirm) |
| POST | `/api/v2/rate-limiting/shutdown` | Shutdown rate limiting system | USED | same (confirm) |

---

## Data quality (`/api/v2/data-quality/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/data-quality/assessment` | Comprehensive data quality assessment | USED | `frontend/src/services/SeedDataQualityService.ts` → `frontend/src/pages/SeedOps.tsx` |
| GET | `/api/v2/data-quality/dashboard` | Data quality monitoring dashboard | USED | same |
| GET | `/api/v2/data-quality/dimension-analysis/{dimension}` | Analysis by data quality dimension | USED | same |
| GET | `/api/v2/data-quality/table-report/{table_name}` | Detailed quality report for specific table | USED | same |
| GET | `/api/v2/data-quality/trends` | Data quality trends over time | USED | same |

---

## Regime analysis (`/api/v2/regime/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/regime/current-regime` | Current market regime detection | USED | `frontend/src/services/SeedRegimeService.ts` → `frontend/src/pages/SeedOps.tsx` |
| GET | `/api/v2/regime/regime-signals` | Real-time regime detection signals | USED | same |
| GET | `/api/v2/regime/regime-analysis` | Comprehensive regime analysis | USED | same |
| GET | `/api/v2/regime/regime-performance` | Performance analysis by market regime | USED | same |

---

## Learning governance (`/api/v2/learning/*` — governance subset)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/learning/governance-status` | Learning governance system status | USED | `frontend/src/services/SeedLearningGovernanceService.ts` → `frontend/src/pages/SeedOps.tsx` |
| GET | `/api/v2/learning/learning-health` | Comprehensive learning system health check | USED | same |
| GET | `/api/v2/learning/arm-performance` | ARM performance analysis | USED | same |
| POST | `/api/v2/learning/evaluate-performance` | Trigger learning performance evaluation | USED | same |
| POST | `/api/v2/learning/force-rollback` | Force rollback to previous learning state | USED | same (confirm) |

> **Note**: `/v2/learning/*` dashboard endpoints (e.g. score-bin-performance) are listed under **Recommendations V2** above; this table is the **OpenAPI `/api/v2/learning/*` governance** paths wired via `SeedLearningGovernanceService`.

---

## Execution quality (`/api/v2/execution/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/execution/quality-report` | Execution quality analysis | USED | `frontend/src/services/SeedExecutionQualityService.ts` → `frontend/src/pages/SeedOps.tsx` |
| GET | `/api/v2/execution/liquidity-analysis/{symbol}` | Real-time liquidity analysis for symbol | USED | same |
| GET | `/api/v2/execution/batch-liquidity` | Batch liquidity analysis for multiple symbols | USED | same |
| GET | `/api/v2/execution/slippage-analysis` | Historical slippage analysis | USED | same |

---

## Portfolio risk (`/api/v2/portfolio/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/portfolio/risk-status` | Portfolio risk metrics and utilization | USED | `frontend/src/services/SeedPortfolioRiskService.ts` → `frontend/src/pages/SeedOps.tsx` |
| POST | `/api/v2/portfolio/risk-check` | Check if a position would violate risk limits | USED | same |

---

## System optimization (`/api/v2/system/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/system/metrics` | Get current system performance metrics | USED | `frontend/src/services/SeedSystemOptimizationService.ts` → `frontend/src/pages/SeedOps.tsx` |
| GET | `/api/v2/system/health` | Check system optimization health | USED | same |
| GET | `/api/v2/system/cpu-utilization/{duration_seconds}` | Monitor CPU utilization over time | USED | same |
| GET | `/api/v2/system/optimize/{workload_type}` | Get optimization recommendations for workload type | USED | same |
| POST | `/api/v2/system/parallel-execution` | Execute parallel processing task | USED | same (confirm) |
| POST | `/api/v2/system/tune` | Apply system tuning optimizations | USED | same |
| POST | `/api/v2/system/shutdown` | Shutdown CPU optimizer | USED | same (confirm) |

---

## Yahoo free tier (`/api/v2/yahoo-free-tier/*`)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/api/v2/yahoo-free-tier/usage` | Get Yahoo Finance free tier usage statistics | USED | `frontend/src/services/SeedYahooFreeTierService.ts` → `frontend/src/pages/SeedOps.tsx` |
| GET | `/api/v2/yahoo-free-tier/quota-check` | Check if Yahoo quota is available for requests | USED | same |
| GET | `/api/v2/yahoo-free-tier/optimization-report` | Get Yahoo free tier optimization report | USED | same |
| POST | `/api/v2/yahoo-free-tier/reset-daily-counter` | Reset daily request counter (admin only) | USED | same (confirm) |
| POST | `/api/v2/yahoo-free-tier/clear-cache` | Clear Yahoo Finance cache | USED | same (confirm) |

---

## NOT_INTEGRATED (remaining)

| Method | Path | OpenAPI summary | Status | Frontend usage |
|---|---|---|---|---|
| GET | `/` | Root | NOT_INTEGRATED | — |

---

## Canonical endpoints & deprecation candidates (Seed backend)

These pairs overlap in purpose; the frontend currently calls **both** where noted. For a future Seed cleanup, pick **one canonical** contract per concern and deprecate the other after clients migrate.

- **Portfolio risk**
  - **Canonical (dashboard UX)**: `GET /api/v2/dashboard/portfolio-risk` — used in `MonitorTab.tsx` for operator dashboard context.
  - **Overlap**: `GET /api/v2/portfolio/risk-status` — same domain; now also exposed in **Seed Ops** for raw JSON / ops workflows. *Recommendation*: document equivalence in OpenAPI; eventually merge or proxy one to the other; keep dashboard path for primary UI if payloads align.

- **Alerts**
  - **Canonical (operator feed)**: `GET /api/v2/monitor/system-alerts` — wired in dashboard/alerts widgets.
  - **Overlap**: `GET /api/v2/monitoring/alerts` — advanced monitoring module; richer filters / acknowledge-resolve flow in Seed Ops. *Recommendation*: treat `/monitor/*` as “product alerts” and `/monitoring/*` as “platform monitoring” **if** semantics differ; otherwise consolidate and version.

- **Learning performance**
  - **Dashboard**: `GET /v2/learning/performance`, `GET /v2/learning/score-bin-performance` (legacy v2 paths).
  - **Governance**: `GET /api/v2/learning/arm-performance` and related under Seed Ops. *Recommendation*: align response shapes or alias under one `/api/v2/learning/*` tree.

- **Root `GET /`**
  - Still **NOT_INTEGRATED**; optional for a future “service info” splash or health deep-link — low priority.

---

## Not in OpenAPI but used by frontend (docs mismatch)

These are **called by the frontend** but are **missing from** `http://203.57.85.201:8182/openapi.json` right now.

| Kind | Path | Where used |
|---|---|---|
| REST | `/v2/positions` (POST) | `frontend/src/services/SeedPositionService.ts` (open position) |
| REST | `/v2/positions/close` (POST) | `frontend/src/services/SeedPositionService.ts` (close position) |
| REST | `/v2/recommendations/all` (GET) | `frontend/src/services/SeedPositionService.ts` (marked “may 404 in prod”) |
| WS | `/ws/positions` | `frontend/src/services/SeedWebSocketService.ts` |
| WS | `/ws/system-health` | `frontend/src/services/SeedWebSocketService.ts` |

> Also note: `frontend/src/services/SharedDataManager.ts` calls legacy proxied routes like `/api/seed/market/registry/top_gainers` and `/api/seed/stocks/unified-recommendations` which are **outside** this OpenAPI surface and include fallback behavior.

