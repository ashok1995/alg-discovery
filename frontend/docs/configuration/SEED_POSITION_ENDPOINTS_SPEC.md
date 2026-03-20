# Seed Position Endpoints — Detailed Spec & Universal Endpoint Proposal

This document specifies **request parameters**, **response parameters**, and **endpoint behaviour** for all position-related Seed APIs. It focuses on **position endpoints first** and proposes a **universal position endpoint** to reduce multiple sources of truth and data mismatch.

**Related:** `SEED_BACKEND_REQUIREMENTS.md` (high-level requirements), `SEED_DASHBOARD_ROOT_CAUSE_ANALYSIS.md` (curl and deviation analysis).

---

## 1. Why a universal position endpoint?

| Problem | Effect |
|--------|--------|
| **Many endpoints** | `daily-summary`, `positions`, `live-positions`, `quick-stats`, `capital-summary`, `performance-pulse`, export URLs — each can use different filters or aggregation rules. |
| **Different semantics** | e.g. “open” in daily-summary = opened in last N days; in live-positions = currently open. Counts and win rate drift. |
| **Duplicate logic** | Frontend and backend both need to know which endpoint to call for “P&L strip” vs “table” vs “live count”. |
| **Hard to extend** | Adding scenario (paper_trade / learning) or new filters means touching several endpoints and keeping them in sync. |

**Recommendation:** Expose **one primary position endpoint** that supports all filters and can return **summary only**, **list only**, or **both**. Other position-related endpoints (e.g. live-positions for real-time LTP) can remain for specific use cases but must **derive from the same data/definitions** as the universal endpoint, or be clearly documented as a different scope.

---

## 2. Enums and allowed values (for request parameters and response fields)

Backend should accept only these values (or document any extension). Frontend uses these same sets for filters and display.

### 2.0.1 `Scenario` (request: `scenario` or `category`; response: `category`)

| Value | Description |
|-------|-------------|
| `all` | All positions (no scenario filter). |
| `paper_trade` | Paper-trading / high-confidence execution path. |
| `learning` | Learning / exploratory ARM-sourced path (reduced capital). |

### 2.0.2 `TradeType` (request: `trade_type`; response: `positions[].trade_type`, `summary.trade_type_distribution` keys, `universe` keys)

**Canonical values (preferred in all APIs):**

| Value | Description |
|-------|-------------|
| `intraday_buy` | Intraday long. |
| `intraday_sell` | Intraday short. |
| `short_buy` | Short-term (e.g. 1–5 days). |
| `swing_buy` | Swing (days to weeks). |
| `long_term` | Positional / long-duration. |

**Legacy aliases (backend may accept and map to canonical):** `short` → `short_buy`, `positional` → `long_term`. Responses should use canonical values only.

### 2.0.3 `PositionStatus` (request: `status`; response: `positions[].status`)

| Value | Description |
|-------|-------------|
| `open` | Position is currently open. |
| `stop_hit` | Closed by stop loss. |
| `target_3` | Closed by target (e.g. T3). |
| `target_1` | Closed by T1 (if tracked). |
| `target_2` | Closed by T2 (if tracked). |
| `force_exit` | Manually or system force exit. |
| `expired` | Validity window expired (e.g. EOD for intraday). |
| `closed` | Generic closed (prefer specific outcome if known). |

### 2.0.4 `Outcome` (request: `outcome`; response: `summary.outcome_distribution` keys, `positions[].outcome_horizon`)

Used for outcome-based filtering and aggregation. Values should match how positions are closed.

| Value | Description |
|-------|-------------|
| `stop` | Stop loss hit (may alias `stop_hit` in distribution). |
| `stop_hit` | Same as `stop`. |
| `target_1` | Target 1 hit. |
| `target_2` | Target 2 hit. |
| `target_3` | Target 3 hit. |
| `force_exit` | Force exit. |
| `expired` | Expired. |

Backend may normalise (e.g. always use `stop` in outcome_distribution) and document the chosen key set.

### 2.0.5 `Include` (request: `include` for universal endpoint)

