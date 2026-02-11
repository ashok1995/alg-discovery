import { AbstractAPIService, BaseAPIRequest, BaseAPIResponse } from './BaseAPIService';

export class VariantsAPIService extends AbstractAPIService {
  constructor() {
    super('variants-api', 'Strategy Variants', 8009, {
      HEALTH: '/health',
      STATUS: '/status',
      VARIANTS: '/api/variants/list',
      BACKTEST: '/api/variants/backtest'
    });
  }

  async getVariants(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.VARIANTS);
  }
}

export const variantsAPIService = new VariantsAPIService();
export default variantsAPIService; 