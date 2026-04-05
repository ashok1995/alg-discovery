import { seedFetchJSON } from './seedHttp';

export type SeedBacktestMode = 'fast' | 'realistic' | 'walk_forward';

export interface BacktestConfigRequest {
  /** Start date (YYYY-MM-DD) */
  start_date: string;
  /** End date (YYYY-MM-DD) */
  end_date: string;
  /** Starting capital in rupees */
  initial_capital?: number;
  /** Backtest mode: fast, realistic, walk_forward */
  mode?: SeedBacktestMode | string;
  /** Maximum concurrent positions */
  max_positions?: number;
  /** Trade types to test */
  trade_types?: string[];
  /** Minimum score threshold */
  min_score?: number;
  /** Slippage in basis points */
  slippage_bps?: number;
  /** Include trading costs in results */
  enable_costs?: boolean;
  /** Apply regime-based filters */
  enable_regime_filters?: boolean;
}

export const seedBacktestingService = {
  runBacktest: (body: BacktestConfigRequest) =>
    seedFetchJSON<unknown>('/api/v2/backtesting/run', { method: 'POST', body, timeoutMs: 90_000 }),

  quickBacktest: (days: number, opts?: { trade_type?: string; min_score?: number }) =>
    seedFetchJSON<unknown>(`/api/v2/backtesting/quick/${days}`, {
      params: {
        trade_type: opts?.trade_type ?? 'intraday_buy',
        min_score: opts?.min_score ?? 60,
      },
      timeoutMs: 60_000,
    }),

  compareStrategies: (opts?: { days?: number; trade_types?: string; score_thresholds?: string }) =>
    seedFetchJSON<unknown>('/api/v2/backtesting/compare-strategies', {
      params: {
        days: opts?.days ?? 90,
        trade_types: opts?.trade_types ?? 'intraday_buy,swing_buy',
        score_thresholds: opts?.score_thresholds ?? '60,70,80',
      },
      timeoutMs: 60_000,
    }),
};

export default seedBacktestingService;

