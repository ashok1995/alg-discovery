/**
 * Seed API hub — surfaces improved Seed endpoints not covered by other dashboard tabs.
 * See frontend/docs/configuration/SEED_UI_ENDPOINT_COVERAGE.md for full path ↔ UI mapping.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Link,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type {
  DashboardOverviewResponse,
  MarketPulseResponse,
  PerformancePulseResponse,
  WatchlistResponse,
  ArmLeaderboardResponse,
  TopPerformersTodayResponse,
  LearningInsightsResponse,
  DataHealthResponse,
  DataStatisticsResponse,
  ProfitProtectionResponse,
  PortfolioRiskResponse,
  ChargesCalculatorResponse,
  SearchPositionsResponse,
  BatchAnalyzeResponse,
} from '../../types/apiModels';

type ScenarioFilter = 'all' | 'paper_trade' | 'learning';

function JsonBlock({ data, maxHeight = 220 }: { data: unknown; maxHeight?: number }): React.ReactElement {
  const text = JSON.stringify(data, null, 2);
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1,
        maxHeight,
        overflow: 'auto',
        fontSize: '0.7rem',
        bgcolor: 'grey.100',
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {text}
    </Box>
  );
}

const SeedAllEndpointsTab: React.FC = () => {
  const [scenario, setScenario] = useState<ScenarioFilter>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [marketPulse, setMarketPulse] = useState<MarketPulseResponse | null>(null);
  const [perfPulse, setPerfPulse] = useState<PerformancePulseResponse | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistResponse | null>(null);
  const [profitProt, setProfitProt] = useState<ProfitProtectionResponse | null>(null);
  const [portfolioRisk, setPortfolioRisk] = useState<PortfolioRiskResponse | null>(null);
  const [armLb, setArmLb] = useState<ArmLeaderboardResponse | null>(null);
  const [topToday, setTopToday] = useState<TopPerformersTodayResponse | null>(null);
  const [learnInsights, setLearnInsights] = useState<LearningInsightsResponse | null>(null);
  const [dataHealth, setDataHealth] = useState<DataHealthResponse | null>(null);
  const [dataStats, setDataStats] = useState<DataStatisticsResponse | null>(null);
  const [settingsAll, setSettingsAll] = useState<Record<string, unknown> | null>(null);

  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState<SearchPositionsResponse | null>(null);
  const [entryPx, setEntryPx] = useState('100');
  const [exitPx, setExitPx] = useState('102');
  const [qty, setQty] = useState('1');
  const [intraday, setIntraday] = useState(false);
  const [chargesRes, setChargesRes] = useState<ChargesCalculatorResponse | null>(null);
  const [analyzeSymbols, setAnalyzeSymbols] = useState('RELIANCE,TCS');
  const [analyzeRes, setAnalyzeRes] = useState<BatchAnalyzeResponse | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const pulseOpts = scenario === 'all' ? undefined : { scenario };
    try {
      const [
        ov,
        mp,
        pp,
        wl,
        ppst,
        pr,
        al,
        tt,
        li,
        dh,
        ds,
        st,
      ] = await Promise.allSettled([
        seedDashboardService.getDashboardOverview({ include_positions: true, include_learning: true }),
        seedDashboardService.getMarketPulse(),
        seedDashboardService.getPerformancePulse(pulseOpts),
        seedDashboardService.getWatchlist(2),
        seedDashboardService.getProfitProtectionStatus(),
        seedDashboardService.getPortfolioRisk(),
        seedDashboardService.getArmLeaderboard(7),
        seedDashboardService.getTopPerformersToday(10),
        seedDashboardService.getLearningInsights(),
        seedDashboardService.getDataHealth(),
        seedDashboardService.getDataStatistics(),
        seedDashboardService.getSettings(),
      ]);

      if (ov.status === 'fulfilled') setOverview(ov.value);
      if (mp.status === 'fulfilled') setMarketPulse(mp.value);
      if (pp.status === 'fulfilled') setPerfPulse(pp.value);
      if (wl.status === 'fulfilled') setWatchlist(wl.value);
      if (ppst.status === 'fulfilled') setProfitProt(ppst.value);
      if (pr.status === 'fulfilled') setPortfolioRisk(pr.value);
      if (al.status === 'fulfilled') setArmLb(al.value);
      if (tt.status === 'fulfilled') setTopToday(tt.value);
      if (li.status === 'fulfilled') setLearnInsights(li.value);
      if (dh.status === 'fulfilled') setDataHealth(dh.value);
      if (ds.status === 'fulfilled') setDataStats(ds.value);
      if (st.status === 'fulfilled') setSettingsAll(st.value);

      const failed = [ov, mp, pp].filter((r) => r.status === 'rejected');
      if (failed.length === 3) {
        setError('Could not reach Seed monitor/dashboard APIs.');
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [scenario]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const runSearch = async (): Promise<void> => {
    if (!searchQ.trim()) return;
    try {
      const r = await seedDashboardService.searchPositions(searchQ.trim(), 25);
      setSearchRes(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed');
    }
  };

  const runCharges = async (): Promise<void> => {
    const en = parseFloat(entryPx);
    const ex = parseFloat(exitPx);
    const qn = parseInt(qty, 10);
    if (Number.isNaN(en) || Number.isNaN(ex)) return;
    try {
      const r = await seedDashboardService.getChargesCalculator({
        entry_price: en,
        exit_price: ex,
        quantity: Number.isNaN(qn) ? 1 : qn,
        is_intraday: intraday,
      });
      setChargesRes(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Charges failed');
    }
  };

  const runAnalyze = async (): Promise<void> => {
    const symbols = analyzeSymbols.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    if (symbols.length === 0) return;
    try {
      const r = await seedDashboardService.analyzeSymbols({
        symbols: symbols.slice(0, 20),
        trade_types: ['swing_buy'],
        days_lookback: 30,
      });
      setAnalyzeRes(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analyze failed');
    }
  };

  const exportPositions = seedDashboardService.getExportUrl('positions', { days: 30 });
  const exportOutcomes = seedDashboardService.getExportUrl('outcomes', { days: 30 });
  const exportCtx = seedDashboardService.getExportUrl('market-context', { days: 30 });

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" gap={2} alignItems="center" mb={2}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Scenario</InputLabel>
          <Select
            value={scenario}
            label="Scenario"
            onChange={(e) => setScenario(e.target.value as ScenarioFilter)}
          >
            <MenuItem value="all">all</MenuItem>
            <MenuItem value="paper_trade">paper_trade</MenuItem>
            <MenuItem value="learning">learning</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />} onClick={() => void loadAll()} disabled={loading}>
          Refresh hub
        </Button>
        <Typography variant="caption" color="text.secondary">
          Applies to performance-pulse (and related monitor calls where API supports scenario).
        </Typography>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }} variant="outlined">
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Exports (GET)</Typography>
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Link href={exportPositions} target="_blank" rel="noopener noreferrer">positions.csv</Link>
              <Link href={exportOutcomes} target="_blank" rel="noopener noreferrer">outcomes.json</Link>
              <Link href={exportCtx} target="_blank" rel="noopener noreferrer">market-context.csv</Link>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }} variant="outlined">
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Search positions</Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              <TextField size="small" label="Query" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} sx={{ minWidth: 200 }} />
              <Button variant="outlined" onClick={() => void runSearch()}>Search</Button>
            </Box>
            {searchRes && (
              <Typography variant="caption" display="block" mt={1}>
                {searchRes.count} results for &quot;{searchRes.query}&quot;
              </Typography>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }} variant="outlined">
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Charges calculator</Typography>
            <Box display="flex" flexWrap="wrap" gap={1} alignItems="center">
              <TextField size="small" label="Entry" value={entryPx} onChange={(e) => setEntryPx(e.target.value)} />
              <TextField size="small" label="Exit" value={exitPx} onChange={(e) => setExitPx(e.target.value)} />
              <TextField size="small" label="Qty" value={qty} onChange={(e) => setQty(e.target.value)} sx={{ width: 80 }} />
              <FormControlLabel control={<Checkbox checked={intraday} onChange={(e) => setIntraday(e.target.checked)} />} label="Intraday" />
              <Button variant="outlined" onClick={() => void runCharges()}>Calculate</Button>
            </Box>
            {chargesRes && <JsonBlock data={chargesRes} maxHeight={160} />}
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }} variant="outlined">
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>Batch analyze symbols</Typography>
            <TextField size="small" fullWidth label="Symbols (comma-separated)" value={analyzeSymbols} onChange={(e) => setAnalyzeSymbols(e.target.value)} sx={{ mb: 1 }} />
            <Button variant="outlined" onClick={() => void runAnalyze()}>POST /api/v2/batch/analyze-symbols</Button>
            {analyzeRes && <JsonBlock data={analyzeRes} maxHeight={200} />}
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 2 }} />

      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={700}>Market & performance pulse</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">GET /api/v2/monitor/market-pulse</Typography>
              <JsonBlock data={marketPulse} />
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">GET /api/v2/monitor/performance-pulse</Typography>
              <JsonBlock data={perfPulse} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={700}>Overview & settings snapshot</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="caption" color="text.secondary" display="block">GET /api/v2/dashboard/overview</Typography>
          <JsonBlock data={overview} maxHeight={280} />
          <Typography variant="caption" color="text.secondary" display="block" mt={2}>GET /api/v2/settings</Typography>
          <JsonBlock data={settingsAll} maxHeight={280} />
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={700}>Watchlist, protection, portfolio risk</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">GET /api/v2/dashboard/watchlist</Typography>
              {watchlist && watchlist.watchlist.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell align="right">Dist %</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {watchlist.watchlist.slice(0, 12).map((w) => (
                      <TableRow key={w.id}>
                        <TableCell>{w.symbol}</TableCell>
                        <TableCell align="right">{w.distance_pct?.toFixed(2) ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <JsonBlock data={watchlist} maxHeight={120} />
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">GET /api/v2/dashboard/profit-protection-status</Typography>
              <JsonBlock data={profitProt} maxHeight={220} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">GET /api/v2/dashboard/portfolio-risk</Typography>
              <JsonBlock data={portfolioRisk} maxHeight={220} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={700}>ARM leaderboard, top today, learning insights</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">GET /api/v2/monitor/arm-leaderboard</Typography>
              {armLb && armLb.leaderboard?.length ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ARM</TableCell>
                      <TableCell align="right">Win%</TableCell>
                      <TableCell align="right">Wt</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {armLb.leaderboard.slice(0, 15).map((a) => (
                      <TableRow key={a.arm}>
                        <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.arm}</TableCell>
                        <TableCell align="right">{a.win_rate_pct?.toFixed(1)}</TableCell>
                        <TableCell align="right">{a.thompson_weight?.toFixed(3)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <JsonBlock data={armLb} />
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">GET /api/v2/monitor/top-performers-today</Typography>
              <JsonBlock data={topToday} maxHeight={240} />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="caption" color="text.secondary">GET /api/v2/monitor/learning-insights</Typography>
              <JsonBlock data={learnInsights} maxHeight={240} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography fontWeight={700}>Data health & batch statistics</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">GET /api/v2/monitor/data-health</Typography>
              {dataHealth?.health_checks?.length ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Component</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Stale h</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dataHealth.health_checks.map((c) => (
                      <TableRow key={c.component}>
                        <TableCell>{c.component}</TableCell>
                        <TableCell>{c.status}</TableCell>
                        <TableCell align="right">{c.staleness_hours ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <JsonBlock data={dataHealth} />
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary">GET /api/v2/batch/data-statistics</Typography>
              <JsonBlock data={dataStats} maxHeight={260} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Alert severity="info" sx={{ mt: 2 }}>
        Batch close (POST /api/v2/batch/close-positions), PUT trading/system settings, and WebSocket /ws are documented in
        {' '}
        <strong>frontend/docs/configuration/SEED_UI_ENDPOINT_COVERAGE.md</strong>
        {' '}
        — add confirmed flows before exposing in UI.
      </Alert>
    </Box>
  );
};

export default SeedAllEndpointsTab;
