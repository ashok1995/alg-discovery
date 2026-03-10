/**
 * Extended recommendation API handlers
 * Keeps recommendationApiHandlers.ts under 300 lines
 */

import type { DynamicRecommendationResponse, UIRecommendationResponse } from '../types/trading';
import type { SeedRecommendationRequest, SeedRecommendationResponse } from '../types/stock';
import { SeedStrategyType, SeedRiskLevel } from '../types/stock';
import type { RecommendationRequest } from '../types/recommendations';
import { mapToSeedStrategy, mapToSeedRiskLevel } from '../config/recommendationRoutes';
import { transformSeedResponse, transformSeedToUIStocks, transformSeedToProductionStocks } from './recommendationTransformers';

export type GetSeedRecommendationsFn = (req: Partial<SeedRecommendationRequest>) => Promise<SeedRecommendationResponse>;

export type PostFn = (url: string, payload: unknown, config?: object) => Promise<{ data?: Record<string, unknown> }>;

export async function handleGetDynamicRecommendations(
  post: PostFn,
  request: { strategy: string; trace?: { request_id?: string } },
  endpointKeys: { RECOMMENDATIONS: string }
): Promise<DynamicRecommendationResponse> {
  let strategy = request.strategy;
  if (['swing-buy', 'swing_buy'].includes(strategy)) strategy = 'swing';
  const payload = { ...request, strategy };
  try {
    const response = await post(endpointKeys.RECOMMENDATIONS, payload, {
      headers: { 'X-Trace-ID': request.trace?.request_id || `trace_${Date.now()}` },
    });
    const backendData = response.data || {};
    return {
      timestamp: (backendData.timestamp as string) || new Date().toISOString(),
      items: (backendData.recommendations || backendData.items || []) as DynamicRecommendationResponse['items'],
      total_count: (backendData.total_count as number) || 0,
      execution_time: (backendData.execution_time as number) || 0,
      strategy: (backendData.strategy as string) || strategy,
      risk_profile: (backendData.risk_profile as string) || 'moderate',
      success: (backendData.success as boolean) !== false,
    };
  } catch {
    console.warn('Dynamic endpoint failed, returning empty response');
    return {
      timestamp: new Date().toISOString(),
      items: [],
      total_count: 0,
      execution_time: 0,
      strategy,
      risk_profile: 'moderate',
      success: false,
    };
  }
}

export async function handleGetUIOrQuickRecommendations(
  getSeed: GetSeedRecommendationsFn,
  request: { strategy: string; risk_level: string; limit?: number; min_price?: number; max_price?: number; min_volume?: number }
): Promise<UIRecommendationResponse> {
  const seedStrategy = mapToSeedStrategy(request.strategy);
  const seedRiskLevel = mapToSeedRiskLevel(request.risk_level);
  const seedRequest = {
    strategy: seedStrategy,
    risk_level: seedRiskLevel,
    limit: request.limit || 20,
    min_price: request.min_price || 10.0,
    max_price: request.max_price || 10000.0,
    min_volume: request.min_volume || 100000,
    include_technical_analysis: true,
    include_reasoning: true,
  };
  const seedResponse = await getSeed(seedRequest);
  const stocks = transformSeedToUIStocks(seedResponse);
  return {
    success: true,
    stocks: stocks as UIRecommendationResponse['stocks'],
    total_count: stocks.length,
    avg_score: stocks.length > 0 ? stocks.reduce((sum, s) => sum + s.score, 0) / stocks.length : 0,
    strategy_used: seedStrategy as unknown as UIRecommendationResponse['strategy_used'],
    execution_time: seedResponse.processing_time_ms || 0,
  };
}

