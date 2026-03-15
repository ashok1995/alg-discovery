/**
 * Dashboard API models
 */

import type { ApiEnvelope } from './common';

export interface UnifiedSummary {
  total_recommendations: number;
  average_score: number;
  market_sentiment: string;
  cache_status?: string;
  generated_at: string;
  strategy_type: string;
}

export interface UnifiedRecommendationItem {
  symbol: string;
  companyName: string;
  score: number;
  currentPrice: number;
  target: number;
  stopLoss: number;
  change: number;
  changePercent: number;
  volume: number;
  sector: string;
  riskLevel: 'low' | 'medium' | 'high';
  lastUpdated?: string;
  realTimeData?: boolean;
}

export interface UnifiedRecommendationPayload {
  recommendations: UnifiedRecommendationItem[];
  summary: UnifiedSummary;
  metadata: Record<string, unknown>;
}

export type UnifiedRecommendationResponse = ApiEnvelope<UnifiedRecommendationPayload>;

export interface RealTimePriceModel {
  price: number;
  change: number;
  changePercent: number;
  realTime: boolean;
  timestamp: string;
}

export interface RealTimePricesModel {
  [symbol: string]: RealTimePriceModel;
}

export interface DashboardPositionSummary {
  total: number;
  open: number;
  closed: number;
  stops: number;
  targets: number;
  wins: number;
  win_rate: number;
  avg_return_pct: number;
}

export interface MarketBreadth {
  advance_count: number;
  decline_count: number;
  unchanged_count: number;
  advance_decline_ratio: number;
}

export interface NiftyData {
  price: number;
  change_percent: number;
}

export interface SectorPerformanceEntry {
  change_percent: number;
  leader: boolean;
}

export interface MarketContext {
  id?: number;
  timestamp?: string;
  market_regime?: string;
  vix_india?: number;
  vix_level?: string;
  market_breadth?: MarketBreadth;
  nifty_50?: NiftyData;
  sector_performance?: Record<string, SectorPerformanceEntry>;
  market_sentiment?: string;
  confidence_score?: number;
  institutional_sentiment?: { sentiment: string };
  volatility_regime?: string;
  nifty_regime_short?: string;
  nifty_regime_medium?: string;
  vix_india_regime_short?: string;
  vix_india_regime_medium?: string;
  banknifty_regime_short?: string;
  indian_equity_stance?: string;
  created_at?: string;
}

export interface DashboardDailySummary {
  period_days: number;
  positions: DashboardPositionSummary;
  universe: Record<string, number>;
  market_context: MarketContext | null;
  generated_at: string;
}

export interface SystemStatusState {
  apiConnected: boolean;
  marketOpen: boolean;
  cacheActive: boolean;
  securityAuthenticated: boolean;
}

export interface TrackedPositionItem {
  id: number;
  recommendation_log_id: number | null;
  symbol: string;
  trade_type: string;
  entry_price: number;
  stop_loss: number | null;
  target_1: number | null;
  target_2: number | null;
  target_3: number | null;
  status: string;
  exit_price: number | null;
  return_pct: number | null;
  outcome_horizon: string | null;
  score_bin: string | null;
  source_arm: string | null;
  allocated_capital: number | null;
  quantity: number | null;
  entry_charges: number | null;
  exit_charges: number | null;
  gross_pnl: number | null;
  net_pnl: number | null;
  entry_vix_india: number | null;
  entry_vix_us: number | null;
  entry_market_regime: string | null;
  entry_global_stance: string | null;
  entry_indian_stance: string | null;
  entry_nifty_change_pct: number | null;
  entry_ad_ratio: number | null;
  opened_at: string | null;
  closed_at: string | null;
  valid_until: string | null;
  duration_minutes: number | null;
  slippage_pct: number | null;
  is_gap_exit: boolean | null;
  risk_reward_ratio: number | null;
  chart_url?: string;
  sector: string | null;
}

