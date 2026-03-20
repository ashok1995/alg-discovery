import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Refresh, Hub, ExpandMore } from '@mui/icons-material';
import DashboardKpiCards from '../components/dashboard/DashboardKpiCards';
import QuickStatsBar from '../components/dashboard/QuickStatsBar';
import SystemAlertsWidget from '../components/dashboard/SystemAlertsWidget';
import SeedAllEndpointsTab from '../components/dashboard/SeedAllEndpointsTab';
import { seedDashboardService } from '../services/SeedDashboardService';
import type { DashboardDailySummary, PositionsResponse } from '../types/apiModels';

/**
 * Seed Dashboard — summary only: KPIs, quick stats, and API tools.
 * Deep views live under dedicated pages (Positions, Investing, Learning, Universe, etc.).
 */
const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const [summary, setSummary] = useState<DashboardDailySummary | null>(null);
  const [kpiWinRate, setKpiWinRate] = useState<number | null>(null);
  const [kpiAvgReturn, setKpiAvgReturn] = useState<number | null>(null);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        sumRes,
        intradayBuyRes,
        intradaySellRes,
        shortRes,
        swingRes,
        longTermRes,
      ] = await Promise.allSettled([
        seedDashboardService.getDailySummary(days),
        seedDashboardService.getPositions({ trade_type: 'intraday_buy', days, limit: 1 }),
        seedDashboardService.getPositions({ trade_type: 'intraday_sell', days, limit: 1 }),
        seedDashboardService.getPositions({ trade_type: 'short_buy', days, limit: 1 }),
        seedDashboardService.getPositions({ trade_type: 'swing_buy', days, limit: 1 }),
        seedDashboardService.getPositions({ trade_type: 'long_term', days, limit: 1 }),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);

      const horizonSummaries = [intradayBuyRes, intradaySellRes, shortRes, swingRes, longTermRes]
        .filter((r): r is PromiseFulfilledResult<PositionsResponse> => r.status === 'fulfilled')
        .map((r) => r.value.summary);
      if (horizonSummaries.length > 0) {
        const totalWeight = horizonSummaries.reduce((acc, s) => acc + (s.total || 0), 0);
        if (totalWeight > 0) {
          const weightedWin = horizonSummaries.reduce((acc, s) => acc + ((s.win_rate_pct ?? 0) * (s.total || 0)), 0) / totalWeight;
          const weightedAvgReturn = horizonSummaries.reduce((acc, s) => acc + ((s.avg_return_pct ?? 0) * (s.total || 0)), 0) / totalWeight;
          setKpiWinRate(weightedWin);
          setKpiAvgReturn(weightedAvgReturn);
        }
      }

      if (sumRes.status === 'rejected') {
        setError('Dashboard summary failed. Is seed-stocks-service running?');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void fetchSummary();
    const interval = setInterval(() => void fetchSummary(), 60000);
    return () => clearInterval(interval);
  }, [fetchSummary]);

  if (loading && !summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.02em' }}>
            Seed Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Summary cards and system pulse. Open dedicated pages for deep-dive analysis.
          </Typography>
        </Box>
        <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
          <QuickStatsBar />
          <SystemAlertsWidget />
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Period</InputLabel>
            <Select value={days} label="Period" onChange={(e) => setDays(Number(e.target.value))}>
              <MenuItem value={1}>1 day</MenuItem>
              <MenuItem value={3}>3 days</MenuItem>
              <MenuItem value={7}>7 days</MenuItem>
              <MenuItem value={14}>14 days</MenuItem>
              <MenuItem value={30}>30 days</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={() => void fetchSummary()} color="primary" sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}
      {error && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {summary && (
        <DashboardKpiCards
          summary={summary}
          winRateOverride={kpiWinRate}
          avgReturnOverride={kpiAvgReturn}
          winRateScopeLabel={`${days}-day weighted across trade types`}
        />
      )}

      <Accordion defaultExpanded={false} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2, minHeight: 48 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Hub fontSize="small" color="action" />
            <Typography fontWeight={700}>Seed API tools (advanced)</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ px: 2, pt: 0, borderTop: '1px solid', borderColor: 'divider' }}>
          <SeedAllEndpointsTab />
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default Dashboard;
