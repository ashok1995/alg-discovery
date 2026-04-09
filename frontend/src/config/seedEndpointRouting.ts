/**
 * HTTP base URL per path: Seed Stocks (8182) vs Position tracker (8183).
 * Derived from `frontend/docs/configuration/seed-openapi.json` and
 * `position-tracker-openapi.json` — refresh after backend deploys.
 */

import { API_CONFIG } from './api';

const SEED = (): string => API_CONFIG.SEED_API_BASE_URL;
const PT = (): string => API_CONFIG.SEED_POSITIONS_API_BASE_URL;

/** Prefixes served only by position-tracker. */
const POSITION_TRACKER_PREFIXES: readonly string[] = [
  '/api/v2/dashboard/positions',
  '/api/v2/batch/',
  '/api/v2/export/',
  '/api/v2/monitor/learning-convergence',
  '/api/v2/monitor/learning-health',
  '/api/v2/monitor/performance-attribution',
  '/api/v2/monitor/target-progression',
  '/api/v2/health/worker',
];

function matchesTrackerPrefix(path: string, prefix: string): boolean {
  if (prefix.endsWith('/')) return path.startsWith(prefix);
  return path === prefix || path.startsWith(`${prefix}/`);
}

export function resolveSeedHttpBase(path: string): string {
  for (const prefix of POSITION_TRACKER_PREFIXES) {
    if (matchesTrackerPrefix(path, prefix)) return PT();
  }
  return SEED();
}

/**
 * Paths the legacy monolith used that are **not** in current Seed (8182) or tracker (8183) OpenAPI.
 * Call sites should handle 404 / omit until backend restores or rehomes them.
 */
export const DASHBOARD_PATHS_NOT_IN_CURRENT_OPENAPI: readonly string[] = [
  '/api/v2/dashboard/daily-summary',
  '/api/v2/dashboard/overview',
  '/api/v2/dashboard/universe-health',
  '/api/v2/dashboard/market-trends',
  '/api/v2/dashboard/arm-performance',
  '/api/v2/dashboard/learning-status',
  '/api/v2/dashboard/performance-timeline',
  '/api/v2/dashboard/capital-summary',
  '/api/v2/dashboard/charges-calculator',
  '/api/v2/dashboard/pnl-timeline',
  '/api/v2/dashboard/watchlist',
  '/api/v2/dashboard/profit-protection-status',
  '/api/v2/dashboard/portfolio-risk',
  '/api/v2/monitor/quick-stats',
  '/api/v2/monitor/market-pulse',
  '/api/v2/monitor/system-alerts',
  '/api/v2/monitor/performance-pulse',
  '/api/v2/monitor/live-positions',
  '/api/v2/monitor/arm-leaderboard',
  '/api/v2/monitor/learning-insights',
  '/api/v2/monitor/top-performers-today',
  '/api/v2/monitor/data-health',
  '/api/v2/observability/endpoints',
  '/api/v2/observability/performance',
  '/api/v2/observability/performance/external',
  '/v2/health/pipeline',
  '/v2/observability/db',
  '/v2/learning/score-bin-performance',
  '/v2/learning/performance',
  '/v2/observability/regime-scoring',
  '/api/v2/arms/observability/learning',
  '/api/v2/arms/observability/utilization',
];
