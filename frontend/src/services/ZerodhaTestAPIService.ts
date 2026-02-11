import { AbstractAPIService, BaseAPIResponse } from './BaseAPIService';

export class ZerodhaTestAPIService extends AbstractAPIService {
  constructor() {
    super('zerodha-test-api', 'Zerodha Test', 8010, {
      HEALTH: '/health',
      STATUS: '/status',
      TEST: '/api/zerodha/test',
      CONNECTION: '/api/zerodha/connection'
    });
  }

  async testZerodhaConnection(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.TEST);
  }
}

export const zerodhaTestAPIService = new ZerodhaTestAPIService();
export default zerodhaTestAPIService; 