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
  // New types
  DashboardOverviewResponse,
  QuickStatsResponse,
  MarketPulseResponse,
  SystemAlertsResponse,
  PerformancePulseResponse,
  LivePositionsResponse,
  WatchlistResponse,
  ProfitProtectionResponse,
  PortfolioRiskResponse,
  ArmLeaderboardResponse,
  LearningInsightsResponse,
  TopPerformersTodayResponse,
  DataHealthResponse,
  DataStatisticsResponse,
  BatchCloseRequest,
  BatchCloseResponse,
  BatchAnalyzeRequest,
  BatchAnalyzeResponse,
  SearchPositionsResponse,
} from '../types/apiModels';

const BASE = API_CONFIG.SEED_API_BASE_URL;
const DEFAULT_TIMEOUT_MS = 15_000;
const SLOW_TIMEOUT_MS = 45_000;

const SLOW_PATHS = new Set([
  '/api/v2/dashboard/top-losers',
  '/api/v2/dashboard/top-gainers',
  '/api/v2/dashboard/top-traded',
]);

/** Fast paths: use a shorter timeout so polling loops don't block */
const FAST_TIMEOUT_MS = 5_000;
const FAST_PATHS = new Set([
  '/api/v2/monitor/quick-stats',
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

  const timeout = SLOW_PATHS.has(path)
    ? SLOW_TIMEOUT_MS
    : FAST_PATHS.has(path)
      ? FAST_TIMEOUT_MS
      : DEFAULT_TIMEOUT_MS;
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

  // ===================================================
  // NEW: Monitor, Batch, Export, Overview endpoints
  // ===================================================

  /** Single consolidated dashboard call — replaces fetching 10 endpoints individually */
  getDashboardOverview: (opts?: { include_positions?: boolean; include_learning?: boolean }) => {
    const params: Record<string, string | number> = {};
    if (opts?.include_positions != null) params.include_positions = opts.include_positions ? 1 : 0;
    if (opts?.include_learning != null) params.include_learning = opts.include_learning ? 1 : 0;
    return fetchJSON<DashboardOverviewResponse>('/api/v2/dashboard/overview', params);
  },

  /** Ultra-fast (<10ms) header stats — poll every 15s */
  getQuickStats: () =>
    fetchJSON<QuickStatsResponse>('/api/v2/monitor/quick-stats'),

  /** Real-time market context (VIX, regime, Nifty, S&P) */
  getMarketPulse: () =>
    fetchJSON<MarketPulseResponse>('/api/v2/monitor/market-pulse'),

  /** System alerts for notification badge */
  getSystemAlerts: () =>
    fetchJSON<SystemAlertsResponse>('/api/v2/monitor/system-alerts'),

  /** Multi-period win/return KPI cards (1h / 24h / 7d) */
  getPerformancePulse: () =>
    fetchJSON<PerformancePulseResponse>('/api/v2/monitor/performance-pulse'),

  /** Live positions with proximity to stop / target */
  getLivePositions: (includeClosedHours = 0) =>
    fetchJSON<LivePositionsResponse>('/api/v2/monitor/live-positions', {
      include_closed_hours: includeClosedHours,
    }),

  /** Positions within N% of a stop or target trigger */
  getWatchlist: (proximityThreshold = 2.0) =>
    fetchJSON<WatchlistResponse>('/api/v2/dashboard/watchlist', { proximity_threshold: proximityThreshold }),

  /** Trailing stop / profit-protection status per open position */
  getProfitProtectionStatus: () =>
    fetchJSON<ProfitProtectionResponse>('/api/v2/dashboard/profit-protection-status'),

  /** Portfolio risk breakdown by trade type and sector */
  getPortfolioRisk: () =>
    fetchJSON<PortfolioRiskResponse>('/api/v2/dashboard/portfolio-risk'),

  /** Ranked ARM leaderboard with Thompson Sampling weights */
  getArmLeaderboard: (days = 7) =>
    fetchJSON<ArmLeaderboardResponse>('/api/v2/monitor/arm-leaderboard', { days }),

  /** Quick learning health summary */
  getLearningInsights: () =>
    fetchJSON<LearningInsightsResponse>('/api/v2/monitor/learning-insights'),

  /** Today's best and worst performing positions */
  getTopPerformersToday: (limit = 10) =>
    fetchJSON<TopPerformersTodayResponse>('/api/v2/monitor/top-performers-today', { limit }),

  /** Data staleness checks per pipeline component */
  getDataHealth: () =>
    fetchJSON<DataHealthResponse>('/api/v2/monitor/data-health'),

  /** DB row counts and quality metrics */
  getDataStatistics: () =>
    fetchJSON<DataStatisticsResponse>('/api/v2/batch/data-statistics'),

  /** Emergency multi-position close (up to 50 positions) */
  batchClosePositions: (body: BatchCloseRequest) =>
    fetchJSON<BatchCloseResponse>('/api/v2/batch/close-positions', undefined, { method: 'POST', body }),

  /** Bulk symbol performance analysis (up to 20 symbols) */
  analyzeSymbols: (body: BatchAnalyzeRequest) =>
    fetchJSON<BatchAnalyzeResponse>('/api/v2/batch/analyze-symbols', undefined, { method: 'POST', body }),

  /** Full-text search across positions (symbol, ARM name, trade type) */
  searchPositions: (query: string, limit = 20) =>
    fetchJSON<SearchPositionsResponse>('/api/v2/export/search/positions', { query, limit }),

  /** Returns a fully-qualified CSV download URL (use as href or window.open) */
  getExportUrl: (type: 'positions' | 'outcomes' | 'market-context', params?: Record<string, string | number>) => {
    const pathMap = {
      positions: '/api/v2/export/positions.csv',
      outcomes: '/api/v2/export/outcomes.json',
      'market-context': '/api/v2/export/market-context.csv',
    };
    const url = new URL(`${BASE}${pathMap[type]}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      });
    }
    return url.toString();
  },
};

export default seedDashboardService;