| Value | Description |
|-------|-------------|
| `summary` | Return aggregate summary for the full filtered set. |
| `list` | Return `positions` array (paginated by limit/offset). |

Comma-separated; e.g. `summary,list` or `summary` only or `list` only.

### 2.0.6 `MarketStatus` (response: `market_status` in live-positions, quick-stats, etc.)

| Value | Description |
|-------|-------------|
| `open` | Market is open. |
| `closed` | Market is closed. |

### 2.0.7 `SystemStatus` (response: `system_status` in quick-stats)

| Value | Description |
|-------|-------------|
| `active` | System is active. |
| `inactive` | System is inactive. |

### 2.0.8 `IncludeClosedHours` (request: `include_closed_hours` for live-positions)

| Value | Description |
|-------|-------------|
| `0` | Exclude positions when market is closed (default). |
| `1` | Include positions even when market is closed. |

### 2.0.9 Score bin (response: `positions[].score_bin`, learning APIs)

Typically ranges; backend defines the set. Common pattern:

| Value pattern | Example |
|---------------|---------|
| `0_30` | Score 0–30. |
| `30_60` | Score 30–60. |
| `60_80` | Score 60–80. |
| `80_100` | Score 80–100. |

Backend should document the exact list (e.g. from config).

### 2.0.10 `source_arm` (request and response)

Free-form string (ARM name). No fixed enum; values come from the ARM registry (e.g. `VWAP_BOUNCE`, `SWING_MOMENTUM_GROWTH`). Backend may validate against known ARMs or accept any string.

---

## 3. Current position-related endpoints (as used by frontend)

### 3.1 `GET /api/v2/dashboard/daily-summary`

**Purpose:** Dashboard “today’s P&L” / period summary plus market context and universe counts.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `days` | integer | No (default: 1) | Period in days for position aggregates. |

**Response (relevant slice):**

| Field | Type | Description |
|-------|------|-------------|
| `period_days` | number | Echo of `days`. |
| `positions` | object | **Aggregate for the period.** |
| `positions.total` | number | Total positions in scope. |
| `positions.open` | number | Currently open count (semantics must match other endpoints). |
| `positions.closed` | number | Closed in period. |
| `positions.stops` | number | Stopped in period. |
| `positions.targets` | number | Target hits in period. |
| `positions.wins` | number | Wins in period. |
| `positions.win_rate` | number | Win rate (0–100 or 0–1; document which). |
| `positions.avg_return_pct` | number | Average return % in scope. |
| `universe` | object | Keys = **TradeType** (§2.0.2), values = counts. |
| `market_context` | object \| null | Regime, VIX, Nifty, sector, etc. |
| `generated_at` | string | ISO timestamp. |

**Gaps:** No `scenario`/`category` filter. “Open” vs “closed” semantics have historically differed from `positions` and `live-positions`, causing mismatch.

---

### 3.2 `GET /api/v2/dashboard/positions`

