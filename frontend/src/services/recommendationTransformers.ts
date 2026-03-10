/**
 * Recommendation response transformation functions
 * Extracted from RecommendationAPIService for clearer separation
 */

import type { DynamicRecommendationResponse, DynamicRecommendationItem } from '../types/trading';
import type {
  SeedRecommendationResponse,
  SeedStockRecommendation,
  SeedMarketContext,
  SeedArmExecutionResult,
  SeedProcessingStats,
  RecommendationsResponse,
  RankedStockResponse,
} from '../types/stock';
import type { RecommendationRequest, RecommendationResponse, Recommendation } from '../types/recommendations';

/**
 * Map prod Seed Stocks Service response (GET /v2/recommendations) to legacy SeedRecommendationResponse.
 * @see http://203.57.85.201:8182/docs
 */
export function mapRecommendationsResponseToSeedRecommendation(
  api: RecommendationsResponse
): SeedRecommendationResponse {
  const recommendations: SeedStockRecommendation[] = (api.recommendations || []).map((r: RankedStockResponse) => {
    const base: SeedStockRecommendation = {
      symbol: r.symbol,
      current_price: r.last_price ?? r.entry_price,
      sector: r.sector ?? 'Unknown',
      overall_score: typeof r.score === 'number' ? r.score / 100 : 0.5,
      confidence: typeof r.score === 'number' && r.score >= 80 ? 0.9 : r.score >= 60 ? 0.7 : 0.5,
      entry_signal: r.reason ?? 'Ranked',
      selected_arms: [r.trade_type],
      dominant_arm: r.trade_type,
      arm_scores: {},
      technical_analysis: {
        rsi: typeof (r as Record<string, unknown>).rsi_14 === 'number' ? (r as Record<string, unknown>).rsi_14 as number : 50,
        sma_20: r.last_price ?? 0,
        volume_trend: (r as Record<string, unknown>).volume_trend as string ?? 'flat',
        momentum: (r as Record<string, unknown>).trend as string ?? 'neutral',
      },
      market_condition_fit: (r as Record<string, unknown>).market_regime as string ?? 'neutral',
      predicted_return: {
        target_return: (r.target_1 ?? 0) - (r.entry_price ?? 0),
        time_horizon: `${(r as Record<string, unknown>).max_hold_days ?? 5} days`,
        confidence: 0.7,
      },
      risk_assessment: `Max risk ${r.max_risk_pct ?? 3}%`,
      reasoning: [r.reason ?? ''],
      data_source: 'seed-v2',
      data_timestamp: r.generated_at ?? api.generated_at,
    };
    return { ...r, ...base } as unknown as SeedStockRecommendation;
  });

  const market_context: SeedMarketContext = {
    regime: api.market_regime ?? 'neutral',
    strength: 0.5,
    volatility_level: 'normal',
    leading_sectors: [],
    key_observations: [],
  };

  const arm_execution_results: SeedArmExecutionResult[] = [];
  const processing_stats: SeedProcessingStats = {
    total_arms_executed: 1,
    successful_arms: 1,
    stocks_analyzed: api.count,
    stocks_recommended: api.count,
    filter_efficiency: 1,
    avg_arms_per_stock: 1,
  };

  return {
    timestamp: api.generated_at,
    request_id: '',
    processing_time_ms: 0,
    recommendations,
    market_context,
    arm_execution_results,
    processing_stats,
    data_source: 'seed-v2',
  };
}

