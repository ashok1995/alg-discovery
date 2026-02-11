import { AbstractAPIService, BaseAPIRequest, BaseAPIResponse } from './BaseAPIService';

export class UnifiedStrategyAPIService extends AbstractAPIService {
  constructor() {
    super('unified-strategy-api', 'Unified Strategy', 8002, {
      HEALTH: '/health',
      STATUS: '/status',
      STRATEGIES: '/api/unified/strategies',
      ANALYSIS: '/api/unified/analysis'
    });
  }

  async getStrategies(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.STRATEGIES);
  }
}

export const unifiedStrategyAPIService = new UnifiedStrategyAPIService();
export default unifiedStrategyAPIService; 