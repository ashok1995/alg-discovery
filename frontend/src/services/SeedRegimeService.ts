import { seedFetchJSON } from './seedHttp';

export const seedRegimeService = {
  getCurrentRegime: (models?: string) =>
    seedFetchJSON<unknown>('/api/v2/regime/current-regime', {
      params: models ? { models } : undefined,
      timeoutMs: 30_000,
    }),

  getSignals: () =>
    seedFetchJSON<unknown>('/api/v2/regime/regime-signals', { timeoutMs: 30_000 }),

  getAnalysis: (days = 30) =>
    seedFetchJSON<unknown>('/api/v2/regime/regime-analysis', { params: { days }, timeoutMs: 45_000 }),

  getPerformance: (days = 90) =>
    seedFetchJSON<unknown>('/api/v2/regime/regime-performance', { params: { days }, timeoutMs: 45_000 }),
};

export default seedRegimeService;

