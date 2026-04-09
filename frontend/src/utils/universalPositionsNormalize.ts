/**
 * Maps position-tracker GET /api/v2/dashboard/positions (UniversalPositionsResponse)
 * into the legacy PositionsResponse shape used across Dashboard / Positions / Home.
 *
 * Behaviour vs monolith:
 * - `count` in legacy meant “rows in this response”; universal API returns `count` = page size and
 *   `total_count` = full filter cardinality. We set legacy `count` to **total_count** so KPIs like
 *   “API rows” reflect the filtered universe, not the current page length.
 * - Root `category` is derived from `filters_applied.scenario`.
 */

import type {
  PositionsResponse,
  PositionsSummaryResponse,
  PositionFiltersApplied,
} from '../types/apiModels';

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function normalizeSummary(raw: unknown): PositionsSummaryResponse | null {
  if (!isRecord(raw)) return null;
  const s = raw;
  return {
    total: typeof s.total === 'number' ? s.total : 0,
    open: typeof s.open === 'number' ? s.open : 0,
    closed: typeof s.closed === 'number' ? s.closed : 0,
    outcome_distribution: isRecord(s.outcome_distribution) ? (s.outcome_distribution as Record<string, number>) : null,
    arm_distribution: isRecord(s.arm_distribution) ? (s.arm_distribution as Record<string, number>) : null,
    trade_type_distribution: isRecord(s.trade_type_distribution)
      ? (s.trade_type_distribution as Record<string, number>)
      : undefined,
    win_rate_pct: typeof s.win_rate_pct === 'number' ? s.win_rate_pct : null,
    avg_return_pct: typeof s.avg_return_pct === 'number' ? s.avg_return_pct : null,
    avg_win_pct: typeof s.avg_win_pct === 'number' ? s.avg_win_pct : null,
    avg_loss_pct: typeof s.avg_loss_pct === 'number' ? s.avg_loss_pct : null,
    best_return_pct: typeof s.best_return_pct === 'number' ? s.best_return_pct : null,
    worst_return_pct: typeof s.worst_return_pct === 'number' ? s.worst_return_pct : null,
    avg_duration_min: typeof s.avg_duration_min === 'number' ? s.avg_duration_min : null,
    avg_duration_hours: typeof s.avg_duration_hours === 'number' ? s.avg_duration_hours : null,
    min_duration_min: typeof s.min_duration_min === 'number' ? s.min_duration_min : null,
    max_duration_min: typeof s.max_duration_min === 'number' ? s.max_duration_min : null,
    total_gross_pnl: typeof s.total_gross_pnl === 'number' ? s.total_gross_pnl : null,
    total_net_pnl: typeof s.total_net_pnl === 'number' ? s.total_net_pnl : null,
    total_charges: typeof s.total_charges === 'number' ? s.total_charges : null,
    total_entry_charges: typeof s.total_entry_charges === 'number' ? s.total_entry_charges : undefined,
    total_exit_charges: typeof s.total_exit_charges === 'number' ? s.total_exit_charges : undefined,
    total_capital_deployed: typeof s.total_capital_deployed === 'number' ? s.total_capital_deployed : null,
    net_return_on_capital_pct: typeof s.net_return_on_capital_pct === 'number' ? s.net_return_on_capital_pct : null,
    gap_exits: typeof s.gap_exits === 'number' ? s.gap_exits : null,
    gap_exit_pct: typeof s.gap_exit_pct === 'number' ? s.gap_exit_pct : null,
    stops: typeof s.stops === 'number' ? s.stops : undefined,
    targets: typeof s.targets === 'number' ? s.targets : undefined,
    wins: typeof s.wins === 'number' ? s.wins : undefined,
  };
}

/**
 * If JSON is already legacy-shaped (e.g. old mock or cached), pass through when safe.
 */
export function normalizeUniversalPositionsPayload(raw: unknown): PositionsResponse {
  if (!isRecord(raw)) {
    return { category: 'all', count: 0, summary: null, positions: [] };
  }

  const hasUniversal =
    ('filters_applied' in raw && raw.filters_applied != null) ||
    'total_count' in raw ||
    ('period_days' in raw && raw.period_days != null);

  if (!hasUniversal && Array.isArray(raw.positions) && typeof raw.category === 'string') {
    return raw as unknown as PositionsResponse;
  }

  const filters = isRecord(raw.filters_applied) ? (raw.filters_applied as PositionFiltersApplied) : undefined;
  const category = typeof filters?.scenario === 'string' ? filters.scenario : 'all';
  const positions = Array.isArray(raw.positions) ? (raw.positions as PositionsResponse['positions']) : [];
  const totalCount = typeof raw.total_count === 'number' ? raw.total_count : null;
  const pageCount = typeof raw.count === 'number' ? raw.count : positions.length;
  const summaryTotal = isRecord(raw.summary) && typeof raw.summary.total === 'number' ? raw.summary.total : null;
  const legacyCount = totalCount ?? summaryTotal ?? pageCount;

  return {
    category,
    count: legacyCount,
    summary: normalizeSummary(raw.summary),
    positions,
    period_days: typeof raw.period_days === 'number' ? raw.period_days : undefined,
    filters_applied: filters,
    total_count: totalCount ?? undefined,
    page_count: pageCount,
    offset: typeof raw.offset === 'number' ? raw.offset : undefined,
    generated_at: typeof raw.generated_at === 'string' ? raw.generated_at : undefined,
  };
}