export async function handleGetProductionRecommendations(
  getSeed: GetSeedRecommendationsFn,
  request: { strategy: string; risk_level: string; min_price?: number; max_price?: number; min_volume?: number; limit?: number }
): Promise<Record<string, unknown>> {
  const seedStrategy = mapToSeedStrategy(request.strategy);
  const seedRiskLevel = mapToSeedRiskLevel(request.risk_level);
  const seedRequest = {
    strategy: seedStrategy,
    risk_level: seedRiskLevel,
    limit: request.limit || 20,
    min_price: request.min_price || 10.0,
    max_price: request.max_price || 10000.0,
    min_volume: request.min_volume || 100000,
    include_technical_analysis: true,
    include_reasoning: true,
    include_arm_details: true,
  };
  const seedResponse = await getSeed(seedRequest);
  const stocks = transformSeedToProductionStocks(seedResponse);
  return { success: true, stocks, total_count: stocks.length, execution_time: seedResponse.processing_time_ms / 1000, timestamp: seedResponse.timestamp };
}

export async function handleGetFullRecommendations(
  getSeed: GetSeedRecommendationsFn,
  request: Record<string, unknown>
): Promise<UIRecommendationResponse> {
  const seedStrategy = mapToSeedStrategy((request.strategy as string) || 'swing');
  const seedRiskLevel = mapToSeedRiskLevel((request.risk_level as string) || 'moderate');
  const seedRequest = {
    strategy: seedStrategy,
    risk_level: seedRiskLevel,
    limit: (request.limit as number) || 20,
    min_price: (request.min_price as number) || 10.0,
    max_price: (request.max_price as number) || 10000.0,
    min_volume: (request.min_volume as number) || 100000,
    include_technical_analysis: true,
    include_reasoning: true,
  };
  const seedResponse = await getSeed(seedRequest);
  const stocks = transformSeedToUIStocks(seedResponse);
  return {
    success: true,
    stocks: stocks as UIRecommendationResponse['stocks'],
    total_count: stocks.length,
    avg_score: stocks.length > 0 ? stocks.reduce((sum, s) => sum + s.score, 0) / stocks.length : 0,
    score_range: stocks.length > 0 ? [Math.min(...stocks.map((s) => s.score)), Math.max(...stocks.map((s) => s.score))] : [0, 0],
    strategy_used: seedStrategy as unknown as UIRecommendationResponse['strategy_used'],
    execution_time: seedResponse.processing_time_ms || 0,
  };
}

export type GetByTypeFn = (
  type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
  req: RecommendationRequest
) => Promise<DynamicRecommendationResponse>;

export async function handleGetAllRecommendations(
  getByType: GetByTypeFn,
  request: RecommendationRequest
): Promise<{ swing: DynamicRecommendationResponse; longBuy: DynamicRecommendationResponse; intradayBuy: DynamicRecommendationResponse; intradaySell: DynamicRecommendationResponse }> {
  const [swing, longBuy, intradayBuy, intradaySell] = await Promise.all([
    getByType('swing', request),
    getByType('long-buy', request),
    getByType('intraday-buy', request),
    getByType('intraday-sell', request),
  ]);
  return { swing, longBuy, intradayBuy, intradaySell };
}

export async function handleGetWithRetry(
  getByType: GetByTypeFn,
  type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell',
  request: RecommendationRequest,
  retries: number,
  retryDelay: number
): Promise<DynamicRecommendationResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await getByType(type, request);
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt}/${retries} failed for ${type}:`, error);
      if (attempt < retries) await new Promise((r) => setTimeout(r, retryDelay * attempt));
    }
  }
  throw lastError;
}

export async function handleGetOpportunities(
  getSeed: GetSeedRecommendationsFn,
  strategyLabel: string,
  arms: string[],
  riskLevel: SeedRiskLevel,
  limit: number
): Promise<DynamicRecommendationResponse> {
  try {
    const seedResponse = await getSeed({
      strategy: SeedStrategyType.INTRADAY,
      risk_level: riskLevel,
      specific_arms: arms,
      limit,
      include_technical_analysis: true,
      include_reasoning: true,
      include_arm_details: true,
    });
    return transformSeedResponse(seedResponse, strategyLabel);
  } catch (error) {
    console.error(`❌ ${strategyLabel} opportunities failed:`, error);
    return {
      timestamp: new Date().toISOString(),
      items: [],
      recommendations: [],
      total_count: 0,
      execution_time: 0,
      strategy: strategyLabel,
      risk_profile: riskLevel,
      success: false,
    };
  }
}
