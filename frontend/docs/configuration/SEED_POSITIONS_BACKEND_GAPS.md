# Seed positions API — UI findings & backend gaps

This document records **observed mismatches** between the AlgoDiscovery UI and `GET /api/v2/dashboard/positions` (and related payloads) so Seed/backend work can be tracked.

## 1. Summary block omitted unless `include` is set

**Symptom:** Home “Position Summary by Trade Type” showed **No data** while the Positions table had rows.

**Cause (frontend):** Requests did not pass `include=summary,list`. Some deployments only return the position list unless `include` asks for the aggregate **summary** object.

**UI fix:** `SeedDashboardService.getPositions` now defaults `include` to `summary,list`.

**Backend recommendation:** Document the default for `include` in OpenAPI and/or always return `summary` when computable (even for `limit=1`), so clients are not surprised.

## 2. `limit=0` vs `limit=1` (summary-only traffic)

**OpenAPI note:** “Max items (**0** = summary only when **include=list**)”.

**UI change:** Home horizon and headline counts use **`limit: 0`** with `include=summary,list` to avoid fetching unused list rows.

**Backend gap to verify:** Confirm `limit=0` returns a valid `summary` + empty `positions[]` and does not 400. If not supported, backend should align with OpenAPI or OpenAPI should be corrected.

## 3. Home total > Positions page total (expected when scenarios differ)

**Symptom:** Home showed more positions than **Paper Trading** on `/positions`.

**Explanation:** Home default **scenario** was **All scenarios** (paper + learning) while the Positions page tab is **paper-only** or **learning-only**. Different **days** windows (e.g. 1 vs 30) also change counts.

**UI fix:**

- Default Home **days** aligned to **30** to match Positions.
- When scenario is **All**, show **Paper · N · Learning · M** split and helper text linking to `/positions`.

**Backend:** No bug required; optional: expose a single “breakdown by scenario” object on the positions summary to avoid three calls.

## 4. `scenario` vs `category` query params

OpenAPI lists **scenario** and **category** as aliases.

**UI:** When filtering, both are sent for paper/learning to tolerate partial backend support.

**Backend gap:** Ensure both query names behave identically in all environments.

## 5. Win rate / avg return / avg duration as “—” with only open positions

**Symptom:** KPI strip shows dashes when **closed = 0**.

**Explanation:** Many systems define win rate and **realized** average return only over **closed** positions. If the API returns `null` for those aggregates when there are no closes, the UI correctly shows **—**.

**Backend gap (optional):** For transparency, consider returning:

- `win_rate_pct_open` / `avg_unrealized_return_pct` for open book, **or**
- explicit `null` with a machine-readable `summary_metrics_reason: "no_closed_positions"`.

## 6. `unrealized_pnl` / `current_return_pct` sometimes null on open rows

**Symptom:** Unreal P&L or return % appears empty or zero despite LTP moving.

**UI fix:** Client estimates unrealized P&L as `allocated_capital × (display_return_pct / 100)` when return % is available but `unrealized_pnl` is null (see `positionDisplayUtils.ts`).

**Backend gap:** Populate `unrealized_pnl` and `unrealized_return_pct` (or `current_return_pct`) consistently when marking a position **open** and LTP is known.

## 7. `net_pnl` null on open positions

**Expected:** Net P&L is often **realized** only after close.

**UI:** For **open** rows, Net column shows the same **estimated** unrealized value as Unreal P&L when `net_pnl` is null, with a tooltip that net is finalized at close.

**Backend:** Optional: return `net_pnl: null` with a flag `is_realized: false` for clarity.

## 8. Trade type filter “not working” (search vs filters)

**Symptom:** Changing **Trade type** did not change the table.

**Cause:** **Search** results were shown (`searchResults !== null`) and **ignore** category / trade_type / days filters.

**UI fix:** Clearing search results when filters change.

## 9. Positions export CSV missing category

**UI fix:** CSV export URL now includes `category` when the tab is paper or learning.

**Backend:** Confirm `/api/v2/export/positions.csv` honors `category` / `scenario` / `trade_type` the same as `/api/v2/dashboard/positions`.

## 10. ARM-level / scenario column on positions list

**Current:** Table shows **source_arm** (ARM tag) but not a dedicated **scenario** column (paper vs learning is implied by tab).

**Enhancement:** If API adds `scenario` or `category` per row, expose it in the table for auditing.

---

*Last updated: 2026-02-27 — paired with frontend fixes in `SeedDashboardService`, `Home`, `PositionsTab`, and `positionDisplayUtils`.*
