/**
 * Shared fetch helper for Candidate Query Registry API
 * Reduces repetition of fetch + error handling across CRUD methods.
 */

export interface ApiJsonResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: string;
}

/**
 * Performs a fetch to the Candidate Query Registry API with unified error handling.
 * Expects JSON response with { success, data, message } shape.
 */
export async function candidateQueryFetch<T>(
  url: string,
  context: string,
  options: FetchOptions = {}
): Promise<T> {
  const { method = 'GET', body } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  try {
    const response = await fetch(url, {
      method,
      headers,
      ...(body !== undefined && { body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data: ApiJsonResponse<T> = await response.json();
    if (!data.success) {
      throw new Error(data.message || `Failed to ${context}`);
    }

    return data.data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error ${context}:`, error);
    throw new Error(`Failed to ${context}: ${message}`);
  }
}

/** Build URL for GET with optional query params */
export function buildQueryUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number>
): string {
  const url = `${baseUrl}${path}`;
  if (!params || Object.keys(params).length === 0) return url;
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => searchParams.append(k, String(v)));
  return `${url}?${searchParams.toString()}`;
}
