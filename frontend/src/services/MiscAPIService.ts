import { AbstractAPIService, BaseAPIResponse } from './BaseAPIService';

export class MiscAPIService extends AbstractAPIService {
  constructor() {
    super('misc-api', 'Misc Tools', 8006, {
      HEALTH: '/health',
      STATUS: '/status',
      TOOLS: '/api/misc/tools',
      UTILITIES: '/api/misc/utilities'
    });
  }

  async getTools(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.TOOLS);
  }
}

export const miscAPIService = new MiscAPIService();
export default miscAPIService; 