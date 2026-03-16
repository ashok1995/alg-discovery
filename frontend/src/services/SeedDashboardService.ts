/**
 * Seed Dashboard Service
 * ======================
 * Client for seed-stocks-service /api/v2/dashboard/* endpoints.
 * Uses SEED_API_BASE_URL from config (dev: localhost:8082, prod: VM:8182).
 */

import { API_CONFIG } from '../config/api';
import type {
  DashboardDailySummary,
  PositionsResponse,
  UniverseHealthResponse,
  MarketTrendsResponse,
  ArmPerformanceResponse,
  LearningStatusResponse,
  PerformanceTimelineResponse,
  TopGainersResponse,
  TopLosersResponse,
  TopTradedResponse,
  PipelineHealthResponse,
  ObservabilityDbResponse,
  ScoreBinPerformanceItem,
  AnalysisPerformanceResponse,
  RegistryStatsResponse,
  LearningPerformanceResponse,
  CapitalSummaryResponse,
  ChargesCalculatorResponse,
  PnlTimelineResponse,
  TradingSettingsResponse,
} from '../types/apiModels';

const BASE = API_CONFIG.SEED_API_BASE_URL;
const DEFAULT_TIMEOUT_MS = 15_000;
const SLOW_TIMEOUT_MS = 45_000;

const SLOW_PATHS = new Set([
  '/api/v2/dashboard/top-losers',
  '/api/v2/dashboard/top-gainers',
  '/api/v2/dashboard/top-traded',
]);

async function fetchJSON<T>(
  path: string,
  params?: Record<string, string | number>,
  opts?: { method?: string; body?: unknown },
): Promise<T> {
  const url = new URL(`${BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }

  const timeout = SLOW_PATHS.has(path) ? SLOW_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

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
      throw new Error(`Dashboard API ${path} failed (${res.status}): ${text}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export const seedDashboardService = {
  getDailySummary: (days = 1) =>
    fetchJSON<DashboardDailySummary>('/api/v2/dashboard/daily-summary', { days }),

  getPositions: (opts?: {
    category?: 'all' | 'learning' | 'paper_trade';
    status?: string;
    outcome?: string;
    trade_type?: string;
    source_arm?: string;
    days?: number;
    from_date?: string;
    to_date?: string;
    limit?: number;
  }) => {
    const params: Record<string, string | number> = {};
    if (opts?.category) params.category = opts.category;
    if (opts?.status) params.status = opts.status;
    if (opts?.outcome) params.outcome = opts.outcome;
    if (opts?.trade_type) params.trade_type = opts.trade_type;
    if (opts?.source_arm) params.source_arm = opts.source_arm;
    if (opts?.days != null) params.days = opts.days;
    if (opts?.from_date) params.from_date = opts.from_date;
    if (opts?.to_date) params.to_date = opts.to_date;
    if (opts?.limit != null) params.limit = opts.limit;
    return fetchJSON<PositionsResponse>('/api/v2/dashboard/positions', params);
  },

  getUniverseHealth: () =>
    fetchJSON<UniverseHealthResponse>('/api/v2/dashboard/universe-health'),

  /** API requires points >= 5 */
  getMarketTrends: (points = 20) =>
    fetchJSON<MarketTrendsResponse>('/api/v2/dashboard/market-trends', { points: Math.max(5, points) }),

  getArmPerformance: (days = 7) =>
    fetchJSON<ArmPerformanceResponse>('/api/v2/dashboard/arm-performance', { days }),

  getLearningStatus: () =>
    fetchJSON<LearningStatusResponse>('/api/v2/dashboard/learning-status'),

  getPerformanceTimeline: (days = 7, trade_type?: string) =>
    fetchJSON<PerformanceTimelineResponse>('/api/v2/dashboard/performance-timeline', {
      days,
      ...(trade_type ? { trade_type } : {}),
    }),

  getTopGainers: (limit = 20, days = 1) =>
    fetchJSON<TopGainersResponse>('/api/v2/dashboard/top-gainers', { limit, days }),

  getTopLosers: (limit = 20, days = 1) =>
    fetchJSON<TopLosersResponse>('/api/v2/dashboard/top-losers', { limit, days }),

  getTopTraded: (limit = 20, days = 1) =>
    fetchJSON<TopTradedResponse>('/api/v2/dashboard/top-traded', { limit, days }),

  getPipelineHealth: () =>
    fetchJSON<PipelineHealthResponse>('/v2/health/pipeline'),

  getObservabilityDb: () =>
    fetchJSON<ObservabilityDbResponse>('/v2/observability/db'),

  getScoreBinPerformance: (opts?: { trade_type?: string; days?: number; from_date?: string; to_date?: string }) => {
    const params: Record<string, string | number> = { days: opts?.days ?? 30 };
    if (opts?.trade_type) params.trade_type = opts.trade_type;
    if (opts?.from_date) params.from_date = opts.from_date;
    if (opts?.to_date) params.to_date = opts.to_date;
    return fetchJSON<ScoreBinPerformanceItem[]>('/v2/learning/score-bin-performance', params);
  },

  /** GET /v2/learning/performance – group_by (score_bin | source_arm | outcome_type), horizon_type (time | event | all), filters */
  getLearningPerformance: (opts?: {
    group_by?: 'score_bin' | 'source_arm' | 'outcome_type';
    trade_type?: string;
    source_arm?: string;
    horizon_type?: 'time' | 'event' | 'all';
    days?: number;
    from_date?: string;
    to_date?: string;
  }) => {
    const params: Record<string, string | number> = {
      group_by: opts?.group_by ?? 'score_bin',
      horizon_type: opts?.horizon_type ?? 'all',
      days: opts?.days ?? 30,
    };
    if (opts?.trade_type) params.trade_type = opts.trade_type;
    if (opts?.source_arm) params.source_arm = opts.source_arm;
    if (opts?.from_date) params.from_date = opts.from_date;
    if (opts?.to_date) params.to_date = opts.to_date;
    return fetchJSON<LearningPerformanceResponse>('/v2/learning/performance', params);
  },

  getAnalysisPerformance: (days = 30) =>
    fetchJSON<AnalysisPerformanceResponse>('/api/v2/analysis/performance', { days }),

  getRegistryStats: () =>
    fetchJSON<RegistryStatsResponse>('/api/v2/registry/stats'),

  getCapitalSummary: (days = 30) =>
    fetchJSON<CapitalSummaryResponse>('/api/v2/dashboard/capital-summary', { days }),

  getChargesCalculator: (opts: { entry_price: number; exit_price: number; quantity?: number; is_intraday?: boolean }) => {
    const params: Record<string, string | number> = {
      entry_price: opts.entry_price,
      exit_price: opts.exit_price,
    };
    if (opts.quantity != null) params.quantity = opts.quantity;
    if (opts.is_intraday != null) params.is_intraday = opts.is_intraday ? 1 : 0;
    return fetchJSON<ChargesCalculatorResponse>('/api/v2/dashboard/charges-calculator', params);
  },

  getPnlTimeline: (days = 30) =>
    fetchJSON<PnlTimelineResponse>('/api/v2/dashboard/pnl-timeline', { days }),

  getTradingSettings: () =>
    fetchJSON<TradingSettingsResponse>('/api/v2/settings/trading'),

  updateTradingSettings: (body: Partial<TradingSettingsResponse>) =>
    fetchJSON<TradingSettingsResponse>('/api/v2/settings/trading', undefined, { method: 'PUT', body }),

  getTradingSettingsSchema: () =>
    fetchJSON<Record<string, unknown>>('/api/v2/settings/trading/schema'),
};

export default seedDashboardService;
