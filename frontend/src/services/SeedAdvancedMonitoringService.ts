import { seedFetchJSON } from './seedHttp';

export const seedAdvancedMonitoringService = {
  getSystemHealth: (opts?: { include_details?: boolean }) =>
    seedFetchJSON<unknown>('/api/v2/monitoring/system-health', {
      params: { include_details: opts?.include_details ?? false },
      timeoutMs: 30_000,
    }),

  getPerformanceMetrics: () =>
    seedFetchJSON<unknown>('/api/v2/monitoring/performance-metrics', { timeoutMs: 30_000 }),

  getMonitoringDashboard: () =>
    seedFetchJSON<unknown>('/api/v2/monitoring/monitoring-dashboard', { timeoutMs: 30_000 }),

  getAlerts: (opts?: { severity?: string; category?: string; acknowledged?: boolean; limit?: number }) =>
    seedFetchJSON<unknown>('/api/v2/monitoring/alerts', {
      params: {
        severity: opts?.severity,
        category: opts?.category,
        acknowledged: opts?.acknowledged,
        limit: opts?.limit ?? 50,
      },
      timeoutMs: 30_000,
    }),

  acknowledgeAlert: (alertId: string) =>
    seedFetchJSON<unknown>(`/api/v2/monitoring/alerts/${encodeURIComponent(alertId)}/acknowledge`, {
      method: 'POST',
      timeoutMs: 15_000,
    }),

  resolveAlert: (alertId: string) =>
    seedFetchJSON<unknown>(`/api/v2/monitoring/alerts/${encodeURIComponent(alertId)}/resolve`, {
      method: 'POST',
      timeoutMs: 15_000,
    }),
};

export default seedAdvancedMonitoringService;

