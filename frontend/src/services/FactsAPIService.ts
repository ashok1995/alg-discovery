import { AbstractAPIService, BaseAPIResponse } from './BaseAPIService';

export class FactsAPIService extends AbstractAPIService {
  constructor() {
    super('facts-api', 'Market Facts', 8008, {
      HEALTH: '/health',
      STATUS: '/status',
      FACTS: '/api/facts/market',
      DATA: '/api/facts/data'
    });
  }

  async getMarketFacts(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.FACTS);
  }
}

export const factsAPIService = new FactsAPIService();
export default factsAPIService; 