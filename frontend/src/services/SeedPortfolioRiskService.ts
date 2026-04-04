import { seedFetchJSON } from './seedHttp';

export const seedPortfolioRiskService = {
  getRiskStatus: () =>
    seedFetchJSON<unknown>('/api/v2/portfolio/risk-status', { timeoutMs: 30_000 }),

  riskCheck: (opts: { symbol: string; trade_type: string; allocation: number; sector?: string }) =>
    seedFetchJSON<unknown>('/api/v2/portfolio/risk-check', {
      method: 'POST',
      params: {
        symbol: opts.symbol,
        trade_type: opts.trade_type,
        allocation: opts.allocation,
        sector: opts.sector,
      },
      timeoutMs: 30_000,
    }),
};

export default seedPortfolioRiskService;

