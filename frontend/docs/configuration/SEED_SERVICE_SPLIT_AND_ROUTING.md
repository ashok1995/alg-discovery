# Seed vs position-tracker — routing, behaviour, gaps

Production VM hosts two HTTP services:

| Port | Service (OpenAPI title) | Repo spec |
|------|-------------------------|-----------|
| **8182** | Seed Stocks — Continuous Analysis Pipeline | `seed-openapi.json` |
| **8183** | Position Tracker | `position-tracker-openapi.json` |

Refresh both after backend releases:

```bash
HOST=203.57.85.201
curl -sf "http://${HOST}:8182/openapi.json" -o frontend/docs/configuration/seed-openapi.json
curl -sf "http://${HOST}:8183/openapi.json" -o frontend/docs/configuration/position-tracker-openapi.json
```

## Behavioural differences (not just host)

### Universal positions — `GET /api/v2/dashboard/positions` (8183 only)

- **Query:** `scenario` | `category` (alias), `status`, `outcome`, `trade_type`, `source_arm`, `days` (1–90, default 30), `from_date` / `to_date`, `limit` (0–300, **0 + `include=summary`** = summary-only), `offset`, **`include`**: `summary` | `list` | `summary,list`.
- **Response:** `period_days`, `filters_applied`, `summary`, **`count`** (page/returned rows), **`total_count`** (full filter cardinality), `positions`, `offset`, `generated_at`.
- **Frontend:** `seedDashboardService.getPositions` normalizes to legacy `PositionsResponse`: root `count` is set to **`total_count`** (or summary total) so KPIs match the filtered universe, not only the current page. Extra fields: `total_count`, `page_count`, `filters_applied`, `generated_at`.
- **Summary:** May include `stops`, `targets`, `wins`, `total_entry_charges`, `total_exit_charges`, `trade_type_distribution` (optional).

### Learning / ML status — Seed `GET /api/v2/learning/health` (8182)

- Replaces legacy **`/api/v2/dashboard/learning-status`** on current prod OpenAPI.
- JSON shape is **not** the old `top_10` / `bottom_5` layout; `getLearningStatus()` loads this endpoint and **adapts** it to `LearningStatusResponse` for `MLLearningTab` (sorts `arms.arms[]` by `thompson_weight`).

### Learning observability — split

- **Legacy aggregate:** `GET /api/v2/monitor/learning-insights` — **not** in either current OpenAPI; may 404 until re-homed.
- **8183 monitors:** `GET /api/v2/monitor/learning-health`, `GET /api/v2/monitor/learning-convergence` — exposed as `getPositionTrackerLearningHealth` / `getPositionTrackerLearningConvergence`, shown on Observability → Learning hub when `learning-insights` is missing.

### HTTP client routing

- Implemented in `frontend/src/config/seedEndpointRouting.ts` (`resolveSeedHttpBase`).
- Env: `REACT_APP_SEED_API_BASE_URL` (8182), `REACT_APP_SEED_POSITIONS_API_BASE_URL` (8183).

## Endpoints still called by the UI but missing from both OpenAPI snapshots

Listed in `DASHBOARD_PATHS_NOT_IN_CURRENT_OPENAPI` in `seedEndpointRouting.ts` (daily-summary, overview, quick-stats, live-positions, arm-leaderboard, arms observability learning/utilization, etc.). Those calls will **404** until the backend restores them on Seed or tracker. Handle with empty states / `Promise.allSettled` (already used on several pages).

## Related

- `SEED_OPENAPI_SYNC.md` — how to refresh specs  
- `SEED_UI_ENDPOINT_COVERAGE.md` — table is being updated for the split; prefer this doc for **truth per port**  
- `learning-observability-ui-integration.md` (repo root) — intended aggregate payload when `learning-insights` exists  