/** Type guard: true if response is prod API RecommendationsResponse (has count + recommendations array) */
export function isRecommendationsResponse(
  data: SeedRecommendationResponse | RecommendationsResponse
): data is RecommendationsResponse {
  return typeof (data as RecommendationsResponse).count === 'number' && Array.isArray((data as RecommendationsResponse).recommendations);
}

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

  const recs = seedResponse.recommendations as unknown as Array<Record<string, unknown>>;
  const items = recs.map((rec: Record<string, unknown>, index: number) => {
    const priceVal = Number(rec.last_price ?? rec.entry_price ?? rec.current_price ?? rec.price ?? rec.close ?? rec.ltp);
    const hasPrice = Number.isFinite(priceVal) && priceVal > 0;

    const scoreRaw = rec.score as number | undefined;
    const overallRaw = rec.overall_score as number | undefined;
    const score = scoreRaw != null ? scoreRaw : overallRaw != null ? overallRaw * 100 : 0;

    const changePct = (rec.change_pct ?? rec.change_percent ?? rec.change_percentage ?? rec.per_change ?? 0) as number;
    const rsiVal = (rec.rsi_14 ?? (rec.technical_analysis as Record<string, unknown> | undefined)?.rsi ?? 0) as number;
    const riskPct = (rec.max_risk_pct ?? 2) as number;
    const signals = rec.signals as Record<string, boolean> | undefined;
    const reason = (rec.reason ?? rec.reasoning ?? '') as string;

    return {
      symbol: (rec.symbol as string) || 'UNKNOWN',
      nsecode: (rec.symbol as string) || 'UNKNOWN',
      company_name: (rec.name as string) || (rec.symbol as string) || '',
      last_price: hasPrice ? priceVal : 0,
      current_price: hasPrice ? priceVal : 0,
      change_percent: changePct,
      score,
      combined_score: score,
      technical_score: score * 0.8,
      fundamental_score: score * 0.6,
      rank: (rec.rank as number) ?? index + 1,
      volume: (rec.volume as number) ?? 0,
      market_cap: 0,
      sector: (rec.sector as string) || '',
      industry: null as string | null,
      rsi: rsiVal,
      sma_20: (rec.sma_20 as number) ?? 0,
      sma_50: (rec.sma_50 as number) ?? 0,
      macd: (rec.macd_state as string) ?? null,
      bollinger_bands: null as unknown,
      pe_ratio: 0,
      pb_ratio: 0,
      debt_to_equity: 0,
      roe: 0,
      roa: null as number | null,
      indicators: {
        rsi: rsiVal,
        sma_20: (rec.sma_20 as number) ?? 0,
        sma_50: (rec.sma_50 as number) ?? 0,
      },
      metadata: {
        stop_loss: rec.stop_loss as number | undefined,
        target_1: rec.target_1 as number | undefined,
        target_2: rec.target_2 as number | undefined,
        target_3: rec.target_3 as number | undefined,
        risk_reward_ratio: rec.risk_reward_ratio as number | undefined,
        entry_price: rec.entry_price as number | undefined,
        max_hold_days: rec.max_hold_days as number | undefined,
        valid_until: rec.valid_until as string | undefined,
        signals: signals,
        reason: reason,
        trend: rec.trend as string | undefined,
        market_regime: rec.market_regime as string | undefined,
        relative_volume: rec.relative_volume as number | undefined,
        volume_trend: rec.volume_trend as string | undefined,
        distance_to_support_pct: rec.distance_to_support_pct as number | undefined,
        distance_to_resistance_pct: rec.distance_to_resistance_pct as number | undefined,
        risk_assessment: riskPct <= 1.5 ? 'low' : riskPct <= 3 ? 'moderate' : 'high',
        data_source: 'seed-v2',
      },
      confidence: score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low',
      source: 'seed-v2',
      fetched_at: (rec.generated_at as string) ?? new Date().toISOString(),
      strategy_type: strategy,
      risk_level: riskPct <= 1.5 ? 'low' : riskPct <= 3 ? 'medium' : 'high',
    };
  });

  items.forEach((item, index) => {
    item.rank = index + 1;
  });

  const seedAny = seedResponse as unknown as Record<string, unknown>;
  return {
    timestamp: new Date().toISOString(),
    items: items as DynamicRecommendationItem[],
    recommendations: items as any,
    total_count: items.length,
    execution_time: ((seedAny.processing_time_ms as number) || 1000) / 1000,
    strategy,
    risk_profile: 'moderate',
    success: true,
  } as DynamicRecommendationResponse;
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
  const recommendations = items.map((it: Record<string, unknown>) => {
    const analysis = it.analysis as Record<string, unknown> | undefined;
    const indicators = it.indicators as Record<string, unknown> | undefined;
    return {
      symbol: it.symbol as string,
      name: (it.company_name ?? it.name ?? '') as string,
      score: typeof it.score === 'number' ? it.score : 0,
      price: typeof (it.last_price ?? it.price) === 'number' ? ((it.last_price ?? it.price) as number) : 0,
      change_percent: typeof it.change_percent === 'number' ? it.change_percent : (analysis?.change_percent as number) ?? 0,
      volume: typeof it.volume === 'number' ? it.volume : 0,
      market_cap: typeof it.market_cap === 'number' ? it.market_cap : 0,
      sector: (it.sector as string) ?? '',
      analysis: {
        technical_score: (typeof indicators?.technical_score === 'number' ? indicators.technical_score : typeof analysis?.technical_score === 'number' ? analysis.technical_score : 0) as number,
        fundamental_score: (typeof indicators?.fundamental_score === 'number' ? indicators.fundamental_score : typeof analysis?.fundamental_score === 'number' ? analysis.fundamental_score : 0) as number,
        sentiment_score: (typeof indicators?.sentiment_score === 'number' ? indicators.sentiment_score : typeof analysis?.sentiment_score === 'number' ? analysis.sentiment_score : 0) as number,
      },
      metadata: it.metadata as Recommendation['metadata'],
    };
  }) as Recommendation[];

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
  const recs = seedResponse.recommendations as unknown as Array<Record<string, unknown>> | undefined;
  return (
    recs?.map((rec) => ({
      symbol: (rec.symbol as string) ?? '',
      score: (rec.score as number) ?? ((rec.overall_score as number) != null ? (rec.overall_score as number) * 100 : 0),
      price: (rec.last_price ?? rec.entry_price ?? rec.current_price ?? 0) as number,
      sector: undefined,
      market_cap: undefined,
      rsi: (rec.rsi_14 ?? (rec.technical_analysis as Record<string, unknown>)?.rsi) as number | undefined,
      trend: (rec.reason ?? rec.entry_signal) as string | undefined,
      volume: (rec.volume as number) ?? 0,
      change_percent: (rec.change_pct ?? rec.change_percent ?? 0) as number,
      market_cap_value: 0,
      pe_ratio: 0,
      pb_ratio: 0,
      debt_to_equity: 0,
      roe: 0,
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
  const recs = seedResponse.recommendations as unknown as Array<Record<string, unknown>> | undefined;
  return (
    recs?.map((rec) => ({
      symbol: (rec.symbol as string) ?? '',
      name: (rec.symbol as string) ?? '',
      price: (rec.last_price ?? rec.entry_price ?? rec.current_price ?? 0) as number,
      change_percentage: (rec.change_pct ?? rec.change_percent ?? 0) as number,
      overall_score: (rec.score ?? rec.overall_score ?? 0) as number,
      technical_score: (rec.score as number) ?? 0,
      fundamental_score: 0,
      sector: (rec.sector as string) ?? '',
      volume: (rec.volume as number) ?? 0,
      market_cap: 0,
      rsi: (rec.rsi_14 ?? (rec.technical_analysis as Record<string, unknown>)?.rsi ?? 0) as number,
      macd: (rec.macd_state ?? (rec.technical_analysis as Record<string, unknown>)?.momentum ?? '') as string,
      sma_20: (rec.sma_20 ?? (rec.technical_analysis as Record<string, unknown>)?.sma_20 ?? 0) as number,
      sma_50: (rec.sma_50 ?? 0) as number,
      entry_signal: (rec.reason ?? rec.entry_signal ?? '') as string,
      timestamp: (rec.generated_at ?? rec.data_timestamp ?? new Date().toISOString()) as string,
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
    sector: (stock.sector as string) ?? '',
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
