import type {
  EndpointsResponse,
  ExternalPerformanceResponse,
  RegimeScoringObservabilityResponse,
  SeedEndpointPerformanceResponse,
  StreamConnectionsResponse,
} from '../types/apiModels';
import { seedFetchJSON } from './seedHttp';

export const seedObservabilityService = {
  getRegisteredRoutes: () =>
    seedFetchJSON<EndpointsResponse>('/api/v2/observability/endpoints'),

  getEndpointPerformance: (windowMinutes?: number) =>
    seedFetchJSON<SeedEndpointPerformanceResponse>('/api/v2/observability/performance', {
      params: windowMinutes != null ? { window_minutes: windowMinutes } : undefined,
    }),

  getExternalPerformance: (windowMinutes?: number) =>
    seedFetchJSON<ExternalPerformanceResponse>('/api/v2/observability/performance/external', {
      params: windowMinutes != null ? { window_minutes: windowMinutes } : undefined,
    }),

  getRegimeScoringObservability: () =>
    seedFetchJSON<RegimeScoringObservabilityResponse>('/v2/observability/regime-scoring'),

  getStreamConnections: () =>
    seedFetchJSON<StreamConnectionsResponse>('/ws/stream/connections'),
};

export default seedObservabilityService;

