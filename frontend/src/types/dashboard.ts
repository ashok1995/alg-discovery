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
  /** Stop-loss hits in period (when API provides). */
  stops?: number;
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
  time_in_trade_minutes: number | null;
  slippage_pct: number | null;
  is_gap_exit: boolean | null;
  risk_reward_ratio: number | null;
  chart_url?: string;
  sector: string | null;
  current_price: number | null;
  current_return_pct: number | null;
  unrealized_return_pct: number | null;
  unrealized_pnl: number | null;
}

/** Echo of universal positions query params (position-tracker). */
export interface PositionFiltersApplied {
  scenario?: string;
  trade_type?: string | null;
  status?: string | null;
  outcome?: string | null;
  source_arm?: string | null;
  days?: number;
  from_date?: string | null;
  to_date?: string | null;
  limit?: number;
  offset?: number;
  include?: string;
}

export interface PositionsSummaryResponse {
  total: number;
  open: number;
  closed: number;
  /** Stop-loss exits in period (position-tracker universal summary). */
  stops?: number | null;
  /** Target exits in period (position-tracker universal summary). */
  targets?: number | null;
  wins?: number | null;
  outcome_distribution: Record<string, number> | null;
  arm_distribution: Record<string, number> | null;
  /** Present on universal positions summary when backend sends it. */
  trade_type_distribution?: Record<string, number> | null;
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
  total_gross_pnl: number | null;
  total_net_pnl: number | null;
  total_charges: number | null;
  total_entry_charges?: number | null;
  total_exit_charges?: number | null;
  total_capital_deployed: number | null;
  net_return_on_capital_pct: number | null;
  gap_exits: number | null;
  gap_exit_pct: number | null;
}

