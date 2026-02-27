/**
 * Recommendation API complex handlers
 * Extracted from RecommendationAPIService to keep main service under 300 lines
 */

import axios, { AxiosInstance } from 'axios';
import { getMetaHeaders } from '../utils/meta';
import attachAxiosLogging from './httpLogger';
import type { DynamicRecommendationResponse } from '../types/trading';
import type { SeedRecommendationRequest, SeedRecommendationResponse } from '../types/stock';
import type { RecommendationRequest } from '../types/recommendations';
import { mapToSeedStrategy, mapToSeedRiskLevel, getArmStrategiesForType, getStrategyForType } from '../config/recommendationRoutes';
import { transformSeedResponse, transformProductionStocksToDynamicItems } from './recommendationTransformers';

export type GetSeedRecommendationsFn = (req: Partial<SeedRecommendationRequest>) => Promise<SeedRecommendationResponse>;
export type GetProductionRecommendationsFn = (req: Record<string, unknown>) => Promise<Record<string, unknown>>;

const RISK_LEVEL_MAP: Record<string, string> = {
  conservative: 'low',
  moderate: 'medium',
  aggressive: 'high',
};

export async function handleGetRecommendationsByType(
  getSeed: GetSeedRecommendationsFn,
  getProduction: GetProductionRecommendationsFn,
  type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
  request: RecommendationRequest
): Promise<DynamicRecommendationResponse> {
  const strategy = getStrategyForType(type);
  if (!strategy) throw new Error(`Invalid recommendation type: ${type}`);

  try {
    const seedStrategy = mapToSeedStrategy(strategy);
    const seedRiskLevel = mapToSeedRiskLevel(request.risk_profile || 'moderate');
    const specificArms = getArmStrategiesForType(type);
    const seedRequest: SeedRecommendationRequest = {
      strategy: seedStrategy,
      risk_level: seedRiskLevel,
      limit: request.max_recommendations || 10,
      specific_arms: specificArms?.length ? specificArms : undefined,
      include_technical_analysis: true,
      include_reasoning: true,
      include_arm_details: true,
    };
    console.log(`🌱 [RecommendationAPI] Using Seed Service for ${type} recommendations`);
    const seedResponse = await getSeed(seedRequest);
    const transformedResponse = transformSeedResponse(seedResponse, strategy);
    console.log(`✅ [RecommendationAPI] Seed Service returned ${transformedResponse.recommendations?.length || 0} recommendations`);
    return transformedResponse;
  } catch (seedError) {
    console.warn(`⚠️ [RecommendationAPI] Seed Service failed for ${type}:`, seedError);
    try {
      console.log(`🔄 [RecommendationAPI] Falling back to production API for ${type}`);
      const riskLevel = RISK_LEVEL_MAP[request.risk_profile as string] || 'medium';
      const productionRequest = {
        strategy,
        risk_level: riskLevel,
        min_score: request.min_score || 60,
        limit: request.max_recommendations || 50,
        min_price: 10,
        max_price: 10000,
        min_volume: 100000,
      };
      const response = await getProduction(productionRequest);
      const stocks = (response.stocks as Array<Record<string, unknown>>) || [];
      const transformedItems = transformProductionStocksToDynamicItems(stocks, riskLevel);
      return {
        timestamp: (response.timestamp as string) || new Date().toISOString(),
        items: transformedItems,
        recommendations: transformedItems,
        total_count: (response.total_count as number) || transformedItems.length,
        execution_time: (response.execution_time as number) || 0,
        strategy,
        risk_profile: riskLevel,
        success: (response.success as boolean) !== false,
      };
    } catch {
      console.warn(`⚠️ [RecommendationAPI] All services failed for ${type}, returning empty response`);
      return {
        timestamp: new Date().toISOString(),
        items: [],
        recommendations: [],
        total_count: 0,
        execution_time: 0,
        strategy,
        risk_profile: 'moderate',
        success: false,
      };
    }
  }
}

