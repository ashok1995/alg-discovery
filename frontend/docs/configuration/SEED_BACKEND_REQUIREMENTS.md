# Seed Backend Requirements — Dashboard Data Consistency

**See also:**
- **SEED_UI_ENDPOINT_COVERAGE.md** — OpenAPI paths mapped to **UI / service**; gaps (batch close, system settings editor, WS debug).
- **SEED_POSITION_ENDPOINTS_SPEC.md** — Detailed **request/response parameters** and **endpoint behaviour** for all position-related APIs, plus **universal position endpoint** proposal (single source of truth to avoid data mismatch).
- **SEED_INVESTING_REQUIREMENTS.md** — **Investing / money monitoring**: minimal endpoint (extend `capital-summary` or one overview), request/response for "where is money", allocation by trade type, performance.
- **SEED_DASHBOARD_ROOT_CAUSE_ANALYSIS.md** — Curl commands, exact request params, and response excerpts used to reach these conclusions.

Hand-off document for backend (seed-stocks-service) to align API responses and fix dashboard data deviation. Frontend expects a single source of truth for “open”, “closed”, win rate, and returns across all dashboard endpoints.

---

## 0. Position endpoints: prefer one universal endpoint (detailed spec in SEED_POSITION_ENDPOINTS_SPEC.md)

**Requirement:** Reduce multiple position endpoints (daily-summary, positions, live-positions, quick-stats, capital-summary, etc.) to a **single canonical contract** where possible. Multiple endpoints are hard to keep in sync and cause data mismatch (e.g. open count 13 vs 29, win rate 0% vs 24%).

**Recommended approach:**
- **One primary endpoint** (e.g. `GET /api/v2/positions` or keep `GET /api/v2/dashboard/positions`) with:
  - **Full request parameter set:** `scenario`, `trade_type`, `status`, `outcome`, `source_arm`, `days`, `from_date`, `to_date`, `limit`, `offset`, `include` (summary / list).
  - **Full response:** `summary` (always over the **entire** filtered set, not just the returned page), optional `positions` array, `total_count` for pagination.
- **Same open/closed/summary definitions** used by daily-summary, quick-stats, live-positions, capital-summary (either they call the same logic or are clearly documented as a different scope).
- **Export and search** accept the same query parameters as the universal endpoint.

**Detailed request/response tables, behaviour, and migration notes:** see **SEED_POSITION_ENDPOINTS_SPEC.md**. That doc also defines **enums for all position-related fields** (scenario, trade_type, status, outcome, include, market_status, system_status, etc.) so the backend has a single list of allowed values.

---

## 1. Single definition of “open” and “closed”

**Requirement:** Every endpoint that exposes position counts must use the same business rules for “open” vs “closed” and the same scope (e.g. same period or “all time” where applicable).

Affected endpoints:

- `GET /api/v2/dashboard/daily-summary` — `positions.open`, `positions.closed`, `positions.total`
- `GET /api/v2/monitor/quick-stats` — `open_positions`
- `GET /api/v2/monitor/live-positions` — `open_positions.count`, `open_positions.positions[]`
- `GET /api/v2/dashboard/positions` — `summary.open`, `summary.closed`, `summary.total`
- `GET /api/v2/dashboard/capital-summary` — `open_positions`
- `GET /api/v2/monitor/performance-pulse` — `current_open_positions`

**Acceptance:** For the same point in time and same filters (e.g. period_days, category), the open count returned by daily-summary, quick-stats, and live-positions must match. Closed count must be consistent with outcomes (e.g. if a position is “stop hit”, it must be counted as closed).

---

## 2. Consistency between daily-summary and positions summary

**Requirement:** For the same `days` (and category if applicable):

- `daily-summary.positions` (open, closed, total, wins, win_rate, avg_return_pct, stops) must match the aggregate of `GET /api/v2/dashboard/positions` with the same filters (e.g. no trade_type = all types).