**Purpose:** Filtered list of positions + aggregate summary for the **same** filter set. Used for All Positions tab, Detailed Positions (paper/learning), Horizon cards, Home summary.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Enum: **Scenario** (§2.0.1) — `all` \| `paper_trade` \| `learning`. |
| `trade_type` | string | No | Enum: **TradeType** (§2.0.2) — `intraday_buy`, `intraday_sell`, `short_buy`, `swing_buy`, `long_term`. |
| `status` | string | No | Enum: **PositionStatus** (§2.0.3) — `open`, `stop_hit`, `target_3`, `force_exit`, `expired`, etc. |
| `outcome` | string | No | Enum: **Outcome** (§2.0.4) — `stop`, `target_3`, `force_exit`, `expired`, etc. |
| `source_arm` | string | No | Filter by ARM name. |
| `days` | integer | No | Limit to positions in last N days. |
| `from_date` | string | No | ISO date (YYYY-MM-DD). |
| `to_date` | string | No | ISO date (YYYY-MM-DD). |
| `limit` | integer | No | Max positions in response (e.g. 1 for summary-only, 200 for table). |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `category` | string | Echo of requested category (or “all”). |
| `count` | number | Length of `positions` array (≤ limit). |
| `summary` | object | **Must be aggregate for full filter set, not only returned rows.** |
| `summary.total` | number | Total positions matching filters. |
| `summary.open` | number | Open count in filter set. |
| `summary.closed` | number | Closed count in filter set. |
| `summary.outcome_distribution` | object \| null | e.g. `{ "stop": 10, "target_3": 2 }`. |
| `summary.arm_distribution` | object \| null | e.g. `{ "ARM_A": 5 }`. |
| `summary.win_rate_pct` | number \| null | Win rate % for filter set. |
| `summary.avg_return_pct` | number \| null | Avg return % for filter set. |
| `summary.avg_win_pct` | number \| null | |
| `summary.avg_loss_pct` | number \| null | |
| `summary.best_return_pct` | number \| null | |
| `summary.worst_return_pct` | number \| null | |
| `summary.avg_duration_min` | number \| null | |
| `summary.avg_duration_hours` | number \| null | |
| `summary.total_gross_pnl` | number \| null | |
| `summary.total_net_pnl` | number \| null | |
| `summary.total_charges` | number \| null | |
| `summary.total_capital_deployed` | number \| null | |
| `summary.net_return_on_capital_pct` | number \| null | |
| `summary.gap_exits` | number \| null | |
| `summary.gap_exit_pct` | number \| null | |
| `positions` | array | List of position items (length ≤ limit). |

**Per-item (TrackedPositionItem):**  
`id`, `recommendation_log_id`, `symbol`, `trade_type`, `entry_price`, `stop_loss`, `target_1`–`target_3`, `status`, `exit_price`, `return_pct`, `outcome_horizon`, `score_bin`, `source_arm`, `allocated_capital`, `quantity`, `entry_charges`, `exit_charges`, `gross_pnl`, `net_pnl`, `opened_at`, `closed_at`, `duration_minutes`, `current_price`, `current_return_pct`, `unrealized_return_pct`, `unrealized_pnl`, `chart_url`, `sector`, and other entry/context fields as available.

**Critical:** `summary` must be computed over **all** positions matching the request filters, not only the first `limit` rows. Otherwise KPIs (win rate, avg return) don’t match the full dataset.

---

### 3.3 `GET /api/v2/monitor/live-positions`

