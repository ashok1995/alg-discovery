// Shared, strictly typed models for common endpoints

export interface BaseMeta {
  requestId?: string;
  processing_time?: number;
  cache_hit?: boolean;
  timestamp?: string;
  price_source?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  metadata?: BaseMeta;
}

// Strategy recommendation unified models
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
  metadata: Record<string, any>;
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



// ================= Universal Recommendation Query =================
// Extensible, strategy-agnostic request model for all recommendation pages

export enum StrategyType {
  SWING = 'swing',
  INTRADAY_BUY = 'intraday_buy',
  INTRADAY_SELL = 'intraday_sell',
  LONG_TERM = 'long_term',
  SHORT_TERM = 'short_term'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum MarketCondition {
  BULLISH = 'bullish',
  BEARISH = 'bearish',
  NEUTRAL = 'neutral',
  AUTO_DETECTED = 'auto_detected'
}

export enum Sector {
  IT = 'i.t',
  FINANCE = 'finance',
  FMCG = 'fmcg',
  AUTO = 'auto',
  PHARMA = 'pharma',
  METALS = 'metals',
  REALTY = 'realty',
  SERVICES = 'services',
  TEXTILES = 'textiles',
  INDUSTRIALS = 'industrials',
  MEDIA = 'media',
  ENERGY = 'energy',
  TELECOM = 'telecom',
  INDICES = 'indices'
}

export enum MarketCap {
  LARGECAP = 'largecap',
  MIDCAP = 'midcap',
  SMALLCAP = 'smallcap'
}

export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc'
}

export enum SortBy {
  SCORE = 'score',
  PRICE = 'price',
  VOLUME = 'volume',
  MARKET_CAP = 'market_cap',
  CHANGE_PERCENT = 'change_percent',
  RSI = 'rsi'
}

export enum InvestmentHorizon {
  INTRADAY = 'intraday',
  SHORT_TERM = 'short_term',
  MEDIUM_TERM = 'medium_term',
  LONG_TERM = 'long_term',
  POSITION = 'position'
}

export enum LossTighteningMode {
  CONSERVATIVE = 'conservative',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive'
}

export enum MarketSession {
  // High-level (backward compatible)
  PRE = 'pre',
  REGULAR = 'regular',
  POST = 'post',
  PRE_POST = 'pre_post',

  // Detailed India market windows
  BEFORE_0900 = 'before_0900',              // Before 09:00
  PRE_OPEN_0900_0915 = 'pre_open_0900_0915',// 09:00 - 09:15
  REGULAR_0915_1445 = 'regular_0915_1445',  // 09:15 - 14:45
  CLOSING_1445_1530 = 'closing_1445_1530',  // 14:45 - 15:30
  AFTER_1530 = 'after_1530',                // After 15:30
  CLOSED = 'closed'                         // Holidays/weekends/outside hours
}

export interface GlobalMarketContext {
  condition?: MarketCondition;
  vix?: number;
  benchmark_trend?: string; // e.g., nifty_trend
  session?: MarketSession;
  timezone?: string;
  [key: string]: any; // forward-compatible
}

export interface UniversalIncludeFlags {
  real_time_prices?: boolean;
  technical_indicators?: boolean;
  fundamentals?: boolean;
  sentiment?: boolean;
  alerts?: boolean;
  ai_analysis?: boolean;
}

// Grouped filter blocks for clarity and future extension
export interface UniversalFilters {
  // Common
  risk_levels?: Array<'low' | 'medium' | 'high'>;
  sectors?: string[];
  symbols?: string[];
  exclude_symbols?: string[];
  time_frame?: 'intraday' | 'swing' | 'long_term';

  // Liquidity / price
  price_range?: { min?: number; max?: number };
  market_cap_range?: { min?: number; max?: number };
  volume_min?: number;

  // Swing/strategy heuristics (optional; safe to ignore by other engines)
  momentum_threshold?: number;
  volatility_max?: number;
  breakout_only?: boolean;
  categories?: string[];
  holding_period_days?: { min?: number; max?: number };

