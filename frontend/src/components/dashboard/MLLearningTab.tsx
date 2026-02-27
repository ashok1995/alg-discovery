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
  TableHead,
  TableRow,
  Paper,
  Chip,
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
import { returnColor } from './types';

interface MLLearningTabProps {
  learningStatus: LearningStatusResponse | null;
  scoreBins?: ScoreBinPerformanceItem[];
}

const MLLearningTab: React.FC<MLLearningTabProps> = ({ learningStatus, scoreBins = [] }) => {
  const top10 = learningStatus?.top_10 ?? [];
  const bottom5 = learningStatus?.bottom_5 ?? [];
  const totalArms = learningStatus?.total_arms ?? 0;

  const binChartData = scoreBins.map((b) => ({
    name: `${b.score_bin} (${b.trade_type})`,
    avg_return_pct: b.avg_return_pct,
    success_rate_pct: b.success_rate_pct,
    count: b.count,
  }));

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Thompson Sampling Weights — Top 10
            </Typography>
            {top10.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={top10} layout="vertical" margin={{ left: 150 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 'auto']} />
                  <YAxis type="category" dataKey="arm" tick={{ fontSize: 10 }} width={140} />
                  <RTooltip formatter={(v: number) => v.toFixed(4)} />
                  <Bar dataKey="weight" fill="#1976d2" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography color="text.secondary">No learning data yet.</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Alpha / Beta (Posterior)
            </Typography>
            {top10.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ARM</TableCell>
                      <TableCell align="right">Weight</TableCell>
                      <TableCell align="right">Alpha</TableCell>
                      <TableCell align="right">Beta</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {top10.map((a) => (
                      <TableRow key={a.arm}>
                        <TableCell sx={{ fontSize: 11 }}>{a.arm}</TableCell>
                        <TableCell align="right">{a.weight.toFixed(4)}</TableCell>
                        <TableCell align="right">{a.alpha.toFixed(3)}</TableCell>
                        <TableCell align="right">{a.beta.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">No learning data yet.</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Score Bin Performance */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Score Bin Performance (Self-Learning)</Typography>
            {binChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={binChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={60} />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="avg_return_pct" name="Avg Return %" fill="#2196f3" />
                    <Bar dataKey="success_rate_pct" name="Success Rate %" fill="#4caf50" />
                  </BarChart>
                </ResponsiveContainer>
                <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Score Bin</TableCell>
                        <TableCell>Trade Type</TableCell>
                        <TableCell>Horizon</TableCell>
                        <TableCell align="right">Count</TableCell>
                        <TableCell align="right">Avg Return</TableCell>
                        <TableCell align="right">Success Rate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {scoreBins.map((b, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Chip label={b.score_bin} size="small" variant="outlined" />
                          </TableCell>
                          <TableCell>{b.trade_type.replace(/_/g, ' ')}</TableCell>
                          <TableCell>{b.horizon}</TableCell>
                          <TableCell align="right">{b.count}</TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" color={returnColor(b.avg_return_pct)}>
                              {b.avg_return_pct > 0 ? '+' : ''}{b.avg_return_pct.toFixed(2)}%
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Chip
                              label={`${b.success_rate_pct.toFixed(1)}%`}
                              size="small"
                              color={b.success_rate_pct >= 50 ? 'success' : 'error'}
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Typography color="text.secondary">No score bin performance data yet.</Typography>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Bottom 5 ARMs (Underperformers)</Typography>
            {bottom5.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ARM</TableCell>
                      <TableCell align="right">Weight</TableCell>
                      <TableCell align="right">Alpha</TableCell>
                      <TableCell align="right">Beta</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bottom5.map((a) => (
                      <TableRow key={a.arm}>
                        <TableCell sx={{ fontSize: 11 }}>{a.arm}</TableCell>
                        <TableCell align="right" sx={{ color: 'error.main' }}>{a.weight.toFixed(4)}</TableCell>
                        <TableCell align="right">{a.alpha.toFixed(3)}</TableCell>
                        <TableCell align="right">{a.beta.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography color="text.secondary">No learning data yet.</Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Total ARMs: {totalArms}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default MLLearningTab;
