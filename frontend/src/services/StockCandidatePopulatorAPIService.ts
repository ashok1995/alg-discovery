import { AbstractAPIService, BaseAPIRequest, BaseAPIResponse } from './BaseAPIService';

export class StockCandidatePopulatorAPIService extends AbstractAPIService {
  constructor() {
    super('stock-candidate-populator-api', 'Stock Candidate', 8018, {
      HEALTH: '/health',
      STATUS: '/status',
      CANDIDATES: '/api/stock-candidate/candidates',
      SCREENING: '/api/stock-candidate/screening'
    });
  }

  async getCandidates(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.CANDIDATES);
  }
}

export const stockCandidatePopulatorAPIService = new StockCandidatePopulatorAPIService();
export default stockCandidatePopulatorAPIService; 