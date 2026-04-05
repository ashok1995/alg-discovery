import { seedFetchJSON } from './seedHttp';

export interface ParallelExecutionRequest {
  task_type: string;
  parameters?: Record<string, unknown>;
}

export interface SystemTuningRequest {
  enable_parallel_processing?: boolean;
  worker_multiplier?: number;
  memory_limit_mb?: number;
}

export const seedSystemOptimizationService = {
  getMetrics: () =>
    seedFetchJSON<unknown>('/api/v2/system/metrics', { timeoutMs: 30_000 }),

  getHealth: () =>
    seedFetchJSON<unknown>('/api/v2/system/health', { timeoutMs: 15_000 }),

  getCpuUtilization: (durationSeconds: number) =>
    seedFetchJSON<unknown>(`/api/v2/system/cpu-utilization/${durationSeconds}`, { timeoutMs: 45_000 }),

  getOptimizeRecommendations: (workloadType: string) =>
    seedFetchJSON<unknown>(`/api/v2/system/optimize/${encodeURIComponent(workloadType)}`, { timeoutMs: 45_000 }),

  parallelExecution: (body: ParallelExecutionRequest) =>
    seedFetchJSON<unknown>('/api/v2/system/parallel-execution', { method: 'POST', body, timeoutMs: 90_000 }),

  tune: (body: SystemTuningRequest) =>
    seedFetchJSON<unknown>('/api/v2/system/tune', { method: 'POST', body, timeoutMs: 60_000 }),

  shutdown: () =>
    seedFetchJSON<unknown>('/api/v2/system/shutdown', { method: 'POST', timeoutMs: 30_000 }),
};

export default seedSystemOptimizationService;

