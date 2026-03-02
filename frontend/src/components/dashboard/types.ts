export const TRADE_TYPE_LABELS: Record<string, string> = {
  intraday_buy: 'Intraday Buy',
  intraday_sell: 'Intraday Sell',
  swing_buy: 'Swing Buy',
  swing_sell: 'Swing Sell',
  short: 'Short-Term Buy',
  positional: 'Positional',
};

export const returnColor = (v: number | null): 'text.secondary' | 'success.main' | 'error.main' => {
  if (v === null || v === undefined) return 'text.secondary';
  return v > 0 ? 'success.main' : v < 0 ? 'error.main' : 'text.secondary';
};
