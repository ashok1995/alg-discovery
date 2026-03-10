/**
 * Candidate Query Registry Service
 *
 * Service for managing candidate queries, strategies, and sub-algorithms
 * through the Candidate Query Registry API.
 */

import { candidateQueryFetch, buildQueryUrl } from './candidateQueryHelpers';

// ==================== TYPES ====================

export interface QueryMetadata {
  query_id: string;
  query_name: string;
  query_type: string;
  description: string;
  tags: string;
  parameters: string;
  version: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  usage_count: number;
  last_used: string | null;
}

export interface QueryStats {
  usage_count: number;
  last_used: string;
  created_at: string;
  redis_key: string;
}

export interface RedisKeys {
  individual_query: string;
  metadata: string;
  stats: string;
}

export interface QueryDetail {
  query_id: string;
  query_string: string;
  metadata: QueryMetadata;
  stats: QueryStats;
  redis_keys: RedisKeys;
}

export interface QueryListItem {
  query_id: string;
  query_name: string;
  query_type: string;
  description: string;
  version: string;
  is_active: boolean;
  usage_count: number;
  last_used: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueryIdItem {
  query_id: string;
  query_name: string;
  query_type: string;
  is_active: boolean;
  created_at: string;
}

export interface QueryIdsResponse {
  query_ids: QueryIdItem[];
  total_queries: number;
  active_queries: number;
  inactive_queries: number;
}

export interface QueryListResponse {
  queries: QueryListItem[];
  total_results: number;
  limit: number;
  offset: number;
}

export interface QuerySearchResponse {
  search_term: string;
  queries: QueryDetail[];
  total_results: number;
}

export interface QueryStatsResponse {
  total_queries: number;
  active_queries: number;
  type_distribution: { sql: number; custom: number };
  redis_stats: {
    total_queries: number;
    type_distribution: { custom: number; sql: number };
    total_usage_count: number;
    average_usage: number;
  };
  storage_status: {
    redis_connected: boolean;
    database_connected: boolean;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  timestamp: string;
  data: T;
  message: string;
}

// ==================== SERVICE CLASS ====================

export class CandidateQueryRegistryService {
  private baseUrl: string;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private fetch<T>(path: string, context: string, options?: { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: string }): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    return candidateQueryFetch<T>(url, context, {
      method: options?.method ?? 'GET',
      body: options?.body,
    });
  }

  // ==================== QUERY MANAGEMENT ====================

  async getQueryIds(): Promise<QueryIdsResponse> {
    return this.fetch(`${this.baseUrl}/api/query/ids`, 'get query IDs');
  }

  async storeBatch(payload: {
    queries: Array<{
      query_name: string;
      query_string: string;
      query_type: string;
      description?: string;
      tags?: string[] | string;
      parameters?: Record<string, unknown> | string;
      version?: string;
      is_active?: boolean;
    }>;
  }): Promise<{ stored: number; message: string }> {
    return this.fetch(
      `${this.baseUrl}/api/query/store-batch`,
      'store batch',
      { method: 'POST', body: JSON.stringify(payload) }
    );
  }

  async getCandidates(): Promise<{ queries: QueryListItem[]; total_results: number }> {
    return this.fetch(`${this.baseUrl}/api/query/candidates`, 'fetch candidates');
  }

  async getBatch(query_ids: string[]): Promise<QueryDetail[]> {
    const result = await this.fetch<{ queries?: QueryDetail[] } | QueryDetail[]>(
      `${this.baseUrl}/api/query/get-batch`,
      'get batch',
      { method: 'POST', body: JSON.stringify({ query_ids }) }
    );
    return Array.isArray(result) ? result : (result?.queries ?? []);
  }

  async updateBatch(updates: Array<
    { query_id: string } & Partial<{
      query_name: string;
      query_string: string;
      query_type: string;
      description: string;
      tags: string;
      parameters: string;
      version: string;
      is_active: boolean;
    }>
  >): Promise<{ updated: number; message: string }> {
    return this.fetch(
      `${this.baseUrl}/api/query/update-batch`,
      'update batch',
      { method: 'PUT', body: JSON.stringify({ updates }) }
    );
  }

  async deleteBatch(query_ids: string[]): Promise<{ deleted: number; message: string }> {
    return this.fetch(
      `${this.baseUrl}/api/query/delete-batch`,
      'delete batch',
      { method: 'POST', body: JSON.stringify({ query_ids }) }
    );
  }

  async getQueries(params?: { limit?: number; offset?: number }): Promise<QueryListResponse> {
    const q: Record<string, number> = {};
    if (params?.limit != null) q.limit = params.limit;
    if (params?.offset != null) q.offset = params.offset;
    const url = buildQueryUrl(this.baseUrl, '/api/query/list', q);
    return this.fetch(url, 'get queries');
  }

  async searchQueries(searchTerm: string, limit: number = 10): Promise<QuerySearchResponse> {
    const url = buildQueryUrl(this.baseUrl, '/api/query/search', { search_term: searchTerm, limit });
    return this.fetch(url, 'search queries');
  }

  async getQuery(queryId: string): Promise<QueryDetail> {
    return this.fetch(`${this.baseUrl}/api/query/${queryId}`, 'get query');
  }

  async getQueryStats(): Promise<QueryStatsResponse> {
    return this.fetch(`${this.baseUrl}/api/query/stats`, 'get query stats');
  }

  async storeQuery(queryData: {
    query_name: string;
    query_string: string;
    query_type: string;
    description?: string;
    tags?: string;
    parameters?: string;
    version?: string;
  }): Promise<{ query_id: string; message: string }> {
    return this.fetch(
      `${this.baseUrl}/api/query/store`,
      'store query',
      { method: 'POST', body: JSON.stringify(queryData) }
    );
  }

  async updateQuery(
    queryId: string,
    updates: Partial<{
      query_name: string;
      query_string: string;
      query_type: string;
      description: string;
      tags: string;
      parameters: string;
      version: string;
      is_active: boolean;
    }>
  ): Promise<{ query_id: string; message: string }> {
    return this.fetch(
      `${this.baseUrl}/api/query/${queryId}`,
      'update query',
      { method: 'PUT', body: JSON.stringify(updates) }
    );
  }

  async deleteQuery(queryId: string): Promise<{ query_id: string; message: string }> {
    return this.fetch(
      `${this.baseUrl}/api/query/${queryId}`,
      'delete query',
      { method: 'DELETE' }
    );
  }

  // ==================== UTILITY METHODS ====================

  parseTags(tagsString: string): string[] {
    try {
      return JSON.parse(tagsString);
    } catch {
      return [];
    }
  }

  parseParameters(parametersString: string): Record<string, unknown> {
    try {
      return JSON.parse(parametersString);
    } catch {
      return {};
    }
  }

  formatQueryString(queryString: string): string {
    return queryString
      .replace(/\s+/g, ' ')
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')')
      .trim();
  }
}

// ==================== DEFAULT INSTANCE ====================

export const candidateQueryRegistryService = new CandidateQueryRegistryService();
