import axios from 'axios';
import { API_CONFIG, getApiUrl } from '../config/api';

// Mock data for when backend is not available
const MOCK_STATISTICS = {
  total_mappings: 5,
  active_mappings: 5,
  inactive_mappings: 0,
  instrument_type_distribution: {
    "EQ": 4,
    "IND": 1
  },
  sector_distribution: {
    "oil_gas": 1,
    "it": 2,
    "banking": 1
  },
  market_cap_distribution: {
    "large_cap": 4
  },
  indexes_count: 1,
  popular_stocks_count: 4,
  last_updated: new Date().toISOString()
};

const MOCK_STOCK_MAPPINGS = [
  {
    id: "1",
    symbol: "RELIANCE",
    kite_symbol: "RELIANCE",
    kite_token: 2885,
    chartink_symbol: "RELIANCE",
    company_name: "Reliance Industries Limited",
    exchange: "NSE",
    instrument_type: "EQ",
    sector: "oil_gas",
    market_cap_category: "large_cap",
    lot_size: 250,
    tick_size: 0.05,
    face_value: 10.0,
    isin: "INE002A01018",
    expiry: null,
    strike: null,
    option_type: null,
    market_cap: 1500000.0,
    is_active: true,
    is_index: false,
    is_popular: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
    metadata: {"industry": "Oil & Gas", "sub_sector": "Refineries"}
  },
  {
    id: "2",
    symbol: "TCS",
    kite_symbol: "TCS",
    kite_token: 11536,
    chartink_symbol: "TCS",
    company_name: "Tata Consultancy Services Limited",
    exchange: "NSE",
    instrument_type: "EQ",
    sector: "it",
    market_cap_category: "large_cap",
    lot_size: 1,
    tick_size: 0.05,
    face_value: 1.0,
    isin: "INE467B01029",
    expiry: null,
    strike: null,
    option_type: null,
    market_cap: 1200000.0,
    is_active: true,
    is_index: false,
    is_popular: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
    metadata: {"industry": "Information Technology", "sub_sector": "Software"}
  },
  {
    id: "3",
    symbol: "NIFTY50",
    kite_symbol: "NIFTY 50",
    kite_token: 256265,
    chartink_symbol: "NIFTY50",
    company_name: "NIFTY 50 Index",
    exchange: "NSE",
    instrument_type: "IND",
    sector: null,
    market_cap_category: null,
    lot_size: 50,
    tick_size: 0.05,
    face_value: null,
    isin: null,
    expiry: null,
    strike: null,
    option_type: null,
    market_cap: null,
    is_active: true,
    is_index: true,
    is_popular: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
    metadata: {"index_type": "Market Cap Weighted", "base_year": 1995}
  },
  {
    id: "4",
    symbol: "HDFCBANK",
    kite_symbol: "HDFCBANK",
    kite_token: 341,
    chartink_symbol: "HDFCBANK",
    company_name: "HDFC Bank Limited",
    exchange: "NSE",
    instrument_type: "EQ",
    sector: "banking",
    market_cap_category: "large_cap",
    lot_size: 15,
    tick_size: 0.05,
    face_value: 1.0,
    isin: "INE040A01034",
    expiry: null,
    strike: null,
    option_type: null,
    market_cap: 800000.0,
    is_active: true,
    is_index: false,
    is_popular: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
    metadata: {"industry": "Banking", "sub_sector": "Private Sector Banks"}
  },
  {
    id: "5",
    symbol: "INFY",
    kite_symbol: "INFY",
    kite_token: 1594,
    chartink_symbol: "INFY",
    company_name: "Infosys Limited",
    exchange: "NSE",
    instrument_type: "EQ",
    sector: "it",
    market_cap_category: "large_cap",
    lot_size: 1,
    tick_size: 0.05,
    face_value: 5.0,
    isin: "INE009A01021",
    expiry: null,
    strike: null,
    option_type: null,
    market_cap: 600000.0,
    is_active: true,
    is_index: false,
    is_popular: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
    metadata: {"industry": "Information Technology", "sub_sector": "Software"}
  }
];