**Acceptance:** No contradiction such as “Closed: 0” in daily-summary when “Stops Hit: 1”; closed ≥ stops (and target hits). Win rate and avg return from daily-summary must match the same scope as positions endpoint.

---

## 3. Per–trade-type totals vs global totals

**Requirement:** Clarify and document:

- Whether “Today’s P&L” / daily-summary is **global** (all trade types) or something else.
- Whether “Position Summary by Trade Type” shows **per-type** totals (so sum of 5 types can be larger than global total if a position is counted in one type only).

**Acceptance:** Frontend can show either “global total” or “per-type totals” without contradicting each other. If both are shown, backend either provides both explicitly or docs state how to derive one from the other.

---

## 4. Live positions: LTP, return %, stop/target distance

**Requirement:** `GET /api/v2/monitor/live-positions` for each item in `open_positions.positions[]` should return when available:

- `current_price` (LTP) so frontend does not show “—” for LTP.
- `unrealized_return_pct` (or equivalent) for Return %.
- `distance_to_stop_pct` and `distance_to_target1_pct` (or single proximity to nearest trigger) so “→ Stop” and “→ Target” are not “No price”.

When market is closed or price is unavailable, return `null` and frontend will show “—” / “No price”; when data exists, values must be present.

**Acceptance:** For open positions with valid market data, Live Positions table shows non-empty LTP, Return %, and stop/target proximity when backend has the data.

---

## 5. Win rate and avg return across endpoints

**Requirement:** For the same period and scope:

- `daily-summary.positions.win_rate` and `avg_return_pct`
- `GET /api/v2/dashboard/positions` → `summary.win_rate_pct`, `summary.avg_return_pct`
- `quick-stats.lifetime_win_rate_pct` (if scope is “lifetime”, document it)

must be computed with the same formula and scope. No conflicting values (e.g. 0% vs 24% for the same set of positions).

**Acceptance:** Same time window and same filters → same win rate and same avg return (or clearly documented different scope, e.g. “7d” vs “lifetime”).

---

## 6. Optional: consolidated “dashboard overview” endpoint

**Suggestion:** If backend exposes `GET /api/v2/dashboard/overview`, it should return a single consistent snapshot (open count, closed, win rate, avg return, etc.) so the frontend can use one source for header KPIs and avoid polling multiple endpoints that might drift.

---

## 7. How to verify (curl)

Frontend repo provides:

```bash
./scripts/seed-prod-curl.sh
```

This fetches prod Seed API and writes JSON under `logs/seed-prod-responses/`. Compare:

- `daily-summary.json` → `positions.open`, `positions.closed`, `positions.total`
- `quick-stats.json` → `open_positions`
- `live-positions.json` → `open_positions.count`, `open_positions.positions`

See **SEED_DASHBOARD_DATA_SYNC.md** for full UI → endpoint mapping and deviation list.

---

## 8. Make scenario a first-class filter for all position endpoints

**Requirement:** Seed must support a single primary filter for execution scenario:

- `all`
- `paper_trade`
- `learning`

This must **not** be overloaded into `trade_type`. `trade_type` should continue to mean horizon/type such as `intraday_buy`, `intraday_sell`, `short_buy`, `swing_buy`, `long_term`.

Preferred request field:

- `scenario`

Acceptable if already established internally:

- `category`

Affected endpoints:

- `GET /api/v2/dashboard/positions`
- `GET /api/v2/dashboard/daily-summary`
- `GET /api/v2/monitor/live-positions`
- `GET /api/v2/dashboard/capital-summary`
- `GET /api/v2/monitor/quick-stats`
- `GET /api/v2/dashboard/pnl-timeline`
- Any future detailed-position, export, or analytics endpoints derived from positions

**Acceptance:**

- Same `days + scenario + trade_type + source_arm` filters must return a consistent slice across all position-related endpoints.
- `scenario=paper_trade` and `scenario=learning` must work even when there are zero positions; response shape must remain stable.
- Frontend should not need different parameter names on different endpoints for the same concept.

