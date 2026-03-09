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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { ArmPerformanceItem, PerformanceTimelineDay, AnalysisPerformanceResponse } from '../../types/apiModels';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';

interface PerformanceTabProps {
  perfTimeline: PerformanceTimelineDay[];
  armPerformance: ArmPerformanceItem[];
  analysisPerformance?: AnalysisPerformanceResponse | null;
}

type ArmKey = 'arm' | 'total' | 'wins' | 'win_rate' | 'avg_return_pct';

const ARM_COLUMNS: ColumnDef<ArmKey>[] = [
  { key: 'arm', label: 'Strategy ARM', sortable: true, minWidth: 180 },
  { key: 'total', label: 'Trades', align: 'right', sortable: true },
  { key: 'wins', label: 'Wins', align: 'right', sortable: true },
  { key: 'win_rate', label: 'Win Rate %', align: 'right', sortable: true },
  { key: 'avg_return_pct', label: 'Avg Return %', align: 'right', sortable: true },
];

const PerformanceTab: React.FC<PerformanceTabProps> = ({ perfTimeline, armPerformance, analysisPerformance }) => {
  const dataVolume = analysisPerformance?.analysis?.data_volume as Array<{ trade_type: string; total_recs: number; unique_symbols: number }> | undefined;
  const { sortedData, requestSort, getSortDirection } = useSortableData<ArmPerformanceItem, ArmKey>(
    armPerformance,
    { key: 'avg_return_pct', direction: 'desc' },
  );

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {Array.isArray(dataVolume) && dataVolume.length > 0 && (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>Analysis data volume</Typography>
            <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 220, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
              <Table size="small">
                <TableBody>
                  {dataVolume.map((row) => (
                    <TableRow key={row.trade_type}>
                      <TableCell sx={{ fontWeight: 500 }}>{row.trade_type.replace(/_/g, ' ')}</TableCell>
                      <TableCell align="right">{row.total_recs?.toLocaleString() ?? 0} recs</TableCell>
                      <TableCell align="right">{row.unique_symbols ?? 0} symbols</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>Daily P&L Timeline</Typography>
          {perfTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perfTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v}%`} />
                <RTooltip
                  formatter={(v: number) => `${v.toFixed(2)}%`}
                  contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                />
                <Legend />
                <Bar dataKey="total_return_pct" name="Total Return %" fill="#1976d2" radius={[4, 4, 0, 0]} />
                <Bar dataKey="win_rate" name="Win Rate %" fill="#4caf50" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No closed trades in this period</Typography>
          )}
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
            <Typography variant="h6" fontWeight={600}>ARM Performance</Typography>
            <Chip label={`${armPerformance.length} strategies`} size="small" variant="outlined" />
          </Box>
          <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 500, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Table size="small" stickyHeader>
              <SortableTableHead columns={ARM_COLUMNS} onSort={requestSort} getSortDirection={getSortDirection} />
              <TableBody>
                {sortedData.map((a) => (
                  <TableRow key={a.arm} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.78rem' }}>
                        {a.arm.replace(/_/g, ' ')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{a.total}</TableCell>
                    <TableCell align="right">{a.wins}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${a.win_rate.toFixed(1)}%`}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          bgcolor: a.win_rate >= 60
                            ? alpha('#4caf50', 0.12)
                            : a.win_rate >= 45
                              ? alpha('#ff9800', 0.12)
                              : alpha('#f44336', 0.12),
                          color: a.win_rate >= 60 ? 'success.dark' : a.win_rate >= 45 ? 'warning.dark' : 'error.dark',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        color={a.avg_return_pct > 0 ? 'success.main' : a.avg_return_pct < 0 ? 'error.main' : 'text.secondary'}
                      >
                        {a.avg_return_pct > 0 ? '+' : ''}{a.avg_return_pct.toFixed(2)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={ARM_COLUMNS.length} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No ARM data</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PerformanceTab;