  // Extension surface for future filters (technicals/fundamentals/etc.)
  technicals?: Record<string, any>;
  fundamentals?: Record<string, any>;
  sentiment?: Record<string, any>;
  [key: string]: any;
}

export interface ScoreFilters {
  // Score-based filtering options
  min_score?: number;           // Minimum recommendation score (0-100)
  max_score?: number;           // Maximum recommendation score (0-100)
  score_range?: { min?: number; max?: number }; // Score range filter
  technical_score_min?: number; // Minimum technical score
  fundamental_score_min?: number; // Minimum fundamental score
  combined_score_min?: number;  // Minimum combined score
}

// UI Models Package Interfaces
export interface UIQuickRecommendationRequest {
  strategy: StrategyType;
  risk_level: RiskLevel;
  investment_horizon?: InvestmentHorizon;
  max_positions?: number;
  profit_target_value?: number;
  stop_loss_percentage?: number;
  min_score: number; // 0-100
  limit: number; // 1-100
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
  rsi_range?: [number, number]; // [min, max]
  min_score: number; // 0-100
  max_score?: number; // 0-100
  limit: number; // 1-100
  loss_tightening?: LossTighteningMode;
  sort_by?: SortBy;
  sort_direction?: SortDirection;
}

export interface UIStockRecommendation {
  symbol: string;
  score: number; // 0-100
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
  source?: 'web' | 'cli' | 'job' | string; // Allow any string for flexibility
  user_id?: string;
  [key: string]: any;
}

export interface UniversalRecommendationRequest {
  strategy: StrategyType;

  // Core controls
  limit?: number; // default 50
  force_refresh?: boolean; // default false

  include?: UniversalIncludeFlags;
  filters?: UniversalFilters;
  score_filters?: ScoreFilters;
  sort?: SortBlock;
  pagination?: PaginationBlock;
  context?: GlobalMarketContext;
  trace?: TraceBlock;

  // Future add-ons; kept for forward compatibility
  extensions?: Record<string, any>;
}

// Response from the dynamic endpoint
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
  bollinger_bands: any | null;
  pe_ratio: number;
  pb_ratio: number;
  debt_to_equity: number;
  roe: number;
  roa: number | null;
  indicators: {
    rsi: number;
    sma_20: number;
    sma_50: number;
  };
  metadata: Record<string, any>;
  confidence: string;
  source: string;
  fetched_at: string | null;
  strategy_type: string;
  risk_level: string;
}

export interface DynamicRecommendationResponse {
  timestamp: string;
  items: DynamicRecommendationItem[];
  recommendations?: DynamicRecommendationItem[]; // Backend returns this format
  total_count: number;
  execution_time: number;
  strategy: string;
  risk_profile: string;
  success: boolean;
}

export type UniversalRecommendationResponse = DynamicRecommendationResponse;

// Options response interface
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

// Validation error interface
export interface ValidationError {
  field: string;
  message: string;
}

// Validation function
export function validateUIRequest(request: Partial<UIRecommendationRequest>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (!request.strategy) {
    errors.push({ field: 'strategy', message: 'Strategy is required' });
  }
  
  if (!request.risk_level) {
    errors.push({ field: 'risk_level', message: 'Risk level is required' });
  }
  
  if (request.min_score !== undefined && (request.min_score < 0 || request.min_score > 100)) {
    errors.push({ field: 'min_score', message: 'Min score must be between 0 and 100' });
  }
  
  if (request.limit !== undefined && (request.limit < 1 || request.limit > 100)) {
    errors.push({ field: 'limit', message: 'Limit must be between 1 and 100' });
  }
  
  return errors;
}

// Default request function
export function getDefaultUIRequest(): UIRecommendationRequest {
  return {
    strategy: StrategyType.SWING,
    risk_level: RiskLevel.MEDIUM,
    investment_horizon: InvestmentHorizon.MEDIUM_TERM,
    max_positions: 10,
    profit_target_value: 5,
    stop_loss_percentage: 3,
    min_price: 10,
    max_price: 10000,
    min_volume: 100000,
    min_score: 60,
    limit: 20,
    sort_by: SortBy.SCORE,
    sort_direction: SortDirection.DESC
  };
}

