// Seed service "ops" endpoints: arms registry, candidate registry, observability, settings helpers.

// ==========================
// Observability / diagnostics
// ==========================

export interface EndpointInfo {
  method: string;
  path: string;
  name: string;
  tags: string[];
}

export interface EndpointsResponse {
  total: number;
  routes: EndpointInfo[];
}

export interface EndpointMetric {
  route: string;
  count: number;
  error_count: number;
  window_samples: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
}

export interface SeedEndpointPerformanceResponse {
  uptime_seconds: number;
  total_tracked_routes: number;
  endpoints: EndpointMetric[];
}

export interface ExternalServiceMetric {
  service_call: string;
  count: number;
  error_count: number;
  window_samples: number;
  avg_ms: number;
  min_ms: number;
  max_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
}

export interface ExternalPerformanceResponse {
  uptime_seconds: number;
  services: ExternalServiceMetric[];
}

export interface StreamConnectionsResponse {
  active_connections: number;
  connection_ids: string[];
  generated_at: string;
}

export interface RegimeScoringScenarioInfo {
  context_score_adjustment: number;
  regime_favorability: number;
}

export interface RegimeScoringObservabilityResponse {
  field_explanations: Record<string, string>;
  market_context: Record<string, unknown>;
  global_context: Record<string, unknown>;
  by_scenario: Record<string, RegimeScoringScenarioInfo>;
  timestamp: string;
}

// ==========================
// Candidate registry (Seed)
// ==========================

export interface FundamentalsOut {
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe: number | null;
  debt_to_equity: number | null;
  operating_margin: number | null;
  profit_margin: number | null;
  updated_at: string | null;
}

export interface CandidateOut {
  symbol: string;
  instrument_token: number | null;
  kite_symbol: string | null;
  chartink_symbol: string | null;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  market_cap_cr: number | null;
  market_cap_category: string | null;
  candidate_status: string | null;
  scan_count: number;
  last_seen_in_scan_at: string | null;
  first_seen_in_scan_at: string | null;
  fundamentals: FundamentalsOut;
  chart_url: string | null;
  updated_at: string | null;
}

export interface FundamentalsHistoryEntry {
  snapshot_date: string;
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe: number | null;
  roce: number | null;
  debt_to_equity: number | null;
  operating_margin: number | null;
  profit_margin: number | null;
  market_cap_cr: number | null;
  last_price: number | null;
  data_source: string;
}

export interface CandidateDetailOut extends CandidateOut {
  fundamentals_history: FundamentalsHistoryEntry[];
}

export interface CoverageOut {
  total_candidates: number;
  by_status: Record<string, number>;
  stale_fundamentals_count: number;
  stale_fundamentals_pct: number;
  sectors_covered: number;
  field_explanations: Record<string, string>;
}

export interface KiteGapItemOut {
  symbol: string;
  chartink_symbol: string | null;
  kite_symbol: string | null;
  scan_count: number;
  last_seen_in_scan_at: string | null;
}

export interface KiteGapOut {
  missing_instrument_token_count: number;
  limit: number;
  items: KiteGapItemOut[];
  field_explanations: Record<string, string>;
}

export interface StatusUpdateIn {
  status: string;
}

export interface KiteMatchIn {
  instrument_token?: number | null;
  kite_symbol?: string | null;
  chartink_symbol?: string | null;
  exchange?: string | null;
}

export interface KiteMatchOut {
  symbol: string;
  instrument_token: number | null;
  kite_symbol: string | null;
  chartink_symbol: string | null;
  exchange: string | null;
  chart_url: string;
}

export interface SyncResultOut {
  discovered_candidates: number;
  fundamentals_refreshed: number;
  history_snapshots_inserted: number;
  snapshot_date: string;
  ran_at: string;
}

// ==========================
// ARM registry (Seed)
// ==========================

export interface SeedArmSummary {
  arm_name: string;
  family: string | null;
  scenario: string;
  parent_arm: string | null;
  regime_alignment: string | null;
  status: string | null;
  description: string | null;
  created_by: string | null;
  is_active: boolean;
}

export interface SeedArmsListResponse {
  count: number;
  arms: SeedArmSummary[];
}

export interface SeedArmDetail extends SeedArmSummary {
  query_string: string | null;
  created_at: string | null;
  updated_at: string | null;
  children: string[];
}

export interface ArmScenarioSummary {
  scenario: string;
  arm_count: number;
}

export interface ArmScenariosResponse {
  scenarios: ArmScenarioSummary[];
  timestamp: string;
}

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
  scenario?: string;
  min_traded_value_rupees?: number | null;
}

export interface VerifyQueryResponse {
  success: boolean;
  record_count: number;
  sample_symbols: string[];
  duration_ms: number;
  message: string;
  resolved_service_host?: string | null;
  diagnostics?: Record<string, unknown> | null;
}

export interface ArmExecutionItem {
  arm_name: string;
  scenario: string;
  executed_at: string;
  duration_ms: number;
  records_returned: number;
  admitted_count: number;
  status: string;
  error_message: string | null;
  market_regime: string | null;
  pipeline_run_id: string | null;
}

export interface ArmExecutionTimelineResponse {
  count: number;
  days: number;
  pipeline_run_ids: string[];
  executions: ArmExecutionItem[];
  field_info?: Record<string, string>;
  timestamp: string;
}

export interface ArmLearningObsItem {
  arm_name: string;
  scenario: string;
  family: string | null;
  thompson_weight: number | null;
  alpha: number | null;
  beta: number | null;
  observations: number | null;
  win_rate_pct: number | null;
  avg_return_pct: number | null;
  avg_return_pct_per_hour: number | null;
  positions_last_n_days: number | null;
  is_probation: boolean;
  regime_weights: Record<string, number> | null;
}

export interface ArmLearningObservabilityResponse {
  days: number;
  arm_count: number;
  arms: ArmLearningObsItem[];
}

// ==========================
// System settings (Seed)
// ==========================

export interface SeedSystemSettingsResponse {
  api_limits: Record<string, unknown>;
  observability: Record<string, unknown>;
  alerts: Record<string, unknown>;
  position_opener: Record<string, unknown>;
}

export interface SeedAllSettingsResponse {
  trading: Record<string, unknown>;
  system: SeedSystemSettingsResponse;
}

