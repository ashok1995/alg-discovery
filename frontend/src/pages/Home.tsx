import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Card,
  CardContent,
  Skeleton,
  Collapse,
  IconButton,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Inventory,
  FiberManualRecord,
  ExpandMore,
  ExpandLess,
  Speed,
  Timer,
} from '@mui/icons-material';
import { seedDashboardService } from '../services/SeedDashboardService';
import type { DashboardDailySummary, PositionsSummaryResponse } from '../types/apiModels';
import { InternalMarketContextCard } from '../components/InternalMarketContextCard';
import HomeMarketMoversTab from '../components/home/HomeMarketMoversTab';

interface HorizonSummary {
  label: string;
  tradeType: string;
  color: string;
  icon: React.ReactNode;
  summary: PositionsSummaryResponse | null;
  loading: boolean;
}

const Home: React.FC = () => {
  const [liveSummary, setLiveSummary] = useState<DashboardDailySummary | null>(null);
  const [loadingSeed, setLoadingSeed] = useState(true);
  const [moversOpen, setMoversOpen] = useState(true);
  const [horizons, setHorizons] = useState<HorizonSummary[]>([
    { label: 'Intraday Buy', tradeType: 'intraday_buy', color: '#4caf50', icon: <TrendingUp />, summary: null, loading: true },
    { label: 'Intraday Sell', tradeType: 'intraday_sell', color: '#f44336', icon: <TrendingDown />, summary: null, loading: true },
    { label: 'Short', tradeType: 'short_buy', color: '#e91e63', icon: <Speed />, summary: null, loading: true },
    { label: 'Swing', tradeType: 'swing_buy', color: '#ff9800', icon: <SwapHoriz />, summary: null, loading: true },
    { label: 'Long Term', tradeType: 'long_term', color: '#2196f3', icon: <Timer />, summary: null, loading: true },
  ]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await seedDashboardService.getDailySummary(1);
      setLiveSummary(res);
    } catch { /* silent */ } finally { setLoadingSeed(false); }
  }, []);

  const fetchHorizons = useCallback(async () => {
    const types = ['intraday_buy', 'intraday_sell', 'short_buy', 'swing_buy', 'long_term'];
    const results = await Promise.allSettled(
      types.map((tt) => seedDashboardService.getPositions({ trade_type: tt, days: 30, limit: 1 }))
    );
    setHorizons((prev) =>
      prev.map((h, i) => {
        const r = results[i];
        return {
          ...h,
          summary: r.status === 'fulfilled' ? r.value.summary : null,
          loading: false,
        };
      })
    );
  }, []);

  useEffect(() => {
    fetchSummary();
    fetchHorizons();
    const iv = setInterval(fetchSummary, 60_000);
    return () => clearInterval(iv);
  }, [fetchSummary, fetchHorizons]);

  const regime = liveSummary?.market_context?.market_regime;
  const pos = liveSummary?.positions;
  const universe = liveSummary?.universe;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={800} color="#1a1a2e">Trading Command Center</Typography>
          <Typography variant="body2" color="text.secondary">Market conditions, P&L summary, and horizon overview</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Chip
            label={regime ? `Market: ${regime}` : 'Loading...'}
            color={regime === 'bullish' ? 'success' : regime === 'bearish' ? 'error' : 'warning'}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          {liveSummary?.generated_at && (
            <Typography variant="caption" color="text.secondary">
              {new Date(liveSummary.generated_at).toLocaleTimeString('en-IN')}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Market Context — full India + Global with trends */}
      <InternalMarketContextCard />

      {/* P&L Summary Strip */}
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
        <CardContent sx={{ py: 1.5, px: 2.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} fontSize="0.62rem">
            Today's P&L Summary
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {loadingSeed ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Grid item xs={4} sm={2} key={i}><Skeleton height={44} /></Grid>
              ))
            ) : (
              <>
                <Grid item xs={4} sm={2}>
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={800} color="primary.main">{pos?.total ?? 0}</Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.62rem">Total Positions</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={800} color="#1976d2">{pos?.open ?? 0}</Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.62rem">Open</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={800}>{pos?.closed ?? 0}</Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.62rem">Closed</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={800} color={(pos?.win_rate ?? 0) >= 50 ? '#4caf50' : '#f44336'}>
                      {pos?.win_rate != null ? `${pos.win_rate.toFixed(0)}%` : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.62rem">Win Rate</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={800} color={(pos?.avg_return_pct ?? 0) >= 0 ? '#4caf50' : '#f44336'}>
                      {pos?.avg_return_pct != null ? `${pos.avg_return_pct > 0 ? '+' : ''}${pos.avg_return_pct.toFixed(1)}%` : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.62rem">Avg Return</Typography>
                  </Box>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <Box textAlign="center">
                    <Typography variant="h5" fontWeight={800} color="#f44336">{pos?.stops ?? 0}</Typography>
                    <Typography variant="caption" color="text.secondary" fontSize="0.62rem">Stops Hit</Typography>
                  </Box>
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Horizon Summary Cards — all 5 trade types */}
      <Box>
        <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} fontSize="0.62rem" sx={{ mb: 1, display: 'block' }}>
          Position Summary by Trade Type (30 days)
        </Typography>
        <Grid container spacing={1.5}>
          {horizons.map((h) => {
            const s = h.summary;
            const durationLabel = s?.avg_duration_hours != null && s.avg_duration_hours >= 1
              ? `${s.avg_duration_hours.toFixed(1)}h`
              : s?.avg_duration_min != null
                ? `${s.avg_duration_min.toFixed(0)}m`
                : '—';
            return (
              <Grid item xs={6} sm={4} md key={h.tradeType}>
                <Card
                  elevation={0}
                  sx={{
                    border: '2px solid',
                    borderColor: alpha(h.color, 0.15),
                    borderRadius: 2.5,
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: h.color, boxShadow: 2 },
                  }}
                >
                  <CardContent sx={{ py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
                    {/* Header */}
                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                      <Box sx={{ color: h.color, display: 'flex', fontSize: 16 }}>{h.icon}</Box>
                      <Typography variant="caption" fontWeight={800} fontSize="0.7rem">{h.label}</Typography>
                      {!h.loading && s && (
                        <Chip
                          label={`${s.open} open`}
                          size="small"
                          sx={{ ml: 'auto', height: 18, fontSize: '0.55rem', fontWeight: 700, bgcolor: alpha(h.color, 0.1), color: h.color }}
                        />
                      )}
                    </Box>
                    {h.loading ? (
                      <Skeleton height={60} />
                    ) : s ? (
                      <>
                        {/* KPI row */}
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                          <Box textAlign="center" flex={1}>
                            <Typography variant="subtitle2" fontWeight={800}>{s.total}</Typography>
                            <Typography variant="caption" color="text.secondary" fontSize="0.5rem">Total</Typography>
                          </Box>
                          <Box textAlign="center" flex={1}>
                            <Typography variant="subtitle2" fontWeight={800} color={(s.win_rate_pct ?? 0) >= 50 ? '#4caf50' : '#f44336'}>
                              {s.win_rate_pct != null ? `${s.win_rate_pct.toFixed(0)}%` : '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontSize="0.5rem">Win</Typography>
                          </Box>
                          <Box textAlign="center" flex={1}>
                            <Typography variant="subtitle2" fontWeight={800} color={(s.avg_return_pct ?? 0) >= 0 ? '#4caf50' : '#f44336'}>
                              {s.avg_return_pct != null ? `${s.avg_return_pct.toFixed(1)}%` : '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontSize="0.5rem">Avg Ret</Typography>
                          </Box>
                        </Box>
                        {/* Duration + Best/Worst chips */}
                        <Box display="flex" gap={0.4} flexWrap="wrap" justifyContent="center">
                          <Chip label={`Avg: ${durationLabel}`} size="small" sx={{ height: 16, fontSize: '0.52rem', fontWeight: 600 }} />
                          {s.best_return_pct != null && (
                            <Chip icon={<FiberManualRecord sx={{ fontSize: 5 }} />} label={`${s.best_return_pct.toFixed(1)}%`} size="small" sx={{ height: 16, fontSize: '0.52rem', fontWeight: 600, '& .MuiChip-icon': { color: '#4caf50' } }} />
                          )}
                          {s.worst_return_pct != null && (
                            <Chip icon={<FiberManualRecord sx={{ fontSize: 5 }} />} label={`${s.worst_return_pct.toFixed(1)}%`} size="small" sx={{ height: 16, fontSize: '0.52rem', fontWeight: 600, '& .MuiChip-icon': { color: '#f44336' } }} />
                          )}
                          {s.arm_distribution && Object.keys(s.arm_distribution).length > 0 && (
                            <Chip label={`ARM: ${Object.keys(s.arm_distribution).join(', ')}`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.52rem', fontWeight: 600 }} />
                          )}
                        </Box>
                      </>
                    ) : (
                      <Typography color="text.secondary" variant="caption">No data</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Box>

      {/* Market Movers — collapsible */}
      <Box>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          onClick={() => setMoversOpen((p) => !p)}
          sx={{
            cursor: 'pointer',
            py: 1,
            px: 2,
            bgcolor: alpha('#1976d2', 0.03),
            borderRadius: moversOpen ? '12px 12px 0 0' : 3,
            border: '1px solid',
            borderColor: 'divider',
            borderBottom: moversOpen ? 'none' : undefined,
            transition: 'all 0.2s',
            '&:hover': { bgcolor: alpha('#1976d2', 0.06) },
          }}
        >
          <Typography variant="subtitle2" fontWeight={700}>Market Movers</Typography>
          <IconButton size="small">{moversOpen ? <ExpandLess /> : <ExpandMore />}</IconButton>
        </Box>
        <Collapse in={moversOpen}>
          <Box sx={{ border: '1px solid', borderColor: 'divider', borderTop: 'none', borderRadius: '0 0 12px 12px', p: 2 }}>
            <HomeMarketMoversTab />
          </Box>
        </Collapse>
      </Box>

      {/* Universe Health Strip */}
      {universe && (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <CardContent sx={{ py: 1.5, px: 2.5, '&:last-child': { pb: 1.5 } }}>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Inventory sx={{ fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} fontSize="0.62rem">
                Stock Universe
              </Typography>
            </Box>
            <Box display="flex" gap={1.5} flexWrap="wrap">
              {Object.entries(universe).map(([type, count]) => (
                <Chip
                  key={type}
                  label={`${type.replace(/_/g, ' ')}: ${count}`}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    textTransform: 'capitalize',
                    bgcolor: alpha('#1976d2', 0.06),
                  }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default Home;
