/**
 * Recommendation API Service
 * =========================
 * 
 * Comprehensive service for all 4 recommendation scenarios:
 * 1. Swing Trading - Medium-term positions (3-10 days)
 * 2. Long-term Buy - Long-term investing (weeks to months)
 * 3. Intraday Buy - Same-day buying opportunities
 * 4. Intraday Sell - Same-day selling opportunities
 * 
 * Based on the CURL commands reference for the recommendation API
 */

import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/api';
import { getEndpointPath, getBaseUrlForDomain } from '../config/endpointRegistry';
import { getMetaHeaders } from '../utils/meta';
import attachAxiosLogging from './httpLogger';

// API base URL for recommendations
const RECOMMENDATION_API_BASE_URL = getBaseUrlForDomain('recommendation');

// Endpoint keys
const ENDPOINT_KEYS = {
  SWING: 'recommendation.recommendations.swing',
  LONG_BUY: 'recommendation.recommendations.long_buy',
  INTRADAY_BUY: 'recommendation.recommendations.intraday_buy',
  INTRADAY_SELL: 'recommendation.recommendations.intraday_sell',
  HEALTH: 'health',
} as const;

// Risk profile types
export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

// Recommendation request interface (supports canonical and legacy aliases)
export interface RecommendationRequest {
  max_recommendations?: number;
  max_items?: number; // canonical
  min_score?: number;
  risk_profile?: RiskProfile;
  risk?: RiskProfile; // canonical
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
  [key: string]: any;
}

// Individual recommendation interface
export interface Recommendation {
  symbol: string;
  name: string;
  company_name?: string; // API returns this field
  score: number;
  price: number; // normalized to number (0 if missing)
  change_percent: number;
  volume: number;
  market_cap: number;
  sector: string;
  analysis: AnalysisScores; // normalized (zeros if missing)
  metadata?: RecommendationMetadata & { source?: string; fetched_at?: string };
}

// Recommendation response interface
export interface RecommendationResponse {
  status: 'success' | 'error';
  timestamp: string;
  recommendations: Recommendation[];
  total_count: number;
  execution_time: number; // seconds
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

class RecommendationAPIService {
  private static instance: RecommendationAPIService;
  private api: AxiosInstance;
  private lastHealthCheck: number = 0;
  private healthCheckCache: boolean | null = null;

