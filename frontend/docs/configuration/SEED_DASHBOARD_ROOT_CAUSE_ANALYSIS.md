# Seed Dashboard Data Deviation — Root Cause Analysis

This doc is based on **actual curl runs** against prod Seed API (`http://203.57.85.201:8182`) using the **same request parameters the frontend uses**. It identifies whether the cause is frontend (wrong params/interpretation) or backend (wrong data/semantics).

---

## 1. Request parameters used by the frontend

| UI / Component        | Service method                    | Exact request |
|-----------------------|-----------------------------------|---------------|
| Dashboard main KPIs   | `getDailySummary(days)`           | `GET /api/v2/dashboard/daily-summary?days=7` |
| QuickStatsBar         | `getQuickStats()`                 | `GET /api/v2/monitor/quick-stats` |
| Live Positions tab    | `getLivePositions(0)`             | `GET /api/v2/monitor/live-positions?include_closed_hours=0` |
| Capital & P&L         | `getCapitalSummary(days)`         | `GET /api/v2/dashboard/capital-summary?days=7` |
| Positions by Horizon  | `getPositions({ trade_type, days: 30, limit: 50 })` | `GET /api/v2/dashboard/positions?trade_type=<X>&days=30&limit=50` (X = intraday_buy, intraday_sell, short_buy, swing_buy, long_term) |
| All Positions tab     | `getPositions({ days, limit: 200 })` | `GET /api/v2/dashboard/positions?days=7&limit=200` (or 30, etc.) |
| Home horizons         | `getPositions({ trade_type, days: 30, limit: 1 })` | Same path, limit=1 |

---

## 2. Curl commands used (copy-paste to reproduce)

```bash
BASE="http://203.57.85.201:8182"

# Dashboard: daily-summary (days=7)
curl -sf "${BASE}/api/v2/dashboard/daily-summary?days=7"

# QuickStatsBar
curl -sf "${BASE}/api/v2/monitor/quick-stats"

# Live Positions tab
curl -sf "${BASE}/api/v2/monitor/live-positions?include_closed_hours=0"

# Capital summary (Dashboard)
curl -sf "${BASE}/api/v2/dashboard/capital-summary?days=7"

# Positions: All Positions tab (days=7, limit=200)
curl -sf "${BASE}/api/v2/dashboard/positions?days=7&limit=200"

# Positions: per trade_type (Horizon section)
curl -sf "${BASE}/api/v2/dashboard/positions?trade_type=long_term&days=30&limit=50"

# daily-summary with days=1 (Home) and days=30 (for comparison)
curl -sf "${BASE}/api/v2/dashboard/daily-summary?days=1"
curl -sf "${BASE}/api/v2/dashboard/daily-summary?days=30"

# performance-pulse (also has current_open_positions)
curl -sf "${BASE}/api/v2/monitor/performance-pulse"
```

---

## 3. Observed responses (excerpts)

### 3.1 daily-summary (Dashboard uses `days=7`)

```json
GET /api/v2/dashboard/daily-summary?days=7
{
  "period_days": 7,
  "positions": {
    "total": 644,
    "open": 13,
    "closed": 0,
    "stops": 477,
    "targets": 10,
    "wins": 0,
    "win_rate": 0.0,
    "avg_return_pct": 0
  },
  ...
}
```

Same endpoint with **days=30**:

```json
"positions": {
  "total": 1360,
  "open": 29,
  "closed": 0,
  "stops": 918,
  "targets": 19,
  ...
}
```

### 3.2 quick-stats

```json
GET /api/v2/monitor/quick-stats
{
  "open_positions": 29,
  "lifetime_win_rate_pct": 0,
  "market_status": "closed",
  "system_status": "active",
  "generated_at": "2026-03-17T20:46:15+05:30"
}
```

### 3.3 live-positions

```json
GET /api/v2/monitor/live-positions?include_closed_hours=0
{
  "open_positions": {
    "count": 29,
    "positions": [ ... 29 items, all long_term ... ],
    "total_unrealized": 0
  },
  "recent_closed": { "count": 0, "positions": [] },
  "market_status": "closed"
}
```

Each position has `current_price: null`, `unrealized_return_pct: null`, `proximity_pct: 999.0` (market closed).

### 3.4 capital-summary (days=7)

```json
GET /api/v2/dashboard/capital-summary?days=7
{
  "period_days": 7,
  "open_positions": 13,
  "closed_positions": 0,
  ...
}
```

### 3.5 positions (All Positions tab: days=7, limit=200)

```json
GET /api/v2/dashboard/positions?days=7&limit=200
{
  "summary": {
    "total": 200,
    "open": 0,
    "closed": 200,
    "win_rate_pct": 35.3,
    "avg_return_pct": -3.59,
    ...
  },
  "count": 200,
  "positions": [ ... 200 items ... ]
}
```

### 3.6 positions per trade_type (Horizon: days=30, limit=50)

| trade_type     | summary.open | summary.closed | summary.total |
|----------------|--------------|----------------|---------------|
| intraday_buy   | 0            | 50             | 50            |
| intraday_sell  | 0            | 50             | 50            |
| short_buy      | 0            | 50             | 50            |
| swing_buy      | 0            | 50             | 50            |
| long_term      | **29**       | 21             | 50            |

### 3.7 performance-pulse

```json
GET /api/v2/monitor/performance-pulse
{
  "performance": [ ... ],
  "current_open_positions": 13,
  "generated_at": "2026-03-17T20:47:28+05:30"
}
```

---

## 4. Root cause summary

### 4.1 Open count 13 vs 29 — backend semantics (period-scoped vs current)

