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
 * Types: types/recommendations.ts
 * Route config: config/recommendationRoutes.ts
 * Transformers: services/recommendationTransformers.ts
 */

import axios, { AxiosInstance } from 'axios';
import { API_CONFIG } from '../config/api';
import { getEndpointPath, getBaseUrlForDomain } from '../config/endpointRegistry';
import { ENDPOINT_KEYS } from '../config/recommendationRoutes';
import { fetchV2Recommendations } from './RecommendationV2Service';
import { handleGetRecommendationsByType, getDefaultOptions, handleIsServiceAvailable, getServiceInfo, createRecommendationApiInstance } from './recommendationApiHandlers';
import {
  handleGetDynamicRecommendations,
  handleGetFullRecommendations,
  handleGetAllRecommendations,
  handleGetWithRetry,
  handleGetOpportunities,
  handleGetUIOrQuickRecommendations,
  handleGetProductionRecommendations,
} from './recommendationApiHandlersExtended';
import {
  UniversalRecommendationRequest,
  DynamicRecommendationResponse,
  UIRecommendationRequest,
  UIRecommendationResponse,
  SeedRecommendationRequest,
  SeedRiskLevel,
  SHORT_SELL_ARMS,
  BUY_ARMS,
} from '../types/apiModels';
import type { RecommendationRequest, HealthResponse, ServiceStatus } from '../types/recommendations';
import type { SeedHealthResponse, SeedRecommendationResponse } from '../types/stock';

export type { RiskProfile, RecommendationRequest, Recommendation, RecommendationResponse, HealthResponse, ServiceStatus } from '../types/recommendations';

const RECOMMENDATION_API_BASE_URL =
  process.env.NODE_ENV === 'development'
    ? ''
    : process.env.NODE_ENV === 'production'
      ? ''
      : getBaseUrlForDomain('recommendation');

class RecommendationAPIService {
  private static instance: RecommendationAPIService;
  private api: AxiosInstance;
  private healthCache = { value: null as boolean | null, lastCheck: 0 };

  private constructor() {
    this.api = createRecommendationApiInstance(RECOMMENDATION_API_BASE_URL, API_CONFIG.REQUEST.TIMEOUT);
  }

  static getInstance(): RecommendationAPIService {
    if (!RecommendationAPIService.instance) {
      RecommendationAPIService.instance = new RecommendationAPIService();
    }
    return RecommendationAPIService.instance;
  }

  async getSeedServiceRecommendations(request: Partial<SeedRecommendationRequest>): Promise<SeedRecommendationResponse> {
    try {
      if (!request.strategy) {
        throw new Error('Strategy is required for Seed Service API');
      }

      const strategy = String(request.strategy);
      const risk_level = request.risk_level != null ? String(request.risk_level) : 'moderate';
      const limit = request.limit ?? 20;

      const v2Request: import('./RecommendationV2Service').V2RecommendationRequestParams = {
        strategy: strategy as 'swing' | 'intraday' | 'intraday_buy' | 'intraday_sell' | 'long_term' | 'short_term',
        risk_level: risk_level as 'low' | 'medium' | 'high',
        limit,
      };
      console.log(`🌱 [SeedService] POST ${API_CONFIG.SEED_V2_RECOMMENDATIONS_PATH}`, v2Request);

      const data = await fetchV2Recommendations(v2Request);
      console.log(`✅ [SeedService] Response: ${data.recommendations?.length ?? 0} recommendations`);
      return data;
    } catch (error) {
      console.error(`❌ [SeedService] Error:`, error);
      throw this.handleError(error, 'Seed Service recommendations');
    }
  }

  async getSeedServiceHealth(): Promise<SeedHealthResponse> {
    try {
      // Use different health endpoints for dev vs prod
      const isProduction = process.env.NODE_ENV === 'production' || 
                          process.env.REACT_APP_NODE_ENV === 'production' ||
                          (typeof window !== 'undefined' && window.location.hostname !== 'localhost');
      
      const healthPath = isProduction ? '/api/v2/stocks/health' : '/health';
      const seedHealthUrl = `${API_CONFIG.SEED_API_BASE_URL}${healthPath}`;
      
      const response = await axios.get(seedHealthUrl, { timeout: 10000 });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Seed Service health check');
    }
  }

  async getProductionRecommendations(request: {
    strategy: string;
    risk_level: string;
    min_price?: number;
    max_price?: number;
    min_volume?: number;
    limit?: number;
  }): Promise<Record<string, unknown>> {
    try {
      return handleGetProductionRecommendations((r) => this.getSeedServiceRecommendations(r), request);
    } catch (error) {
      throw this.handleError(error, 'production recommendations');
    }
  }

  async getUIRecommendations(request: UIRecommendationRequest): Promise<UIRecommendationResponse> {
    try {
      return handleGetUIOrQuickRecommendations(
        (r) => this.getSeedServiceRecommendations(r),
        { strategy: request.strategy as string, risk_level: request.risk_level as string, limit: request.limit, min_price: request.min_price, max_price: request.max_price, min_volume: request.min_volume }
      );
    } catch (error) {
      throw this.handleError(error, 'UI recommendations');
    }
  }

