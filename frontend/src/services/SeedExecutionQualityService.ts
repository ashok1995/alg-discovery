import { seedFetchJSON } from './seedHttp';

export const seedExecutionQualityService = {
  getQualityReport: (days = 30) =>
    seedFetchJSON<unknown>('/api/v2/execution/quality-report', { params: { days }, timeoutMs: 60_000 }),

  getLiquidityAnalysis: (symbol: string) =>
    seedFetchJSON<unknown>(`/api/v2/execution/liquidity-analysis/${encodeURIComponent(symbol)}`, { timeoutMs: 30_000 }),

  getBatchLiquidity: (symbols: string) =>
    seedFetchJSON<unknown>('/api/v2/execution/batch-liquidity', { params: { symbols }, timeoutMs: 60_000 }),

  getSlippageAnalysis: (opts?: { days?: number; trade_type?: string }) =>
    seedFetchJSON<unknown>('/api/v2/execution/slippage-analysis', {
      params: {
        days: opts?.days ?? 90,
        trade_type: opts?.trade_type,
      },
      timeoutMs: 60_000,
    }),
};

export default seedExecutionQualityService;