- **daily-summary** and **capital-summary** (and **performance-pulse**) use a **period-scoped** definition of “open”:
  - `positions.open` = “positions that are **currently open** and were **opened** within the last `days`”.
  - So with **days=7** → 13 (13 such positions); with **days=30** → 29 (all current open fall within 30 days).
- **quick-stats** and **live-positions** use **current open** (no period filter):
  - `open_positions` / `open_positions.count` = 29 = all currently open positions.

So the **13 vs 29** is not a frontend bug: the frontend calls the APIs correctly. The backend exposes two different semantics and the UI does not distinguish them, so the same label “Open Positions” shows 13 (from daily-summary) and 29 (from quick-stats / Live tab).

**Conclusion:** Backend should either (a) document clearly that daily-summary “open” is “opened in period and still open”, and/or (b) add a field like `current_open_positions` (or `open_all`) to daily-summary so the UI can show “current open” consistently. Frontend can meanwhile use quick-stats or live-positions for the main “Open Positions” number and treat daily-summary as “Open (opened in last N days)” if desired.

### 4.2 closed=0 vs stops=477 — backend bug

- **daily-summary** returns `positions.closed = 0` while `positions.stops = 477` (and `targets = 10`) for the same period. Closed count must be at least the number of positions that have an outcome (e.g. stop/target). So **closed** is wrong on the backend.

**Conclusion:** Backend must fix daily-summary (and any similar endpoint) so that `closed` is consistent with outcomes (e.g. closed ≥ stops + targets, or closed = total - open for the same scope).

### 4.3 Win rate / avg return 0% vs 35% / -3.59%

- **daily-summary** for the same period shows `win_rate: 0`, `avg_return_pct: 0`.
- **positions?days=7&limit=200** shows `win_rate_pct: 35.3`, `avg_return_pct: -3.59` for the 200 returned rows.

So either (a) daily-summary is computing win rate / avg return incorrectly (e.g. wrong scope or bug), or (b) the 200 positions are a different subset than what daily-summary aggregates. Given daily-summary also has `closed: 0`, the aggregate logic for wins/returns in daily-summary is likely wrong.

**Conclusion:** Backend should align daily-summary aggregates (closed, wins, win_rate, avg_return_pct) with the same scope and with the positions endpoint (or document the difference).

### 4.4 /positions “summary” is for the returned set only

- **GET /api/v2/dashboard/positions?days=7&limit=200** returns `summary.open=0`, `summary.closed=200`, `summary.total=200` — i.e. the summary describes the **200 returned rows**, not the full universe. So when the “All Positions” tab shows “OPEN: 0”, it is correct for *those* 200 rows (all closed), but the user may expect a **global** open/closed total.

**Conclusion:** Either (a) backend returns a **global** summary (e.g. total open/closed for the filter) in addition to the paginated list, or (b) frontend labels the summary as “Of N shown” and/or fetches global totals from another endpoint (e.g. quick-stats for open).

### 4.5 Live positions: LTP / Return % / Stop–Target showing “—” or “No price”

- **live-positions** returns each position with `current_price: null`, `unrealized_return_pct: null`, `proximity_pct: 999.0`. The UI correctly shows “—” and “No price” when these are null/999. At the time of the run, **market_status** was **closed**, so missing LTP is expected.

**Conclusion:** No frontend bug. Backend can document that when market is closed, LTP/return/proximity may be null; optionally provide last known price for display.

---

## 5. Summary table (who is wrong / what to do)

| Observation              | Cause                    | Action |
|--------------------------|--------------------------|--------|
| Open 13 vs 29            | Backend: two semantics   | Document or add `current_open`; frontend can use quick-stats for “Open Positions”. |
| closed=0 vs stops=477     | Backend: wrong closed    | Fix daily-summary (and similar) so closed is consistent with outcomes. |
| Win rate / avg return 0 vs 35% / -3.59% | Backend: daily-summary aggregates wrong or different scope | Align daily-summary with positions logic or document. |
| All Positions “OPEN: 0”  | Backend: summary = returned set only | Add global summary or document; frontend can label “Of N shown”. |
| Live tab “—” / “No price”| Expected when market closed | Optional: backend last-known price; document null when closed. |

---

## 6. Recommended next steps

1. **Backend:** Fix `closed` in daily-summary; align win_rate / avg_return_pct with same scope as positions (or document difference).
2. **Backend:** Document or extend daily-summary so “open” semantics are clear; consider adding `current_open_positions` for UI consistency.
3. **Backend:** Document that /positions summary is for the returned set; consider adding global open/closed for the filter.
4. **Frontend:** Use one source for “Open Positions” in the main KPI (e.g. quick-stats or live-positions) so the number matches Live Positions tab; or show “Open (last 7d)” when using daily-summary.
5. **Frontend:** Optionally label “All Positions” summary as “Of N shown” and show global open from quick-stats if backend does not add global summary.

All curl commands above use the same parameters as the frontend; responses were captured from prod and used for this analysis.

---

## 7. Post–Seed improvement verification

After backend fixes, re-run `./scripts/seed-prod-curl.sh` and confirm:

- **daily-summary** `positions.closed` is consistent with outcomes (e.g. closed ≥ stops; no closed=0 when stops>0).
- **daily-summary** `positions.win_rate` and `positions.avg_return_pct` are non-zero when there are closed positions with wins/returns.
- **quick-stats** `lifetime_win_rate_pct` and **live-positions** structure unchanged.

Example verified response (improved Seed): `closed: 606`, `win_rate: 5.9`, `avg_return_pct: -7.605` for daily-summary; `lifetime_win_rate_pct: 4.8` for quick-stats.
