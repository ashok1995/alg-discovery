/**
 * Seed Registry — ARMs: all /api/v2/arms* REST calls (same base as SeedDashboardService).
 */

import { API_CONFIG } from '../config/api';
import type {
  ArmListParams,
  CreateArmRequest,
  ExecutionTimelineParams,
  UpdateArmRequest,
  VerifyQueryRequest,
  VerifyQueryResponse,
} from '../types/seedArms';

const BASE = API_CONFIG.SEED_API_BASE_URL;
const DEFAULT_TIMEOUT_MS = 30_000;
const VERIFY_TIMEOUT_MS = 120_000;

async function fetchJSON<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
  opts?: { method?: string; body?: unknown; timeoutMs?: number },
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
    });
  }
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const fetchOpts: RequestInit = { signal: controller.signal };
  if (opts?.method) fetchOpts.method = opts.method;
  if (opts?.body !== undefined) {
    fetchOpts.body = JSON.stringify(opts.body);
    fetchOpts.headers = { 'Content-Type': 'application/json' };
  }
  try {
    const res = await fetch(url.toString(), fetchOpts);
    clearTimeout(timeoutId);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`ARM API ${path} failed (${res.status}): ${text}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

function encodeArmPath(armName: string): string {
  return encodeURIComponent(armName);
}

export const seedArmService = {
  /** GET /api/v2/arms */
  listArms: (params?: ArmListParams) =>
    fetchJSON<Record<string, unknown>>('/api/v2/arms', {
      scenario: params?.scenario ?? undefined,
      status: params?.status ?? undefined,
      include_inactive: params?.include_inactive === true ? true : undefined,
    }),

  /** POST /api/v2/arms */
  createArm: (body: CreateArmRequest) =>
    fetchJSON<Record<string, unknown>>('/api/v2/arms', undefined, { method: 'POST', body }),

  /** GET /api/v2/arms/scenarios */
  listScenarios: () => fetchJSON<Record<string, unknown>>('/api/v2/arms/scenarios'),

  /** GET /api/v2/arms/{arm_name} */
  getArm: (armName: string) =>
    fetchJSON<Record<string, unknown>>(`/api/v2/arms/${encodeArmPath(armName)}`),

  /** PUT /api/v2/arms/{arm_name} */
  updateArm: (armName: string, body: UpdateArmRequest) =>
    fetchJSON<Record<string, unknown>>(`/api/v2/arms/${encodeArmPath(armName)}`, undefined, {
      method: 'PUT',
      body,
    }),

  /** POST /api/v2/arms/verify-query */
  verifyQuery: (body: VerifyQueryRequest) =>
    fetchJSON<VerifyQueryResponse>('/api/v2/arms/verify-query', undefined, {
      method: 'POST',
      body,
      timeoutMs: VERIFY_TIMEOUT_MS,
    }),

  /** GET /api/v2/arms/observability/execution-timeline */
  getExecutionTimeline: (params?: ExecutionTimelineParams) =>
    fetchJSON<Record<string, unknown>>('/api/v2/arms/observability/execution-timeline', {
      days: params?.days ?? 7,
      arm_name: params?.arm_name ?? undefined,
      scenario: params?.scenario ?? undefined,
      limit: params?.limit ?? 200,
    }),

  /** GET /api/v2/arms/observability/run/{pipeline_run_id} */
  getRunSummary: (pipelineRunId: string) =>
    fetchJSON<Record<string, unknown>>(`/api/v2/arms/observability/run/${encodeURIComponent(pipelineRunId)}`),

  /** GET /api/v2/arms/observability/learning */
  getObservabilityLearning: () =>
    fetchJSON<Record<string, unknown>>('/api/v2/arms/observability/learning'),

  /** GET /api/v2/arms/observability/utilization */
  getObservabilityUtilization: () =>
    fetchJSON<Record<string, unknown>>('/api/v2/arms/observability/utilization'),
};

export default seedArmService;
