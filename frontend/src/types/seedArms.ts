/**
 * Seed GET/POST/PUT /api/v2/arms* — aligned with seed-openapi.json components.
 */

export interface CreateArmRequest {
  arm_name: string;
  query_string: string;
  scenario: string;
  parent_arm?: string | null;
  regime_alignment?: string;
  description?: string | null;
  status?: string;
}

export interface UpdateArmRequest {
  query_string?: string | null;
  parent_arm?: string | null;
  regime_alignment?: string | null;
  description?: string | null;
  status?: string | null;
}

export interface VerifyQueryRequest {
  query_string: string;
  widget_id?: string;
}

export interface VerifyQueryResponse {
  success: boolean;
  record_count: number;
  sample_symbols: string[];
  duration_ms: number;
  message: string;
}

export interface ArmListParams {
  scenario?: string | null;
  status?: string | null;
  include_inactive?: boolean;
}

export interface ExecutionTimelineParams {
  days?: number;
  arm_name?: string | null;
  scenario?: string | null;
  limit?: number;
}