export interface PositionsSummaryResponse {
  total: number;
  open: number;
  closed: number;
  outcome_distribution: Record<string, number> | null;
  arm_distribution: Record<string, number> | null;
  win_rate_pct: number | null;
  avg_return_pct: number | null;
  avg_win_pct: number | null;
  avg_loss_pct: number | null;
  best_return_pct: number | null;
  worst_return_pct: number | null;
  avg_duration_min: number | null;
  avg_duration_hours: number | null;
  min_duration_min: number | null;
  max_duration_min: number | null;
  gap_exits: number | null;
  gap_exit_pct: number | null;
}

export interface PositionsResponse {
  count: number;
  summary: PositionsSummaryResponse;
  positions: TrackedPositionItem[];
}

export interface UniverseScenarioHealth {
  active: number;
  avg_score: number;
  min_score: number;
  max_score: number;
  stalest_hours: number | null;
}

export interface UniverseHealthResponse {
  scenarios: Record<string, UniverseScenarioHealth>;
  generated_at: string;
}

export interface MarketTrendPoint {
  timestamp: string;
  market_regime: string | null;
  regime?: string | null;
  vix_india: number | null;
  vix?: number | null;
  vix_level: string | null;
  nifty50_price: number | null;
  nifty50_change_percent?: number | null;
  nifty50_change_pct?: number | null;
  advance_decline_ratio: number | null;
  market_sentiment: string | null;
  sentiment?: string | null;
  breadth_trend: string | null;
  vix_trend: string | null;
  nifty_regime_short?: string | null;
  nifty_regime_medium?: string | null;
  vix_india_regime_short?: string | null;
  vix_india_regime_medium?: string | null;
  banknifty_regime_short?: string | null;
  indian_equity_stance?: string | null;
  sector_performance: Record<string, unknown> | null;
}

export interface TrendsSummary {
  nifty_change_from_first: number;
  vix_current: number;
  vix_avg: number;
  vix_direction: string;
  ad_ratio_avg: number;
  dominant_regime: string;
  regime_distribution: Record<string, number>;
}

export interface GlobalContext {
  sp500: number;
  sp500_change_pct: number;
  nasdaq: number;
  nasdaq_change_pct: number;
  vix_us: number;
  gold: number;
  usd_inr: number;
  crude_oil: number;
  sp500_regime_short?: string;
  sp500_regime_medium?: string;
  vix_regime_short?: string;
  vix_regime_medium?: string;
  global_equity_stance?: string;
}

export interface MarketTrendsResponse {
  count: number;
  trends_summary?: TrendsSummary;
  global_context?: GlobalContext;
  timeline: MarketTrendPoint[];
}

export interface ArmPerformanceItem {
  arm: string;
  total: number;
  wins: number;
  win_rate: number;
  avg_return_pct: number;
}

export interface ArmPerformanceResponse {
  period_days: number;
  arms: ArmPerformanceItem[];
}

export interface ArmWeightItem {
  arm: string;
  weight: number;
  alpha: number;
  beta: number;
}

export interface LearningStatusResponse {
  total_arms: number;
  top_10: ArmWeightItem[];
  bottom_5: ArmWeightItem[];
  all_weights: Record<string, number>;
}

export interface PerformanceTimelineDay {
  date: string;
  trades: number;
  avg_return_pct: number;
  total_return_pct: number;
  wins: number;
  win_rate: number;
}

export interface PerformanceTimelineResponse {
  period_days: number;
  timeline: PerformanceTimelineDay[];
}

// --- Top Gainers / Losers / Traded ---

export interface TopMoverItem {
  symbol: string;
  exchange?: string;
  last_price: number;
  period_return_pct?: number;
  change_pct: number;
  change_pct_5min?: number | null;
  change_pct_15min?: number | null;
  change_pct_30min?: number | null;
  change_pct_1h?: number | null;
  volume: number | null;
  value_traded_cr?: number;
  chart_url?: string;
  sector?: string | null;
  market_cap_category?: string | null;
  pe_ratio?: number | null;
  generated_at?: string;
  trade_type?: string;
  score?: number;
  relative_volume?: number | null;
  ranked_at?: string;
}

