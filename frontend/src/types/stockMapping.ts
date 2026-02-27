/**
 * Type definitions for Stock Mapping Service
 */

export interface StockMapping {
  id: string;
  symbol: string;
  kite_symbol: string;
  kite_token: number;
  chartink_symbol?: string | null;
  company_name: string;
  exchange: string;
  instrument_type: string;
  sector?: string | null;
  market_cap_category?: string | null;
  lot_size: number;
  tick_size: number;
  face_value?: number | null;
  isin?: string | null;
  expiry?: string | null;
  strike?: number | null;
  option_type?: string | null;
  market_cap?: number | null;
  is_active: boolean;
  is_index: boolean;
  is_popular: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  last_updated?: string | null;
  metadata: Record<string, unknown>;
}

export interface SearchRequest {
  query: string;
  limit: number;
  include_indexes: boolean;
}

export interface SyncResponse {
  status: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface StatisticsResponse {
  total_mappings: number;
  active_mappings: number;
  inactive_mappings: number;
  instrument_type_distribution: Record<string, number>;
  sector_distribution: Record<string, number>;
  market_cap_distribution: Record<string, number>;
  indexes_count: number;
  popular_stocks_count: number;
  last_updated: string;
}
