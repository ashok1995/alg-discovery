export interface BacktestConfig {
  start_date: string;
  end_date: string;
  initial_capital: number;
  risk_per_trade: number;
  strategy_type: string;
  symbols: string[];
  atr_multiplier_sl: number;
  atr_multiplier_tp: number;
  max_positions: number;
  include_slippage: boolean;
  include_commission: boolean;
}

export interface BacktestResult {
  id: string;
  status: 'running' | 'completed' | 'failed';
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  max_drawdown: number;
  sharpe_ratio: number;
  profit_factor: number;
  avg_trade_duration: number;
  equity_curve: Array<{ date: string; equity: number }>;
  trades: Array<{
    symbol: string;
    entry_date: string;
    exit_date: string;
    entry_price: number;
    exit_price: number;
    quantity: number;
    pnl: number;
    pnl_pct: number;
    signal_type: string;
    exit_reason: string;
  }>;
}
