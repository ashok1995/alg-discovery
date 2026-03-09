import React from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Chip,
  Box,
  alpha,
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
import type { LearningStatusResponse, ScoreBinPerformanceItem } from '../../types/apiModels';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';

interface MLLearningTabProps {
  learningStatus: LearningStatusResponse | null;
  scoreBins?: ScoreBinPerformanceItem[];
}

type BinKey = 'score_bin' | 'trade_type' | 'horizon' | 'count' | 'avg_return_pct' | 'success_rate_pct';

const BIN_COLUMNS: ColumnDef<BinKey>[] = [
  { key: 'score_bin', label: 'Score Bin', sortable: true },
  { key: 'trade_type', label: 'Trade Type', sortable: true },
  { key: 'horizon', label: 'Horizon', sortable: true },
  { key: 'count', label: 'Count', align: 'right', sortable: true },
  { key: 'avg_return_pct', label: 'Avg Return %', align: 'right', sortable: true },
  { key: 'success_rate_pct', label: 'Success %', align: 'right', sortable: true },
];

type WeightKey = 'arm' | 'weight' | 'alpha' | 'beta';

const WEIGHT_COLUMNS: ColumnDef<WeightKey>[] = [
  { key: 'arm', label: 'ARM', sortable: true, minWidth: 160 },
  { key: 'weight', label: 'Weight', align: 'right', sortable: true },
  { key: 'alpha', label: 'Alpha', align: 'right', sortable: true },
  { key: 'beta', label: 'Beta', align: 'right', sortable: true },
];

const MLLearningTab: React.FC<MLLearningTabProps> = ({ learningStatus, scoreBins = [] }) => {
  const top10 = learningStatus?.top_10 ?? [];
  const bottom5 = learningStatus?.bottom_5 ?? [];
  const totalArms = learningStatus?.total_arms ?? 0;

  const { sortedData: sortedBins, requestSort: sortBin, getSortDirection: getBinDir } =
    useSortableData<ScoreBinPerformanceItem, BinKey>(scoreBins, { key: 'success_rate_pct', direction: 'desc' });

  const allWeights = [...top10, ...bottom5];
  const { sortedData: sortedWeights, requestSort: sortWeight, getSortDirection: getWeightDir } =
    useSortableData<typeof allWeights[number], WeightKey>(allWeights, { key: 'weight', direction: 'desc' });

  const binChartData = scoreBins.map((b) => ({
    name: `${b.score_bin} (${b.trade_type.replace(/_/g, ' ')})`,
    avg_return_pct: b.avg_return_pct,
    success_rate_pct: b.success_rate_pct,
    count: b.count,
  }));

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={600}>Thompson Sampling Weights</Typography>
              <Chip label={`${totalArms} arms`} size="small" variant="outlined" />
            </Box>
            {top10.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top10} layout="vertical" margin={{ left: 130 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis type="number" domain={[0, 'auto']} />
                  <YAxis type="category" dataKey="arm" tick={{ fontSize: 9 }} width={120} />
                  <RTooltip formatter={(v: number) => v.toFixed(4)} contentStyle={{ borderRadius: 8, border: '1px solid #eee' }} />
                  <Bar dataKey="weight" fill="#1976d2" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No learning data yet</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
          <CardContent sx={{ p: 2 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Alpha / Beta (Posterior)</Typography>
            {sortedWeights.length > 0 ? (
              <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 340, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Table size="small" stickyHeader>
                  <SortableTableHead columns={WEIGHT_COLUMNS} onSort={sortWeight} getSortDirection={getWeightDir} />
                  <TableBody>
                    {sortedWeights.map((a) => (
                      <TableRow key={a.arm} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.75rem' }}>
                            {a.arm.replace(/_/g, ' ')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{a.weight.toFixed(4)}</TableCell>
                        <TableCell align="right">{a.alpha.toFixed(3)}</TableCell>
                        <TableCell align="right">{a.beta.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No learning data yet</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="h6" fontWeight={600}>Score Bin Performance (Self-Learning)</Typography>
              <Chip label={`${scoreBins.length} bins`} size="small" variant="outlined" />
            </Box>
            {binChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={binChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <RTooltip contentStyle={{ borderRadius: 8, border: '1px solid #eee' }} />
                    <Legend />
                    <Bar dataKey="avg_return_pct" name="Avg Return %" fill="#1976d2" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="success_rate_pct" name="Success Rate %" fill="#4caf50" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <TableContainer component={Paper} elevation={0} sx={{ mt: 2, maxHeight: 340, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                  <Table size="small" stickyHeader>
                    <SortableTableHead columns={BIN_COLUMNS} onSort={sortBin} getSortDirection={getBinDir} />
                    <TableBody>
                      {sortedBins.map((b, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Chip label={b.score_bin} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
                          </TableCell>
                          <TableCell>{b.trade_type.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{b.horizon}</TableCell>
                          <TableCell align="right">{b.count}</TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              color={b.avg_return_pct > 0 ? 'success.main' : b.avg_return_pct < 0 ? 'error.main' : 'text.secondary'}
                            >
                              {b.avg_return_pct > 0 ? '+' : ''}{b.avg_return_pct.toFixed(2)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${b.success_rate_pct.toFixed(1)}%`}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.72rem',
                                bgcolor: b.success_rate_pct >= 50 ? alpha('#4caf50', 0.12) : alpha('#f44336', 0.12),
                                color: b.success_rate_pct >= 50 ? 'success.dark' : 'error.dark',
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No score bin data yet</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default MLLearningTab;
