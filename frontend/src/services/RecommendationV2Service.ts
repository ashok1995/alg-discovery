/**
 * Recommendation V2 Service
 * Integrates with Seed service POST /api/v2/recommendations
 * Contract: { strategy, risk_level, limit }
 */

import { API_CONFIG } from '../config/api';
import type { V2RecommendationRequest } from '../types/apiModels';
import type { SeedRecommendationResponse } from '../types/apiModels';

const TIMEOUT_MS = 30000;

/**
 * Call Seed v2 recommendations endpoint.
 * Uses relative path /api/seed/recommendations (proxied in dev, nginx in prod to 203.57.85.72:8182).
 */
export async function fetchV2Recommendations(
  request: V2RecommendationRequest
): Promise<SeedRecommendationResponse> {
  const url = API_CONFIG.SEED_V2_RECOMMENDATIONS_PATH;
  const body: V2RecommendationRequest = {
    strategy: request.strategy,
    risk_level: request.risk_level,
    limit: request.limit ?? 10,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`V2 recommendations failed (${res.status}): ${text || res.statusText}`);
    }

    const data = (await res.json()) as SeedRecommendationResponse;
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error) throw err;
    throw new Error('V2 recommendations request failed');
  }
}
