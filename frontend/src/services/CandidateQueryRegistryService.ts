/**
 * Candidate Query Registry Service
 * 
 * Service for managing candidate queries, strategies, and sub-algorithms
 * through the Candidate Query Registry API.
 */

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
  type_distribution: {
    sql: number;
    custom: number;
  };
  redis_stats: {
    total_queries: number;
    type_distribution: {
      custom: number;
      sql: number;
    };
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

  // ==================== QUERY MANAGEMENT ====================

  async getQueryIds(): Promise<QueryIdsResponse> {
    const url = `${this.baseUrl}/api/query/ids`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to get query IDs');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching query IDs:', error);
      throw new Error(`Failed to fetch query IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Batch store
  async storeBatch(payload: { queries: Array<{
    query_name: string;
    query_string: string;
    query_type: string;
    description?: string;
    tags?: string[] | string;
    parameters?: Record<string, any> | string;
    version?: string;
    is_active?: boolean;
  }> }): Promise<{ stored: number; message: string }> {
    const url = `${this.baseUrl}/api/query/store-batch`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to store batch');
      }
      return data.data;
    } catch (error) {
      console.error('Error storing batch:', error);
      throw new Error(`Failed to store batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Candidates
  async getCandidates(): Promise<{ queries: QueryListItem[]; total_results: number }> {
    const url = `${this.baseUrl}/api/query/candidates`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch candidates');
      }
      return data.data;
    } catch (error) {
      console.error('Error fetching candidates:', error);
      throw new Error(`Failed to fetch candidates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get batch
  async getBatch(query_ids: string[]): Promise<QueryDetail[]> {
    const url = `${this.baseUrl}/api/query/get-batch`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query_ids }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to get batch');
      }
      return data.data.queries || data.data;
    } catch (error) {
      console.error('Error getting batch:', error);
      throw new Error(`Failed to get batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Update batch
  async updateBatch(updates: Array<{ query_id: string } & Partial<{
    query_name: string;
    query_string: string;
    query_type: string;
    description: string;
    tags: string;
    parameters: string;
    version: string;
    is_active: boolean;
  }>>): Promise<{ updated: number; message: string }> {
    const url = `${this.baseUrl}/api/query/update-batch`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update batch');
      }
      return data.data;
    } catch (error) {
      console.error('Error updating batch:', error);
      throw new Error(`Failed to update batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Delete batch
  async deleteBatch(query_ids: string[]): Promise<{ deleted: number; message: string }> {
    const url = `${this.baseUrl}/api/query/delete-batch`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query_ids }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete batch');
      }
      return data.data;
    } catch (error) {
      console.error('Error deleting batch:', error);
      throw new Error(`Failed to delete batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQueries(params?: {
    limit?: number;
    offset?: number;
  }): Promise<QueryListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const url = `${this.baseUrl}/api/query/list?${searchParams.toString()}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to get queries');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching queries:', error);
      throw new Error(`Failed to fetch queries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchQueries(searchTerm: string, limit: number = 10): Promise<QuerySearchResponse> {
    const params = new URLSearchParams();
    params.append('search_term', searchTerm);
    params.append('limit', limit.toString());

    const url = `${this.baseUrl}/api/query/search?${params.toString()}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to search queries');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error searching queries:', error);
      throw new Error(`Failed to search queries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQuery(queryId: string): Promise<QueryDetail> {
    const url = `${this.baseUrl}/api/query/${queryId}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to get query');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching query:', error);
      throw new Error(`Failed to fetch query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getQueryStats(): Promise<QueryStatsResponse> {
    const url = `${this.baseUrl}/api/query/stats`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to get query stats');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error fetching query stats:', error);
      throw new Error(`Failed to fetch query stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    const url = `${this.baseUrl}/api/query/store`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(queryData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to store query');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error storing query:', error);
      throw new Error(`Failed to store query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateQuery(queryId: string, updates: Partial<{
    query_name: string;
    query_string: string;
    query_type: string;
    description: string;
    tags: string;
    parameters: string;
    version: string;
    is_active: boolean;
  }>): Promise<{ query_id: string; message: string }> {
    const url = `${this.baseUrl}/api/query/${queryId}`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to update query');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error updating query:', error);
      throw new Error(`Failed to update query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteQuery(queryId: string): Promise<{ query_id: string; message: string }> {
    const url = `${this.baseUrl}/api/query/${queryId}`;
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Failed to delete query');
      }
      
      return data.data;
    } catch (error) {
      console.error('Error deleting query:', error);
      throw new Error(`Failed to delete query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== UTILITY METHODS ====================

  parseTags(tagsString: string): string[] {
    try {
      return JSON.parse(tagsString);
    } catch {
      return [];
    }
  }

  parseParameters(parametersString: string): Record<string, any> {
    try {
      return JSON.parse(parametersString);
    } catch {
      return {};
    }
  }

  formatQueryString(queryString: string): string {
    // Format the query string for better readability
    return queryString
      .replace(/\s+/g, ' ')
      .replace(/\s*\(\s*/g, '(')
      .replace(/\s*\)\s*/g, ')')
      .trim();
  }

  // ==================== ERROR HANDLING ====================

  private handleError(error: any): never {
    console.error('Candidate Query Registry Service Error:', error);
    throw new Error(error.message || 'An error occurred while communicating with the Candidate Query Registry');
  }
}

// ==================== DEFAULT INSTANCE ====================

export const candidateQueryRegistryService = new CandidateQueryRegistryService(); 