// Dropdown options function
export function getDropdownOptions() {
  return {
    strategies: [
      { value: StrategyType.SWING, label: 'Swing Trading' },
      { value: StrategyType.INTRADAY_BUY, label: 'Intraday Buy' },
      { value: StrategyType.INTRADAY_SELL, label: 'Intraday Sell' },
      { value: StrategyType.LONG_TERM, label: 'Long Term' }
    ],
    riskLevels: [
      { value: RiskLevel.LOW, label: 'Low Risk' },
      { value: RiskLevel.MEDIUM, label: 'Medium Risk' },
      { value: RiskLevel.HIGH, label: 'High Risk' }
    ],
    investmentHorizons: [
      { value: InvestmentHorizon.INTRADAY, label: 'Intraday' },
      { value: InvestmentHorizon.SHORT_TERM, label: 'Short Term (1-3 days)' },
      { value: InvestmentHorizon.MEDIUM_TERM, label: 'Medium Term (1-4 weeks)' },
      { value: InvestmentHorizon.LONG_TERM, label: 'Long Term (1+ months)' },
      { value: InvestmentHorizon.POSITION, label: 'Position' }
    ],
    sectors: [],
    marketCaps: [],
    marketConditions: [
      { value: MarketCondition.BULLISH, label: 'Bullish' },
      { value: MarketCondition.BEARISH, label: 'Bearish' },
      { value: MarketCondition.NEUTRAL, label: 'Neutral' },
      { value: MarketCondition.AUTO_DETECTED, label: 'Auto Detected' }
    ],
    lossTighteningModes: [
      { value: LossTighteningMode.CONSERVATIVE, label: 'Conservative' },
      { value: LossTighteningMode.MODERATE, label: 'Moderate' },
      { value: LossTighteningMode.AGGRESSIVE, label: 'Aggressive' }
    ],
    sortOptions: [
      { value: SortBy.SCORE, label: 'Score' },
      { value: SortBy.PRICE, label: 'Price' },
      { value: SortBy.VOLUME, label: 'Volume' },
      { value: SortBy.MARKET_CAP, label: 'Market Cap' },
      { value: SortBy.CHANGE_PERCENT, label: 'Change %' },
      { value: SortBy.RSI, label: 'RSI' }
    ],
    sortDirections: [
      { value: SortDirection.ASC, label: 'Ascending' },
      { value: SortDirection.DESC, label: 'Descending' }
    ],
    presets: []
  };
}

// ================= Seed Service API Models =================
// Based on the Seed Service v2 API specification

export enum SeedStrategyType {
  SWING = 'swing',
  INTRADAY = 'intraday',
  LONG_TERM = 'long_term',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive',
  CONSERVATIVE = 'conservative'
}

export enum SeedRiskLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high'
}

/** Minimal request for POST /api/v2/recommendations (Seed service) */
export interface V2RecommendationRequest {
  strategy: string;
  risk_level: string;
  limit?: number;
}

export interface SeedRecommendationRequest {
  // Mandatory field
  strategy: SeedStrategyType;

  // Optional parameters with defaults
  risk_level?: SeedRiskLevel;
  limit?: number;
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

// ARM Strategy Constants for Production
export const SHORT_SELL_ARMS = [
  'INTRADAY_SHORT_BREAKDOWN',
  'INTRADAY_SHORT_REVERSAL', 
  'INTRADAY_SHORT_MOMENTUM'
];

export const BUY_ARMS = [
  'INTRADAY_MOMENTUM_BREAKOUT',
  'INTRADAY_TECHNICAL_VOLUME',
  'INTRADAY_QUICK_PROFIT'
];

export const SWING_ARMS = [
  'SWING_TECHNICAL_BREAKOUT',
  'SWING_MOMENTUM_GROWTH',
  'SWING_TREND_FOLLOWING'
];

export const LONG_TERM_ARMS = [
  'LONG_TERM_BLUE_CHIP',
  'LONG_TERM_FUNDAMENTAL_GROWTH',
  'LONG_TERM_DIVIDEND_YIELD'
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
  // Optional fields returned by seed service
  data_source?: string;
}

export interface SeedHealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  api_version: string;
  features: string;
}

