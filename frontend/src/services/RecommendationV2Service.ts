/**
 * Recommendation V2 Service
 * Integrates with new Recommendation service at http://localhost:8282/api/v2/recommendations
 * Contract: { strategy, risk_level, limit }
 * Returns comprehensive recommendation data with interval performance, trade targets, and technical indicators
 */

import { API_CONFIG } from '../config/api';
import type { V2RecommendationsResponse } from '../types/apiModels';

const TIMEOUT_MS = 30000;

export interface V2RecommendationRequestParams {
  strategy: 'swing' | 'intraday' | 'long_term' | 'short';
  risk_level: 'low' | 'moderate' | 'high';
  limit?: number;
}

/**
 * Call V2 recommendations endpoint at port 8282
 * URL: http://localhost:8282/api/v2/recommendations (staging)
 * Method: POST
 * Body: { strategy, risk_level, limit }
 */
export async function fetchV2Recommendations(
  request: V2RecommendationRequestParams
): Promise<V2RecommendationsResponse> {
  // Use nginx proxy path if base URL is empty (production), otherwise use direct URL
  const baseUrl = API_CONFIG.RECOMMENDATION_V2_API_BASE_URL || '';
  const url = baseUrl 
    ? `${baseUrl}/api/v2/recommendations`
    : '/api/seed/recommendations';
  const body: V2RecommendationRequestParams = {
    strategy: request.strategy,
    risk_level: request.risk_level,
    limit: request.limit ?? 10,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    console.log('🔍 V2 API Request URL:', url);
    console.log('🔍 V2 API Request Body:', body);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const text = await res.text();
      const errorMsg = `V2 recommendations failed (${res.status}): ${text || res.statusText}`;
      console.error('❌ V2 API Error:', errorMsg);
      throw new Error(errorMsg);
    }

    const data = (await res.json()) as V2RecommendationsResponse;
    console.log('✅ V2 API Success:', data);
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    const errorMsg = err instanceof Error ? err.message : 'V2 recommendations request failed';
    console.error('❌ V2 API Fetch Error:', errorMsg, err);
    throw new Error(errorMsg);
  }
}

/**
 * Health check for V2 recommendation service
 */
export async function checkV2RecommendationHealth(): Promise<boolean> {
  const baseUrl = API_CONFIG.RECOMMENDATION_V2_API_BASE_URL || '';
  const url = baseUrl ? `${baseUrl}/health` : '/api/seed/health';
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    clearTimeout(timeoutId);
    return false;
  }
}