---

## 9. Detailed positions workspace for trader operations

**Requirement:** Seed should support a detailed position-analysis view for traders, with `paper_trade` and `learning` as the two main top-level slices.

Minimum capabilities needed:

- Filter by `scenario`
- Filter by `trade_type`
- Filter by `source_arm`
- Filter by `status`
- Filter by `outcome`
- Filter by `days`, `from_date`, `to_date`
- Return aggregate summary for the **full filtered result set**, not only the returned page

Recommended response additions for `GET /api/v2/dashboard/positions` or a dedicated detail endpoint:

- `summary.total_gross_pnl`
- `summary.total_net_pnl`
- `summary.total_charges`
- `summary.total_capital_deployed`
- `summary.outcome_distribution`
- `summary.arm_distribution`
- `summary.trade_type_distribution`
- `summary.status_distribution`

Per-position detail should include when available:

- `source_arm`
- `score_bin`
- `entry_market_regime`
- `entry_global_stance`
- `entry_indian_stance`
- `slippage_pct`
- `risk_reward_ratio`
- `allocated_capital`
- `net_pnl`
- `chart_url`

**Acceptance:** Frontend can build a dedicated “Detailed Positions” page with top tabs `Paper Trading` and `Learning`, then secondary filters for trade type, arm, outcome, and date range, without needing client-side joining from multiple unrelated endpoints.

---

## 10. ML / Learning page data requirements

**Observed live endpoints already available:**

- `GET /api/v2/dashboard/learning-status`
- `GET /api/v2/monitor/arm-leaderboard`
- `GET /api/v2/monitor/learning-insights`
- `GET /v2/learning/performance`

**Requirement:** These endpoints need a consistent filter contract so the ML / Learning page can become a real standalone page instead of a dashboard tab.

Required filters:

- `scenario`
- `trade_type`
- `source_arm`
- `days`
- `from_date`
- `to_date`
- `group_by=score_bin|source_arm|outcome_type|trade_type`
- `horizon_type=time|event|all`

Required summary blocks:

- Overall outcomes and win rate
- Learning health / regime context
- Top arms and bottom arms
- Arm-level observations and confidence
- Performance grouped by score bin and trade type
- Time-to-exit / outcome timing

**Acceptance:** Frontend can show:

- `Paper Trading` vs `Learning` tabs
- Arm leaderboard
- Learning health/status
- Score-bin performance
- Outcome analysis
- Trade-type drilldown

without needing special-case endpoint behavior for each widget.

---

## 11. Query manager and ARM provenance

**Requirement:** To integrate ARMs into Query Manager, Seed must expose a stable mapping between:

- `source_arm`
- query / registry id
- query name
- strategy family
- active/inactive status
- latest run timestamp
- result counts / hit rate / win rate if tracked

Current registry stats alone are not enough for drilldown. Frontend needs either:

- a dedicated ARM metadata endpoint, or
- ARM provenance fields added to relevant learning / positions responses

Recommended contract:

- `GET /api/v2/registry/arms`
- `GET /api/v2/registry/arms/:arm_name`

Minimum fields:

- `arm_name`
- `query_id`
- `query_name`
- `query_version`
- `trade_type`
- `scenario`
- `enabled`
- `last_executed_at`
- `observation_count`
- `win_rate_pct`
- `avg_return_pct`

**Acceptance:** Query Manager can become an ARM-centric control page, not just a raw query registry.

---

## 12. Trade-type naming must be standardized

**Requirement:** Position and learning endpoints must use one canonical naming scheme for trade types. Today the frontend sees a mix of:

- `short_buy` vs `short`
- `long_term` vs `positional`

This causes mapping bugs and unnecessary client-side translation.

**Acceptance:** Every Seed endpoint returns the same canonical `trade_type` values, documented in one place, with backward-compatible alias handling if needed during migration.