**Purpose:** Currently open positions with optional LTP/proximity for live view.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_closed_hours` | integer | No (default: 0) | Enum: **IncludeClosedHours** (§2.0.8) — `0` \| `1`. |

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `open_positions` | object | |
| `open_positions.count` | number | Must match length of `positions` and agree with universal endpoint for same scope. |
| `open_positions.positions` | array | Live position items. |
| `open_positions.total_unrealized` | number \| null | Sum of unrealized P&L. |
| `recent_closed` | object | Optional recent closed. |
| `market_status` | string | Enum: **MarketStatus** (§2.0.6) — `open` \| `closed`. |
| `generated_at` | string | ISO timestamp. |

**Per live item:**  
`id`, `symbol`, `trade_type`, `entry_price`, `current_price`, `stop_loss`, `target_1`, `unrealized_return_pct`, `proximity_pct`, `distance_to_stop_pct`, `distance_to_target1_pct`, `opened_at`, `source_arm`, `score_bin`, etc.

**Gaps:** No `scenario`/`category` or `days` filter. For consistency, “open” count and list should match the universal endpoint when called with `status=open` and same scenario/trade_type.

---

### 3.4 `GET /api/v2/monitor/quick-stats`

**Purpose:** Single number for “open positions” and lifetime win rate (e.g. header bar).

**Request:** No parameters.

**Response:**

| Field | Type | Description |
|-------|------|-------------|
| `open_positions` | number | Must match universal endpoint with same scope (e.g. all scenarios, no trade_type filter). |
| `lifetime_win_rate_pct` | number | Document scope: lifetime vs period. |
| `market_status` | string | Enum: **MarketStatus** (§2.0.6). |
| `system_status` | string | Enum: **SystemStatus** (§2.0.7). |
| `generated_at` | string | |

**Gaps:** No filters; scope (all vs paper vs learning) undefined. Prefer deriving from universal endpoint.

---

### 3.5 `GET /api/v2/dashboard/capital-summary`

**Purpose:** Capital and P&L over a period.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `days` | integer | No | Period in days. |

**Response (position-related):**

| Field | Type | Description |
|-------|------|-------------|
| `period_days` | number | |
| `open_positions` | number | Should match universal endpoint for same period/scenario. |
| `open_capital_deployed` | number | |
| `closed_positions` | number | |
| `closed_capital_deployed` | number | |
| `total_gross_pnl` | number | |
| `total_charges` | number | |
| `total_net_pnl` | number | |
| `net_return_on_capital_pct` | number | |
| `by_trade_type` | object | Optional breakdown. |

**Gaps:** No `scenario`/`category`. Should be derivable from same underlying data as universal endpoint.

---

### 3.6 `GET /api/v2/monitor/performance-pulse`

**Purpose:** Short-horizon performance and current open count.

**Response (position-related):**  
`current_open_positions` — must align with universal endpoint when called with same scope.

---

### 3.7 Export / batch

- **CSV/JSON export** (e.g. `/api/v2/export/positions.csv`, `/api/v2/export/outcomes.json`) should accept the **same query parameters** as the universal position endpoint (scenario, trade_type, days, from_date, to_date, etc.) so exported data matches the UI.
- **Batch close** (`POST /api/v2/batch/close-positions`) and **search** (`GET /api/v2/export/search/positions`) are position-related; search should support at least `scenario` and `trade_type` for consistency.

---

## 4. Proposed universal position endpoint

**Single endpoint:** `GET /api/v2/positions` (or keep path `GET /api/v2/dashboard/positions` and make it the canonical one).

**Behaviour:**  
One contract for all “position” reads: same request parameters, same definitions of open/closed/summary. Optional response shapes via a single `include` or `mode` parameter to avoid multiple URLs.

### 4.1 Request parameters (query)

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `scenario` | string | No | `all` | Enum: **Scenario** (§2.0.1). Primary filter; do not overload `trade_type`. |
| `trade_type` | string | No | — | Enum: **TradeType** (§2.0.2). |
| `status` | string | No | — | Enum: **PositionStatus** (§2.0.3). |
| `outcome` | string | No | — | Enum: **Outcome** (§2.0.4). |
| `source_arm` | string | No | — | ARM name (§2.0.10); no fixed enum. |
| `days` | integer | No | 30 | Restrict to positions in last N days. |
| `from_date` | string | No | — | ISO date (YYYY-MM-DD). |
| `to_date` | string | No | — | ISO date (YYYY-MM-DD). |
| `limit` | integer | No | 100 | Max items in `positions` array (0 = summary only). |
| `offset` | integer | No | 0 | Pagination offset when returning list. |
| `include` | string | No | `summary,list` | Enum: **Include** (§2.0.5) — comma-separated `summary`, `list`. |

**Backward compatibility:** If Seed already uses `category` instead of `scenario`, keep `category` as an alias and document it; frontend can send either.

### 4.2 Response body (JSON)

**When `include` contains `summary`:**

| Field | Type | Description |
|-------|------|-------------|
| `period_days` | number \| null | Echo or derived from `days`/`from_date`/`to_date`. |
| `filters_applied` | object | Echo of request params (scenario, trade_type, status, days, etc.). |
| `summary` | object | **Always over the full filtered set**, not only the current page. |
| `summary.total` | number | Total positions matching filters. |
| `summary.open` | number | Open count. |
| `summary.closed` | number | Closed count. |
| `summary.stops` | number | Stop hits in scope. |
| `summary.targets` | number | Target hits in scope. |
| `summary.wins` | number | Wins in scope. |
| `summary.win_rate_pct` | number \| null | |
| `summary.avg_return_pct` | number \| null | |
| `summary.outcome_distribution` | object \| null | |
| `summary.arm_distribution` | object \| null | |
| `summary.trade_type_distribution` | object \| null | Optional. |
| `summary.total_gross_pnl` | number \| null | |
| `summary.total_net_pnl` | number \| null | |
| `summary.total_charges` | number \| null | |
| `summary.total_capital_deployed` | number \| null | |
| `summary.net_return_on_capital_pct` | number \| null | |
| (other summary fields as in current `PositionsSummaryResponse`) | | |

**When `include` contains `list`:**

| Field | Type | Description |
|-------|------|-------------|
| `count` | number | Length of `positions` (≤ limit). |
| `total_count` | number | Total positions matching filters (for pagination). |
| `positions` | array | List of position items (same schema as current `TrackedPositionItem` / live item). |
| `offset` | number | Echo of request offset. |

**Metadata:**

| Field | Type | Description |
|-------|------|-------------|
| `generated_at` | string | ISO timestamp. |

**Example:** Summary-only for Home P&L strip:  
`GET /api/v2/positions?scenario=paper_trade&days=1&limit=0&include=summary`  
→ Response: `summary` + `filters_applied` + `generated_at`; no `positions`.

**Example:** Table + summary for Detailed Positions:  
`GET /api/v2/positions?scenario=learning&days=30&limit=200&include=summary,list`  
→ Response: `summary` (for full filtered set) + `positions` (up to 200) + `total_count` + `count`.

### 3.3 Definition of “open” and “closed”

- **Open:** Position has `status === 'open'` (or equivalent) and is within the requested time window (e.g. opened in last `days` or within `from_date`–`to_date`).
- **Closed:** Position has a terminal status (e.g. `stop_hit`, `target_3`, `force_exit`, `expired`) and closed_at within the window.
- **Same rule everywhere:** daily-summary, quick-stats, live-positions, capital-summary, and this universal endpoint must use the **same** definition and scope when filters are equivalent.

### 4.4 Trade-type canonical values

Use one set of names in all responses and docs, e.g.:  
`intraday_buy`, `intraday_sell`, `short_buy`, `swing_buy`, `long_term`.  
If legacy data uses `short` or `positional`, map to these in the API layer and document aliases.

---

## 5. Migration and other endpoints

- **daily-summary:** Can remain for “market context + universe + one summary” but should either (a) accept `scenario` and delegate position aggregates to the same logic as the universal endpoint, or (b) document that it is “all scenarios, period summary” and frontend uses universal endpoint for scenario-specific P&L.
- **live-positions:** Keep for real-time LTP/proximity. Add `scenario` (and optionally `trade_type`, `days`) so counts and list align with universal endpoint. Same open/closed definition.
- **quick-stats:** Prefer computed from universal endpoint (e.g. `GET /api/v2/positions?limit=0&include=summary`) or clearly document scope (e.g. “all scenarios, all time for open count”).
- **capital-summary:** Add `scenario`; ensure open_positions / closed_positions / P&L come from same dataset as universal endpoint.
- **Export (CSV/JSON):** Same query parameters as universal endpoint; same filters, same semantics.

---

## 6. Acceptance criteria (position endpoints)

1. **Single source of truth:** One documented endpoint (`GET /api/v2/positions` or `GET /api/v2/dashboard/positions`) defines request params, response shape, and open/closed/summary semantics.
2. **Request/response documented:** Every request parameter and every response field listed (as in this spec) with type and meaning.
3. **Summary = full filter set:** For any request, `summary` is the aggregate over **all** positions matching the filters, not only the returned page.
4. **Scenario everywhere:** All position-related endpoints support at least `scenario` (or `category`) so frontend can show Paper vs Learning without client-side hacks.
5. **No conflicting counts:** For the same filters and time, open/closed counts and win_rate/avg_return match across endpoints that expose them.
6. **Export and search:** Export and search accept the same filters as the universal endpoint and return consistent data.

Once this is in place, the frontend can rely on one primary endpoint for all position tables and P&L strips and use the others only for specialised needs (e.g. live LTP), with no data mismatch.
