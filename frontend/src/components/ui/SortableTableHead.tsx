import React from 'react';
import { TableCell, TableHead, TableRow, TableSortLabel, Box } from '@mui/material';
import type { SortDirection } from '../../hooks/useSortableData';

export interface ColumnDef<K extends string = string> {
  key: K;
  label: string;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  minWidth?: number;
  width?: number | string;
}

interface SortableTableHeadProps<K extends string = string> {
  columns: ColumnDef<K>[];
  onSort: (key: K) => void;
  getSortDirection: (key: K) => SortDirection | undefined;
}

function SortableTableHead<K extends string>({
  columns,
  onSort,
  getSortDirection,
}: SortableTableHeadProps<K>): React.ReactElement {
  return (
    <TableHead>
      <TableRow>
        {columns.map((col) => {
          const dir = getSortDirection(col.key);
          const sortable = col.sortable !== false;
          return (
            <TableCell
              key={col.key}
              align={col.align ?? 'left'}
              sx={{
                fontWeight: 700,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'text.secondary',
                bgcolor: 'grey.50',
                minWidth: col.minWidth,
                width: col.width,
                whiteSpace: 'nowrap',
              }}
              sortDirection={dir ?? false}
            >
              {sortable ? (
                <TableSortLabel
                  active={!!dir}
                  direction={dir ?? 'desc'}
                  onClick={() => onSort(col.key)}
                >
                  {col.label}
                  {dir && (
                    <Box component="span" sx={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
                      {dir === 'desc' ? 'sorted descending' : 'sorted ascending'}
                    </Box>
                  )}
                </TableSortLabel>
              ) : (
                col.label
              )}
            </TableCell>
          );
        })}
      </TableRow>
    </TableHead>
  );
}

export default SortableTableHead;
