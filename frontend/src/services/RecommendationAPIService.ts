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
import {
  UniversalRecommendationRequest,
  DynamicRecommendationResponse,
  StrategyType,
  UIRecommendationRequest,
  UIRecommendationResponse,
  Sector,
} from '../types/apiModels';

// API base URL for recommendations - use Nginx proxy for production
const RECOMMENDATION_API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? '' 
  : (process.env.NODE_ENV === 'production' 
    ? '' // Use relative URL to go through Nginx proxy
    : getBaseUrlForDomain('recommendation'));

// Endpoint keys
const ENDPOINT_KEYS = {
  RECOMMENDATIONS: '/api/recommendations',
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
    const items = raw.items ?? raw.recommendations ?? raw.data ?? [];
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

  /** Normalize strategy aliases for dynamic endpoint */
  private normalizeStrategyName(strategy: any): string {
    const s = String(strategy || '').toLowerCase();
    if (s === 'swing-buy' || s === 'swing_buy') return 'swing';
    return s;
  }

  /** Production API endpoint method */
  async getProductionRecommendations(request: {
    strategy: string;
    risk_level: string;
    market_condition?: string;
    market_cap?: string;
    sector?: string;
    min_price?: number;
    max_price?: number;
    min_volume?: number;
    rsi_min?: number;
    rsi_max?: number;
    min_score?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const response = await this.api.post(ENDPOINT_KEYS.RECOMMENDATIONS, request);
      
      const backendData = response.data || {};
      return {
        success: true,
        stocks: backendData.recommendations?.map((rec: any) => ({
          symbol: rec.symbol,
          name: rec.symbol,
          price: rec.current_price,
          change_percentage: rec.change_percent, // Use change_percent
          overall_score: rec.overall_score,
          technical_score: rec.technical_analysis?.technical_score,
          fundamental_score: rec.fundamental_analysis?.fundamental_score,
          sector: rec.sector,
          volume: rec.volume,
          market_cap: rec.market_cap,
          rsi: rec.technical_analysis?.rsi,
          macd: rec.technical_analysis?.macd,
          sma_20: rec.technical_analysis?.sma_20,
          sma_50: rec.technical_analysis?.sma_50,
          entry_signal: rec.trade_setup?.entry_signal,
          timestamp: rec.timestamp
        })) || [],
        total_count: backendData.total_count || 0,
        execution_time: backendData.execution_time_ms / 1000,
        timestamp: backendData.timestamp
      };
    } catch (error) {
      throw this.handleError(error, 'production recommendations');
    }
  }

  /** Dynamic unified endpoint (dev) */
  async getUIRecommendations(request: UIRecommendationRequest): Promise<UIRecommendationResponse> {
    try {
      const payload = { ...request, strategy: this.normalizeStrategyName(request.strategy) };
      const response = await this.api.post('/api/ui-recommendations', payload);
      const normalized = this.normalizeResponse(response.data);
      return {
        success: normalized.status === 'success',
        stocks: normalized.recommendations.map(rec => ({
          symbol: rec.symbol,
          score: rec.score,
          price: rec.price,
          sector: rec.sector as Sector,
          change_percent: rec.change_percent,
        })),
        total_count: normalized.total_count,
        avg_score: normalized.recommendations.reduce((sum, r) => sum + r.score, 0) / normalized.total_count,
        execution_time: normalized.execution_time,
        error_message: normalized.error,
        strategy_used: this.normalizeStrategyName(request.strategy) as StrategyType,
      };
    } catch (error) {
      throw this.handleError(error, 'UI recommendations');
    }
  }

  // Quick recommendations endpoint
  async getQuickRecommendations(request: any): Promise<UIRecommendationResponse> {
    const { strategy, risk_level, limit = 10 } = request;
    try {
      const payload = { strategy: this.normalizeStrategyName(strategy), risk_level, limit };
      const response = await this.api.post('/api/quick-recommendations', payload);
      const normalized = this.normalizeResponse(response.data);
      return {
        success: normalized.status === 'success',
        stocks: normalized.recommendations.map(rec => ({
          symbol: rec.symbol,
          score: rec.score,
          price: rec.price,
          sector: rec.sector as Sector,
          change_percent: rec.change_percent,
        })),
        total_count: normalized.total_count,
        avg_score: normalized.recommendations.reduce((sum, r) => sum + r.score, 0) / normalized.total_count,
        execution_time: normalized.execution_time,
        error_message: normalized.error,
        strategy_used: this.normalizeStrategyName(strategy) as StrategyType,
      };
    } catch (error) {
      throw this.handleError(error, 'quick recommendations');
    }
  }

  async getDynamicRecommendations(request: UniversalRecommendationRequest): Promise<DynamicRecommendationResponse> {
    try {
      // Normalize strategy type for backend consistency
      let strategy = request.strategy;
      if (['swing-buy', 'swing_buy'].includes(strategy)) {
        strategy = StrategyType.SWING;
      }
      const payload = { ...request, strategy }; // Use the normalized strategy
      
      // Try the production endpoint first
      try {
        const response = await this.api.post(ENDPOINT_KEYS.RECOMMENDATIONS, payload, {
          headers: { 'X-Trace-ID': request.trace?.request_id || `trace_${Date.now()}` }
        });
        
        // Transform the response to match the expected format
        const backendData = response.data || {};
        return {
          timestamp: backendData.timestamp || new Date().toISOString(),
          items: backendData.recommendations || backendData.items || [],
          total_count: backendData.total_count || 0,
          execution_time: backendData.execution_time || 0,
          strategy: backendData.strategy || strategy,
          risk_profile: backendData.risk_profile || 'moderate',
          success: backendData.success !== false
        };
      } catch (dynamicError) {
        // NO MORE MOCK DATA - Return empty response for real stocks only
        console.warn('Dynamic endpoint failed, returning empty response (no mock data)');
        
        return {
          timestamp: new Date().toISOString(),
          items: [],
          total_count: 0,
          execution_time: 0,
          strategy: strategy,
          risk_profile: 'moderate',
          success: false
        };
      }
    } catch (error) {
      throw this.handleError(error, 'dynamic recommendations');
    }
  }

  /** Get recommendations by type */
  async getRecommendationsByType(
    type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
    request: RecommendationRequest = {}
  ): Promise<DynamicRecommendationResponse> {
    try {
      const strategy = this.normalizeStrategyName(type);

      const riskLevelMap = {
        'conservative': 'low',
        'moderate': 'medium',
        'aggressive': 'high'
      };

      const riskLevel = riskLevelMap[request.risk_profile as keyof typeof riskLevelMap] || 'medium';

      const payload = {
        strategy,
        risk_level: riskLevel,
        min_score: request.min_score || 60,
        limit: request.max_recommendations || 50,
        min_price: 10,
        max_price: 10000,
        min_volume: 100000
      };

      const response = await this.api.post(ENDPOINT_KEYS.RECOMMENDATIONS, payload);
      const normalized = this.normalizeResponse(response.data);
      return {
        success: normalized.status === 'success',
        items: normalized.recommendations.map(rec => ({
          symbol: rec.symbol,
          nsecode: rec.symbol,
          company_name: rec.name,
          last_price: rec.price,
          current_price: rec.price,
          change_percent: rec.change_percent,
          score: rec.score,
          combined_score: rec.score,
          technical_score: rec.analysis.technical_score,
          fundamental_score: rec.analysis.fundamental_score,
          rank: 0, // Placeholder, will be ranked client-side
          volume: rec.volume,
          market_cap: rec.market_cap,
          sector: rec.sector,
          industry: null,
          rsi: rec.metadata?.rsi || 0,
          sma_20: rec.metadata?.sma_20 || 0,
          sma_50: rec.metadata?.sma_50 || 0,
          macd: null,
          bollinger_bands: null,
          pe_ratio: rec.metadata?.pe_ratio || 0,
          pb_ratio: rec.metadata?.pb_ratio || 0,
          debt_to_equity: rec.metadata?.debt_to_equity || 0,
          roe: 0, // Not available in current Recommendation type
          roa: null,
          indicators: {
            rsi: rec.metadata?.rsi || 0,
            sma_20: rec.metadata?.sma_20 || 0,
            sma_50: rec.metadata?.sma_50 || 0,
          },
          metadata: rec.metadata || {},
          confidence: '',
          source: rec.metadata?.source || 'RecommendationAPI',
          fetched_at: normalized.timestamp,
          strategy_type: strategy,
          risk_level: riskLevel,
        })),
        total_count: normalized.total_count,
        execution_time: normalized.execution_time,
        timestamp: normalized.timestamp,
        strategy: strategy,
        risk_profile: riskLevel,
      };
    } catch (error) {
      throw this.handleError(error, 'recommendations by type');
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
    swing: DynamicRecommendationResponse;
    longBuy: DynamicRecommendationResponse;
    intradayBuy: DynamicRecommendationResponse;
    intradaySell: DynamicRecommendationResponse;
  }> {
    try {
      const [swing, longBuy, intradayBuy, intradaySell] = await Promise.all([
        this.getRecommendationsByType('swing', request),
        this.getRecommendationsByType('long-buy', request),
        this.getRecommendationsByType('intraday-buy', request),
        this.getRecommendationsByType('intraday-sell', request)
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
  ): Promise<DynamicRecommendationResponse> {
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

  /** Get short sell opportunities */
  async getShortSellOpportunities(limit: number = 10): Promise<DynamicRecommendationResponse> {
    const requestBody = {
      strategy: 'intraday_sell',
      risk_level: 'high',
      limit: limit,
    };
    try {
      const response = await this.api.post('/api/intraday-sell/recommendations', requestBody);
      const normalized = this.normalizeResponse(response.data);
      return {
        success: normalized.status === 'success',
        items: normalized.recommendations.map(rec => ({
          symbol: rec.symbol,
          nsecode: rec.symbol,
          company_name: rec.name,
          last_price: rec.price,
          current_price: rec.price,
          change_percent: rec.change_percent,
          score: rec.score,
          combined_score: rec.score,
          technical_score: rec.analysis.technical_score,
          fundamental_score: rec.analysis.fundamental_score,
          rank: 0, // Placeholder
          volume: rec.volume,
          market_cap: rec.market_cap,
          sector: rec.sector,
          industry: null,
          rsi: rec.metadata?.rsi || 0,
          sma_20: rec.metadata?.sma_20 || 0,
          sma_50: rec.metadata?.sma_50 || 0,
          macd: null,
          bollinger_bands: null,
          pe_ratio: rec.metadata?.pe_ratio || 0,
          pb_ratio: rec.metadata?.pb_ratio || 0,
          debt_to_equity: rec.metadata?.debt_to_equity || 0,
          roe: 0, // Not available in current Recommendation type
          roa: null,
          indicators: {
            rsi: rec.metadata?.rsi || 0,
            sma_20: rec.metadata?.sma_20 || 0,
            sma_50: rec.metadata?.sma_50 || 0,
          },
          metadata: rec.metadata || {},
          confidence: '',
          source: rec.metadata?.source || 'RecommendationAPI',
          fetched_at: normalized.timestamp,
          strategy_type: requestBody.strategy,
          risk_level: requestBody.risk_level,
        })),
        total_count: normalized.total_count,
        execution_time: normalized.execution_time,
        timestamp: normalized.timestamp,
        strategy: requestBody.strategy,
        risk_profile: requestBody.risk_level,
      };
    } catch (error) {
      throw this.handleError(error, 'short sell opportunities');
    }
  }

  /** Get buy opportunities */
  async getBuyOpportunities(limit: number = 10): Promise<DynamicRecommendationResponse> {
    const requestBody = {
      strategy: 'intraday_buy',
      risk_level: 'moderate',
      limit: limit,
    };
    try {
      const response = await this.api.post('/api/intraday-buy/recommendations', requestBody);
      const normalized = this.normalizeResponse(response.data);
      return {
        success: normalized.status === 'success',
        items: normalized.recommendations.map(rec => ({
          symbol: rec.symbol,
          nsecode: rec.symbol,
          company_name: rec.name,
          last_price: rec.price,
          current_price: rec.price,
          change_percent: rec.change_percent,
          score: rec.score,
          combined_score: rec.score,
          technical_score: rec.analysis.technical_score,
          fundamental_score: rec.analysis.fundamental_score,
          rank: 0, // Placeholder
          volume: rec.volume,
          market_cap: rec.market_cap,
          sector: rec.sector,
          industry: null,
          rsi: rec.metadata?.rsi || 0,
          sma_20: rec.metadata?.sma_20 || 0,
          sma_50: rec.metadata?.sma_50 || 0,
          macd: null,
          bollinger_bands: null,
          pe_ratio: rec.metadata?.pe_ratio || 0,
          pb_ratio: rec.metadata?.pb_ratio || 0,
          debt_to_equity: rec.metadata?.debt_to_equity || 0,
          roe: 0, // Not available in current Recommendation type
          roa: null,
          indicators: {
            rsi: rec.metadata?.rsi || 0,
            sma_20: rec.metadata?.sma_20 || 0,
            sma_50: rec.metadata?.sma_50 || 0,
          },
          metadata: rec.metadata || {},
          confidence: '',
          source: rec.metadata?.source || 'RecommendationAPI',
          fetched_at: normalized.timestamp,
          strategy_type: requestBody.strategy,
          risk_level: requestBody.risk_level,
        })),
        total_count: normalized.total_count,
        execution_time: normalized.execution_time,
        timestamp: normalized.timestamp,
        strategy: requestBody.strategy,
        risk_profile: requestBody.risk_level,
      };
    } catch (error) {
      throw this.handleError(error, 'buy opportunities');
    }
  }

  /** Get service information */
  getServiceInfo() {
    return {
      name: 'Recommendation API Service',
      baseUrl: RECOMMENDATION_API_BASE_URL,
      endpoints: {
        RECOMMENDATIONS: ENDPOINT_KEYS.RECOMMENDATIONS,
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