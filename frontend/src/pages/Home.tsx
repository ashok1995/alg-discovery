/**
 * Home — summary only (no embedded Market Movers; those live on /seed-dashboard and /market-movers).
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Card,
  CardContent,
  Skeleton,
  alpha,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Link,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  SwapHoriz,
  Inventory,
  FiberManualRecord,
  Speed,
  Timer,
} from '@mui/icons-material';
import { seedDashboardService } from '../services/SeedDashboardService';
import type { DashboardDailySummary, PositionsSummaryResponse } from '../types/apiModels';
import { InternalMarketContextCard } from '../components/InternalMarketContextCard';
import { positionsSummaryIsPresent } from '../utils/positionDisplayUtils';

interface HorizonSummary {
  label: string;
  tradeType: string;
  color: string;
  icon: React.ReactNode;
  summary: PositionsSummaryResponse | null;
  loading: boolean;
}

const SUMMARY_DAYS_MIN = 1;
const SUMMARY_DAYS_MAX = 90;
const SCENARIO_OPTIONS = [
  { value: 'all', label: 'All Scenarios' },
  { value: 'paper_trade', label: 'Paper Trading' },
  { value: 'learning', label: 'Learning' },
] as const;

type ScenarioValue = (typeof SCENARIO_OPTIONS)[number]['value'];

function scenarioQuery(scenario: ScenarioValue): { category?: 'paper_trade' | 'learning'; scenario?: 'paper_trade' | 'learning' } {
  if (scenario === 'all') return {};
  return { category: scenario, scenario };
}

const Home: React.FC = () => {
  /** Align with Positions page default window so totals are comparable */
  const [summaryDays, setSummaryDays] = useState(30);
  const [scenario, setScenario] = useState<ScenarioValue>('all');
  const [liveSummary, setLiveSummary] = useState<DashboardDailySummary | null>(null);
  const [positionsSummary, setPositionsSummary] = useState<PositionsSummaryResponse | null>(null);
  /** When scenario is "all", split counts (paper vs learning) for transparency */
  const [scenarioSplit, setScenarioSplit] = useState<{ paper: number; learning: number } | null>(null);
  const [loadingSeed, setLoadingSeed] = useState(true);
  const [horizons, setHorizons] = useState<HorizonSummary[]>([
    { label: 'Intraday Buy', tradeType: 'intraday_buy', color: '#4caf50', icon: <TrendingUp />, summary: null, loading: true },
    { label: 'Intraday Sell', tradeType: 'intraday_sell', color: '#f44336', icon: <TrendingDown />, summary: null, loading: true },
    { label: 'Short', tradeType: 'short_buy', color: '#e91e63', icon: <Speed />, summary: null, loading: true },
    { label: 'Swing', tradeType: 'swing_buy', color: '#ff9800', icon: <SwapHoriz />, summary: null, loading: true },
    { label: 'Long Term', tradeType: 'long_term', color: '#2196f3', icon: <Timer />, summary: null, loading: true },
  ]);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await seedDashboardService.getDailySummary(summaryDays);
      setLiveSummary(res);
    } catch { /* silent */ } finally { setLoadingSeed(false); }
  }, [summaryDays]);

  const fetchPositionsSummary = useCallback(async () => {
    try {
      const res = await seedDashboardService.getPositions({
        ...scenarioQuery(scenario),
        days: summaryDays,
        limit: 0,
      });
      setPositionsSummary(res.summary ?? null);

      if (scenario === 'all') {
        const [paper, learning] = await Promise.allSettled([
          seedDashboardService.getPositions({
            category: 'paper_trade',
            scenario: 'paper_trade',
            days: summaryDays,
            limit: 0,
          }),
          seedDashboardService.getPositions({
            category: 'learning',
            scenario: 'learning',
            days: summaryDays,
            limit: 0,
          }),
        ]);
        let ptot = 0;
        let ltot = 0;
        if (paper.status === 'fulfilled' && positionsSummaryIsPresent(paper.value.summary)) {
          ptot = paper.value.summary.total;
        }
        if (learning.status === 'fulfilled' && positionsSummaryIsPresent(learning.value.summary)) {
          ltot = learning.value.summary.total;
        }
        setScenarioSplit({ paper: ptot, learning: ltot });
      } else {
        setScenarioSplit(null);
      }
    } catch {
      setPositionsSummary(null);
      setScenarioSplit(null);
    }
  }, [scenario, summaryDays]);

  const fetchHorizons = useCallback(async () => {
    const types = ['intraday_buy', 'intraday_sell', 'short_buy', 'swing_buy', 'long_term'];
    const results = await Promise.allSettled(
      types.map((tt) => seedDashboardService.getPositions({
        ...scenarioQuery(scenario),
        trade_type: tt,
        days: summaryDays,
        limit: 0,
      }))
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
  }, [scenario, summaryDays]);

  useEffect(() => {
    setLoadingSeed(true);
    setHorizons((prev) => prev.map((h) => ({ ...h, loading: true })));
    fetchSummary();
    fetchPositionsSummary();
    fetchHorizons();
  }, [fetchSummary, fetchHorizons, fetchPositionsSummary]);

  useEffect(() => {
    const iv = setInterval(fetchSummary, 60_000);
    return () => clearInterval(iv);
  }, [fetchSummary]);

  const regime = liveSummary?.market_context?.market_regime;
  const pos = positionsSummary;
  const universe = liveSummary?.universe;
  const stopsCount = pos?.outcome_distribution?.stop ?? 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pb: 4, background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: '100%', p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5" fontWeight={800} color="#1a1a2e">Trading Command Center</Typography>
          <Typography variant="body2" color="text.secondary">Summary only — market context, P&amp;L, horizons; use Dashboard for movers, other pages for detail</Typography>
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
          <Box display="flex" justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} gap={1.5} flexDirection={{ xs: 'column', md: 'row' }}>
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} fontSize="0.62rem">
                P&amp;L Summary
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                {summaryDays} day{summaryDays !== 1 ? 's' : ''} · {SCENARIO_OPTIONS.find((option) => option.value === scenario)?.label}
                {scenario === 'all' && scenarioSplit != null && (
                  <> · Paper {scenarioSplit.paper} · Learning {scenarioSplit.learning}</>
                )}
              </Typography>
              {scenario === 'all' && (
                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.25 }}>
                  &quot;All scenarios&quot; sums paper + learning. Use the scenario filter or{' '}
                  <Box component={RouterLink} to="/positions" sx={{ color: 'primary.main', fontWeight: 600 }}>Positions</Box>
                  {' '}for a single lane.
                </Typography>
              )}
            </Box>
            <Box display="flex" gap={1.25} flexWrap="wrap" justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <FormControl size="small" sx={{ minWidth: 168 }}>
                <InputLabel>Scenario</InputLabel>
                <Select value={scenario} label="Scenario" onChange={(e) => setScenario(e.target.value as (typeof SCENARIO_OPTIONS)[number]['value'])}>
                  {SCENARIO_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                type="number"
                size="small"
                label="Days"
                value={summaryDays}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setSummaryDays(Math.min(SUMMARY_DAYS_MAX, Math.max(SUMMARY_DAYS_MIN, v)));
                }}
                inputProps={{ min: SUMMARY_DAYS_MIN, max: SUMMARY_DAYS_MAX, step: 1 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">days</Typography></InputAdornment>,
                }}
                sx={{ width: 172, '& .MuiInputBase-input': { fontWeight: 700 } }}
              />
            </Box>
          </Box>
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
                    <Typography variant="h5" fontWeight={800} color={(pos?.win_rate_pct ?? 0) >= 50 ? '#4caf50' : '#f44336'}>
                      {pos?.win_rate_pct != null ? `${pos.win_rate_pct.toFixed(0)}%` : '—'}
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
                    <Typography variant="h5" fontWeight={800} color="#f44336">{stopsCount}</Typography>
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
          Position Summary by Trade Type ({summaryDays} day{summaryDays !== 1 ? 's' : ''})
        </Typography>
        <Grid container spacing={2}>
          {horizons.map((h) => {
            const s = h.summary;
            const durationLabel = s?.avg_duration_hours != null && s.avg_duration_hours >= 1
              ? `${s.avg_duration_hours.toFixed(1)}h`
              : s?.avg_duration_min != null
                ? `${s.avg_duration_min.toFixed(0)}m`
                : '—';
            return (
              <Grid item xs={12} sm={6} md={4} lg key={h.tradeType} sx={{ minWidth: 0 }}>
                <Card
                  elevation={0}
                  sx={{
                    border: '2px solid',
                    borderColor: alpha(h.color, 0.15),
                    borderRadius: 2.5,
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: h.color, boxShadow: 2 },
                    height: '100%',
                  }}
                >
                  <CardContent sx={{ py: 2, px: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header */}
                    <Box display="flex" alignItems="center" gap={0.5} mb={1.5}>
                      <Box sx={{ color: h.color, display: 'flex', fontSize: 18 }}>{h.icon}</Box>
                      <Typography variant="caption" fontWeight={800} fontSize="0.8rem">{h.label}</Typography>
                      {!h.loading && positionsSummaryIsPresent(s) && (
                        <Chip
                          label={`${s.open} open`}
                          size="small"
                          sx={{ ml: 'auto', height: 18, fontSize: '0.55rem', fontWeight: 700, bgcolor: alpha(h.color, 0.1), color: h.color }}
                        />
                      )}
                    </Box>
                    {h.loading ? (
                      <Skeleton height={60} />
                    ) : positionsSummaryIsPresent(s) ? (
                      <>
                        {/* KPI row — minWidth so numbers aren't clipped */}
                        <Box display="flex" justifyContent="space-between" gap={0.5} mb={0.5} sx={{ minWidth: 0 }}>
                          <Box textAlign="center" flex={1} sx={{ minWidth: 36 }}>
                            <Typography variant="subtitle2" fontWeight={800} noWrap>{s.total}</Typography>
                            <Typography variant="caption" color="text.secondary" fontSize="0.55rem">Total</Typography>
                          </Box>
                          <Box textAlign="center" flex={1} sx={{ minWidth: 44 }}>
                            <Typography variant="subtitle2" fontWeight={800} color={(s.win_rate_pct ?? 0) >= 50 ? '#4caf50' : '#f44336'} noWrap>
                              {s.win_rate_pct != null ? `${s.win_rate_pct.toFixed(0)}%` : '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontSize="0.55rem">Win</Typography>
                          </Box>
                          <Box textAlign="center" flex={1} sx={{ minWidth: 52 }}>
                            <Typography variant="subtitle2" fontWeight={800} color={(s.avg_return_pct ?? 0) >= 0 ? '#4caf50' : '#f44336'} noWrap>
                              {s.avg_return_pct != null ? `${s.avg_return_pct > 0 ? '+' : ''}${s.avg_return_pct.toFixed(1)}%` : '—'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontSize="0.55rem">Avg Ret</Typography>
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

      <Box sx={{ py: 0.5, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Market movers:{' '}
          <Link component={RouterLink} to="/seed-dashboard" underline="hover" fontWeight={600}>
            Seed Dashboard
          </Link>
          {' · '}
          <Link component={RouterLink} to="/market-movers" underline="hover" fontWeight={600}>
            full page
          </Link>
        </Typography>
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
