import { seedFetchJSON } from './seedHttp';

export interface AttributionRequest {
  start_date: string;
  end_date: string;
  dimensions?: string[];
}

export const seedAttributionAnalyticsService = {
  getAttributionSummary: (days = 30) =>
    seedFetchJSON<unknown>('/api/v2/analytics/attribution-summary', { params: { days }, timeoutMs: 45_000 }),

  getArmPerformanceBreakdown: (opts?: { days?: number; min_trades?: number }) =>
    seedFetchJSON<unknown>('/api/v2/analytics/arm-performance-breakdown', {
      params: {
        days: opts?.days ?? 90,
        min_trades: opts?.min_trades ?? 5,
      },
      timeoutMs: 60_000,
    }),

  runAttributionAnalysis: (body: AttributionRequest) =>
    seedFetchJSON<unknown>('/api/v2/analytics/attribution-analysis', {
      method: 'POST',
      body,
      timeoutMs: 90_000,
    }),
};

export default seedAttributionAnalyticsService;

