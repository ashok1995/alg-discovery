import type {
  ArmExecutionTimelineResponse,
  ArmLearningObservabilityResponse,
  ArmScenariosResponse,
  CreateArmRequest,
  SeedArmDetail,
  SeedArmsListResponse,
  UpdateArmRequest,
  VerifyQueryRequest,
  VerifyQueryResponse,
} from '../types/apiModels';
import { seedFetchJSON } from './seedHttp';

export const seedArmsService = {
  listArms: (opts?: { scenario?: string; status?: string; include_inactive?: boolean }) =>
    seedFetchJSON<SeedArmsListResponse>('/api/v2/arms', {
      params: {
        scenario: opts?.scenario,
        status: opts?.status,
        include_inactive: opts?.include_inactive ?? false,
      },
    }),

  getArm: (armName: string) =>
    seedFetchJSON<SeedArmDetail>(`/api/v2/arms/${encodeURIComponent(armName)}`),

  listScenarios: () =>
    seedFetchJSON<ArmScenariosResponse>('/api/v2/arms/scenarios'),

  verifyQuery: (body: VerifyQueryRequest) =>
    seedFetchJSON<VerifyQueryResponse>('/api/v2/arms/verify-query', { method: 'POST', body }),

  createArm: (body: CreateArmRequest) =>
    seedFetchJSON<SeedArmDetail>('/api/v2/arms', { method: 'POST', body }),

  updateArm: (armName: string, body: UpdateArmRequest) =>
    seedFetchJSON<SeedArmDetail>(`/api/v2/arms/${encodeURIComponent(armName)}`, { method: 'PUT', body }),

  getLearningObservability: (days = 30) =>
    seedFetchJSON<ArmLearningObservabilityResponse>('/api/v2/arms/observability/learning', {
      params: { days },
    }),

  getExecutionTimeline: (opts?: { days?: number; arm_name?: string; scenario?: string; limit?: number }) =>
    seedFetchJSON<ArmExecutionTimelineResponse>('/api/v2/arms/observability/execution-timeline', {
      params: {
        days: opts?.days ?? 7,
        arm_name: opts?.arm_name,
        scenario: opts?.scenario,
        limit: opts?.limit ?? 200,
      },
    }),

  // Some observability endpoints can be intermittently unavailable; keep typing flexible.
  getRecentRuns: (opts?: { days?: number; scenario?: string; limit?: number }) =>
    seedFetchJSON<Record<string, unknown>>('/api/v2/arms/observability/recent-runs', {
      params: {
        days: opts?.days ?? 7,
        scenario: opts?.scenario,
        limit: opts?.limit ?? 50,
      },
    }),

  getRunSummary: (pipelineRunId: string) =>
    seedFetchJSON<Record<string, unknown>>(`/api/v2/arms/observability/run/${encodeURIComponent(pipelineRunId)}`),

  getUtilization: (opts?: { days?: number; scenario?: string }) =>
    seedFetchJSON<Record<string, unknown>>('/api/v2/arms/observability/utilization', {
      params: {
        days: opts?.days,
        scenario: opts?.scenario,
      },
    }),
};

export default seedArmsService;

