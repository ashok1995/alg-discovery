import { seedFetchJSON } from './seedHttp';

export const seedLearningGovernanceService = {
  getGovernanceStatus: () =>
    seedFetchJSON<unknown>('/api/v2/learning/governance-status', { timeoutMs: 30_000 }),

  getLearningHealth: (opts?: { include_recommendations?: boolean }) =>
    seedFetchJSON<unknown>('/api/v2/learning/learning-health', {
      params: { include_recommendations: opts?.include_recommendations ?? false },
      timeoutMs: 45_000,
    }),

  getArmPerformance: (days = 30) =>
    seedFetchJSON<unknown>('/api/v2/learning/arm-performance', { params: { days }, timeoutMs: 45_000 }),

  evaluatePerformance: (lookbackDays = 30) =>
    seedFetchJSON<unknown>('/api/v2/learning/evaluate-performance', {
      method: 'POST',
      params: { lookback_days: lookbackDays },
      timeoutMs: 90_000,
    }),

  forceRollback: (opts: { confirm: boolean; target_version?: string }) =>
    seedFetchJSON<unknown>('/api/v2/learning/force-rollback', {
      method: 'POST',
      params: {
        target_version: opts.target_version,
        confirm: opts.confirm,
      },
      timeoutMs: 45_000,
    }),
};

export default seedLearningGovernanceService;

