import React from 'react';
import {
  Card,
  CardContent,
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
import type { ArmPerformanceItem, PerformanceTimelineDay } from '../../types/apiModels';
import { returnColor } from './types';

interface PerformanceTabProps {
  perfTimeline: PerformanceTimelineDay[];
  armPerformance: ArmPerformanceItem[];
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ perfTimeline, armPerformance }) => {
  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Daily P&L Timeline</Typography>
          {perfTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perfTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${v}%`} />
                <RTooltip formatter={(v: number) => `${v.toFixed(2)}%`} />
                <Legend />
                <Bar dataKey="total_return_pct" name="Total Return %" fill="#2196f3" />
                <Bar dataKey="win_rate" name="Win Rate %" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary">No closed trades in this period.</Typography>
          )}
        </CardContent>
      </Card>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>ARM Performance (Top 15)</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ARM Strategy</TableCell>
                  <TableCell align="right">Trades</TableCell>
                  <TableCell align="right">Wins</TableCell>
                  <TableCell align="right">Win Rate</TableCell>
                  <TableCell align="right">Avg Return</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {armPerformance.slice(0, 15).map((a) => (
                  <TableRow key={a.arm}>
                    <TableCell sx={{ fontSize: 12 }}>{a.arm}</TableCell>
                    <TableCell align="right">{a.total}</TableCell>
                    <TableCell align="right">{a.wins}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${a.win_rate}%`}
                        size="small"
                        color={a.win_rate >= 50 ? 'success' : 'error'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={returnColor(a.avg_return_pct)}>
                        {a.avg_return_pct > 0 ? '+' : ''}{a.avg_return_pct}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {armPerformance.length === 0 && (
                  <TableRow><TableCell colSpan={5} align="center">No ARM data</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </>
  );
};

export default PerformanceTab;
