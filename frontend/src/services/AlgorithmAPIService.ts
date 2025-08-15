import { AbstractAPIService, BaseAPIRequest, BaseAPIResponse } from './BaseAPIService';

export class AlgorithmAPIService extends AbstractAPIService {
  constructor() {
    super('algorithm-api', 'Algorithm Analysis', 8013, {
      HEALTH: '/health',
      STATUS: '/status',
      ANALYSIS: '/api/algorithm/analysis',
      OPTIMIZATION: '/api/algorithm/optimization'
    });
  }

  async getAnalysis(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.ANALYSIS);
  }
}

export const algorithmAPIService = new AlgorithmAPIService();
export default algorithmAPIService; 