const DEFAULT_OPTIONS = {
  strategies: [
    { value: 'swing', label: 'Swing Trading' },
    { value: 'intraday_buy', label: 'Intraday Buy' },
    { value: 'intraday_sell', label: 'Intraday Sell' },
    { value: 'long_term', label: 'Long Term' },
  ],
  risk_levels: [
    { value: 'low', label: 'Low Risk' },
    { value: 'medium', label: 'Medium Risk' },
    { value: 'high', label: 'High Risk' },
  ],
  investment_horizons: [
    { value: 'short_term', label: 'Short Term (1-3 days)' },
    { value: 'medium_term', label: 'Medium Term (1-4 weeks)' },
    { value: 'long_term', label: 'Long Term (1+ months)' },
  ],
  sectors: [],
  market_caps: [],
  market_conditions: [],
  sort_options: [],
  sort_directions: [],
};

export function getDefaultOptions(): Record<string, unknown> {
  return DEFAULT_OPTIONS;
}

export function createRecommendationApiInstance(baseUrl: string, timeout: number): AxiosInstance {
  const api = axios.create({ baseURL: baseUrl, timeout, headers: { 'Content-Type': 'application/json' } });
  attachAxiosLogging(api, 'RecommendationAPI');
  api.interceptors.request.use(
    (config) => {
      (config as Record<string, unknown>).headers = { ...((config.headers || {}) as object), ...getMetaHeaders('/recommendations') };
      console.log(`🚀 [RecommendationAPI] ${config.method?.toUpperCase()} ${config.url}`, config.data);
      return config;
    },
    (err) => { console.error('❌ [RecommendationAPI] Request error:', err); return Promise.reject(err); }
  );
  api.interceptors.response.use(
    (res) => { console.log(`✅ [RecommendationAPI] ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url}`); return res; },
    (err) => { console.error('❌ [RecommendationAPI] Response error:', err.response?.status, err.response?.data); return Promise.reject(err); }
  );
  return api;
}

export type HealthCheckFn = () => Promise<{ status: string }>;
export type SeedHealthFn = () => Promise<{ status: string }>;

export function getServiceInfo(
  seedBaseUrl: string,
  fallbackBaseUrl: string,
  fallbackEndpoints: { RECOMMENDATIONS: string; HEALTH: string },
  config: { timeout: number; retryAttempts: number; retryDelay: number }
): Record<string, unknown> {
  return {
    name: 'Recommendation API Service (Seed Service Integration)',
    primaryService: {
      name: 'Production Seed Service API (algodiscovery.com:8182)',
      baseUrl: seedBaseUrl,
      endpoints: { RECOMMENDATIONS: '/api/v2/stocks/recommendations', HEALTH: '/health', ARMS: '/api/v2/stocks/arms', DOCS: '/docs' },
      features: ['32 ARM Strategies', 'Short Sell Support', 'Real-time Data', 'AI-Powered'],
    },
    fallbackService: { name: 'Legacy Recommendation API', baseUrl: fallbackBaseUrl, endpoints: fallbackEndpoints },
    timeout: config.timeout,
    retryAttempts: config.retryAttempts,
    retryDelay: config.retryDelay,
  };
}

export async function handleIsServiceAvailable(
  getSeedHealth: SeedHealthFn,
  healthCheck: HealthCheckFn,
  cache: { value: boolean | null; lastCheck: number }
): Promise<boolean> {
  const now = Date.now();
  const cacheExpiry = 30000;
  if (cache.value !== null && now - cache.lastCheck < cacheExpiry) return cache.value;

  try {
    const seedHealth = await getSeedHealth();
    if (seedHealth.status === 'healthy') {
      cache.value = true;
      cache.lastCheck = now;
      return true;
    }
  } catch {
    console.warn('⚠️ Seed Service health check failed');
  }
  try {
    const health = await healthCheck();
    cache.value = health.status === 'healthy';
    cache.lastCheck = now;
    return cache.value;
  } catch {
    cache.value = false;
    cache.lastCheck = now;
    return false;
  }
}
