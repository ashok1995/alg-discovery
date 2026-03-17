/**
 * LivePositionsTab
 * ================
 * Shows all open positions from GET /api/v2/monitor/live-positions.
 * Each row shows entry price, current price, stop/target, and proximity bars.
 * Auto-refreshes every 30s while market open; 60s otherwise.
 * Also embeds the WatchlistWidget (positions near triggers).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { Refresh, FiberManualRecord } from '@mui/icons-material';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type { LivePositionItem, LivePositionsResponse } from '../../types/apiModels';
import WatchlistWidget from './WatchlistWidget';
import { useSeedWebSocket } from '../../hooks/useSeedWebSocket';

const ProximityBar: React.FC<{ value: number | null; type: 'stop' | 'target' }> = ({ value, type }) => {
  if (value == null || value >= 100) {
    return <Typography variant="caption" color="text.disabled" fontSize="0.65rem">No price</Typography>;
  }
  // value is the % distance from current price to trigger (lower = closer to trigger)
  const filled = Math.max(0, Math.min(100, 100 - value));
  const stopColor = filled > 80 ? '#f44336' : filled > 50 ? '#ff9800' : '#4caf50';
  const targetColor = filled > 80 ? '#4caf50' : filled > 50 ? '#1976d2' : '#9e9e9e';
  const color = type === 'stop' ? stopColor : targetColor;
  return (
    <Tooltip title={`${value.toFixed(1)}% away from ${type === 'stop' ? 'stop' : 'target'}`} arrow>
      <Box width={72}>
        <LinearProgress
          variant="determinate"
          value={filled}
          sx={{
            height: 5,
            borderRadius: 3,
            bgcolor: alpha(color, 0.15),
            '& .MuiLinearProgress-bar': { bgcolor: color },
          }}
        />
        <Typography variant="caption" fontSize="0.6rem" color="text.secondary">
          {value.toFixed(1)}% away
        </Typography>
      </Box>
    </Tooltip>
  );
};

const ReturnCell: React.FC<{ val: number | null }> = ({ val }) => {
  if (val == null) return <Typography variant="body2" color="text.disabled" fontSize="0.72rem">—</Typography>;
  return (
    <Typography
      variant="body2"
      fontWeight={700}
      fontSize="0.76rem"
      color={val > 0 ? 'success.main' : val < 0 ? 'error.main' : 'text.secondary'}
    >
      {val > 0 ? '+' : ''}{val.toFixed(2)}%
    </Typography>
  );
};

const TRADE_TYPE_SHORT: Record<string, string> = {
  intraday_buy: 'ID Buy',
  intraday_sell: 'ID Sell',
  short_buy: 'Short',
  swing_buy: 'Swing',
  long_term: 'Long',
};

const LivePositionsTable: React.FC<{ positions: LivePositionItem[] }> = ({ positions }) => (
  <TableContainer sx={{ maxHeight: 480 }}>
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Symbol</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Type</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Entry</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>LTP</TableCell>
          <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Return %</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>→ Stop</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>→ Target</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>Score</TableCell>
          <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem' }}>ARM</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {positions.map((p, i) => (
          <TableRow key={p.id ?? `${p.symbol}-${i}`} hover sx={{ bgcolor: alpha('#1976d2', 0.015) }}>
            <TableCell sx={{ py: 0.5 }}>
              <Typography variant="body2" fontWeight={700} fontSize="0.78rem">{p.symbol}</Typography>
            </TableCell>
            <TableCell sx={{ py: 0.5 }}>
              <Chip
                label={TRADE_TYPE_SHORT[p.trade_type ?? ''] ?? (p.trade_type ?? '—')}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.58rem', height: 18, fontWeight: 600 }}
              />
            </TableCell>
            <TableCell align="right" sx={{ py: 0.5 }}>
              <Typography variant="body2" fontSize="0.75rem">
                {p.entry_price != null ? `₹${p.entry_price.toFixed(2)}` : '—'}
              </Typography>
            </TableCell>
            <TableCell align="right" sx={{ py: 0.5 }}>
              {p.current_price != null ? (
                <Typography variant="body2" fontWeight={600} fontSize="0.75rem" color="primary.main">
                  ₹{p.current_price.toFixed(2)}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.disabled" fontSize="0.72rem">—</Typography>
              )}
            </TableCell>
            <TableCell align="right" sx={{ py: 0.5 }}>
              <ReturnCell val={p.unrealized_return_pct} />
            </TableCell>
            <TableCell sx={{ py: 0.5 }}>
              <ProximityBar value={p.distance_to_stop_pct ?? p.proximity_pct ?? null} type="stop" />
            </TableCell>
            <TableCell sx={{ py: 0.5 }}>
              <ProximityBar value={p.distance_to_target1_pct ?? null} type="target" />
            </TableCell>
            <TableCell sx={{ py: 0.5 }}>
              {p.score_bin ? (
                <Chip
                  label={p.score_bin.replace('_', '-')}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: '0.58rem',
                    height: 18,
                    fontWeight: 600,
                    borderColor: p.score_bin === '80_100' ? '#4caf50' : '#ff9800',
                    color: p.score_bin === '80_100' ? '#4caf50' : '#ff9800',
                  }}
                />
              ) : '—'}
            </TableCell>
            <TableCell sx={{ py: 0.5 }}>
              {p.source_arm ? (
                <Tooltip title={p.source_arm} arrow>
                  <Chip
                    label={p.source_arm.length > 10 ? p.source_arm.slice(0, 10) + '…' : p.source_arm}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.58rem', height: 18 }}
                  />
                </Tooltip>
              ) : '—'}
            </TableCell>
          </TableRow>
        ))}
        {positions.length === 0 && (
          <TableRow>
            <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
              <Typography color="text.secondary">No open positions</Typography>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const LivePositionsTab: React.FC = () => {
  const [data, setData] = useState<LivePositionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { positionsData, connected } = useSeedWebSocket();

  const fetch = useCallback(async (force = false) => {
    if (force) setLoading(true);
    try {
      const res = await seedDashboardService.getLivePositions(0);
      setData(res);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const isOpen = data?.market_status === 'open';
    const interval = isOpen ? 30_000 : 60_000;
    const id = setInterval(() => fetch(), interval);
    return () => clearInterval(id);
  }, [fetch, data?.market_status]);

  const openPositions = data?.open_positions?.positions ?? [];
  const recentClosed = data?.recent_closed?.positions ?? [];
  const totalUnrealized = data?.open_positions?.total_unrealized ?? null;
  const wsCount = positionsData?.open_positions?.count;

  return (
    <Grid container spacing={2}>
      {/* Open positions table */}
      <Grid item xs={12} md={8}>
        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            px={2}
            py={1.5}
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <FiberManualRecord sx={{ fontSize: 10, color: data?.market_status === 'open' ? '#4caf50' : '#9e9e9e' }} />
              <Typography variant="subtitle1" fontWeight={700}>Live Positions</Typography>
              <Chip
                label={`${wsCount ?? openPositions.length} open`}
                size="small"
                color="primary"
                sx={{ fontWeight: 700, fontSize: '0.7rem', height: 20 }}
              />
              {totalUnrealized != null && (
                <Chip
                  label={`${totalUnrealized >= 0 ? '+' : ''}${totalUnrealized.toFixed(2)}% total`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    height: 20,
                    bgcolor: alpha(totalUnrealized >= 0 ? '#4caf50' : '#f44336', 0.1),
                    color: totalUnrealized >= 0 ? 'success.dark' : 'error.dark',
                  }}
                />
              )}
              {connected && (
                <Chip
                  label="Live"
                  size="small"
                  sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha('#4caf50', 0.1), color: 'success.dark' }}
                />
              )}
            </Box>
            <Box display="flex" alignItems="center" gap={0.5}>
              {loading && <CircularProgress size={14} />}
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={() => fetch(true)}>
                  <Refresh fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <LivePositionsTable positions={openPositions} />

          {/* Recently closed section */}
          {recentClosed.length > 0 && (
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                Recently Closed ({recentClosed.length})
              </Typography>
              <LivePositionsTable positions={recentClosed} />
            </Box>
          )}
        </Paper>
      </Grid>

      {/* Watchlist sidebar */}
      <Grid item xs={12} md={4}>
        <WatchlistWidget proximityThreshold={2.0} />
      </Grid>
    </Grid>
  );
};

export default LivePositionsTab;
