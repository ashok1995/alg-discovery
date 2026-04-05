/**
 * Seed Position Service
 * =====================
 * Client for seed-stocks-service /v2/position* and /v2/recommendations/all endpoints.
 */

import type {
  PositionStatusResponse,
  PositionOpenRequest,
  PositionOpenResponse,
  PositionCloseRequest,
  PositionCloseResponse,
} from '../types/apiModels';
import { seedFetchJSON } from './seedHttp';

export const seedPositionService = {
  getPositionStatus: (symbol: string, trade_type: string) =>
    seedFetchJSON<PositionStatusResponse>('/v2/position-status', { params: { symbol, trade_type } }),

  openPosition: (body: PositionOpenRequest) =>
    seedFetchJSON<PositionOpenResponse>('/v2/positions', { method: 'POST', body }),

  closePosition: (body: PositionCloseRequest) =>
    seedFetchJSON<PositionCloseResponse>('/v2/positions/close', { method: 'POST', body }),

  /**
   * Get recommendations for all trade types. Note: prod Seed API (203.57.85.201:8182) does not
   * expose /v2/recommendations/all; use GET /v2/recommendations?trade_type=X per type instead.
   * This method may 404 in prod - callers should handle or use RecommendationAPIService per type.
   */
  getAllRecommendations: (opts?: { limit?: number; min_score?: number; risk_level?: string }) =>
    seedFetchJSON<{
      trade_types: Record<string, { count: number; recommendation_source: string; recommendations: Array<Record<string, unknown>> }>;
      generated_at: string;
      risk_level: string | null;
      min_score_applied: number;
      market_regime: string | null;
    }>('/v2/recommendations/all', { params: opts }),
};

export default seedPositionService;
