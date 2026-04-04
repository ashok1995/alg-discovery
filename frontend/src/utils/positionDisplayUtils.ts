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

/** Fallback return calc from prices when API leaves return fields null. */
export function estimateReturnPctFromPrices(p: TrackedPositionItem): number | null {
  const entry = p.entry_price;
  const current = p.status === 'open' ? p.current_price : (p.exit_price ?? p.current_price);
  if (entry == null || current == null) return null;
  if (!Number.isFinite(entry) || !Number.isFinite(current) || entry === 0) return null;

  // Shorts profit when price goes down.
  const isShortLike = p.trade_type === 'intraday_sell' || p.trade_type === 'short_buy';
  const raw = isShortLike ? ((entry - current) / entry) * 100 : ((current - entry) / entry) * 100;
  return Number.isFinite(raw) ? raw : null;
}

/** Return % to show for a row (open → live / unrealized / stored; closed → final). */
export function displayReturnPctForRow(p: TrackedPositionItem): number | null {
  const isOpen = p.status === 'open';
  const v = isOpen
    ? (p.current_return_pct ?? p.unrealized_return_pct ?? p.return_pct)
    : (p.return_pct ?? p.current_return_pct);
  if (v != null && Number.isFinite(v)) return v;
  return estimateReturnPctFromPrices(p);
}

/** Best-effort unrealized P&L for open rows when API leaves unrealized_pnl null. */
export function openUnrealizedPnlDisplay(p: TrackedPositionItem): number | null {
  if (p.status !== 'open') return null;
  if (p.unrealized_pnl != null && Number.isFinite(p.unrealized_pnl)) return p.unrealized_pnl;
  const ret = displayReturnPctForRow(p);
  return estimatePnlFromReturn(p.allocated_capital, ret);
}

/** Sum entry+exit charges for a row (partial values allowed). */
export function rowTotalCharges(p: TrackedPositionItem): number | null {
  const e = p.entry_charges;
  const x = p.exit_charges;
  const hasE = e != null && Number.isFinite(e);
  const hasX = x != null && Number.isFinite(x);
  if (!hasE && !hasX) return null;
  return (hasE ? e! : 0) + (hasX ? x! : 0);
}

/**
 * Closed rows: prefer API `net_pnl`; else gross P&amp;L minus total charges (profit − charges).
 */
export function closedNetProfitDisplay(p: TrackedPositionItem): number | null {
  if (p.status === 'open') return null;
  if (p.net_pnl != null && Number.isFinite(p.net_pnl)) return p.net_pnl;
  const charges = rowTotalCharges(p);
  if (p.gross_pnl != null && Number.isFinite(p.gross_pnl)) {
    if (charges != null) return p.gross_pnl - charges;
    return p.gross_pnl;
  }
  return p.net_pnl;
}

export function positionsSummaryIsPresent(s: PositionsSummaryResponse | null | undefined): s is PositionsSummaryResponse {
  return s != null && typeof s.total === 'number';
}

/**
 * Stopped-out count from summary outcome_distribution (key names differ across API versions).
 * Uses first matching key only — avoids double-count if API sends both `stop` and `stop_hit`.
 */
export function stopHitCountFromDistribution(dist: Record<string, number> | null | undefined): number {
  if (!dist) return 0;
  const preferred = ['stop_hit', 'stop', 'sl_hit', 'stopped', 'STOP'] as const;
  for (const key of preferred) {
    const v = dist[key as string];
    if (typeof v === 'number') return v;
  }
  for (const [k, v] of Object.entries(dist)) {
    if (typeof v !== 'number') continue;
    const low = k.toLowerCase();
    if ((low === 'stop' || low.includes('stop_hit') || low === 'sl_hit') && !low.includes('non_stop')) {
      return v;
    }
  }
  return 0;
}

/** Minutes in trade for KPI averaging (prefers time_in_trade_minutes). */
export function rowDurationMinutes(p: TrackedPositionItem): number | null {
  const t = p.time_in_trade_minutes ?? p.duration_minutes;
  if (t == null || !Number.isFinite(t)) return null;
  return t;
}

/** Mean duration in minutes, or null. */
export function avgDurationMinutesFromPositions(positions: TrackedPositionItem[]): number | null {
  const mins: number[] = [];
  for (const p of positions) {
    const m = rowDurationMinutes(p);
    if (m != null && m >= 0) mins.push(m);
  }
  if (mins.length === 0) return null;
  return mins.reduce((a, b) => a + b, 0) / mins.length;
}

/** Avg duration label from row list when API summary omits avg_duration_* . */
export function avgDurationLabelFromPositions(positions: TrackedPositionItem[]): string | null {
  const avg = avgDurationMinutesFromPositions(positions);
  if (avg == null) return null;
  if (avg < 60) return `${avg.toFixed(0)}m`;
  if (avg < 1440) return `${(avg / 60).toFixed(1)}h`;
  return `${(avg / 1440).toFixed(1)}d`;
}

/** Count closed rows that hit stop (from loaded list — may be partial if API paginates). */
export function countStopHitInPositions(positions: TrackedPositionItem[]): number {
  return positions.filter((p) => p.status === 'stop_hit' || p.status === 'sl_hit').length;
}

/** Client-side aggregates for a subset of rows (e.g. score-bin filter). */
export function computePositionListSummary(positions: TrackedPositionItem[]): {
  total: number;
  open: number;
  closed: number;
  win_rate_pct: number | null;
  avg_return_pct: number | null;
} {
  const open = positions.filter((p) => p.status === 'open').length;
  const closedRows = positions.filter((p) => p.status !== 'open');
  const wins = closedRows.filter((p) => (p.return_pct ?? 0) > 0).length;
  const win_rate_pct = closedRows.length > 0 ? (wins / closedRows.length) * 100 : null;
  const rets = closedRows
    .map((p) => p.return_pct)
    .filter((x): x is number => x != null && Number.isFinite(x));
  const avg_return_pct = rets.length > 0 ? rets.reduce((a, b) => a + b, 0) / rets.length : null;
  return {
    total: positions.length,
    open,
    closed: closedRows.length,
    win_rate_pct,
    avg_return_pct,
  };
}
