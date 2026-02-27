/**
 * Recommendation response transformation functions
 * Extracted from RecommendationAPIService for clearer separation
 */

import type { DynamicRecommendationResponse } from '../types/trading';
import type { SeedRecommendationResponse } from '../types/stock';
import type { RecommendationRequest, RecommendationResponse, Recommendation } from '../types/recommendations';

/** Transform Seed Service response to DynamicRecommendationResponse format */
export function transformSeedResponse(
  seedResponse: SeedRecommendationResponse,
  strategy: string
): DynamicRecommendationResponse {
  if (!seedResponse.recommendations || seedResponse.recommendations.length === 0) {
    return {
      timestamp: new Date().toISOString(),
      items: [],
      recommendations: [],
      total_count: 0,
      execution_time: 0,
      strategy,
      risk_profile: 'moderate',
      success: true,
    };
  }

  const items = seedResponse.recommendations.map((rec: Record<string, unknown>, index: number) => {
    const priceVal = Number(rec.current_price ?? rec.price ?? rec.close ?? rec.ltp);
    const hasPrice = Number.isFinite(priceVal);
    const recAny = rec as Record<string, unknown>;
    const tech = recAny.technical_analysis as Record<string, unknown> | undefined;
    return {
      symbol: (rec.symbol as string) || 'UNKNOWN',
      nsecode: (rec.symbol as string) || 'UNKNOWN',
      company_name: (rec.name as string) || (rec.symbol as string) || 'Unknown Company',
      last_price: hasPrice ? priceVal : 0,
      current_price: hasPrice ? priceVal : 0,
      change_percent: (rec.change_percent ?? rec.change_percentage ?? rec.per_change ?? 0) as number,
      score: ((rec.overall_score as number) || 0.5) * 100,
      combined_score: ((rec.overall_score as number) || 0.5) * 100,
      technical_score: 60,
      fundamental_score: 70,
      rank: index + 1,
      volume: (rec.volume as number) ?? 0,
      market_cap: 10000,
      sector: (rec.sector as string) || 'Unknown',
      industry: null as string | null,
      rsi: tech?.rsi as number ?? 50,
      sma_20: hasPrice ? priceVal * 0.99 : 0,
      sma_50: hasPrice ? priceVal * 0.98 : 0,
      macd: 'neutral' as string | null,
      bollinger_bands: null as unknown,
      pe_ratio: 15,
      pb_ratio: 2,
      debt_to_equity: 0.3,
      roe: 15,
      roa: null as number | null,
      indicators: {
        rsi: (tech?.rsi as number) || 50,
        sma_20: (tech?.sma_20 as number) || (rec.current_price as number),
        sma_50: (rec.current_price as number) * 0.98,
      },
      metadata: {
        dominant_arm: (rec.selected_by_arm as string) || 'unknown',
        selected_arms: [(rec.selected_by_arm as string) || 'unknown'],
        arm_scores: {},
        risk_assessment: (rec.risk_level as string) || 'moderate',
        reasoning: (rec.reasoning as string) || 'ARM-based recommendation',
        data_source: (rec.data_source as string) || (seedResponse as Record<string, unknown>).data_source || 'seed-service',
        arm_name: (seedResponse as Record<string, unknown>)?.debug_info?.arm_name ?? (rec.selected_by_arm as string) ?? 'unknown',
        predicted_return: (rec.confidence as number) || 0.8,
        market_condition_fit: (rec.confidence as number) || 0.8,
      },
      confidence: (rec.confidence as number) > 0.8 ? 'high' : (rec.confidence as number) > 0.6 ? 'medium' : 'low',
      source: (rec.data_source as string) || (seedResponse as Record<string, unknown>).data_source || 'seed-service',
      fetched_at: new Date().toISOString(),
      strategy_type: strategy,
      risk_level: (rec.risk_level as string) || 'moderate',
    };
  });

  items.forEach((item, index) => {
    item.rank = index + 1;
  });

  const seedAny = seedResponse as Record<string, unknown>;
  return {
    timestamp: new Date().toISOString(),
    items,
    recommendations: items,
    total_count: items.length,
    execution_time: ((seedAny.processing_time_ms as number) || 1000) / 1000,
    strategy,
    risk_profile: 'moderate',
    success: true,
  };
}

/** Build canonical request payload from mixed aliases */
export function toCanonicalPayload(req: RecommendationRequest): {
  max_items: number;
  min_score: number;
  risk: string;
} {
  return {
    max_items: req.max_items ?? req.max_recommendations ?? 50,
    min_score: req.min_score ?? 70,
    risk: (req.risk ?? req.risk_profile ?? 'moderate') as string,
  };
}

