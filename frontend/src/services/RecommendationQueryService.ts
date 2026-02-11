import axios, { AxiosInstance } from 'axios';
import { getMetaHeaders } from '../utils/meta';
import attachAxiosLogging from './httpLogger';
import {
  UniversalRecommendationRequest,
  UniversalRecommendationResponse
} from '../types/apiModels';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? (process.env.REACT_APP_API_BASE_URL || 'http://localhost:8002')
  : (process.env.REACT_APP_API_BASE_URL || '');

const ENDPOINT = '/api/recommendations/query';

class RecommendationQueryService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: Number(process.env.REACT_APP_REQUEST_TIMEOUT || 30000),
      headers: { 'Content-Type': 'application/json' }
    });

    attachAxiosLogging(this.api, 'UniversalRecommendationAPI');

    this.api.interceptors.request.use((config) => {
      const mergedHeaders = { ...((config.headers || {}) as any), ...getMetaHeaders('/recommendations/query') };
      (config as any).headers = mergedHeaders;
      return config;
    });
  }

  async query(body: UniversalRecommendationRequest): Promise<UniversalRecommendationResponse> {
    const response = await this.api.post(ENDPOINT, body);
    return response.data as UniversalRecommendationResponse;
  }
}

export const recommendationQueryService = new RecommendationQueryService();
export default recommendationQueryService;


