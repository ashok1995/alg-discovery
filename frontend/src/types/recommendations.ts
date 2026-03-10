/**
 * Recommendation API Service types
 * Extracted from RecommendationAPIService for clearer separation
 */

// Risk profile types
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

// Recommendation request interface (supports canonical and legacy aliases)
export interface RecommendationRequest {
  max_recommendations?: number;
  max_items?: number;
  min_score?: number;
  risk_profile?: RiskProfile;
  risk?: RiskProfile;
  include_metadata?: boolean;
}

// Analysis scores interface
export interface AnalysisScores {
  technical_score: number;
  fundamental_score: number;
  sentiment_score: number;
}

// Metadata interface
export interface RecommendationMetadata {
  pe_ratio?: number;
  pb_ratio?: number;
  debt_to_equity?: number;
  [key: string]: unknown;
}

// Individual recommendation interface
export interface Recommendation {
  symbol: string;
  name: string;
  company_name?: string;
  score: number;
  price: number;
  change_percent: number;
  volume: number;
  market_cap: number;
  sector: string;
  analysis: AnalysisScores;
  metadata?: RecommendationMetadata & { source?: string; fetched_at?: string };
}

// Recommendation response interface
export interface RecommendationResponse {
  status: 'success' | 'error';
  timestamp: string;
  recommendations: Recommendation[];
  total_count: number;
  execution_time: number;
  error?: string;
}

// Health check response interface
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  environment: string;
  version: string;
}

// Service status interface
export interface ServiceStatus {
  connected: boolean;
  url: string;
  status: 'connected' | 'disconnected' | 'error';
  lastCheck: string;
}
