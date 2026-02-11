import { AbstractAPIService, BaseAPIResponse } from './BaseAPIService';

export class DashboardAPIService extends AbstractAPIService {
  constructor() {
    super('dashboard-api', 'Dashboard', 8005, {
      HEALTH: '/health',
      STATUS: '/status',
      OVERVIEW: '/api/dashboard/overview',
      ANALYTICS: '/api/dashboard/analytics'
    });
  }

  async getOverview(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.OVERVIEW);
  }
}

export const dashboardAPIService = new DashboardAPIService();
export default dashboardAPIService; 