export interface PositionsResponse {
  category: string;
  /**
   * Total rows matching filters (`total_count` from universal API), not necessarily `positions.length`
   * when paginated.
   */
  count: number;
  /** May be null if client omitted `include=summary` or server returned list-only. */
  summary: PositionsSummaryResponse | null;
  positions: TrackedPositionItem[];
  /** Universal positions: echo from position-tracker. */
  period_days?: number | null;
  filters_applied?: PositionFiltersApplied;
  total_count?: number | null;
  page_count?: number | null;
  offset?: number | null;
  generated_at?: string;
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
  /** Optional: improved Seed market-movers may only send period_return_pct */
  change_pct?: number;
  change_pct_5min?: number | null;
  change_pct_15min?: number | null;
  change_pct_30min?: number | null;
  change_pct_1h?: number | null;
  change_pct_3h?: number | null;
  volume: number | null;
  value_traded_cr?: number;
  non_null_column_count?: number;
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

export interface MarketMoversCounts {
  gainers?: number;
  losers?: number;
  top_traded?: number;
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

/** Improved Seed: single GET /api/v2/dashboard/market-movers (mover_type=gainers|losers|traded) */
export interface MarketMoversSingleResponse {
  mover_type: 'gainers' | 'losers' | 'traded';
  count: number;
  items: TopMoverItem[];
  days: number;
  generated_at: string;
}

export interface MarketMoversAllResponse {
  mover_type: 'all';
  days: number;
  limit: number;
  gainers: TopMoverItem[];
  losers: TopMoverItem[];
  top_traded: TopMoverItem[];
  counts: {
    gainers: number;
    losers: number;
    top_traded: number;
  };
  generated_at: string;
}

export type MarketMoversResponse = MarketMoversSingleResponse | MarketMoversAllResponse;

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

// ============================================================
// NEW: Monitor, Batch, Export, and WebSocket types
// ============================================================

// --- Dashboard Overview (GET /api/v2/dashboard/overview) ---

export interface OverviewPerformancePeriod {
  positions_opened: number;
  positions_closed: number;
  wins: number;
  win_rate_pct: number;
  avg_return_pct: number;
  total_return_pct: number;
}

export interface DashboardOverviewResponse {
  timestamp: string;
  market_status: 'open' | 'closed' | string;
  performance: {
    '1h': OverviewPerformancePeriod;
    '24h': OverviewPerformancePeriod;
    '7d': OverviewPerformancePeriod;
  };
  positions: {
    total_open: number;
    unique_trade_types: number;
    unique_arms: number;
    oldest_position_hours: number | null;
    newest_position_minutes: number | null;
  };
  market_context: {
    regime: string | null;
    vix_india: number | null;
    nifty50_change_pct: number | null;
    indian_equity_stance: string | null;
    market_sentiment: string | null;
    last_update: string | null;
  } | null;
  system_health: {
    status: string;
    issues?: string[];
    checks_passed?: boolean;
  };
  learning: {
    status: string;
    total_arms: number;
    top_arm: { name: string; weight: number } | null;
    bottom_arm: { name: string; weight: number } | null;
    weight_spread: number | null;
  } | null;
  recent_activity: {
    period_hours: number;
    positions_opened: number;
    positions_closed: number;
    wins: number;
    win_rate_pct: number;
    target_3_hits: number;
    stop_hits: number;
    success_ratio: number;
  } | null;
}

// --- Quick Stats (GET /api/v2/monitor/quick-stats) ---

export interface QuickStatsResponse {
  open_positions: number;
  lifetime_win_rate_pct: number;
  market_status: 'open' | 'closed' | string;
  system_status: 'active' | 'inactive' | string;
  generated_at: string;
}

// --- Market Pulse (GET /api/v2/monitor/market-pulse) ---

export interface MarketPulseResponse {
  market_regime: string | null;
  vix_india: number | null;
  nifty50_change_pct: number | null;
  indian_equity_stance: string | null;
  global_equity_stance: string | null;
  sp500_change_pct: number | null;
  market_status: 'open' | 'closed' | string;
  recent_activity: {
    positions_opened_4h: number;
    positions_closed_4h: number;
  } | null;
  generated_at?: string;
}

// --- System Alerts (GET /api/v2/monitor/system-alerts) ---

export interface SystemAlert {
  severity: 'medium' | 'high';
  type: string;
  message: string;
  action: string | null;
}

export interface SystemAlertsResponse {
  alert_count: number;
  system_status: 'healthy' | 'degraded' | string;
  alerts: SystemAlert[];
}

// --- Performance Pulse (GET /api/v2/monitor/performance-pulse) ---

export interface PerformancePulsePeriod {
  period: '1h' | '24h' | '7d' | string;
  closed_positions: number;
  wins: number;
  win_rate_pct: number;
  avg_return_pct: number;
}

export interface PerformancePulseResponse {
  performance: PerformancePulsePeriod[];
  current_open_positions: number;
  generated_at: string;
}

// --- Live Positions (GET /api/v2/monitor/live-positions) ---

export interface LivePositionItem {
  id?: number;
  symbol: string;
  trade_type?: string;
  unrealized_return_pct: number | null;
  /** proximity_pct = distance to nearest trigger (stop or target); 999 means no live price */
  proximity_pct?: number | null;
  /** distance_to_stop_pct may be derived from proximity; not always present */
  distance_to_stop_pct?: number | null;
  distance_to_target1_pct?: number | null;
  entry_price?: number | null;
  current_price?: number | null;
  stop_loss?: number | null;
  target_1?: number | null;
  opened_at?: string | null;
  source_arm?: string | null;
  score_bin?: string | null;
  peak_unrealized_pct?: number | null;
}

export interface LivePositionsResponse {
  open_positions: {
    count: number;
    positions: LivePositionItem[];
    total_unrealized: number | null;
  };
  recent_closed: {
    count: number;
    positions: LivePositionItem[];
  };
  market_status: 'open' | 'closed' | string;
  generated_at?: string;
}

// --- Watchlist (GET /api/v2/dashboard/watchlist) ---

export interface WatchlistItem {
  id: number;
  symbol: string;
  trade_type: string;
  unrealized_return_pct: number | null;
  closest_trigger: 'stop_loss' | 'target_1' | 'target_2' | 'target_3';
  trigger_price: number | null;
  distance_pct: number | null;
  opened_hours_ago: number | null;
}

export interface WatchlistResponse {
  count: number;
  threshold_pct: number;
  watchlist: WatchlistItem[];
  generated_at?: string;
}

// --- Profit Protection (GET /api/v2/dashboard/profit-protection-status) ---

export interface ProfitProtectionItem {
  id?: number;
  symbol: string;
  trade_type?: string;
  unrealized_return_pct: number | null;
  peak_unrealized_pct: number | null;
  protection_active: boolean;
}

export interface ProfitProtectionResponse {
  total_positions: number;
  total_unrealized_return_pct: number | null;
  positions_with_protection: number;
  positions: ProfitProtectionItem[];
}

// --- Portfolio Risk (GET /api/v2/dashboard/portfolio-risk) ---

export interface PortfolioRiskByType {
  positions: number;
  capital_at_risk: number;
}

export interface PortfolioRiskResponse {
  total_positions: number;
  total_capital_at_risk: number;
  risk_by_trade_type: Record<string, PortfolioRiskByType>;
  sector_exposure: Record<string, number>;
}

// --- ARM Leaderboard (GET /api/v2/monitor/arm-leaderboard) ---

export interface ArmLeaderboardItem {
  arm: string;
  positions: number;
  wins: number;
  win_rate_pct: number;
  avg_return_pct: number;
  thompson_weight: number;
  observations: number;
  confidence: number;
}

export interface ArmLeaderboardResponse {
  period_days: number;
  arms_count: number;
  leaderboard: ArmLeaderboardItem[];
  generated_at?: string;
}

// --- Learning Insights (GET /api/v2/monitor/learning-insights) ---

export interface LearningInsightArmItem {
  arm: string;
  weight: number;
  confidence: number;
  observations: number;
}

/** Thompson / weight diagnostics nested under `convergence.convergence` (Seed `get_full_learning_health`). */
export interface LearningThompsonDiagnostics {
  weight_stability?: number | Record<string, unknown>;
  evidence_summary?: Record<string, unknown>;
  stuck_arms?: string[];
  top_confident?: Array<Record<string, unknown>>;
  posteriors?: unknown;
  regime_coverage?: Record<string, unknown>;
  total_arms?: number;
}

/** Beta posterior health under `convergence.reward_distribution`. */
export interface LearningRewardDistribution {
  posterior_distribution?: unknown;
  saturation_pct?: number | null;
  is_saturated?: boolean;
  avg_alpha?: number | null;
  avg_beta?: number | null;
  health?: string;
}

/** Full convergence block: Thompson + reward distribution + compute time. */
export interface LearningConvergenceBlock {
  convergence?: LearningThompsonDiagnostics;
  reward_distribution?: LearningRewardDistribution;
  timestamp?: string;
}

/** Cached learned snapshot (adaptive insights cache); keys optional when insufficient data. */
export interface LearnedInsightsSnapshot {
  dynamic_expectations?: Record<string, unknown>;
  profit_protection?: Record<string, unknown>;
  high_score_perf?: Record<string, unknown>;
  context_correlations?: Record<string, unknown>;
  regime_horizon_weights?: Record<string, unknown>;
  score_band_weights?: Record<string, unknown>;
  min_score_adj?: number | Record<string, unknown> | null;
  cache_age_seconds?: number | null;
  /** Per trade type / TA signal multipliers when Seed exposes them. */
  signal_weights?: Record<string, unknown>;
  /** Per trade type paper-trade bin eligibility. */
  paper_trade_eligible_bins?: Record<string, unknown>;
}

/** Per-process rollup under `scorer_weights_timing.summary_by_process`. */
export interface ScorerProcessTimingSummary {
  n: number;
  avg_duration_ms: number;
  max_duration_ms: number;
}

/** Single row in `scorer_weights_timing.recent_runs`. */
export interface ScorerWeightsRecentRun {
  process: string;
  scenario?: string | null;
  status: string;
  duration_ms?: number;
  started_at?: string;
  finished_at?: string | null;
  rows_scanned?: number;
  rows_updated?: number;
  metric_used?: string;
  error?: string | null;
  extra?: Record<string, unknown>;
}

/** Scorer pipeline + weight timing (learning-observability-ui-integration.md). */
export interface ScorerWeightsTiming {
  recent_runs?: ScorerWeightsRecentRun[];
  summary_by_process?: Record<string, ScorerProcessTimingSummary>;
  orchestrator_last_scenario_timing?: Record<string, Record<string, unknown>>;
  /** Tooltip / label glossary from server. */
  fields?: Record<string, string>;
}

/** One process row in `learner_observability.processes`. */
export interface LearnerObservabilityProcess {
  name?: string;
  scenario?: string | null;
  schedule_status?: string;
  lag_seconds?: number | null;
  expected_interval_seconds?: number | null;
  last_run?: string | null;
  error?: string | null;
  [key: string]: unknown;
}

/** Learner cadence / lag (same endpoint). */
export interface LearnerObservability {
  generated_at?: string;
  processes?: LearnerObservabilityProcess[];
  summary?: Record<string, unknown>;
  error?: string;
}

export interface LearningInsightsResponse {
  top_arms: LearningInsightArmItem[];
  total_arms: number;
  regime_contexts?: string[];
  learning_health: 'active' | 'inactive' | 'error' | string;
  /** Payload build time (ISO). */
  generated_at?: string;
  learning_iterations?: number;
  /** Present when Seed exposes `get_full_learning_health()` on this endpoint. */
  convergence?: LearningConvergenceBlock | null;
  /** Rolling / learned tuning snapshot (cache_age_seconds reflects staleness). */
  learned_insights?: LearnedInsightsSnapshot | null;
  adaptive_insights?: unknown;
  learner_observability?: LearnerObservability | null;
  learning_runs?: Array<Record<string, unknown>>;
  scorer_weights_timing?: ScorerWeightsTiming | null;
  table_growth?: Record<string, unknown>;
  error?: string;
}

// --- Top Performers Today (GET /api/v2/monitor/top-performers-today) ---

export interface TopPerformerItem {
  id?: number;
  symbol: string;
  trade_type?: string;
  unrealized_return_pct?: number | null;
  return_pct?: number | null;
  source_arm?: string | null;
  opened_at?: string | null;
}

export interface TopPerformersTodayResponse {
  date: string;
  best_performers: TopPerformerItem[];
  worst_performers: TopPerformerItem[];
}

// --- Data Health (GET /api/v2/monitor/data-health) ---

export interface DataHealthCheck {
  component: string;
  description?: string;
  total_rows: number | null;
  latest_update?: string | null;
  staleness_hours: number | null;
  recent_updates_2h: number | null;
  status: 'healthy' | 'stale' | 'empty' | string;
}

export interface DataHealthResponse {
  overall_status: 'healthy' | 'degraded' | string;
  market_open: boolean;
  health_checks: DataHealthCheck[];
}

// --- Data Statistics (GET /api/v2/batch/data-statistics) ---

export interface DataStatisticsResponse {
  table_statistics: Record<string, {
    total_rows?: number;
    open_positions?: number;
    active_stocks?: number;
    [key: string]: unknown;
  }>;
  data_staleness?: Record<string, unknown>;
  database_health?: string;
  [key: string]: unknown;
}

// --- Batch Close Positions (POST /api/v2/batch/close-positions) ---

export interface BatchCloseRequest {
  position_ids: number[];
  reason?: string;
  fetch_live_prices?: boolean;
}

export interface BatchCloseResultItem {
  id: number;
  symbol: string;
  entry_price: number;
  exit_price: number | null;
  return_pct: number | null;
  duration_minutes: number | null;
}

export interface BatchCloseResponse {
  requested: number;
  successful: number;
  failed: number;
  closed_positions: BatchCloseResultItem[];
  errors: Array<{ position_id: number; error: string }>;
}

// --- Batch Analyze Symbols (POST /api/v2/batch/analyze-symbols) ---

export interface BatchAnalyzeRequest {
  symbols: string[];
  trade_types?: string[];
  days_lookback?: number;
}

export interface BatchAnalyzeTradeStats {
  total_positions: number;
  wins: number;
  win_rate_pct: number;
  avg_return_pct: number;
}

export interface BatchAnalyzeResponse {
  analyzed_symbols: number;
  analysis: Record<string, Record<string, BatchAnalyzeTradeStats>>;
}

// --- Search Positions (GET /api/v2/export/search/positions) ---

export interface SearchPositionsResponse {
  count: number;
  results: TrackedPositionItem[];
  query: string;
}

// --- Seed WebSocket message types ---

export interface SeedPositionsUpdateData {
  open_positions: {
    count: number;
    avg_score: number | null;
    unique_arms: number | null;
  };
  hourly_activity: {
    opened: number;
    closed: number;
    wins: number;
  } | null;
  market_open: boolean;
}

export interface SeedPositionsMessage {
  type: 'connected' | 'positions_update';
  timestamp: string;
  message?: string;
  data?: SeedPositionsUpdateData;
}

export interface SeedHealthUpdateData {
  tracked_positions_count: number;
  stock_universe_count: number;
  ranked_stocks_count: number;
  ranking_staleness_hours: number | null;
}

export interface SeedHealthMessage {
  type: 'connected' | 'health_update';
  timestamp: string;
  message?: string;
  data?: SeedHealthUpdateData;
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
  } | null;
  /** API may omit or null when index feed is unavailable */
  nifty_50: { price: number; change_percent: number; trend: IndexTrend } | null;
  bank_nifty: { price: number; change_percent: number; trend: IndexTrend } | null;
  india_vix: { value: number; change_percent: number | null; level: string; trend: IndexTrend } | null;
  sectors: Record<string, { change_percent: number; leader: boolean }> | null;
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
  sp500: GlobalAsset | null;
  nasdaq: GlobalAsset | null;
  dow_jones: GlobalAsset | null;
  vix: { value: number; trend: Omit<IndexTrend, 'intraday'> } | null;
  gold: GlobalAsset | null;
  usd_inr: GlobalAsset | null;
  crude_oil: GlobalAsset | null;
  nikkei: GlobalAsset | null;
  hang_seng: GlobalAsset | null;
  timestamp: string;
}
