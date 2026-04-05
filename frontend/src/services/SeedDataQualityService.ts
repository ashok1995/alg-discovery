import { seedFetchJSON } from './seedHttp';

export const seedDataQualityService = {
  getAssessment: (opts?: { tables?: string; dimensions?: string }) =>
    seedFetchJSON<unknown>('/api/v2/data-quality/assessment', {
      params: {
        tables: opts?.tables,
        dimensions: opts?.dimensions,
      },
      timeoutMs: 90_000,
    }),

  getDashboard: () =>
    seedFetchJSON<unknown>('/api/v2/data-quality/dashboard', { timeoutMs: 45_000 }),

  getDimensionAnalysis: (dimension: string) =>
    seedFetchJSON<unknown>(`/api/v2/data-quality/dimension-analysis/${encodeURIComponent(dimension)}`, { timeoutMs: 60_000 }),

  getTableReport: (tableName: string) =>
    seedFetchJSON<unknown>(`/api/v2/data-quality/table-report/${encodeURIComponent(tableName)}`, { timeoutMs: 60_000 }),

  getTrends: (days = 30) =>
    seedFetchJSON<unknown>('/api/v2/data-quality/trends', { params: { days }, timeoutMs: 60_000 }),
};

export default seedDataQualityService;