export interface TopGainersResponse {
  count: number;
  gainers: TopMoverItem[];
  generated_at: string;
}

export interface TopLosersResponse {
  count: number;
  losers: TopMoverItem[];
  generated_at: string;
}

export interface TopTradedResponse {
  count: number;
  top_traded: TopMoverItem[];
  generated_at: string;
}

// --- Position Management ---

export interface PositionStatusResponse {
  symbol: string;
  trade_type: string;
  position_status: 'not_tracked' | 'in_universe' | 'ranked' | 'open_position';
  open_position: boolean;
  can_add: boolean;
  rank: number | null;
  rank_change: string | null;
  score: number | null;
}

/** API: quantity optional (default 0). trade_type: intraday_buy | intraday_sell | swing_buy | short | long_term */
export interface PositionOpenRequest {
  symbol: string;
  trade_type: string;
  entry_price: number;
  quantity?: number;
}

export interface PositionOpenResponse {
  id: number;
  symbol: string;
  trade_type: string;
  entry_price: number;
  quantity: number;
  is_active: boolean;
}

export interface PositionCloseRequest {
  symbol: string;
  trade_type: string;
}

export interface PositionCloseResponse {
  closed: boolean;
  symbol: string;
  trade_type: string;
}

// --- Pipeline Health ---

export interface PipelineHealthResponse {
  status: 'healthy' | 'degraded';
  pipeline: {
    stock_universe: Record<string, unknown>;
    stock_universe_by_scenario: Record<string, { active: number; total: number }>;
    candles: string;
    ranked_stocks: Record<string, number>;
    orchestrator?: Record<string, unknown>;
  };
  errors: string[] | null;
  timestamp: string;
}

// --- DB Observability ---

export interface ObservabilityDbResponse {
  stock_universe: Record<string, unknown>;
  stock_indicators: Record<string, unknown>;
  ranked_stocks: Record<string, unknown>;
  by_scenario: Record<string, {
    stock_universe: Record<string, unknown>;
    stock_indicators_count: number;
    ranked_stocks_count: number;
    pipeline_last_run?: Record<string, string>;
  }>;
  pipeline_operations: Record<string, unknown>;
  timestamp: string;
}

// --- Score Bin Performance ---

export interface ScoreBinPerformanceItem {
  score_bin: string;
  trade_type: string;
  horizon: string;
  avg_return_pct: number;
  count: number;
  success_rate_pct: number;
}

// --- Learning Performance (GET /v2/learning/performance) ---

export interface PerformanceSummary {
  total_outcomes: number;
  avg_return_pct: number;
  overall_win_rate_pct: number;
}

export interface PerformanceGroupItem {
  group_key: string | null;
  trade_type: string | null;
  count: number;
  avg_return_pct: number;
  min_return_pct: number;
  max_return_pct: number;
  win_rate_pct: number;
  wins: number;
}

export interface TimeToExitItem {
  trade_type: string | null;
  source_arm: string | null;
  outcome: string | null;
  count: number;
  avg_hours: number;
  min_hours: number;
  max_hours: number;
  avg_return_pct: number;
  win_rate_pct: number;
}

export interface LearningPerformanceResponse {
  group_by: string;
  filters_applied: Record<string, unknown>;
  summary: PerformanceSummary;
  groups: PerformanceGroupItem[];
  time_to_exit: TimeToExitItem[];
}

// --- Analysis Performance ---

export interface AnalysisPerformanceResponse {
  status: string;
  days: number;
  analysis: Record<string, unknown>;
  error?: string;
}

// --- Registry Stats ---

export interface RegistryStatsResponse {
  total_queries: number;
  active_queries: number;
  arm_queries: number;
  [key: string]: unknown;
}

// --- Capital Summary ---

