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
import { UniversalRecommendationRequest, DynamicRecommendationResponse, StrategyType, UIRecommendationRequest, UIRecommendationResponse, SortDirection, MarketCondition, MarketSession } from '../types/apiModels';

// API base URL for recommendations - use Nginx proxy for production
const RECOMMENDATION_API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? '' 
  : (process.env.NODE_ENV === 'production' 
    ? '' // Use relative URL to go through Nginx proxy
    : getBaseUrlForDomain('recommendation'));

// Endpoint keys - using correct production endpoint
const ENDPOINT_KEYS = {
  RECOMMENDATIONS: '/api/recommendations/stocks',
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
      // Build query parameters
      const queryParams = new URLSearchParams();
      queryParams.append('strategy', request.strategy);
      queryParams.append('risk_level', request.risk_level);
      queryParams.append('ui_optimized', 'true');
      
      if (request.limit) queryParams.append('limit', request.limit.toString());
      if (request.market_condition) queryParams.append('market_condition', request.market_condition);
      if (request.market_cap) queryParams.append('market_cap', request.market_cap);
      if (request.sector) queryParams.append('sector', request.sector);
      if (request.min_price) queryParams.append('min_price', request.min_price.toString());
      if (request.max_price) queryParams.append('max_price', request.max_price.toString());
      if (request.min_volume) queryParams.append('min_volume', request.min_volume.toString());
      if (request.rsi_min) queryParams.append('rsi_min', request.rsi_min.toString());
      if (request.rsi_max) queryParams.append('rsi_max', request.rsi_max.toString());
      if (request.min_score) queryParams.append('min_score', request.min_score.toString());

      const url = `${ENDPOINT_KEYS.RECOMMENDATIONS}?${queryParams.toString()}`;
      
      const response = await this.api.post(url, {}, {
        headers: { 'X-Trace-ID': `prod_req_${Date.now()}` }
      });
      
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'production recommendations');
    }
  }

  /** Dynamic unified endpoint (dev) */
  // New UI endpoint method
  async getUIRecommendations(request: UIRecommendationRequest): Promise<UIRecommendationResponse> {
    try {
      const response = await this.api.post('/api/v1/minimal/recommendations', request, {
        headers: { 'X-Trace-ID': `ui_req_${Date.now()}` }
      });
      return response.data || {};
    } catch (error) {
      throw this.handleError(error, 'UI recommendations');
    }
  }

  // Quick recommendations endpoint
  async getQuickRecommendations(strategy: StrategyType, riskLevel: string, minScore: number = 65, limit: number = 10): Promise<UIRecommendationResponse> {
    try {
      const request = {
        strategy,
        risk_level: riskLevel,
        min_score: minScore,
        limit
      };
      const response = await this.api.post('/api/v1/minimal/recommendations/quick', request, {
        headers: { 'X-Trace-ID': `quick_req_${Date.now()}` }
      });
      return response.data || {};
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
        // If dynamic endpoint fails, provide mock data as fallback
        console.warn('Dynamic endpoint failed, providing mock data as fallback');
        
        const mockData = this.getMockRecommendations(strategy, request.pagination?.limit || 50);
        
        return {
          timestamp: new Date().toISOString(),
          items: mockData,
          total_count: mockData.length,
          execution_time: 0,
          strategy: strategy,
          risk_profile: 'moderate',
          success: true
        };
      }
    } catch (error) {
      throw this.handleError(error, 'dynamic recommendations');
    }
  }

  /** Get recommendations by type - now uses production endpoint */
  async getRecommendationsByType(
    type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
    request: RecommendationRequest = {}
  ): Promise<DynamicRecommendationResponse> {
    // Map legacy types to production strategy types
    const strategyMap = {
      'swing': 'swing',
      'long-buy': 'long_term',
      'intraday-buy': 'intraday_buy',
      'intraday-sell': 'intraday_sell'
    };

    const strategy = strategyMap[type];
    if (!strategy) {
      throw new Error(`Invalid recommendation type: ${type}`);
    }

    // Map risk profile
    const riskLevelMap = {
      'conservative': 'low',
      'moderate': 'medium',
      'aggressive': 'high'
    };

    const riskLevel = riskLevelMap[request.risk_profile as keyof typeof riskLevelMap] || 'medium';

    // Convert to production API request format
    const productionRequest = {
      strategy,
      risk_level: riskLevel,
      min_score: request.min_score || 60,
      limit: request.max_recommendations || 50,
      min_price: 10,
      max_price: 10000,
      min_volume: 100000
    };

    try {
      const response = await this.getProductionRecommendations(productionRequest);
      
      // Transform production response to DynamicRecommendationResponse format
      const transformedItems = response.stocks?.map((stock: any) => ({
        symbol: stock.symbol,
        company_name: stock.name,
        current_price: stock.price,
        last_price: stock.price,
        change_percent: stock.change_percentage,
        volume: stock.volume,
        sector: stock.sector || 'Unknown',
        score: stock.overall_score,
        technical_score: stock.technical_score,
        fundamental_score: stock.fundamental_score,
        risk_level: riskLevel,
        rsi: stock.rsi,
        macd: stock.macd,
        sma_20: stock.sma_20,
        sma_50: stock.sma_50,
        entry_signal: stock.entry_signal,
        entry_price: stock.entry_price,
        stop_loss: stock.stop_loss,
        target_price: stock.target_price,
        metadata: {
          timestamp: stock.timestamp,
          market_cap: stock.market_cap
        }
      })) || [];

      return {
        timestamp: response.timestamp || new Date().toISOString(),
        items: transformedItems,
        recommendations: transformedItems, // For backward compatibility
        total_count: response.total_count || transformedItems.length,
        execution_time: response.execution_time || 0,
        strategy: strategy,
        risk_profile: riskLevel,
        success: response.success !== false
      };
    } catch (error) {
      // Fallback to mock data if production API fails
      console.warn('Production API failed, providing mock data as fallback');
      
      const mockData = this.getMockRecommendations(strategy as any, request.max_recommendations || 50);
      
      return {
        timestamp: new Date().toISOString(),
        items: mockData,
        recommendations: mockData,
        total_count: mockData.length,
        execution_time: 0,
        strategy: strategy,
        risk_profile: riskLevel,
        success: true
      };
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

  /** Get all recommendation types at once - now uses dynamic endpoint */
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

  /** Get mock recommendations for fallback */
  private getMockRecommendations(strategy: string, limit: number): any[] {
    const mockStocks = [
      { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', price: 2850.75, change: 1.2, sector: 'FMCG', score: 85 },
      { symbol: 'ITC', name: 'ITC', price: 450.5, change: 0.8, sector: 'FMCG', score: 78 },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel', price: 950.25, change: 1.5, sector: 'Telecom', score: 82 },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', price: 1850.8, change: 2.3, sector: 'Banking', score: 88 },
      { symbol: 'NESTLEIND', name: 'Nestle India', price: 2250.6, change: 1.1, sector: 'FMCG', score: 79 },
      { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2450.75, change: 0.5, sector: 'Oil & Gas', score: 75 },
      { symbol: 'TCS', name: 'Tata Consultancy Services', price: 3850.2, change: 1.8, sector: 'IT', score: 90 },
      { symbol: 'HDFC', name: 'HDFC Bank', price: 1650.3, change: 0.9, sector: 'Banking', score: 83 },
      { symbol: 'INFY', name: 'Infosys', price: 1850.7, change: 1.2, sector: 'IT', score: 86 },
      { symbol: 'WIPRO', name: 'Wipro', price: 450.8, change: 0.7, sector: 'IT', score: 72 }
    ];

    return mockStocks.slice(0, limit).map((stock, index) => ({
      symbol: stock.symbol,
      nsecode: stock.symbol,
      company_name: stock.name,
      last_price: stock.price,
      current_price: stock.price,
      change_percent: stock.change,
      score: stock.score,
      combined_score: stock.score,
      technical_score: stock.score,
      fundamental_score: stock.score - 5,
      rank: index + 1,
      volume: Math.floor(Math.random() * 2000000) + 500000,
      market_cap: stock.price * 1000000,
      sector: stock.sector,
      industry: null,
      rsi: 50 + Math.floor(Math.random() * 20) - 10,
      sma_20: stock.price * 0.98,
      sma_50: stock.price * 0.95,
      macd: 'bullish',
      bollinger_bands: null,
      pe_ratio: 15 + Math.floor(Math.random() * 20),
      pb_ratio: 2 + Math.random() * 2,
      debt_to_equity: Math.random() * 0.5,
      roe: 10 + Math.random() * 15,
      roa: 5 + Math.random() * 10,
      indicators: {
        rsi: 50 + Math.floor(Math.random() * 20) - 10,
        sma_20: stock.price * 0.98,
        sma_50: stock.price * 0.95
      },
      metadata: { source: 'mock', note: 'Mock data - Backend service unavailable' },
      confidence: stock.score > 85 ? 'high' : stock.score > 75 ? 'medium' : 'low',
      source: 'mock',
      fetched_at: new Date().toISOString(),
      strategy_type: strategy,
      risk_level: stock.score > 85 ? 'low' : stock.score > 75 ? 'medium' : 'high'
    }));
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
