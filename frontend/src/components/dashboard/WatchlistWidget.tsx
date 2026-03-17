/**
 * WatchlistWidget
 * ===============
 * Polls GET /api/v2/dashboard/watchlist every 60s.
 * Shows positions within N% of a stop or target trigger — for urgent monitoring.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
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
import { Refresh, WarningAmberOutlined } from '@mui/icons-material';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type { WatchlistItem, WatchlistResponse } from '../../types/apiModels';

const POLL_INTERVAL_MS = 60_000;

const triggerColor = (trigger: string) => {
  if (trigger === 'stop_loss') return '#f44336';
  return '#4caf50';
};

const triggerLabel = (trigger: string) => {
  const map: Record<string, string> = {
    stop_loss: 'Stop',
    target_1: 'T1',
    target_2: 'T2',
    target_3: 'T3',
  };
  return map[trigger] ?? trigger;
};

const distanceChip = (distance: number | null) => {
  if (distance == null) return '—';
  const color = distance < 1 ? '#f44336' : distance < 2 ? '#ff9800' : '#4caf50';
  return (
    <Chip
      label={`${distance.toFixed(1)}%`}
      size="small"
      sx={{
        fontSize: '0.68rem',
        fontWeight: 700,
        height: 20,
        bgcolor: alpha(color, 0.12),
        color,
      }}
    />
  );
};

interface Props {
  proximityThreshold?: number;
}

const WatchlistWidget: React.FC<Props> = ({ proximityThreshold = 2.0 }) => {
  const [data, setData] = useState<WatchlistResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async (force = false) => {
    if (force) setLoading(true);
    try {
      const res = await seedDashboardService.getWatchlist(proximityThreshold);
      setData(res);
    } catch {
      // keep previous data
    } finally {
      setLoading(false);
    }
  }, [proximityThreshold]);

  useEffect(() => {
    fetch();
    const id = setInterval(() => fetch(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetch]);

  const items: WatchlistItem[] = data?.watchlist ?? [];

  return (
    <Paper
      elevation={0}
      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={2}
        py={1.5}
        sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <WarningAmberOutlined sx={{ fontSize: 18, color: items.length > 0 ? 'warning.main' : 'text.disabled' }} />
          <Typography variant="subtitle2" fontWeight={700}>
            Near Triggers
          </Typography>
          {data && (
            <Chip
              label={`within ${data.threshold_pct}%`}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.6rem', height: 18 }}
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

      {items.length === 0 ? (
        <Box textAlign="center" py={3}>
          <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
            {loading ? 'Loading…' : 'No positions near triggers'}
          </Typography>
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: 280 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.68rem' }}>Symbol</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.68rem' }}>Trigger</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.68rem' }}>Distance</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.68rem' }}>Return %</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.68rem' }}>Open (h)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => {
                const tc = triggerColor(item.closest_trigger);
                return (
                  <TableRow key={item.id} hover>
                    <TableCell sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontWeight={600} fontSize="0.75rem">
                        {item.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontSize="0.62rem">
                        {item.trade_type.replace(/_/g, ' ')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 0.5 }}>
                      <Chip
                        label={triggerLabel(item.closest_trigger)}
                        size="small"
                        sx={{
                          fontSize: '0.62rem',
                          height: 18,
                          fontWeight: 700,
                          bgcolor: alpha(tc, 0.12),
                          color: tc,
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      {distanceChip(item.distance_pct)}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      {item.unrealized_return_pct != null ? (
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          fontSize="0.72rem"
                          color={item.unrealized_return_pct >= 0 ? 'success.main' : 'error.main'}
                        >
                          {item.unrealized_return_pct >= 0 ? '+' : ''}
                          {item.unrealized_return_pct.toFixed(2)}%
                        </Typography>
                      ) : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ py: 0.5 }}>
                      <Typography variant="body2" fontSize="0.72rem" color="text.secondary">
                        {item.opened_hours_ago != null ? item.opened_hours_ago.toFixed(1) : '—'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
};

export default WatchlistWidget;
