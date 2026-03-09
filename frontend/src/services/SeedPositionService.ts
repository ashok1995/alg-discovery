/**
 * Seed Position Service
 * =====================
 * Client for seed-stocks-service /v2/position* and /v2/recommendations/all endpoints.
 */

import { API_CONFIG } from '../config/api';
import type {
  PositionStatusResponse,
  PositionOpenRequest,
  PositionOpenResponse,
  PositionCloseRequest,
  PositionCloseResponse,
} from '../types/apiModels';

const BASE = API_CONFIG.SEED_API_BASE_URL;
const TIMEOUT_MS = 15000;

async function fetchJSON<T>(path: string, opts?: RequestInit & { params?: Record<string, string | number> }): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (opts?.params) {
    Object.entries(opts.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      ...opts,
      headers: { 'Content-Type': 'application/json', ...opts?.headers },
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Position API ${path} failed (${res.status}): ${text}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const seedPositionService = {
  getPositionStatus: (symbol: string, trade_type: string) =>
    fetchJSON<PositionStatusResponse>('/v2/position-status', {
      params: { symbol, trade_type },
    }),

  openPosition: (body: PositionOpenRequest) =>
    fetchJSON<PositionOpenResponse>('/v2/positions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  closePosition: (body: PositionCloseRequest) =>
    fetchJSON<PositionCloseResponse>('/v2/positions/close', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /**
   * Get recommendations for all trade types. Note: prod Seed API (203.57.85.201:8182) does not
   * expose /v2/recommendations/all; use GET /v2/recommendations?trade_type=X per type instead.
   * This method may 404 in prod - callers should handle or use RecommendationAPIService per type.
   */
  getAllRecommendations: async (opts?: { limit?: number; min_score?: number; risk_level?: string }) => {
    try {
      return await fetchJSON<{
        trade_types: Record<string, { count: number; recommendation_source: string; recommendations: Array<Record<string, unknown>> }>;
        generated_at: string;
        risk_level: string | null;
        min_score_applied: number;
        market_regime: string | null;
      }>('/v2/recommendations/all', { params: opts as Record<string, string | number> });
    } catch {
      return {
        trade_types: {},
        generated_at: new Date().toISOString(),
        risk_level: null,
        min_score_applied: 60,
        market_regime: null,
      };
    }
  },
};

export default seedPositionService;
