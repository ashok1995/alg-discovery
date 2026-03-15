import React from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  alpha,
} from '@mui/material';
import {
  AccountBalance,
  TrendingUp,
  TrendingDown,
  Receipt,
  Timeline,
} from '@mui/icons-material';
import type { CapitalSummaryResponse, PnlTimelineDay } from '../../types/apiModels';

interface CapitalPnlTabProps {
  capitalSummary: CapitalSummaryResponse | null;
  pnlTimeline: PnlTimelineDay[];
}

const formatCurrency = (v: number): string => {
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const CapitalPnlTab: React.FC<CapitalPnlTabProps> = ({ capitalSummary, pnlTimeline }) => {
  const cs = capitalSummary;

  return (
    <Box>
      {/* Capital Summary Cards */}
      {cs && (
        <>
          <Typography variant="h6" fontWeight={600} mb={2}>Capital & Deployment</Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                  <AccountBalance sx={{ fontSize: 28, color: 'primary.main', mb: 0.5 }} />
                  <Typography variant="h5" fontWeight={700}>
                    {formatCurrency(cs.capital_per_stock)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Per Stock Capital</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                  <TrendingUp sx={{ fontSize: 28, color: 'info.main', mb: 0.5 }} />
                  <Typography variant="h5" fontWeight={700}>{cs.open_positions}</Typography>
                  <Typography variant="caption" color="text.secondary">Open Positions</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                  <Box sx={{ mb: 0.5 }}>
                    {cs.total_net_pnl >= 0
                      ? <TrendingUp sx={{ fontSize: 28, color: 'success.main' }} />
                      : <TrendingDown sx={{ fontSize: 28, color: 'error.main' }} />}
                  </Box>
                  <Typography
                    variant="h5"
                    fontWeight={700}
                    color={cs.total_net_pnl >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(cs.total_net_pnl)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Net P&L ({cs.period_days}d)</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                  <Receipt sx={{ fontSize: 28, color: 'warning.main', mb: 0.5 }} />
                  <Typography variant="h5" fontWeight={700}>
                    {formatCurrency(cs.total_charges)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">Total Charges</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Score Allocation Tiers */}
          <Card sx={{ border: '1px solid', borderColor: 'divider', mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} mb={1.5}>Score Allocation Tiers</Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                {cs.score_allocation_tiers.map((tier) => (
                  <Chip
                    key={tier.min_score}
                    label={`Score ≥${tier.min_score}: ${(tier.fraction * 100).toFixed(0)}% allocation`}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      bgcolor: alpha(
                        tier.min_score >= 90 ? '#4caf50' : tier.min_score >= 80 ? '#8bc34a' : tier.min_score >= 70 ? '#ff9800' : '#ff5722',
                        0.12,
                      ),
                      color: tier.min_score >= 90 ? 'success.dark' : tier.min_score >= 80 ? '#558b2f' : tier.min_score >= 70 ? 'warning.dark' : 'error.dark',
                    }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          <Divider sx={{ mb: 3 }} />
        </>
      )}

      {/* P&L Timeline */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Timeline sx={{ color: 'primary.main' }} />
        <Typography variant="h6" fontWeight={600}>P&L Timeline</Typography>
      </Box>

      {pnlTimeline.length > 0 ? (
        <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Gross P&L</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Charges</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Net P&L</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>Positions Closed</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pnlTimeline.map((day) => (
                <TableRow key={day.date} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600} color={day.gross_pnl >= 0 ? 'success.main' : 'error.main'}>
                      {formatCurrency(day.gross_pnl)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">{formatCurrency(day.charges)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={formatCurrency(day.net_pnl)}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: day.net_pnl >= 0 ? alpha('#4caf50', 0.12) : alpha('#f44336', 0.12),
                        color: day.net_pnl >= 0 ? 'success.dark' : 'error.dark',
                      }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">{day.positions_closed}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">No P&L data available for this period</Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default CapitalPnlTab;
