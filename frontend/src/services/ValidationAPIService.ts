import { AbstractAPIService, BaseAPIResponse } from './BaseAPIService';

export class ValidationAPIService extends AbstractAPIService {
  constructor() {
    super('validation-api', 'Validation Tools', 8012, {
      HEALTH: '/health',
      STATUS: '/status',
      VALIDATE: '/api/validation/validate',
      QUALITY: '/api/validation/quality'
    });
  }

  async validateData(): Promise<BaseAPIResponse> {
    return this.makeGetRequest<BaseAPIResponse>(this.endpoints.VALIDATE);
  }
}

export const validationAPIService = new ValidationAPIService();
export default validationAPIService; 