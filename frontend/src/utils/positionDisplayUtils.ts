/**
 * Client-side fallbacks when Seed omits unrealized / return fields on open positions.
 */
import type { TrackedPositionItem, PositionsSummaryResponse } from '../types/apiModels';

export function estimatePnlFromReturn(
  allocatedCapital: number | null | undefined,
  returnPct: number | null | undefined
): number | null {
  if (allocatedCapital == null || returnPct == null) return null;
  if (!Number.isFinite(allocatedCapital) || !Number.isFinite(returnPct)) return null;
  return (allocatedCapital * returnPct) / 100;
}

/** Return % to show for a row (open → live / unrealized / stored; closed → final). */
export function displayReturnPctForRow(p: TrackedPositionItem): number | null {
  const isOpen = p.status === 'open';
  const v = isOpen
    ? (p.current_return_pct ?? p.unrealized_return_pct ?? p.return_pct)
    : (p.return_pct ?? p.current_return_pct);
  return v != null && Number.isFinite(v) ? v : null;
}

/** Best-effort unrealized P&L for open rows when API leaves unrealized_pnl null. */
export function openUnrealizedPnlDisplay(p: TrackedPositionItem): number | null {
  if (p.status !== 'open') return null;
  if (p.unrealized_pnl != null && Number.isFinite(p.unrealized_pnl)) return p.unrealized_pnl;
  const ret = displayReturnPctForRow(p);
  return estimatePnlFromReturn(p.allocated_capital, ret);
}

export function positionsSummaryIsPresent(s: PositionsSummaryResponse | null | undefined): s is PositionsSummaryResponse {
  return s != null && typeof s.total === 'number';
}