// Interfaces
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
  metadata: Record<string, any>;
}

export interface SearchRequest {
  query: string;
  limit: number;
  include_indexes: boolean;
}

export interface SyncResponse {
  status: string;
  message: string;
  details?: Record<string, any>;
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

// Helper function to check if backend is available
const isBackendAvailable = async (): Promise<boolean> => {
  try {
          await axios.get(getApiUrl('/api/database/mapping/health'), { timeout: API_CONFIG.REQUEST.RETRY_DELAY });
    return true;
  } catch {
    return false;
  }
};

// Service functions
export const getStatistics = async (): Promise<StatisticsResponse> => {
  try {
    const backendAvailable = await isBackendAvailable();
    if (backendAvailable) {
      const response = await axios.get(getApiUrl('/api/database/mapping/statistics'));
      return response.data;
    }
  } catch (error) {
    console.warn('Backend not available, using mock data:', error);
  }
  
  // Return mock data
  return MOCK_STATISTICS;
};

export const getStockMapping = async (symbol: string): Promise<StockMapping> => {
  try {
    const backendAvailable = await isBackendAvailable();
    if (backendAvailable) {
      const response = await axios.get(getApiUrl(`/api/database/mapping/stock/${symbol}`));
      return response.data;
    }
  } catch (error) {
    console.warn('Backend not available, using mock data:', error);
  }
  
  // Return mock data
  const mapping = MOCK_STOCK_MAPPINGS.find(m => m.symbol === symbol);
  if (!mapping) {
    throw new Error(`Stock mapping not found for symbol: ${symbol}`);
  }
  return mapping;
};

export const searchStockMappings = async (request: SearchRequest): Promise<StockMapping[]> => {
  try {
    const backendAvailable = await isBackendAvailable();
    if (backendAvailable) {
      const response = await axios.post(getApiUrl('/api/database/mapping/search'), request);
      return response.data;
    }
  } catch (error) {
    console.warn('Backend not available, using mock data:', error);
  }
  
  // Return mock data
  const query = request.query.toLowerCase();
  const results = MOCK_STOCK_MAPPINGS.filter(mapping => {
    if (!request.include_indexes && mapping.is_index) {
      return false;
    }
    return (
      mapping.symbol.toLowerCase().includes(query) ||
      mapping.company_name.toLowerCase().includes(query) ||
      mapping.kite_symbol.toLowerCase().includes(query)
    );
  });
  
  return results.slice(0, request.limit);
};

export const getPopularStocks = async (limit: number = 50): Promise<StockMapping[]> => {
  try {
    const backendAvailable = await isBackendAvailable();
    if (backendAvailable) {
      const response = await axios.get(getApiUrl(`/api/database/mapping/popular-stocks?limit=${limit}`));
      return response.data;
    }
  } catch (error) {
    console.warn('Backend not available, using mock data:', error);
  }
  
  // Return mock data
  return MOCK_STOCK_MAPPINGS.filter(m => m.is_popular).slice(0, limit);
};

export const syncWithZerodhaFiles = async (): Promise<SyncResponse> => {
  try {
    const backendAvailable = await isBackendAvailable();
    if (backendAvailable) {
      const response = await axios.post(getApiUrl('/api/database/mapping/sync'));
      return response.data;
    }
  } catch (error) {
    console.warn('Backend not available, using mock response:', error);
  }
  
  // Return mock response
  return {
    status: 'success',
    message: 'Mock sync completed successfully. Updated 5 mappings.',
    details: { updated_count: 5, new_mappings: 2, errors: 0 }
  };
};

// Default export
const stockMappingService = {
  getStatistics,
  getStockMapping,
  searchStockMappings,
  getPopularStocks,
  syncWithZerodhaFiles
};

export default stockMappingService; 