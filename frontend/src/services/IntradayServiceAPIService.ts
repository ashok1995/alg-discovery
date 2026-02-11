import { AbstractAPIService, BaseAPIResponse } from './BaseAPIService';

export class IntradayServiceAPIService extends AbstractAPIService {
  constructor() {
    super('intraday-service-api', 'Intraday Service', 8014, {
      HEALTH: '/health',
      STATUS: '/status',
      SERVICE: '/api/intraday-service/service',
      ENHANCED: '/api/intraday-service/enhanced'
    });
  }

  async getService(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.SERVICE);
  }
}

export const intradayServiceAPIService = new IntradayServiceAPIService();
export default intradayServiceAPIService; 