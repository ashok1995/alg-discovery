/**
 * Trading and recommendation strategy models
 */

import {
  StrategyType,
  RiskLevel,
  MarketCondition,
  Sector,
  MarketCap,
  SortDirection,
  SortBy,
  InvestmentHorizon,
  LossTighteningMode,
  MarketSession,
} from './tradingEnums';

export {
  StrategyType,
  RiskLevel,
  MarketCondition,
  Sector,
  MarketCap,
  SortDirection,
  SortBy,
  InvestmentHorizon,
  LossTighteningMode,
  MarketSession,
};

export interface GlobalMarketContext {
  condition?: MarketCondition;
  vix?: number;
  benchmark_trend?: string;
  session?: MarketSession;
  timezone?: string;
  [key: string]: unknown;
}

export interface UniversalIncludeFlags {
  real_time_prices?: boolean;
  technical_indicators?: boolean;
  fundamentals?: boolean;
  sentiment?: boolean;
  alerts?: boolean;
  ai_analysis?: boolean;
}

export interface UniversalFilters {
  risk_levels?: Array<'low' | 'medium' | 'high'>;
  sectors?: string[];
  symbols?: string[];
  exclude_symbols?: string[];
  time_frame?: 'intraday' | 'swing' | 'long_term';
  price_range?: { min?: number; max?: number };
  market_cap_range?: { min?: number; max?: number };
  volume_min?: number;
  momentum_threshold?: number;
  volatility_max?: number;
  breakout_only?: boolean;
  categories?: string[];
  holding_period_days?: { min?: number; max?: number };
  technicals?: Record<string, unknown>;
  fundamentals?: Record<string, unknown>;
  sentiment?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ScoreFilters {
  min_score?: number;
  max_score?: number;
  score_range?: { min?: number; max?: number };
  technical_score_min?: number;
  fundamental_score_min?: number;
  combined_score_min?: number;
}

export interface UIQuickRecommendationRequest {
  strategy: StrategyType;
  risk_level: RiskLevel;
  investment_horizon?: InvestmentHorizon;
  max_positions?: number;
  profit_target_value?: number;
  stop_loss_percentage?: number;
  min_score: number;
  limit: number;
}

export interface UIRecommendationRequest {
  strategy: StrategyType;
  risk_level: RiskLevel;
  investment_horizon?: InvestmentHorizon;
  max_positions?: number;
  profit_target_value?: number;
  stop_loss_percentage?: number;
  min_price?: number;
  max_price?: number;
  min_volume?: number;
  min_liquidity?: number;
  execution_urgency?: string;
  market_condition?: MarketCondition;
  sectors?: Sector[];
  market_caps?: MarketCap[];
  preferred_sectors?: Sector[];
  excluded_sectors?: Sector[];
  rsi_range?: [number, number];
  min_score: number;
  max_score?: number;
  limit: number;
  loss_tightening?: LossTighteningMode;
  sort_by?: SortBy;
  sort_direction?: SortDirection;
}

export interface UIStockRecommendation {
  symbol: string;
  score: number;
  price?: number;
  sector?: Sector;
  market_cap?: MarketCap;
  rsi?: number;
  trend?: string;
  volume?: number;
  change_percent?: number;
  market_cap_value?: number;
  pe_ratio?: number;
  pb_ratio?: number;
  debt_to_equity?: number;
  roe?: number;
}

export interface UIRecommendationResponse {
  success: boolean;
  stocks: UIStockRecommendation[];
  total_count: number;
  avg_score?: number;
  score_range?: [number, number];
  market_condition?: MarketCondition;
  strategy_used?: StrategyType;
  execution_time?: number;
  error_message?: string;
}

export interface SortBlock {
  by?: string;
  direction?: SortDirection;
}

export interface PaginationBlock {
  page?: number;
  per_page?: number;
  limit?: number;
  offset?: number;
}

export interface TraceBlock {
  request_id?: string;
  source?: 'web' | 'cli' | 'job' | string;
  user_id?: string;
  [key: string]: unknown;
}

export interface UniversalRecommendationRequest {
  strategy: StrategyType;
  limit?: number;
  force_refresh?: boolean;
  include?: UniversalIncludeFlags;
  filters?: UniversalFilters;
  score_filters?: ScoreFilters;
  sort?: SortBlock;
  pagination?: PaginationBlock;
  context?: GlobalMarketContext;
  trace?: TraceBlock;
  extensions?: Record<string, unknown>;
}

export interface DynamicRecommendationItem {
  symbol: string;
  nsecode: string;
  company_name: string;
  last_price: number;
  current_price: number;
  change_percent: number | null;
  score: number;
  combined_score: number;
  technical_score: number;
  fundamental_score: number;
  rank: number;
  volume: number;
  market_cap: number;
  sector: string;
  industry: string | null;
  rsi: number;
  sma_20: number;
  sma_50: number;
  macd: string | null;
  bollinger_bands: unknown;
  pe_ratio: number;
  pb_ratio: number;
  debt_to_equity: number;
  roe: number;
  roa: number | null;
  indicators: { rsi: number; sma_20: number; sma_50: number };
  metadata: Record<string, unknown>;
  confidence: string;
  source: string;
  fetched_at: string | null;
  strategy_type: string;
  risk_level: string;
}

export interface DynamicRecommendationResponse {
  timestamp: string;
  items: DynamicRecommendationItem[];
  recommendations?: DynamicRecommendationItem[];
  total_count: number;
  execution_time: number;
  strategy: string;
  risk_profile: string;
  success: boolean;
}

export type UniversalRecommendationResponse = DynamicRecommendationResponse;

export interface UIOptionsResponse {
  strategies: Array<{ value: StrategyType; label: string }>;
  risk_levels: Array<{ value: RiskLevel; label: string }>;
  investment_horizons: Array<{ value: InvestmentHorizon; label: string }>;
  sectors: Array<{ value: Sector; label: string }>;
  market_caps: Array<{ value: MarketCap; label: string }>;
  market_conditions: Array<{ value: MarketCondition; label: string }>;
  sort_options: Array<{ value: SortBy; label: string }>;
  sort_directions: Array<{ value: SortDirection; label: string }>;
  loss_tightening_modes?: Array<{ value: LossTighteningMode; label: string }>;
  presets?: Array<{ value: string; label: string }>;
}
