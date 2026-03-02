import axios from 'axios';
import { API_CONFIG, getApiUrl } from '../config/api';
import type {
  StockMapping,
  SearchRequest,
  SyncResponse,
  StatisticsResponse,
} from '../types/stockMapping';

export type { StockMapping, SearchRequest, SyncResponse, StatisticsResponse };

const isBackendAvailable = async (): Promise<boolean> => {
  try {
    await axios.get(getApiUrl('/api/database/mapping/health'), {
      timeout: API_CONFIG.REQUEST.RETRY_DELAY,
    });
    return true;
  } catch {
    return false;
  }
};

export const getStatistics = async (): Promise<StatisticsResponse> => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    throw new Error('Stock mapping service unavailable');
  }
  const response = await axios.get(getApiUrl('/api/database/mapping/statistics'));
  return response.data;
};

export const getStockMapping = async (symbol: string): Promise<StockMapping> => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    throw new Error('Stock mapping service unavailable');
  }
  const response = await axios.get(getApiUrl(`/api/database/mapping/stock/${symbol}`));
  return response.data;
};

export const searchStockMappings = async (request: SearchRequest): Promise<StockMapping[]> => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    throw new Error('Stock mapping service unavailable');
  }
  const response = await axios.post(getApiUrl('/api/database/mapping/search'), request);
  return response.data;
};

export const getPopularStocks = async (limit: number = 50): Promise<StockMapping[]> => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    throw new Error('Stock mapping service unavailable');
  }
  const response = await axios.get(
    getApiUrl(`/api/database/mapping/popular-stocks?limit=${limit}`)
  );
  return response.data;
};

export const syncWithZerodhaFiles = async (): Promise<SyncResponse> => {
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    throw new Error('Stock mapping service unavailable');
  }
  const response = await axios.post(getApiUrl('/api/database/mapping/sync'));
  return response.data;
};

const stockMappingService = {
  getStatistics,
  getStockMapping,
  searchStockMappings,
  getPopularStocks,
  syncWithZerodhaFiles,
};

export default stockMappingService;
