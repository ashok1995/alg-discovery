import { seedFetchJSON } from './seedHttp';

export const seedRateLimitingService = {
  getStatus: () =>
    seedFetchJSON<unknown>('/api/v2/rate-limiting/status', { timeoutMs: 30_000 }),

  getHealth: () =>
    seedFetchJSON<unknown>('/api/v2/rate-limiting/health', { timeoutMs: 15_000 }),

  getLimits: () =>
    seedFetchJSON<unknown>('/api/v2/rate-limiting/limits', { timeoutMs: 30_000 }),

  getUsageReport: () =>
    seedFetchJSON<unknown>('/api/v2/rate-limiting/usage-report', { timeoutMs: 45_000 }),

  getServiceStatus: (serviceName: string) =>
    seedFetchJSON<unknown>(`/api/v2/rate-limiting/service/${encodeURIComponent(serviceName)}`, { timeoutMs: 30_000 }),

  resetService: (serviceName: string) =>
    seedFetchJSON<unknown>(`/api/v2/rate-limiting/reset-service/${encodeURIComponent(serviceName)}`, {
      method: 'POST',
      timeoutMs: 30_000,
    }),

  initialize: (opts?: { redis_url?: string; worker_id?: string }) =>
    seedFetchJSON<unknown>('/api/v2/rate-limiting/initialize', {
      method: 'POST',
      params: {
        redis_url: opts?.redis_url,
        worker_id: opts?.worker_id,
      },
      timeoutMs: 45_000,
    }),

  shutdown: () =>
    seedFetchJSON<unknown>('/api/v2/rate-limiting/shutdown', { method: 'POST', timeoutMs: 30_000 }),
};

export default seedRateLimitingService;

