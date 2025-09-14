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
  min_score: number; // 0-100
  limit: number; // 1-100
}

export interface UIRecommendationRequest {
  strategy: StrategyType;
  risk_level: RiskLevel;
  market_condition?: MarketCondition;
  sectors?: Sector[];
  market_caps?: MarketCap[];
  rsi_range?: [number, number]; // [min, max]
  min_score: number; // 0-100
  max_score?: number; // 0-100
  limit: number; // 1-100
  loss_tightening?: 'conservative' | 'moderate' | 'aggressive';
  sort_by?: 'score' | 'price' | 'volume' | 'market_cap' | 'change_percent' | 'rsi';
  sort_direction?: 'asc' | 'desc';
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

