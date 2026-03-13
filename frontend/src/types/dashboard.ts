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
  opened_at: string | null;
  closed_at: string | null;
  valid_until: string | null;
}

export interface PositionsResponse {
  count: number;
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
  regime: string | null;
  vix: number | null;
  vix_level: string | null;
  nifty50_price: number | null;
  nifty50_change_pct: number | null;
  advance_decline_ratio: number | null;
  sentiment: string | null;
  breadth_trend: string | null;
  vix_trend: string | null;
  sector_performance: Record<string, unknown> | null;
}

export interface MarketTrendsResponse {
  count: number;
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
  change_pct: number;
  volume: number | null;
  value_traded_cr?: number;
  generated_at?: string;
  trade_type?: string;
  score?: number;
  relative_volume?: number | null;
  sector?: string | null;
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

// --- Internal / Global Market Context (Kite, Yahoo) ---

export interface InternalMarketContextResponse {
  market_regime?: string;
  vix?: number;
  nifty_50?: number;
  [key: string]: unknown;
}

export interface GlobalContextResponse {
  market_regime?: string;
  vix?: number;
  [key: string]: unknown;
}
