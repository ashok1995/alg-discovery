/**
 * Recommendation V2 Service
 * Integrates with Seed/Recommendation V2 API (openai.json: recommendationsV2).
 * Prod: http://203.57.85.201:8182
 * Endpoints: GET /v2/recommendations, /v2/observability/db, /v2/health/pipeline, /v2/learning/score-bin-performance
 */

import { getRecommendationsV2Url } from '../config/openaiConfig';
import type { RecommendationsResponse } from '../types/stock';
import type { ObservabilityDbResponse, PipelineHealthResponse, ScoreBinPerformanceItem } from '../types/apiModels';

const TIMEOUT_MS = 30000;

/** Prod OpenAPI trade_type values (seed-openapi.json /v2/recommendations) */
export type SeedTradeType =
  | 'intraday_buy'
  | 'intraday_sell'
  | 'swing_buy'
  | 'short_buy'
  | 'long_term';

/** @deprecated Seed no longer accepts risk_level on GET /v2/recommendations — kept for typing legacy UI only */
export type SeedRiskLevel = 'low' | 'med' | 'high';

/** Query params for GET /v2/recommendations (OpenAPI: trade_type, limit, min_score only) */
export interface V2RecommendationQueryParams {
  trade_type: SeedTradeType;
  limit?: number;
  min_score?: number;
}

/** Legacy request: strategy maps to trade_type; risk_level is ignored for the Seed API. */
export interface V2RecommendationRequestParams {
  strategy: 'swing' | 'intraday' | 'intraday_buy' | 'intraday_sell' | 'long_term' | 'short_term';
  /** Ignored by Seed v2 recommendations (not in OpenAPI). */
  risk_level?: 'low' | 'medium' | 'high';
  limit?: number;
  min_score?: number;
}

function buildRecommendationsQuery(params: V2RecommendationQueryParams): string {
  const q = new URLSearchParams();
  q.set('trade_type', params.trade_type);
  q.set('limit', String(params.limit ?? 10));
  q.set('min_score', String(params.min_score ?? 60));
  return q.toString();
}

/** Map UI strategy to prod trade_type (OpenAPI: long_term, short_buy) */
export function mapStrategyToSeedTradeType(
  strategy: 'swing' | 'intraday' | 'intraday_buy' | 'intraday_sell' | 'long_term' | 'short_term'
): SeedTradeType {
  const map: Record<string, SeedTradeType> = {
    swing: 'swing_buy',
    intraday: 'intraday_buy',
    intraday_buy: 'intraday_buy',
    intraday_sell: 'intraday_sell',
    long_term: 'long_term',
    short_term: 'short_buy',
  };
  return map[strategy] ?? 'swing_buy';
}

/** @deprecated Seed recommendations API no longer uses risk_level */
export function mapRiskToSeedRiskLevel(risk: 'low' | 'medium' | 'high'): SeedRiskLevel {
  return risk === 'medium' ? 'med' : risk;
}

/**
 * Build the full request URL for debugging (same params as fetchV2Recommendations).
 */
export function buildV2RecommendationsUrl(
  request: V2RecommendationQueryParams | V2RecommendationRequestParams
): string {
  const queryParams: V2RecommendationQueryParams =
    'trade_type' in request
      ? {
          trade_type: request.trade_type,
          limit: request.limit ?? 10,
          min_score: request.min_score ?? 60,
        }
      : {
          trade_type: mapStrategyToSeedTradeType(request.strategy as 'swing' | 'intraday' | 'intraday_buy' | 'intraday_sell' | 'long_term' | 'short_term'),
          limit: request.limit ?? 10,
          min_score: request.min_score ?? 60,
        };
  const query = buildRecommendationsQuery(queryParams);
  return getRecommendationsV2Url('recommendations', query);
}

/**
 * Call V2 recommendations endpoint (GET with query params).
 * OpenAPI: trade_type, limit, min_score only — risk_level is not sent.
 */
export async function fetchV2Recommendations(
  request: V2RecommendationQueryParams | V2RecommendationRequestParams
): Promise<RecommendationsResponse> {
  const queryParams: V2RecommendationQueryParams =
    'trade_type' in request
      ? {
          trade_type: request.trade_type,
          limit: request.limit ?? 10,
          min_score: request.min_score ?? 60,
        }
      : {
          trade_type: mapStrategyToSeedTradeType(request.strategy as 'swing' | 'intraday' | 'intraday_buy' | 'intraday_sell' | 'long_term' | 'short_term'),
          limit: request.limit ?? 10,
          min_score: request.min_score ?? 60,
        };
  const query = buildRecommendationsQuery(queryParams);
  const url = getRecommendationsV2Url('recommendations', query);

  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('📡 V2 Recommendations request:', url);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      const errorMsg = `V2 recommendations failed (${res.status}): ${text || res.statusText}`;
      console.error('❌ V2 API Error:', errorMsg);
      throw new Error(errorMsg);
    }

    return (await res.json()) as RecommendationsResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error ? err.message : 'V2 recommendations request failed';
    throw new Error(errorMsg);
  }
}

/**
 * Health check for V2 recommendation service.
 */
export async function checkV2RecommendationHealth(): Promise<boolean> {
  const url = getRecommendationsV2Url('health');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Fetch DB observability data (GET /v2/observability/db).
 * Prod returns stock_universe, stock_indicators, ranked_stocks, by_scenario, pipeline_operations.
 */
export async function fetchObservabilityDb(): Promise<ObservabilityDbResponse> {
  const url = getRecommendationsV2Url('observabilityDb');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Observability DB failed (${res.status}): ${text || res.statusText}`);
    }
    return (await res.json()) as ObservabilityDbResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err instanceof Error ? err : new Error('Observability DB request failed');
  }
}

/**
 * Fetch pipeline health (GET /v2/health/pipeline).
 */
export async function fetchPipelineHealth(): Promise<PipelineHealthResponse> {
  const url = getRecommendationsV2Url('pipelineHealth');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pipeline health failed (${res.status}): ${text || res.statusText}`);
    }
    return (await res.json()) as PipelineHealthResponse;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err instanceof Error ? err : new Error('Pipeline health request failed');
  }
}

/**
 * Fetch score bin performance (GET /v2/learning/score-bin-performance).
 */
export async function fetchScoreBinPerformance(params?: {
  trade_type?: string;
  days?: number;
}): Promise<ScoreBinPerformanceItem[]> {
  const q = new URLSearchParams();
  if (params?.trade_type) q.set('trade_type', params.trade_type);
  if (params?.days != null) q.set('days', String(params.days));
  const query = q.toString();
  const url = getRecommendationsV2Url('scoreBinPerformance', query);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Score bin performance failed (${res.status}): ${text || res.statusText}`);
    }
    return (await res.json()) as ScoreBinPerformanceItem[];
  } catch (err) {
    clearTimeout(timeoutId);
    throw err instanceof Error ? err : new Error('Score bin performance request failed');
  }
}
