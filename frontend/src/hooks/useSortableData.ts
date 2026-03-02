import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<K extends string = string> {
  key: K;
  direction: SortDirection;
}

export interface SortableResult<T, K extends string = string> {
  sortedData: T[];
  sortConfig: SortConfig<K> | null;
  requestSort: (key: K) => void;
  getSortDirection: (key: K) => SortDirection | undefined;
}

function getNestedValue(obj: unknown, key: string): unknown {
  return key.split('.').reduce((acc: unknown, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part];
    return undefined;
  }, obj);
}

export function useSortableData<T, K extends string = string>(
  items: T[],
  defaultSort?: SortConfig<K>,
): SortableResult<T, K> {
  const [sortConfig, setSortConfig] = useState<SortConfig<K> | null>(defaultSort ?? null);

  const sortedData = useMemo(() => {
    if (!sortConfig) return [...items];

    return [...items].sort((a, b) => {
      const aVal = getNestedValue(a, sortConfig.key);
      const bVal = getNestedValue(b, sortConfig.key);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [items, sortConfig]);

  const requestSort = (key: K) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  };

  const getSortDirection = (key: K): SortDirection | undefined => {
    if (sortConfig?.key === key) return sortConfig.direction;
    return undefined;
  };

  return { sortedData, sortConfig, requestSort, getSortDirection };
}
