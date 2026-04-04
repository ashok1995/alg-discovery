/**
 * Seed Dashboard Service
 * ======================
 * Client for seed-stocks-service /api/v2/dashboard/* endpoints.
 * Uses SEED_API_BASE_URL from config (dev: localhost:8082, prod: VM:8182).
 */

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
  SeedSystemSettingsResponse,
  SeedAllSettingsResponse,
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
  MarketMoversResponse,
  BatchCloseRequest,
  BatchCloseResponse,
  BatchAnalyzeRequest,
  BatchAnalyzeResponse,
  SearchPositionsResponse,
} from '../types/apiModels';
import { seedBuildUrl, seedFetchJSON } from './seedHttp';

// Centralized HTTP logic lives in services/seedHttp.ts

export const seedDashboardService = {
  getDailySummary: (days = 1) =>
    seedFetchJSON<DashboardDailySummary>('/api/v2/dashboard/daily-summary', { params: { days } }),

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
    return seedFetchJSON<PositionsResponse>('/api/v2/dashboard/positions', { params });
  },

  getUniverseHealth: () =>
    seedFetchJSON<UniverseHealthResponse>('/api/v2/dashboard/universe-health'),

  /** API requires points >= 5 */
  getMarketTrends: (points = 20) =>
    seedFetchJSON<MarketTrendsResponse>('/api/v2/dashboard/market-trends', { params: { points: Math.max(5, points) } }),

  getArmPerformance: (days = 7) =>
    seedFetchJSON<ArmPerformanceResponse>('/api/v2/dashboard/arm-performance', { params: { days } }),

  getLearningStatus: () =>
    seedFetchJSON<LearningStatusResponse>('/api/v2/dashboard/learning-status'),

  getPerformanceTimeline: (days = 7, trade_type?: string) =>
    seedFetchJSON<PerformanceTimelineResponse>('/api/v2/dashboard/performance-timeline', {
      params: { days, ...(trade_type ? { trade_type } : {}) },
    }),

  /**
   * Consolidated endpoint that returns movers in one call.
   * mover_type: gainers | losers | traded | all
   */
  getMarketMovers: (opts?: { mover_type?: 'gainers' | 'losers' | 'traded' | 'all'; days?: number; limit?: number }) =>
    seedFetchJSON<MarketMoversResponse>('/api/v2/dashboard/market-movers', {
      params: {
        mover_type: opts?.mover_type ?? 'all',
        days: opts?.days ?? 1,
        limit: opts?.limit ?? 20,
      },
    }),

  // Backwards-compatible wrappers (the old split endpoints were removed from Seed API)
  getTopGainers: async (limit = 20, days = 1): Promise<TopGainersResponse> => {
    const res = await seedDashboardService.getMarketMovers({ mover_type: 'gainers', days, limit });
    return {
      count: res.counts?.gainers ?? res.gainers?.length ?? 0,
      gainers: res.gainers ?? [],
      generated_at: res.generated_at,
    };
  },

  getTopLosers: async (limit = 20, days = 1): Promise<TopLosersResponse> => {
    const res = await seedDashboardService.getMarketMovers({ mover_type: 'losers', days, limit });
    return {
      count: res.counts?.losers ?? res.losers?.length ?? 0,
      losers: res.losers ?? [],
      generated_at: res.generated_at,
    };
  },

  getTopTraded: async (limit = 20, days = 1): Promise<TopTradedResponse> => {
    const res = await seedDashboardService.getMarketMovers({ mover_type: 'traded', days, limit });
    return {
      count: res.counts?.top_traded ?? res.top_traded?.length ?? 0,
      top_traded: res.top_traded ?? [],
      generated_at: res.generated_at,
    };
  },

  getPipelineHealth: () =>
    seedFetchJSON<PipelineHealthResponse>('/v2/health/pipeline'),

  getObservabilityDb: () =>
    seedFetchJSON<ObservabilityDbResponse>('/v2/observability/db'),

  getScoreBinPerformance: (opts?: { trade_type?: string; days?: number; from_date?: string; to_date?: string }) => {
    const params: Record<string, string | number> = { days: opts?.days ?? 30 };
    if (opts?.trade_type) params.trade_type = opts.trade_type;
    if (opts?.from_date) params.from_date = opts.from_date;
    if (opts?.to_date) params.to_date = opts.to_date;
    return seedFetchJSON<ScoreBinPerformanceItem[]>('/v2/learning/score-bin-performance', { params });
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
    return seedFetchJSON<LearningPerformanceResponse>('/v2/learning/performance', { params });
  },

  getAnalysisPerformance: (days = 30) =>
    seedFetchJSON<AnalysisPerformanceResponse>('/api/v2/analysis/performance', { params: { days } }),

  getRegistryStats: () =>
    seedFetchJSON<RegistryStatsResponse>('/api/v2/registry/stats'),

  getCapitalSummary: (days = 30) =>
    seedFetchJSON<CapitalSummaryResponse>('/api/v2/dashboard/capital-summary', { params: { days } }),

  getChargesCalculator: (opts: { entry_price: number; exit_price: number; quantity?: number; is_intraday?: boolean }) => {
    const params: Record<string, string | number> = {
      entry_price: opts.entry_price,
      exit_price: opts.exit_price,
    };
    if (opts.quantity != null) params.quantity = opts.quantity;
    if (opts.is_intraday != null) params.is_intraday = opts.is_intraday ? 1 : 0;
    return seedFetchJSON<ChargesCalculatorResponse>('/api/v2/dashboard/charges-calculator', { params });
  },

  getPnlTimeline: (days = 30) =>
    seedFetchJSON<PnlTimelineResponse>('/api/v2/dashboard/pnl-timeline', { params: { days } }),

  getTradingSettings: () =>
    seedFetchJSON<TradingSettingsResponse>('/api/v2/settings/trading'),

  updateTradingSettings: (body: Partial<TradingSettingsResponse>) =>
    seedFetchJSON<TradingSettingsResponse>('/api/v2/settings/trading', { method: 'PUT', body }),

  getTradingSettingsSchema: () =>
    seedFetchJSON<Record<string, unknown>>('/api/v2/settings/trading/schema'),

  getTradingSettingsForm: () =>
    seedFetchJSON<Record<string, unknown>>('/api/v2/settings/trading/form'),

  getSystemSettings: () =>
    seedFetchJSON<SeedSystemSettingsResponse>('/api/v2/settings/system'),

  updateSystemSettings: (body: Partial<SeedSystemSettingsResponse>) =>
    seedFetchJSON<SeedSystemSettingsResponse>('/api/v2/settings/system', { method: 'PUT', body }),

  getSystemSettingsSchema: () =>
    seedFetchJSON<Record<string, unknown>>('/api/v2/settings/system/schema'),

  getSystemSettingsForm: () =>
    seedFetchJSON<Record<string, unknown>>('/api/v2/settings/system/form'),

  getAllSettings: () =>
    seedFetchJSON<SeedAllSettingsResponse>('/api/v2/settings'),

  // ===================================================
  // NEW: Monitor, Batch, Export, Overview endpoints
  // ===================================================

  /** Single consolidated dashboard call — replaces fetching 10 endpoints individually */
  getDashboardOverview: (opts?: { include_positions?: boolean; include_learning?: boolean }) => {
    const params: Record<string, string | number> = {};
    if (opts?.include_positions != null) params.include_positions = opts.include_positions ? 1 : 0;
    if (opts?.include_learning != null) params.include_learning = opts.include_learning ? 1 : 0;
    return seedFetchJSON<DashboardOverviewResponse>('/api/v2/dashboard/overview', { params });
  },

  /** Ultra-fast (<10ms) header stats — poll every 15s */
  getQuickStats: () =>
    seedFetchJSON<QuickStatsResponse>('/api/v2/monitor/quick-stats'),

  /** Real-time market context (VIX, regime, Nifty, S&P) */
  getMarketPulse: () =>
    seedFetchJSON<MarketPulseResponse>('/api/v2/monitor/market-pulse'),

  /** System alerts for notification badge */
  getSystemAlerts: () =>
    seedFetchJSON<SystemAlertsResponse>('/api/v2/monitor/system-alerts'),

  /** Multi-period win/return KPI cards (1h / 24h / 7d) */
  getPerformancePulse: () =>
    seedFetchJSON<PerformancePulseResponse>('/api/v2/monitor/performance-pulse'),

  /** Live positions with proximity to stop / target */
  getLivePositions: (includeClosedHours = 0) =>
    seedFetchJSON<LivePositionsResponse>('/api/v2/monitor/live-positions', {
      params: { include_closed_hours: includeClosedHours },
    }),

  /** Positions within N% of a stop or target trigger */
  getWatchlist: (proximityThreshold = 2.0) =>
    seedFetchJSON<WatchlistResponse>('/api/v2/dashboard/watchlist', { params: { proximity_threshold: proximityThreshold } }),

  /** Trailing stop / profit-protection status per open position */
  getProfitProtectionStatus: () =>
    seedFetchJSON<ProfitProtectionResponse>('/api/v2/dashboard/profit-protection-status'),

  /** Portfolio risk breakdown by trade type and sector */
  getPortfolioRisk: () =>
    seedFetchJSON<PortfolioRiskResponse>('/api/v2/dashboard/portfolio-risk'),

  /** Ranked ARM leaderboard with Thompson Sampling weights */
  getArmLeaderboard: (days = 7) =>
    seedFetchJSON<ArmLeaderboardResponse>('/api/v2/monitor/arm-leaderboard', { params: { days } }),

  /** Quick learning health summary */
  getLearningInsights: () =>
    seedFetchJSON<LearningInsightsResponse>('/api/v2/monitor/learning-insights'),

  /** Today's best and worst performing positions */
  getTopPerformersToday: (limit = 10) =>
    seedFetchJSON<TopPerformersTodayResponse>('/api/v2/monitor/top-performers-today', { params: { limit } }),

  /** Data staleness checks per pipeline component */
  getDataHealth: () =>
    seedFetchJSON<DataHealthResponse>('/api/v2/monitor/data-health'),

  /** DB row counts and quality metrics */
  getDataStatistics: () =>
    seedFetchJSON<DataStatisticsResponse>('/api/v2/batch/data-statistics'),

  /** Emergency multi-position close (up to 50 positions) */
  batchClosePositions: (body: BatchCloseRequest) =>
    seedFetchJSON<BatchCloseResponse>('/api/v2/batch/close-positions', { method: 'POST', body }),

  /** Bulk symbol performance analysis (up to 20 symbols) */
  analyzeSymbols: (body: BatchAnalyzeRequest) =>
    seedFetchJSON<BatchAnalyzeResponse>('/api/v2/batch/analyze-symbols', { method: 'POST', body }),

  /** Full-text search across positions (symbol, ARM name, trade type) */
  searchPositions: (query: string, limit = 20) =>
    seedFetchJSON<SearchPositionsResponse>('/api/v2/export/search/positions', { params: { query, limit } }),

  /** Returns a fully-qualified CSV download URL (use as href or window.open) */
  getExportUrl: (type: 'positions' | 'outcomes' | 'market-context', params?: Record<string, string | number>) => {
    const pathMap = {
      positions: '/api/v2/export/positions.csv',
      outcomes: '/api/v2/export/outcomes.json',
      'market-context': '/api/v2/export/market-context.csv',
    };
    return seedBuildUrl(pathMap[type], params);
  },
};

export default seedDashboardService;
