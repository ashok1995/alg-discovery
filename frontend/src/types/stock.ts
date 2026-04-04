/**
 * Seed Service and stock API models
 */

export enum SeedStrategyType {
  SWING = 'swing',
  INTRADAY = 'intraday',
  INTRADAY_BUY = 'intraday_buy',
  INTRADAY_SELL = 'intraday_sell',
  LONG_TERM = 'long_term',
  SHORT_TERM = 'short_term',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive',
  CONSERVATIVE = 'conservative',
}

export enum SeedRiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
}

/** @deprecated risk_level — Seed GET /v2/recommendations no longer accepts risk_level; use min_score only. Kept for legacy callers. */
export interface V2RecommendationRequest {
  strategy: string;
  risk_level?: string;
  limit?: number;
}

export interface SeedRecommendationRequest {
  strategy: SeedStrategyType;
  /** @deprecated Not sent to Seed v2 recommendations API (OpenAPI: trade_type, limit, min_score only). */
  risk_level?: SeedRiskLevel;
  limit?: number;
  /** Optional score floor; default 60 in client when omitted. */
  min_score?: number;
  min_price?: number;
  max_price?: number;
  min_volume?: number;
  preferred_sectors?: string[];
  excluded_sectors?: string[];
  execute_all_arms?: boolean;
  specific_arms?: string[];
  include_technical_analysis?: boolean;
  include_reasoning?: boolean;
  include_arm_details?: boolean;
  diversify_sectors?: boolean;
}

export const SHORT_SELL_ARMS = [
  'INTRADAY_SHORT_BREAKDOWN',
  'INTRADAY_SHORT_REVERSAL',
  'INTRADAY_SHORT_MOMENTUM',
];

export const BUY_ARMS = [
  'INTRADAY_MOMENTUM_BREAKOUT',
  'INTRADAY_TECHNICAL_VOLUME',
  'INTRADAY_QUICK_PROFIT',
];

export const SWING_ARMS = [
  'SWING_TECHNICAL_BREAKOUT',
  'SWING_MOMENTUM_GROWTH',
  'SWING_TREND_FOLLOWING',
];

export const LONG_TERM_ARMS = [
  'LONG_TERM_BLUE_CHIP',
  'LONG_TERM_FUNDAMENTAL_GROWTH',
  'LONG_TERM_DIVIDEND_YIELD',
];

export interface SeedTechnicalAnalysis {
  rsi: number;
  sma_20: number;
  volume_trend: string;
  momentum: string;
}

export interface SeedPredictedReturn {
  target_return: number;
  time_horizon: string;
  confidence: number;
}

export interface SeedStockRecommendation {
  symbol: string;
  current_price: number;
  sector: string;
  overall_score: number;
  confidence: number;
  entry_signal: string;
  selected_arms: string[];
  dominant_arm: string;
  arm_scores: Record<string, number>;
  technical_analysis: SeedTechnicalAnalysis;
  market_condition_fit: string;
  predicted_return: SeedPredictedReturn;
  risk_assessment: string;
  reasoning: string[];
  data_source: string;
  data_timestamp: string;
}

export interface SeedMarketContext {
  regime: string;
  strength: number;
  volatility_level: string;
  leading_sectors: string[];
  key_observations: string[];
}

export interface SeedArmExecutionResult {
  arm_name: string;
  success: boolean;
  execution_time_ms: number;
  stocks_found: number;
  avg_score: number;
  data_quality_score: number;
  query_used: string;
}

export interface SeedProcessingStats {
  total_arms_executed: number;
  successful_arms: number;
  stocks_analyzed: number;
  stocks_recommended: number;
  filter_efficiency: number;
  avg_arms_per_stock: number;
}

export interface SeedRecommendationResponse {
  timestamp: string;
  request_id: string;
  processing_time_ms: number;
  recommendations: SeedStockRecommendation[];
  market_context: SeedMarketContext;
  arm_execution_results: SeedArmExecutionResult[];
  processing_stats: SeedProcessingStats;
  data_source?: string;
}

/**
 * Prod Seed Stocks Service (GET /v2/recommendations) - OpenAPI wire format.
 * @see http://203.57.85.201:8182/docs
 */
export interface RankedStockResponse {
  symbol: string;
  exchange: string;
  trade_type: string;
  score: number;
  rank: number;
  ranked_at: string;
  last_price: number;
  change_pct: number | null;
  entry_price: number;
  stop_loss: number;
  target_1: number;
  target_2: number | null;
  target_3: number | null;
  risk_reward_ratio: number;
  max_risk_pct: number;
  generated_at: string;
  valid_until: string;
  reason: string;
  signals: Record<string, unknown>;
  market_regime?: string | null;
  sector?: string | null;
  volume?: number | null;
  [key: string]: unknown;
}

export interface RecommendationsResponse {
  trade_type: string;
  count: number;
  recommendations: RankedStockResponse[];
  generated_at: string;
  recommendation_source?: string | null;
  risk_level?: string | null;
  min_score_applied?: number | null;
  market_regime?: string | null;
}

export interface SeedHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  api_version: string;
  features: string;
}