  private constructor() {
    this.api = axios.create({
      baseURL: RECOMMENDATION_API_BASE_URL,
      timeout: API_CONFIG.REQUEST.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    attachAxiosLogging(this.api, 'RecommendationAPI');

    // Add request interceptors for logging
    this.api.interceptors.request.use(
      (config) => {
        const mergedHeaders = { ...((config.headers || {}) as any), ...getMetaHeaders('/recommendations') };
        (config as any).headers = mergedHeaders;
        console.log(`🚀 [RecommendationAPI] ${config.method?.toUpperCase()} ${config.url}`, config.data);
        return config;
      },
      (error) => {
        console.error('❌ [RecommendationAPI] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptors for logging
    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ [RecommendationAPI] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('❌ [RecommendationAPI] Response error:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RecommendationAPIService {
    if (!RecommendationAPIService.instance) {
      RecommendationAPIService.instance = new RecommendationAPIService();
    }
    return RecommendationAPIService.instance;
  }

  /** Build canonical request payload from mixed aliases */
  private toCanonicalPayload(req: RecommendationRequest) {
    return {
      max_items: req.max_items ?? req.max_recommendations ?? 50,
      min_score: req.min_score ?? 70,
      risk: req.risk ?? req.risk_profile ?? 'moderate',
    };
  }

  /** Normalize backend response (items) to RecommendationResponse (recommendations) */
  private normalizeResponse(raw: any): RecommendationResponse {
    const items = raw.items ?? raw.recommendations ?? [];
    const recommendations: Recommendation[] = items.map((it: any) => ({
      symbol: it.symbol,
      name: it.company_name ?? it.name ?? '',
      score: typeof it.score === 'number' ? it.score : 0,
      price: typeof (it.last_price ?? it.price) === 'number' ? (it.last_price ?? it.price) : 0,
      change_percent: typeof it.change_percent === 'number' ? it.change_percent : (it.analysis?.change_percent ?? 0),
      volume: typeof it.volume === 'number' ? it.volume : 0,
      market_cap: typeof it.market_cap === 'number' ? it.market_cap : 0,
      sector: it.sector ?? 'Unknown',
      analysis: {
        technical_score: it.indicators?.technical_score ?? it.analysis?.technical_score ?? 0,
        fundamental_score: it.indicators?.fundamental_score ?? it.analysis?.fundamental_score ?? 0,
        sentiment_score: it.indicators?.sentiment_score ?? it.analysis?.sentiment_score ?? 0,
      },
      metadata: it.metadata,
    }));

    return {
      status: 'success',
      timestamp: raw.timestamp ?? new Date().toISOString(),
      recommendations,
      total_count: raw.total_count ?? recommendations.length,
      execution_time: raw.execution_time ?? 0,
    };
  }

  /** Get swing trading recommendations */
  async getSwingRecommendations(request: RecommendationRequest = {}): Promise<RecommendationResponse> {
    try {
      const payload = this.toCanonicalPayload(request);
      const response = await this.api.post(getEndpointPath(ENDPOINT_KEYS.SWING), payload);
      const data = response.data || {};
      return this.normalizeResponse(data);
    } catch (error) {
      throw this.handleError(error, 'swing recommendations');
    }
  }

  /** Get long-term buy recommendations */
  async getLongBuyRecommendations(request: RecommendationRequest = {}): Promise<RecommendationResponse> {
    try {
      const payload = this.toCanonicalPayload(request);
      const response = await this.api.post(getEndpointPath(ENDPOINT_KEYS.LONG_BUY), payload);
      const data = response.data || {};
      return this.normalizeResponse(data);
    } catch (error) {
      throw this.handleError(error, 'long-term buy recommendations');
    }
  }

  /** Get intraday buy recommendations */
  async getIntradayBuyRecommendations(request: RecommendationRequest = {}): Promise<RecommendationResponse> {
    try {
      const payload = this.toCanonicalPayload(request);
      const response = await this.api.post(getEndpointPath(ENDPOINT_KEYS.INTRADAY_BUY), payload);
      const data = response.data || {};
      return this.normalizeResponse(data);
    } catch (error) {
      throw this.handleError(error, 'intraday buy recommendations');
    }
  }

  /** Get intraday sell recommendations */
  async getIntradaySellRecommendations(request: RecommendationRequest = {}): Promise<RecommendationResponse> {
    try {
      const payload = this.toCanonicalPayload(request);
      const response = await this.api.post(getEndpointPath(ENDPOINT_KEYS.INTRADAY_SELL), payload);
      const data = response.data || {};
      return this.normalizeResponse(data);
    } catch (error) {
      throw this.handleError(error, 'intraday sell recommendations');
    }
  }

  /** Get recommendations by type */
  async getRecommendationsByType(
    type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
    request: RecommendationRequest = {}
  ): Promise<RecommendationResponse> {
    switch (type) {
      case 'swing':
        return this.getSwingRecommendations(request);
      case 'long-buy':
        return this.getLongBuyRecommendations(request);
      case 'intraday-buy':
        return this.getIntradayBuyRecommendations(request);
      case 'intraday-sell':
        return this.getIntradaySellRecommendations(request);
      default:
        throw new Error(`Invalid recommendation type: ${type}`);
    }
  }

  /** Health check for the recommendation service */
  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await this.api.get(getEndpointPath(ENDPOINT_KEYS.HEALTH));
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'health check');
    }
  }

  /** Check if service is available (with caching) */
  async isServiceAvailable(): Promise<boolean> {
    const now = Date.now();
    const cacheExpiry = 30000; // 30 seconds

    if (this.healthCheckCache !== null && (now - this.lastHealthCheck) < cacheExpiry) {
      return this.healthCheckCache;
    }

    try {
      const health = await this.healthCheck();
      this.healthCheckCache = health.status === 'healthy';
      this.lastHealthCheck = now;
      return this.healthCheckCache;
    } catch (_error) {
      this.healthCheckCache = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  /** Get service status */
  async getServiceStatus(): Promise<ServiceStatus> {
    const isAvailable = await this.isServiceAvailable();
    return {
      connected: isAvailable,
      url: RECOMMENDATION_API_BASE_URL,
      status: isAvailable ? 'connected' : 'disconnected',
      lastCheck: new Date().toISOString()
    };
  }

  /** Test connection */
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch (error) {
      console.error('❌ Recommendation service connection test failed:', error);
      return false;
    }
  }

  /** Get all recommendation types at once */
  async getAllRecommendations(request: RecommendationRequest = {}): Promise<{
    swing: RecommendationResponse;
    longBuy: RecommendationResponse;
    intradayBuy: RecommendationResponse;
    intradaySell: RecommendationResponse;
  }> {
    try {
      const [swing, longBuy, intradayBuy, intradaySell] = await Promise.all([
        this.getSwingRecommendations(request),
        this.getLongBuyRecommendations(request),
        this.getIntradayBuyRecommendations(request),
        this.getIntradaySellRecommendations(request)
      ]);

      return {
        swing,
        longBuy,
        intradayBuy,
        intradaySell
      };
    } catch (error) {
      console.error('❌ Error fetching all recommendations:', error);
      throw this.handleError(error, 'all recommendations');
    }
  }

  /** Get recommendations with enhanced error handling and retries */
  async getRecommendationsWithRetry(
    type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
    request: RecommendationRequest = {},
    retries: number = API_CONFIG.REQUEST.RETRY_ATTEMPTS
  ): Promise<RecommendationResponse> {
    let lastError: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await this.getRecommendationsByType(type, request);
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Attempt ${attempt}/${retries} failed for ${type} recommendations:`, error);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, API_CONFIG.REQUEST.RETRY_DELAY * attempt));
        }
      }
    }

    throw lastError;
  }

  /** Handle API errors consistently */
  private handleError(error: any, operation: string): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      return new Error(`Recommendation API ${operation} failed (${status}): ${data?.detail || data?.message || 'Unknown error'}`);
    } else if (error.request) {
      return new Error(`Recommendation API ${operation} failed: No response from server`);
    } else {
      return new Error(`Recommendation API ${operation} failed: ${error.message}`);
    }
  }

  /** Get service information */
  getServiceInfo() {
    return {
      name: 'Recommendation API Service',
      baseUrl: RECOMMENDATION_API_BASE_URL,
      endpoints: {
        SWING: getEndpointPath(ENDPOINT_KEYS.SWING),
        LONG_BUY: getEndpointPath(ENDPOINT_KEYS.LONG_BUY),
        INTRADAY_BUY: getEndpointPath(ENDPOINT_KEYS.INTRADAY_BUY),
        INTRADAY_SELL: getEndpointPath(ENDPOINT_KEYS.INTRADAY_SELL),
        HEALTH: getEndpointPath(ENDPOINT_KEYS.HEALTH),
      },
      timeout: API_CONFIG.REQUEST.TIMEOUT,
      retryAttempts: API_CONFIG.REQUEST.RETRY_ATTEMPTS,
      retryDelay: API_CONFIG.REQUEST.RETRY_DELAY
    };
  }
}

// Export singleton instance
export const recommendationAPIService = RecommendationAPIService.getInstance();