/** Normalize backend response (items) to RecommendationResponse (recommendations) */
export function normalizeResponse(raw: Record<string, unknown>): RecommendationResponse {
  const items = (raw.items ?? raw.recommendations ?? raw.data ?? []) as Array<Record<string, unknown>>;
  const recommendations: Recommendation[] = items.map((it: Record<string, unknown>) => ({
    symbol: it.symbol as string,
    name: (it.company_name ?? it.name ?? '') as string,
    score: typeof it.score === 'number' ? it.score : 0,
    price: typeof (it.last_price ?? it.price) === 'number' ? ((it.last_price ?? it.price) as number) : 0,
    change_percent: typeof it.change_percent === 'number' ? it.change_percent : ((it.analysis as Record<string, unknown>)?.change_percent as number) ?? 0,
    volume: typeof it.volume === 'number' ? it.volume : 0,
    market_cap: typeof it.market_cap === 'number' ? it.market_cap : 0,
    sector: (it.sector as string) ?? 'Unknown',
    analysis: {
      technical_score: (it.indicators as Record<string, unknown>)?.technical_score ?? (it.analysis as Record<string, unknown>)?.technical_score ?? 0,
      fundamental_score: (it.indicators as Record<string, unknown>)?.fundamental_score ?? (it.analysis as Record<string, unknown>)?.fundamental_score ?? 0,
      sentiment_score: (it.indicators as Record<string, unknown>)?.sentiment_score ?? (it.analysis as Record<string, unknown>)?.sentiment_score ?? 0,
    },
    metadata: it.metadata as Recommendation['metadata'],
  }));

  return {
    status: 'success',
    timestamp: (raw.timestamp as string) ?? new Date().toISOString(),
    recommendations,
    total_count: (raw.total_count as number) ?? recommendations.length,
    execution_time: (raw.execution_time as number) ?? 0,
  };
}

/** Normalize strategy aliases for dynamic endpoint */
export function normalizeStrategyName(strategy: unknown): string {
  const s = String(strategy ?? '').toLowerCase();
  if (s === 'swing-buy' || s === 'swing_buy') return 'swing';
  return s;
}

/** Seed rec to UI stock shape (used by getUIRecommendations, getQuickRecommendations, getFullRecommendations) */
export function transformSeedToUIStocks(seedResponse: SeedRecommendationResponse): Array<{
  symbol: string;
  score: number;
  price: number;
  sector?: undefined;
  market_cap?: undefined;
  rsi?: number;
  trend?: string;
  volume: number;
  change_percent: number;
  market_cap_value: number;
  pe_ratio: number;
  pb_ratio: number;
  debt_to_equity: number;
  roe: number;
}> {
  return (
    seedResponse.recommendations?.map((rec) => ({
      symbol: rec.symbol,
      score: rec.overall_score * 100,
      price: rec.current_price,
      sector: undefined,
      market_cap: undefined,
      rsi: rec.technical_analysis?.rsi,
      trend: rec.entry_signal,
      volume: 0,
      change_percent: 0,
      market_cap_value: 0,
      pe_ratio: 15,
      pb_ratio: 2,
      debt_to_equity: 0.3,
      roe: 15,
    })) ?? []
  );
}

/** Seed rec to production stocks shape */
export function transformSeedToProductionStocks(seedResponse: SeedRecommendationResponse): Array<{
  symbol: string;
  name: string;
  price: number;
  change_percentage: number;
  overall_score: number;
  technical_score: number;
  fundamental_score: number;
  sector: string;
  volume: number;
  market_cap: number;
  rsi: number;
  macd: string;
  sma_20: number;
  sma_50: number;
  entry_signal: string;
  timestamp: string;
}> {
  return (
    seedResponse.recommendations?.map((rec) => ({
      symbol: rec.symbol,
      name: rec.symbol,
      price: rec.current_price,
      change_percentage: 0,
      overall_score: rec.overall_score,
      technical_score: 80,
      fundamental_score: 70,
      sector: rec.sector,
      volume: 0,
      market_cap: 0,
      rsi: rec.technical_analysis?.rsi || 50,
      macd: rec.technical_analysis?.momentum || 'neutral',
      sma_20: rec.technical_analysis?.sma_20 || rec.current_price,
      sma_50: rec.current_price * 0.98,
      entry_signal: rec.entry_signal,
      timestamp: rec.data_timestamp,
    })) ?? []
  );
}

/** Production stocks to DynamicRecommendationItem array (for getRecommendationsByType fallback) */
export function transformProductionStocksToDynamicItems(
  stocks: Array<Record<string, unknown>>,
  riskLevel: string
): import('../types/trading').DynamicRecommendationItem[] {
  return stocks.map((stock, idx) => ({
    symbol: stock.symbol as string,
    nsecode: stock.symbol as string,
    company_name: (stock.name as string) ?? '',
    last_price: (stock.price as number) ?? 0,
    current_price: (stock.price as number) ?? 0,
    change_percent: (stock.change_percentage as number) ?? 0,
    score: (stock.overall_score as number) ?? 0,
    combined_score: (stock.overall_score as number) ?? 0,
    technical_score: (stock.technical_score as number) ?? 0,
    fundamental_score: (stock.fundamental_score as number) ?? 0,
    rank: idx + 1,
    volume: (stock.volume as number) ?? 0,
    market_cap: (stock.market_cap as number) ?? 0,
    sector: (stock.sector as string) ?? 'Unknown',
    industry: null,
    rsi: (stock.rsi as number) ?? 50,
    sma_20: (stock.sma_20 as number) ?? 0,
    sma_50: (stock.sma_50 as number) ?? 0,
    macd: (stock.macd as string) ?? null,
    bollinger_bands: null,
    pe_ratio: 15,
    pb_ratio: 2,
    debt_to_equity: 0.3,
    roe: 15,
    roa: null,
    indicators: { rsi: (stock.rsi as number) ?? 50, sma_20: (stock.sma_20 as number) ?? 0, sma_50: (stock.sma_50 as number) ?? 0 },
    metadata: { timestamp: stock.timestamp, market_cap: stock.market_cap },
    confidence: 'medium',
    source: 'production-fallback',
    fetched_at: (stock.timestamp as string) ?? null,
    strategy_type: 'unknown',
    risk_level: riskLevel,
  }));
}
