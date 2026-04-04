/**
 * Normalize Seed list_arms response shapes to a row array.
 */

export function extractArmsRows(data: Record<string, unknown> | null): Record<string, unknown>[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  const candidates = [data.arms, data.items, data.results, data.data, data.records];
  for (const v of candidates) {
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [];
}

export function armCell(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null) return String(v);
  }
  return '—';
}
