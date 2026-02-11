import { AbstractAPIService, BaseAPIResponse } from './BaseAPIService';

export class StockMappingAPIService extends AbstractAPIService {
  constructor() {
    super('stock-mapping-api', 'Stock Mapping', 8015, {
      HEALTH: '/health',
      STATUS: '/status',
      MAPPING: '/api/stock-mapping/mapping',
      CATEGORIES: '/api/stock-mapping/categories'
    });
  }

  async getMapping(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.MAPPING);
  }
}

export const stockMappingAPIService = new StockMappingAPIService();
export default stockMappingAPIService; 