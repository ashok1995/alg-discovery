import type {
  CandidateDetailOut,
  CandidateOut,
  CoverageOut,
  KiteGapOut,
  KiteMatchIn,
  KiteMatchOut,
  StatusUpdateIn,
  SyncResultOut,
} from '../types/apiModels';
import { seedFetchJSON } from './seedHttp';

export const seedCandidatesService = {
  listCandidates: (opts?: { status?: string; sector?: string; market_cap_category?: string; limit?: number }) =>
    seedFetchJSON<CandidateOut[]>('/api/v2/candidates', {
      params: {
        status: opts?.status,
        sector: opts?.sector,
        market_cap_category: opts?.market_cap_category,
        limit: opts?.limit ?? 200,
      },
    }),

  getCandidate: (symbol: string) =>
    seedFetchJSON<CandidateDetailOut>(`/api/v2/candidates/${encodeURIComponent(symbol)}`),

  updateCandidateStatus: (symbol: string, body: StatusUpdateIn) =>
    seedFetchJSON<CandidateOut>(`/api/v2/candidates/${encodeURIComponent(symbol)}/status`, { method: 'PUT', body }),

  upsertKiteMatch: (symbol: string, body: KiteMatchIn) =>
    seedFetchJSON<KiteMatchOut>(`/api/v2/candidates/${encodeURIComponent(symbol)}/match`, { method: 'PUT', body }),

  forceSync: () =>
    seedFetchJSON<SyncResultOut>('/api/v2/candidates/sync', { method: 'POST' }),

  getCoverage: () =>
    seedFetchJSON<CoverageOut>('/api/v2/candidates/observability/coverage'),

  getKiteGap: (limit = 100) =>
    seedFetchJSON<KiteGapOut>('/api/v2/candidates/observability/kite-gap', { params: { limit } }),
};

export default seedCandidatesService;

