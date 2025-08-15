export interface SwingRecommendation {
  symbol: string;
  name: string;
  price: number;
  score: number;
  per_change: number;
  volume: number;
  volume_in_crore?: number; // volume * price / 10000000
  appearances: number;
  category_count: number;
  recommendation_type: string;
  breakout: boolean;
  momentum: boolean;
  pattern: boolean;
  reversal: boolean;
  categories: string[];
  confidence?: number;
  strength?: number;
  timestamp?: string;
  // New fields from updated API
  final_score?: number;
  base_score?: number;
  price_source?: string; // 'zerodha_real_time' | 'chartink_only'
  sector?: string;
  analysis_date?: string;
  // New chart URL field
  chart_url?: string; // Kite chart URL
}

export interface CacheMetadata {
  last_updated_at: string | null;
  total_recommendations: number;
  cache_status: 'success' | 'error' | 'empty';
  generated_at: string;
  market_hours: boolean;
}

export interface SwingRecommendationsResponse {
  recommendations: SwingRecommendation[];
  metadata: CacheMetadata;
}

export interface MarketStatus {
  isMarketHours: boolean;
  currentTime: string;
  nextUpdate: string;
  lastUpdate: string;
}

export interface RefreshSettings {
  autoRefresh: boolean;
  interval: number; // in seconds
  enabled: boolean;
} 