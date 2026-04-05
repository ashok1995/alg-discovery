import { seedFetchJSON } from './seedHttp';

export const seedYahooFreeTierService = {
  getUsage: () =>
    seedFetchJSON<unknown>('/api/v2/yahoo-free-tier/usage', { timeoutMs: 15_000 }),

  getQuotaCheck: () =>
    seedFetchJSON<unknown>('/api/v2/yahoo-free-tier/quota-check', { timeoutMs: 15_000 }),

  getOptimizationReport: () =>
    seedFetchJSON<unknown>('/api/v2/yahoo-free-tier/optimization-report', { timeoutMs: 30_000 }),

  resetDailyCounter: () =>
    seedFetchJSON<unknown>('/api/v2/yahoo-free-tier/reset-daily-counter', { method: 'POST', timeoutMs: 30_000 }),

  clearCache: () =>
    seedFetchJSON<unknown>('/api/v2/yahoo-free-tier/clear-cache', { method: 'POST', timeoutMs: 30_000 }),
};

export default seedYahooFreeTierService;