  async getQuickRecommendations(request: { strategy: string; risk_level: string; limit?: number }): Promise<UIRecommendationResponse> {
    try {
      return handleGetUIOrQuickRecommendations(
        (r) => this.getSeedServiceRecommendations(r),
        { ...request, limit: request.limit ?? 10 }
      );
    } catch (error) {
      throw this.handleError(error, 'quick recommendations');
    }
  }

  async getDynamicRecommendations(request: UniversalRecommendationRequest): Promise<DynamicRecommendationResponse> {
    try {
      return handleGetDynamicRecommendations(
        (url, payload, config) => this.api.post(url, payload, config),
        { strategy: request.strategy, trace: request.trace },
        ENDPOINT_KEYS
      );
    } catch (error) {
      throw this.handleError(error, 'dynamic recommendations');
    }
  }

  async getRecommendationsByType(
    type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell' | 'short',
    request: RecommendationRequest = {}
  ): Promise<DynamicRecommendationResponse> {
    return handleGetRecommendationsByType(
      (r) => this.getSeedServiceRecommendations(r),
      (r) => this.getProductionRecommendations({
        strategy: r.strategy as string,
        risk_level: r.risk_level as string,
        min_price: r.min_price as number | undefined,
        max_price: r.max_price as number | undefined,
        min_volume: r.min_volume as number | undefined,
        limit: r.limit as number | undefined,
      }),
      type,
      request
    );
  }

  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await this.api.get(getEndpointPath(ENDPOINT_KEYS.HEALTH));
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'health check');
    }
  }

  async isServiceAvailable(): Promise<boolean> {
    return handleIsServiceAvailable(
      () => this.getSeedServiceHealth(),
      () => this.healthCheck(),
      this.healthCache
    );
  }

  async getServiceStatus(): Promise<ServiceStatus> {
    const isAvailable = await this.isServiceAvailable();
    return {
      connected: isAvailable,
      url: RECOMMENDATION_API_BASE_URL,
      status: isAvailable ? 'connected' : 'disconnected',
      lastCheck: new Date().toISOString()
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      const health = await this.healthCheck();
      return health.status === 'healthy';
    } catch (error) {
      console.error('❌ Recommendation service connection test failed:', error);
      return false;
    }
  }

  async getFullRecommendations(request: Record<string, unknown>): Promise<UIRecommendationResponse> {
    try {
      return handleGetFullRecommendations((r) => this.getSeedServiceRecommendations(r), request);
    } catch (error) {
      console.warn('⚠️ Seed Service failed, using fallback');
      throw this.handleError(error, 'full recommendations');
    }
  }

  async getOptions(): Promise<Record<string, unknown>> {
    try {
      const response = await this.api.get('/api/options');
      return (response.data as Record<string, unknown>) || getDefaultOptions();
    } catch {
      return getDefaultOptions();
    }
  }

  async getAllRecommendations(request: RecommendationRequest = {}): Promise<{
    swing: DynamicRecommendationResponse;
    longBuy: DynamicRecommendationResponse;
    intradayBuy: DynamicRecommendationResponse;
    intradaySell: DynamicRecommendationResponse;
  }> {
    try {
      return handleGetAllRecommendations((t, r) => this.getRecommendationsByType(t, r), request);
    } catch (error) {
      console.error('❌ Error fetching all recommendations:', error);
      throw this.handleError(error, 'all recommendations');
    }
  }

  async getRecommendationsWithRetry(
    type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
    request: RecommendationRequest = {},
    retries = API_CONFIG.REQUEST.RETRY_ATTEMPTS
  ): Promise<DynamicRecommendationResponse> {
    return handleGetWithRetry(
      (t, r) => this.getRecommendationsByType(t, r),
      type,
      request,
      retries,
      API_CONFIG.REQUEST.RETRY_DELAY
    );
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

  async getShortSellOpportunities(limit = 10): Promise<DynamicRecommendationResponse> {
    return handleGetOpportunities(
      (r) => this.getSeedServiceRecommendations(r),
      'intraday_sell',
      SHORT_SELL_ARMS,
      SeedRiskLevel.HIGH,
      limit
    );
  }

  async getBuyOpportunities(limit = 10): Promise<DynamicRecommendationResponse> {
    return handleGetOpportunities(
      (r) => this.getSeedServiceRecommendations(r),
      'intraday_buy',
      BUY_ARMS,
      SeedRiskLevel.MODERATE,
      limit
    );
  }

  getServiceInfo() {
    return getServiceInfo(
      API_CONFIG.SEED_API_BASE_URL,
      RECOMMENDATION_API_BASE_URL,
      { RECOMMENDATIONS: ENDPOINT_KEYS.RECOMMENDATIONS, HEALTH: getEndpointPath(ENDPOINT_KEYS.HEALTH) },
      { timeout: API_CONFIG.REQUEST.TIMEOUT, retryAttempts: API_CONFIG.REQUEST.RETRY_ATTEMPTS, retryDelay: API_CONFIG.REQUEST.RETRY_DELAY }
    );
  }
}

// Export singleton instance
export const recommendationAPIService = RecommendationAPIService.getInstance();
