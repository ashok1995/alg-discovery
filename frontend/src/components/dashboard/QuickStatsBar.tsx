/**
 * QuickStatsBar
 * =============
 * Polls GET /api/v2/monitor/quick-stats every 15 seconds.
 * Displays: open positions, lifetime win rate, market status, system status.
 * Also subscribes to Seed WebSocket so the open-positions count updates live.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  Divider,
  Skeleton,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  Circle,
  Speed,
} from '@mui/icons-material';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type { QuickStatsResponse } from '../../types/apiModels';
import { useSeedWebSocket } from '../../hooks/useSeedWebSocket';

const POLL_INTERVAL_MS = 15_000;

const MarketChip: React.FC<{ status: string }> = ({ status }) => {
  const isOpen = status === 'open';
  return (
    <Chip
      icon={<Circle sx={{ fontSize: '8px !important' }} />}
      label={isOpen ? 'Market Open' : 'Market Closed'}
      size="small"
      sx={{
        fontWeight: 700,
        fontSize: '0.7rem',
        height: 22,
        bgcolor: isOpen ? alpha('#4caf50', 0.12) : alpha('#9e9e9e', 0.12),
        color: isOpen ? 'success.dark' : 'text.secondary',
        '& .MuiChip-icon': { color: isOpen ? '#4caf50' : '#9e9e9e' },
      }}
    />
  );
};

const SystemChip: React.FC<{ status: string }> = ({ status }) => {
  const isActive = status === 'active';
  return (
    <Chip
      icon={<Speed sx={{ fontSize: '12px !important' }} />}
      label={isActive ? 'Active' : 'Inactive'}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: '0.7rem',
        height: 22,
        bgcolor: isActive ? alpha('#1976d2', 0.1) : alpha('#ff9800', 0.1),
        color: isActive ? 'primary.main' : 'warning.dark',
        '& .MuiChip-icon': { color: isActive ? '#1976d2' : '#ff9800' },
      }}
    />
  );
};

const StatItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <Box display="flex" flexDirection="column" alignItems="center" px={1.5}>
    <Typography variant="caption" color="text.secondary" fontWeight={500} fontSize="0.6rem" textTransform="uppercase" letterSpacing={0.4}>
      {label}
    </Typography>
    <Box mt={0.2}>{value}</Box>
  </Box>
);

const QuickStatsBar: React.FC = () => {
  const [stats, setStats] = useState<QuickStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const { positionsData, connected } = useSeedWebSocket();

  const fetch = async () => {
    try {
      const data = await seedDashboardService.getQuickStats();
      setStats(data);
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  // Override open_positions from live WS when available
  const openPositions = positionsData?.open_positions?.count ?? stats?.open_positions ?? null;
  const winRate = stats?.lifetime_win_rate_pct ?? null;
  const marketStatus = stats?.market_status ?? '';
  const systemStatus = stats?.system_status ?? '';

  if (loading && !stats) {
    return (
      <Box display="flex" gap={2} alignItems="center" px={1}>
        {[80, 100, 90, 90].map((w, i) => (
          <Skeleton key={i} variant="rounded" width={w} height={22} />
        ))}
      </Box>
    );
  }

  return (
    <Tooltip
      title={connected ? 'Live — WebSocket connected' : `Last polled: ${stats?.generated_at ? new Date(stats.generated_at).toLocaleTimeString('en-IN') : '—'}`}
      arrow
    >
      <Box
        display="flex"
        alignItems="center"
        gap={0}
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          py: 0.5,
          px: 0.5,
        }}
      >
        <StatItem
          label="Open Positions"
          value={
            <Box display="flex" alignItems="center" gap={0.5}>
              {connected && (
                <Circle sx={{ fontSize: 7, color: '#4caf50', animation: 'pulse 2s infinite' }} />
              )}
              <Typography variant="subtitle2" fontWeight={800} color="primary.main" fontSize="0.85rem">
                {openPositions ?? '—'}
              </Typography>
            </Box>
          }
        />
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <StatItem
          label="Lifetime Win Rate"
          value={
            <Box display="flex" alignItems="center" gap={0.4}>
              <TrendingUp sx={{ fontSize: 14, color: (winRate ?? 0) >= 50 ? '#4caf50' : '#f44336' }} />
              <Typography
                variant="subtitle2"
                fontWeight={800}
                fontSize="0.85rem"
                color={(winRate ?? 0) >= 50 ? 'success.main' : 'error.main'}
              >
                {winRate != null ? `${winRate.toFixed(0)}%` : '—'}
              </Typography>
            </Box>
          }
        />
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Box px={1}>{marketStatus && <MarketChip status={marketStatus} />}</Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
        <Box px={1}>{systemStatus && <SystemChip status={systemStatus} />}</Box>
      </Box>
    </Tooltip>
  );
};

export default QuickStatsBar;
