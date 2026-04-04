/**
 * Seed GET /api/v2/candidates* — aligned with candidates-ui-integration.md & OpenAPI.
 */

export type CandidateStatusV2 = 'active' | 'watchlist' | 'blacklisted';

export interface FundamentalsOutV2 {
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe: number | null;
  debt_to_equity: number | null;
  operating_margin: number | null;
  profit_margin: number | null;
  updated_at: string | null;
}

export interface CandidateOutV2 {
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
  candidate_status: CandidateStatusV2 | null;
  scan_count: number;
  last_seen_in_scan_at: string | null;
  first_seen_in_scan_at: string | null;
  fundamentals: FundamentalsOutV2;
  chart_url: string | null;
  updated_at: string | null;
}

export interface FundamentalsHistoryEntryV2 {
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

export interface CandidateDetailOutV2 extends CandidateOutV2 {
  fundamentals_history: FundamentalsHistoryEntryV2[];
}

export interface CoverageOutV2 {
  total_candidates: number;
  by_status: Record<string, number>;
  stale_fundamentals_count: number;
  stale_fundamentals_pct: number;
  sectors_covered: number;
  field_explanations: Record<string, string>;
}

export interface KiteGapItemOutV2 {
  symbol: string;
  chartink_symbol: string | null;
  kite_symbol: string | null;
  scan_count: number;
  last_seen_in_scan_at: string | null;
}

export interface KiteGapOutV2 {
  missing_instrument_token_count: number;
  limit: number;
  items: KiteGapItemOutV2[];
  field_explanations: Record<string, string>;
}

export interface KiteMatchInV2 {
  instrument_token?: number;
  kite_symbol?: string;
  chartink_symbol?: string;
  exchange?: string;
}

export interface KiteMatchOutV2 {
  symbol: string;
  instrument_token: number | null;
  kite_symbol: string | null;
  chartink_symbol: string | null;
  exchange: string | null;
  chart_url: string;
}

export interface SyncResultOutV2 {
  discovered_candidates: number;
  fundamentals_refreshed: number;
  history_snapshots_inserted: number;
  snapshot_date: string;
  ran_at: string;
}

export interface StatusUpdateInV2 {
  status: CandidateStatusV2;
}

export interface StatusUpdateOutV2 {
  symbol: string;
  status: string;
  updated: boolean;
}
