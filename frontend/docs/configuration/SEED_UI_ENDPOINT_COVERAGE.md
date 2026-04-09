# Seed prod API — OpenAPI ↔ UI coverage

**Split services:** See **`SEED_SERVICE_SPLIT_AND_ROUTING.md`** — Seed **8182** vs position-tracker **8183** (separate OpenAPI files).

**Canonical specs:** `seed-openapi.json` (8182), `position-tracker-openapi.json` (8183).  
**Curl samples:** `./scripts/seed-prod-curl.sh` (8182-oriented; add 8183 curls for positions/batch as needed).

## Recommendations (no `risk_level`)

Prod **GET `/v2/recommendations`** accepts only **`trade_type`**, **`limit`**, **`min_score`** (see OpenAPI). The frontend **does not send `risk_level`** to Seed. UI may still show a “risk” control for legacy copy or future non-Seed paths; it does not affect the Seed query.

## Single-responsibility split

- **Settings** (`/settings`): Configure values only — API & connections, Workspace preferences, Seed trading/platform (dual-tier: Essentials | Seed advanced). No pipeline/DB views.
- **Observability** (`/observability`): Read-only telemetry — Pulse, Pipeline & storage, Service map, Learning & arms. No configuration.

## Path → UI surface

| Path | Method | UI / service |
|------|--------|----------------|
| `/` | GET | Infra only |
| `/health` | GET | `RecommendationAPIService.getSeedServiceHealth`, health checks |
| `/openapi.json` | GET | Docs / `seed-openapi.json` in repo |
| `/v2/recommendations` | GET | Recommendations flow → `RecommendationV2Service.fetchV2Recommendations` |
| `/v2/position-status` | GET | `SeedPositionService` → Recommendation table |
| `/v2/positions` | POST | Open position |
| `/v2/positions/close` | POST | Close position |
| `/v2/learning/score-bin-performance` | GET | Dashboard → ML / Learning |
| `/v2/learning/performance` | GET | Dashboard → Performance |
| `/v2/health/pipeline` | GET | System Control |
| `/v2/observability/db` | GET | System Control |
| `/api/v2/registry/stats` | GET | System Control |
| `/api/v2/dashboard/*` | GET | Dashboard tabs (daily-summary, positions, universe, trends, arm-performance, learning-status, performance-timeline, **market-movers**, overview, watchlist, capital-summary, pnl-timeline, charges-calculator, profit-protection, portfolio-risk) |
| `/api/v2/analysis/performance` | GET | Dashboard → Performance |
| `/api/v2/monitor/quick-stats` | GET | `QuickStatsBar` (optional scenario in service) |
| `/api/v2/monitor/system-alerts` | GET | `SystemAlertsWidget` |
| `/api/v2/monitor/live-positions` | GET | Live Positions tab |
| `/api/v2/monitor/market-pulse` | GET | **Dashboard → Seed API hub** |
| `/api/v2/monitor/performance-pulse` | GET | **Seed API hub** (scenario-aware service) |
| `/api/v2/monitor/arm-leaderboard` | GET | **Seed API hub** |
| `/api/v2/monitor/learning-insights` | GET | **Seed API hub** |
| `/api/v2/monitor/top-performers-today` | GET | **Seed API hub** |
| `/api/v2/monitor/data-health` | GET | **Seed API hub** |
| `/api/v2/batch/data-statistics` | GET | **Seed API hub** |
| `/api/v2/batch/analyze-symbols` | POST | **Seed API hub** (form) |
| `/api/v2/batch/close-positions` | POST | **Gap** — destructive; needs confirm + role gate (see below) |
| `/api/v2/export/*` | GET | **Seed API hub** (download links) |
| `/api/v2/export/search/positions` | GET | **Seed API hub** (search) |
| `/api/v2/settings` | GET | **Seed API hub** (read-only JSON) |
| `/api/v2/settings/trading` | GET/PUT | Trading settings flows / System Settings (where wired) |
| `/api/v2/settings/trading/schema` | GET | Settings forms (where wired) |
| `/api/v2/settings/system` | GET/PUT | `getSystemSettings` / `updateSystemSettings` in service — **Gap:** no full editor UI |
| `/api/v2/settings/system/schema` | GET | **Gap:** wire to generated form if desired |
| `/api/v2/settings/system/form` | GET | System Settings → Seed platform (form layout) |
| `/api/v2/settings/trading/form` | GET | Seed trading form (optional) |
| `/api/v2/observability/endpoints` | GET | **Observability page** → Service map tab |
| `/api/v2/observability/performance` | GET | **Observability page** → Service map tab |
| `/api/v2/observability/performance/external` | GET | **Observability page** → Service map tab |
| `/v2/observability/regime-scoring` | GET | **Observability page** → Service map tab |
| `/api/v2/arms` | GET | **ARM manager** (`/arm-manager`) → catalog tab — `SeedArmService.listArms` |
| `/api/v2/arms` | POST | **ARM manager** → Verify & create tab — `SeedArmService.createArm` |
| `/api/v2/arms/scenarios` | GET | **ARM manager** → Scenarios tab — `SeedArmService.listScenarios` |
| `/api/v2/arms/{arm_name}` | GET | **ARM manager** → row View/edit — `SeedArmService.getArm` |
| `/api/v2/arms/{arm_name}` | PUT | **ARM manager** → edit dialog — `SeedArmService.updateArm` |
| `/api/v2/arms/verify-query` | POST | **ARM manager** → Verify & create tab — `SeedArmService.verifyQuery` |
| `/api/v2/arms/observability/execution-timeline` | GET | **ARM manager** → Observability tab — `SeedArmService.getExecutionTimeline` |
| `/api/v2/arms/observability/run/{pipeline_run_id}` | GET | **ARM manager** → Observability tab (run summary) — `SeedArmService.getRunSummary` |
| `/api/v2/arms/observability/learning` | GET | **Observability page** → Learning & arms tab; **ARM manager** → Observability tab — `SeedArmService.getObservabilityLearning` |
| `/api/v2/arms/observability/utilization` | GET | **Observability page** → Learning & arms tab; **ARM manager** → Observability tab — `SeedArmService.getObservabilityUtilization` |
| `/api/v2/dashboard/arm-performance` | GET | **ARM manager** → Performance tab — `seedDashboardService.getArmPerformance` |
| `/api/v2/candidates/observability/coverage` | GET | **Observability page** → Learning & arms tab |
| `/ws/stream/connections` | GET | Debug only; **Gap:** admin-only page |
| WebSocket stream | — | `SeedWebSocketService` / `useSeedWebSocket` (not REST) |

## Gaps / requirements

1. **Batch close positions** — POST with live price side effects. **Requirement:** two-step confirm, optional PIN/role, audit log; surface only on Positions or admin.
2. **PUT `/api/v2/settings/system`** — **Requirement:** form from `GET /api/v2/settings/system/form` + schema validation; dry-run preview before save.
3. **Scenario filter everywhere** — Quick stats bar and live positions could pass `scenario` when product wants paper vs learning split; service methods support optional `scenario`/`category` where OpenAPI allows.
4. **`/v2/recommendations/all`** — Not in OpenAPI; do not call. Use per–`trade_type` calls (already documented in `SEED_SERVICE_INTEGRATION.md`).

## Related docs

- `SEED_SERVICE_INTEGRATION.md` — config, curl, endpoint list  
- `SEED_POSITION_ENDPOINTS_SPEC.md` — universal positions filters  
- `SEED_BACKEND_REQUIREMENTS.md` — backend alignment  
