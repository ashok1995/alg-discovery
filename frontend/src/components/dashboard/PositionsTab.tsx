import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Chip,
  alpha,
  Box,
} from '@mui/material';
import type { TrackedPositionItem } from '../../types/apiModels';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';
import SymbolLink from '../ui/SymbolLink';
import { TRADE_TYPE_LABELS, returnColor } from './types';

interface PositionsTabProps {
  positions: TrackedPositionItem[];
}

type PosKey = 'symbol' | 'trade_type' | 'entry_price' | 'stop_loss' | 'target_1' | 'target_2' | 'status' | 'return_pct' | 'source_arm' | 'opened_at';

const COLUMNS: ColumnDef<PosKey>[] = [
  { key: 'symbol', label: 'Symbol', sortable: true, minWidth: 120 },
  { key: 'trade_type', label: 'Type', sortable: true },
  { key: 'entry_price', label: 'Entry', align: 'right', sortable: true },
  { key: 'stop_loss', label: 'Stop Loss', align: 'right', sortable: true },
  { key: 'target_1', label: 'Target 1', align: 'right', sortable: true },
  { key: 'target_2', label: 'Target 2', align: 'right', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'return_pct', label: 'Return %', align: 'right', sortable: true },
  { key: 'source_arm', label: 'Strategy ARM', sortable: true },
  { key: 'opened_at', label: 'Opened', sortable: true },
];

const PositionsTab: React.FC<PositionsTabProps> = ({ positions }) => {
  const { sortedData, requestSort, getSortDirection } = useSortableData<TrackedPositionItem, PosKey>(
    positions,
    { key: 'opened_at', direction: 'desc' },
  );

  return (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="h6" fontWeight={600}>
            Tracked Positions
          </Typography>
          <Chip label={`${positions.length} total`} size="small" variant="outlined" />
        </Box>
        <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 520, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Table size="small" stickyHeader>
            <SortableTableHead columns={COLUMNS} onSort={requestSort} getSortDirection={getSortDirection} />
            <TableBody>
              {sortedData.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <SymbolLink symbol={p.symbol} chartUrl={p.chart_url} />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={TRADE_TYPE_LABELS[p.trade_type] || p.trade_type.replace(/_/g, ' ')}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 22 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={500}>₹{p.entry_price?.toFixed(2)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="error.main">{p.stop_loss?.toFixed(2) ?? '—'}</Typography>
                  </TableCell>
                  <TableCell align="right">{p.target_1?.toFixed(2) ?? '—'}</TableCell>
                  <TableCell align="right">{p.target_2?.toFixed(2) ?? '—'}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.status}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        bgcolor: p.status === 'open'
                          ? alpha('#2196f3', 0.12)
                          : p.return_pct != null && p.return_pct > 0
                            ? alpha('#4caf50', 0.12)
                            : alpha('#f44336', 0.12),
                        color: p.status === 'open'
                          ? 'info.dark'
                          : p.return_pct != null && p.return_pct > 0
                            ? 'success.dark'
                            : 'error.dark',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {p.return_pct !== null ? (
                      <Typography variant="body2" fontWeight={600} color={returnColor(p.return_pct)}>
                        {p.return_pct > 0 ? '+' : ''}{p.return_pct.toFixed(2)}%
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.disabled">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                      {p.source_arm?.replace(/_/g, ' ') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {p.opened_at
                        ? new Date(p.opened_at).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {sortedData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 4 }}>
                    <Typography color="text.secondary">No positions in this period</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default PositionsTab;
