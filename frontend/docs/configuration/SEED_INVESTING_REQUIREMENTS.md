# Seed Backend Requirements — Investing & Money Monitoring

This document defines what the frontend **Investing** page needs from Seed so that "where is invested money", monitoring, and performance are real and consistent. The goal is **minimal endpoints** by reusing and extending existing position/capital contracts.

**Related:** `SEED_BACKEND_REQUIREMENTS.md`, `SEED_POSITION_ENDPOINTS_SPEC.md`.

---

## 1. Frontend usage today

The Investing page uses:

- **Seed:** `GET /api/v2/dashboard/capital-summary?days=N` for:
  - Open capital deployed, closed capital deployed
  - Total gross P&L, charges, net P&L
  - Net return on capital %
  - `by_trade_type` for allocation breakdown (optional)
- **Recommendation API:** Long-term recommendations for "Investment opportunities" (separate service).

So **Investing** is primarily "capital + P&L + allocation" from Seed, with a period selector (`days`). It does **not** require a separate "investing" service; it needs a **single, consistent capital/positions overview** from Seed.

---

## 2. Preferred approach: one overview endpoint (minimal)

To keep endpoints minimal and data consistent, Seed should expose **one** endpoint that serves both "Capital & P&L" and "Investing / money monitoring" use cases.

**Option A — Extend existing:**  
Use **`GET /api/v2/dashboard/capital-summary`** as the single source for investing KPIs and allocation. Ensure it supports the same filters as the universal position endpoint (`scenario`, `days`, optionally `trade_type`) and returns the fields below.

**Option B — New single endpoint:**  
If a new route is preferred, expose **`GET /api/v2/investing/overview`** (or `GET /api/v2/dashboard/investing-overview`) that returns the same shape. Internally it can aggregate from the same position/capital logic as `capital-summary` and the universal position endpoint.

**Recommendation:** Prefer **Option A** (extend `capital-summary`) so there is only one place for "capital, deployment, P&L, and allocation". If product later needs investing-specific fields (e.g. goals, benchmarks), add them to the same response or a small extension.

---

## 3. Request parameters

Same as the rest of the app: **period** and **scenario**.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `days` | integer | No | 30 | Period in days for all aggregates. |
| `scenario` | string | No | `all` | Enum: **Scenario** — `all` \| `paper_trade` \| `learning`. |

**Backward compatibility:** If the backend already uses `category` for scenario, accept it as an alias.

---

## 4. Response shape (single endpoint)

The response must provide:

- **Where is money:** capital deployed (open + closed), breakdown by trade type (and optionally by scenario).
- **Monitoring:** open positions count, closed count, capital per stock / allocation tiers.
- **Performance:** gross P&L, charges, net P&L, net return on capital %.

Suggested structure (align with existing `CapitalSummaryResponse` where possible):

| Field | Type | Description |
|-------|------|-------------|
| `period_days` | number | Echo of `days`. |
| `scenario` | string | Echo of `scenario` or `all`. |
| `capital_per_stock` | number | Capital per stock (config or average). |
| `score_allocation_tiers` | array | Score-based allocation tiers (existing). |
| `open_positions` | number | Count of open positions in scope. |
| `open_capital_deployed` | number | Total capital currently deployed in open positions. |
| `closed_positions` | number | Count of closed positions in period. |
| `closed_capital_deployed` | number | Total capital that was deployed in now-closed positions (in period). |
| `total_gross_pnl` | number | Gross P&L in period. |
| `total_charges` | number | Total charges in period. |
| `total_net_pnl` | number | Net P&L in period. |
| `net_return_on_capital_pct` | number | Net return on capital % in period. |
| `charges_breakdown` | object | e.g. `{ entry_total, exit_total }`. |
| `by_trade_type` | object | **Required for "where is money".** Keys = **TradeType** (§2.0.2 in position spec). Values = object with at least: |
| `by_trade_type.<type>.capital_deployed` | number | Capital deployed for this trade type (open + closed in period). |
| `by_trade_type.<type>.positions` | number | Optional; count of positions. |
| `by_trade_type.<type>.pnl` | number | Optional; P&L for this type. |
| `generated_at` | string | ISO timestamp. |

**Critical:** `by_trade_type` must be present and populated so the frontend can show "where is money" by trade type (e.g. intraday_buy, swing_buy, long_term). If no positions in a type, return `0` or omit the key; frontend will show zero or hide.

---

## 5. Enums

Reuse the same enums as position endpoints:

- **Scenario:** `all` \| `paper_trade` \| `learning`
- **TradeType:** `intraday_buy`, `intraday_sell`, `short_buy`, `swing_buy`, `long_term` (see `SEED_POSITION_ENDPOINTS_SPEC.md` §2.0.2).

---

## 6. Consistency with position endpoint

- For the same `days` and `scenario`, aggregates (open_positions, open_capital_deployed, total_net_pnl, etc.) must be consistent with the universal position endpoint (e.g. `GET /api/v2/positions?scenario=X&days=Y&limit=0&include=summary`).
- Prefer computing this endpoint from the same underlying position/capital store so that Investing and Dashboard never show conflicting numbers.

---

## 7. Acceptance criteria

1. **Single endpoint:** One GET (e.g. `capital-summary` or `investing/overview`) returns all of: capital deployed (open/closed), P&L, return %, and allocation by trade type.
2. **Request params:** At least `days` and `scenario` (or `category`).
3. **Response:** Includes `by_trade_type` with per–trade-type capital (and optionally positions/P&L) so the frontend can render "where is money" and allocation without extra calls.
4. **Consistency:** Same filters (days + scenario) produce the same totals as the universal position endpoint summary.
5. **No extra investing-only endpoints** unless product later requires distinct investing features (e.g. goals, benchmarks); then extend this response or add a small, documented extension.

---

## 8. Optional: P&L timeline for charts

If the Investing page later shows a performance **chart** over time, reuse:

- **`GET /api/v2/dashboard/pnl-timeline?days=N`** (and optionally `scenario`)

so that again there is no new endpoint. The frontend already uses PnL timeline on the Dashboard; the same response can drive an Investing performance chart.
