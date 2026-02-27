/**
 * Shared base types for API models
 */

export interface BaseMeta {
  requestId?: string;
  processing_time?: number;
  cache_hit?: boolean;
  timestamp?: string;
  price_source?: string;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  error?: string;
  metadata?: BaseMeta;
}

export interface ValidationError {
  field: string;
  message: string;
}