export interface ScoreAllocationTier {
  min_score: number;
  fraction: number;
}

export interface CapitalSummaryResponse {
  period_days: number;
  capital_per_stock: number;
  score_allocation_tiers: ScoreAllocationTier[];
  open_positions: number;
  open_capital_deployed: number;
  closed_positions: number;
  closed_capital_deployed: number;
  total_gross_pnl: number;
  total_charges: number;
  total_net_pnl: number;
  net_return_on_capital_pct: number;
  charges_breakdown: { entry_total: number; exit_total: number };
  by_trade_type: Record<string, unknown>;
}

// --- Charges Calculator ---

export interface ChargesDetail {
  turnover: number;
  brokerage: number;
  stt: number;
  exchange_txn: number;
  sebi: number;
  stamp_duty: number;
  gst: number;
  dp_charges: number;
  total: number;
}

export interface ChargesCalculatorResponse {
  entry_charges: ChargesDetail;
  exit_charges: ChargesDetail;
  total_charges: number;
  gross_pnl: number;
  net_pnl: number;
  charges_pct: number;
}

// --- P&L Timeline ---

export interface PnlTimelineDay {
  date: string;
  gross_pnl: number;
  net_pnl: number;
  charges: number;
  positions_closed: number;
}

export interface PnlTimelineResponse {
  period_days: number;
  timeline: PnlTimelineDay[];
}

// --- Trading Settings ---

export interface TradingSettingsResponse {
  charges: Record<string, number>;
  capital: {
    capital_per_stock: number;
    score_tiers: Array<[number, number]>;
    fallback_fraction: number;
  };
  opener: {
    max_per_sector: number;
    max_slippage_pct: Record<string, number>;
    cooldown_hours: Record<string, number>;
    intraday_entry_cutoff_buy: string;
    intraday_entry_cutoff_sell: string;
    vix_reduce_threshold: number;
    vix_halt_buy_threshold: number;
  };
  tracker: Record<string, unknown>;
  learning: Record<string, unknown>;
  [key: string]: unknown;
}

// --- Internal / Global Market Context (Kite, Yahoo) ---

export interface TrendTimeframe {
  roc: number;
  slope_per_day: number;
  r_squared: number;
  rsi: number;
  volatility_annualized: number;
  atr_pct: number;
  sma: number;
  sma_distance_pct: number;
  period_high: number;
  period_low: number;
  regime: string;
  volatility_regime: string;
  candles_used: number;
}

export interface IndexTrend {
  intraday?: TrendTimeframe;
  short_term?: TrendTimeframe;
  medium_term?: TrendTimeframe;
  long_term?: TrendTimeframe;
}

export interface InternalMarketContextResponse {
  market_regime: string;
  volatility_regime: string;
  market_breadth: {
    advances: number;
    declines: number;
    unchanged: number;
    advance_decline_ratio: number;
    total_stocks: number;
    data_source: string;
    timestamp: string;
  };
  nifty_50: { price: number; change_percent: number; trend: IndexTrend };
  bank_nifty: { price: number; change_percent: number; trend: IndexTrend };
  india_vix: { value: number; change_percent: number | null; level: string; trend: IndexTrend };
  sectors: Record<string, { change_percent: number; leader: boolean }>;
  institutional_sentiment: string;
  confidence_score: number;
  timestamp: string;
}

export interface GlobalAsset {
  price?: number;
  value?: number;
  rate?: number;
  change_percent: number;
  trend: Omit<IndexTrend, 'intraday'>;
}

export interface GlobalContextResponse {
  sp500: GlobalAsset;
  nasdaq: GlobalAsset;
  dow_jones: GlobalAsset;
  vix: { value: number; trend: Omit<IndexTrend, 'intraday'> };
  gold: GlobalAsset;
  usd_inr: GlobalAsset;
  crude_oil: GlobalAsset;
  nikkei: GlobalAsset;
  hang_seng: GlobalAsset;
  timestamp: string;
}
