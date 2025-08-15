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


