export type SeedBacktestMode = 'fast' | 'realistic' | 'walk_forward';

/** Form state aligned with Seed `POST /api/v2/backtesting/run` (BacktestConfigRequest). */
export interface BacktestConfig {
  start_date: string;
  end_date: string;
  initial_capital: number;
  mode: SeedBacktestMode;
  max_positions: number;
  /** Comma-separated trade types, e.g. `intraday_buy,swing_buy` */
  trade_types: string;
  min_score: number;
  slippage_bps: number;
  enable_costs: boolean;
  enable_regime_filters: boolean;
  /** Quick backtest path param */
  quick_days: number;
  quick_trade_type: string;
  quick_min_score: number;
  /** Compare-strategies query params */
  compare_days: number;
  compare_trade_types: string;
  compare_score_thresholds: string;
}

export interface BacktestRunEntry {
  id: string;
  title: string;
  createdAt: string;
  data: unknown;
}
