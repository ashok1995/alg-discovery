# Seed Dashboard Data Sync — UI → Backend Mapping

This doc maps where each dashboard metric comes from. **For root cause (curl runs, request params, response analysis) see SEED_DASHBOARD_ROOT_CAUSE_ANALYSIS.md.**

## Prod Seed API base

- **URL:** `http://203.57.85.201:8182` (from `REACT_APP_SEED_API_BASE_URL` in env.prod)
- **Curl script:** `./scripts/seed-prod-curl.sh` — fetches key endpoints and saves JSON under `logs/seed-prod-responses/`

## Where each UI number comes from

| UI location | Metric | Source endpoint | Response path |
|-------------|--------|-----------------|---------------|
| **Main KPI cards** (big cards) | Open Positions | `GET /api/v2/dashboard/daily-summary?days=N` | `positions.open` |
| | Total / Closed | same | `positions.total`, `positions.closed` |
| | Win Rate, Avg Return | same | `positions.win_rate`, `positions.avg_return_pct` |
| **QuickStatsBar** (top right) | Open Positions | `GET /api/v2/monitor/quick-stats` or WebSocket | `open_positions` or WS `open_positions.count` |
| | Lifetime Win Rate | quick-stats | `lifetime_win_rate_pct` |
| **Live Positions tab** | "X open" badge | `GET /api/v2/monitor/live-positions` or WebSocket | `open_positions.count` or `open_positions.positions.length` |
| | Table rows (LTP, Return %, Stop, Target) | live-positions | `open_positions.positions[].current_price`, `unrealized_return_pct`, `distance_to_stop_pct`, `distance_to_target1_pct` |
| **Positions by Horizon** (Home/Dashboard) | Per–trade-type Total/Open/Closed | `GET /api/v2/dashboard/positions?trade_type=X&days=30` | `summary.total`, `summary.open`, `summary.closed` |
| **All Positions tab** | Tracked positions summary | `GET /api/v2/dashboard/positions?days=N&limit=M` | `summary`, `positions` |
| **Capital & P&L** | Open Positions | `GET /api/v2/dashboard/capital-summary?days=N` | `open_positions` |

## Observed deviations (to fix)

1. **Open positions count**
   - Main KPI uses **daily-summary** `positions.open` (e.g. 13).
   - QuickStatsBar uses **quick-stats** `open_positions` or WebSocket (e.g. 29).
   - Live Positions tab uses **live-positions** `open_positions.count`.
   - **Requirement:** All three must use the same definition of “open” and return the same count for the same period/scope.

2. **Closed vs stops hit**
   - If “Stops Hit: 1” then “Closed” should be ≥ 1. Today’s P&L “Closed: 0” with “Stops Hit: 1” is inconsistent.

3. **Win rate / avg return across tabs**
   - Main KPI shows 0% / 0.0% while “Positions by Horizon” or “All Positions” can show 24% / -0.91%. Same period and scope should match.

4. **Total positions**
   - “Today’s P&L” Total: 1 vs “Position Summary by Trade Type” Total: 1 per type (5 types) suggests either “total” is per-type on one side and global on the other, or one is wrong.

5. **Live Positions table gaps**
   - LTP, Return %, “→ Stop”, “→ Target” showing “—” or “No price” mean backend should return `current_price`, `unrealized_return_pct`, `distance_to_stop_pct`, `distance_to_target1_pct` (or equivalent) for each open position when market data is available.

## How to compare with curl

1. Run: `./scripts/seed-prod-curl.sh`
2. Inspect:
   - `logs/seed-prod-responses/daily-summary.json` → `positions.open`, `positions.total`, `positions.closed`
   - `logs/seed-prod-responses/quick-stats.json` → `open_positions`
   - `logs/seed-prod-responses/live-positions.json` → `open_positions.count`, `open_positions.positions[]`
3. Compare: same time window should give same open count and consistent closed/win/return across endpoints. Use **SEED_BACKEND_REQUIREMENTS.md** to hand off fixes to backend.
