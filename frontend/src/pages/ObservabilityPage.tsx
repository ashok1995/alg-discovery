/**
 * Observability — read-only telemetry. Single place to see pipeline, DB, monitor, and API health.
 * No configuration; use System settings for values.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  alpha,
  Alert,
  Button,
  Typography,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { Speed, Storage, Map, Psychology, Refresh, Savings } from '@mui/icons-material';
import TabPanel from '../components/ui/TabPanel';
import PageHero from '../components/layout/PageHero';
import SystemControl from './SystemControl';
import SeedTradingEconomyPanel from '../components/observability/SeedTradingEconomyPanel';
import LearningObservabilityHub from '../components/observability/LearningObservabilityHub';
import StructuredDataView from '../components/ui/StructuredDataView';
import { seedDashboardService } from '../services/SeedDashboardService';
import type { ArmLeaderboardResponse, LearningInsightsResponse } from '../types/dashboard';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../components/ui/SortableTableHead';

const toNum = (v: unknown): number | null => (typeof v === 'number' ? v : null);
const toStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);

function getSemanticStatusColor(value: string): 'success' | 'warning' | 'error' | 'default' {
  const s = value.toLowerCase();
  if (s.includes('up') || s.includes('ok') || s.includes('healthy') || s.includes('active') || s.includes('open') || s.includes('success')) return 'success';
  if (s.includes('warn') || s.includes('degraded') || s.includes('stale')) return 'warning';
  if (s.includes('down') || s.includes('fail') || s.includes('error') || s.includes('critical')) return 'error';
  return 'default';
}

const StatusLegend: React.FC = () => (
  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
    <Typography variant="caption" color="text.secondary">Legend:</Typography>
    <Chip size="small" color="success" label="Healthy / Up" />
    <Chip size="small" color="warning" label="Warning / Degraded" />
    <Chip size="small" color="error" label="Error / Down" />
    <Chip size="small" variant="outlined" label="Unknown" />
  </Stack>
);

const MetricCard: React.FC<{ label: string; value: string; tone?: 'default' | 'success' | 'warning' | 'error' }> = ({
  label,
  value,
  tone = 'default',
}) => {
  const color =
    tone === 'success'
      ? 'success.main'
      : tone === 'warning'
        ? 'warning.main'
        : tone === 'error'
          ? 'error.main'
          : 'text.primary';
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" sx={{ color, fontWeight: 700 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

type EndpointRow = {
  name: string;
  method: string;
  path: string;
  status: string;
  latencyMs: number | null;
};

type EndpointSortKey = 'name' | 'method' | 'path' | 'status' | 'latencyMs';
const ENDPOINT_COLUMNS: ColumnDef<EndpointSortKey>[] = [
  { key: 'name', label: 'Service', sortable: true, minWidth: 140 },
  { key: 'method', label: 'Method', sortable: true },
  { key: 'path', label: 'Path', sortable: true, minWidth: 220 },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'latencyMs', label: 'Latency ms', align: 'right', sortable: true },
];

function normalizeEndpointRows(payload: Record<string, unknown> | null): EndpointRow[] {
  if (!payload) return [];
  const bag = [payload.endpoints, payload.items, payload.data, payload.results];
  for (const candidate of bag) {
    if (!Array.isArray(candidate)) continue;
    const rows = candidate
      .map((x): EndpointRow | null => {
        if (!x || typeof x !== 'object') return null;
        const r = x as Record<string, unknown>;
        return {
          name: toStr(r.service) ?? toStr(r.name) ?? 'endpoint',
          method: (toStr(r.method) ?? 'GET').toUpperCase(),
          path: toStr(r.path) ?? toStr(r.endpoint) ?? '—',
          status: toStr(r.status) ?? toStr(r.health) ?? 'unknown',
          latencyMs: toNum(r.latency_ms) ?? toNum(r.avg_ms) ?? toNum(r.p95_ms) ?? null,
        };
      })
      .filter((x): x is EndpointRow => Boolean(x));
    if (rows.length > 0) return rows;
  }
  return [];
}

const ObservabilityPulseTab: React.FC = () => {
  const [data, setData] = useState<{
    overview?: Record<string, unknown>;
    quickStats?: Record<string, unknown>;
    marketPulse?: Record<string, unknown>;
    alerts?: Record<string, unknown>;
    performancePulse?: Record<string, unknown>;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, quickStats, marketPulse, alerts, performancePulse] = await Promise.allSettled([
        seedDashboardService.getDashboardOverview({ include_positions: true, include_learning: true }),
        seedDashboardService.getQuickStats(),
        seedDashboardService.getMarketPulse(),
        seedDashboardService.getSystemAlerts(),
        seedDashboardService.getPerformancePulse(),
      ]);
      setData({
        overview: overview.status === 'fulfilled' ? (overview.value as unknown as Record<string, unknown>) : undefined,
        quickStats: quickStats.status === 'fulfilled' ? (quickStats.value as unknown as Record<string, unknown>) : undefined,
        marketPulse: marketPulse.status === 'fulfilled' ? (marketPulse.value as unknown as Record<string, unknown>) : undefined,
        alerts: alerts.status === 'fulfilled' ? (alerts.value as unknown as Record<string, unknown>) : undefined,
        performancePulse: performancePulse.status === 'fulfilled' ? (performancePulse.value as unknown as Record<string, unknown>) : undefined,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load pulse');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Alert severity="error" action={<Button onClick={() => void load()}>Retry</Button>}>
        {error}
      </Alert>
    );
  }
  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="flex-end" mb={1}>
        <Button size="small" startIcon={<Refresh />} onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </Box>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        For learning / scorer timing / ARMs, use <strong>Observability → Learning &amp; arms</strong> (grouped hub + ~60s refresh).
      </Alert>
      <Box sx={{ mb: 1.5 }}>
        <StatusLegend />
      </Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          orientation="vertical"
          variant="scrollable"
          sx={{ borderRight: 1, borderColor: 'divider', minWidth: 190, bgcolor: 'action.hover', borderRadius: 1 }}
        >
          <Tab label="Summary" />
          <Tab label="Performance" />
          <Tab label="Alerts" />
          <Tab label="Raw payloads" />
        </Tabs>
        <Box sx={{ flex: 1, minWidth: 0 }}>
      <TabPanel value={subTab} index={0}>
        <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              label="Market status"
              value={toStr(data?.quickStats?.market_status) ?? '—'}
              tone={toStr(data?.quickStats?.market_status) === 'open' ? 'success' : 'warning'}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard label="Open positions" value={String(toNum(data?.quickStats?.open_positions) ?? 0)} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard label="Lifetime win rate" value={`${(toNum(data?.quickStats?.lifetime_win_rate_pct) ?? 0).toFixed(2)}%`} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              label="Alert count"
              value={String(toNum(data?.alerts?.alert_count) ?? 0)}
              tone={(toNum(data?.alerts?.alert_count) ?? 0) > 0 ? 'warning' : 'success'}
            />
          </Grid>
        </Grid>
        <Grid container spacing={1.5}>
          <Grid item xs={12} md={6}>
            {data?.marketPulse && <StructuredDataView data={data.marketPulse} title="Market pulse" />}
          </Grid>
          <Grid item xs={12} md={6}>
            {data?.quickStats && <StructuredDataView data={data.quickStats} title="Quick stats" />}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={subTab} index={1}>
        {Array.isArray((data?.performancePulse as Record<string, unknown> | undefined)?.performance) ? (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableBody>
                {((data?.performancePulse as Record<string, unknown>).performance as Array<Record<string, unknown>>).map((p, idx) => {
                  const winRate = toNum(p.win_rate_pct) ?? 0;
                  const avg = toNum(p.avg_return_pct) ?? 0;
                  return (
                    <TableRow key={`${toStr(p.period) ?? 'period'}-${idx}`} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{toStr(p.period) ?? '—'}</TableCell>
                      <TableCell align="right">{toNum(p.closed_positions) ?? 0} closed</TableCell>
                      <TableCell align="right" sx={{ color: winRate >= 50 ? 'success.main' : 'warning.main' }}>{winRate.toFixed(1)}% win</TableCell>
                      <TableCell align="right" sx={{ color: avg >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}>
                        {avg >= 0 ? '+' : ''}{avg.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Alert severity="info">Performance pulse payload is empty.</Alert>
        )}
      </TabPanel>

      <TabPanel value={subTab} index={2}>
        {Array.isArray((data?.alerts as Record<string, unknown> | undefined)?.alerts) ? (
          <Stack spacing={1}>
            {((data?.alerts as Record<string, unknown>).alerts as Array<Record<string, unknown>>).map((a, idx) => (
              <Card key={idx} variant="outlined">
                <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Chip size="small" label={toStr(a.severity) ?? 'n/a'} color={toStr(a.severity) === 'high' ? 'error' : 'warning'} />
                    <Typography variant="subtitle2">{toStr(a.type) ?? 'Alert'}</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {toStr(a.message) ?? 'No message'}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Alert severity="success">No active alerts.</Alert>
        )}
      </TabPanel>

      <TabPanel value={subTab} index={3}>
        <Stack spacing={2}>
          {data?.overview && <StructuredDataView data={data.overview} title="Dashboard overview" />}
          {data?.quickStats && <StructuredDataView data={data.quickStats} title="Quick stats" />}
          {data?.marketPulse && <StructuredDataView data={data.marketPulse} title="Market pulse" />}
          {data?.alerts && <StructuredDataView data={data.alerts} title="System alerts" />}
          {data?.performancePulse && <StructuredDataView data={data.performancePulse} title="Performance pulse" />}
        </Stack>
      </TabPanel>
        </Box>
      </Box>
    </Box>
  );
};

const ObservabilityServiceMapTab: React.FC = () => {
  const [endpoints, setEndpoints] = useState<Record<string, unknown> | null>(null);
  const [perf, setPerf] = useState<Record<string, unknown> | null>(null);
  const [perfExt, setPerfExt] = useState<Record<string, unknown> | null>(null);
  const [regime, setRegime] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subTab, setSubTab] = useState(0);
  const endpointRows = normalizeEndpointRows(endpoints);
  const { sortedData: sortedEndpoints, requestSort: sortEndpoints, getSortDirection: endpointSortDir } = useSortableData<EndpointRow, EndpointSortKey>(
    endpointRows,
    { key: 'latencyMs', direction: 'desc' },
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [e, p, pe, r] = await Promise.allSettled([
        seedDashboardService.getObservabilityEndpoints(),
        seedDashboardService.getObservabilityPerformance(),
        seedDashboardService.getObservabilityPerformanceExternal(),
        seedDashboardService.getRegimeScoring(),
      ]);
      setEndpoints(e.status === 'fulfilled' ? e.value : null);
      setPerf(p.status === 'fulfilled' ? p.value : null);
      setPerfExt(pe.status === 'fulfilled' ? pe.value : null);
      setRegime(r.status === 'fulfilled' ? r.value : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load service map');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !endpoints) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Alert severity="error" action={<Button onClick={() => void load()}>Retry</Button>}>
        {error}
      </Alert>
    );
  }
  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="flex-end" mb={1}>
        <Button size="small" startIcon={<Refresh />} onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <Tabs
          value={subTab}
          onChange={(_, v) => setSubTab(v)}
          orientation="vertical"
          variant="scrollable"
          sx={{ borderRight: 1, borderColor: 'divider', minWidth: 200, bgcolor: 'action.hover', borderRadius: 1 }}
        >
          <Tab label="Endpoints" />
          <Tab label="Internal perf" />
          <Tab label="External perf" />
          <Tab label="Regime scoring" />
          <Tab label="Raw snapshot" />
        </Tabs>
        <Box sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ mb: 1.5 }}>
        <StatusLegend />
      </Box>
      <TabPanel value={subTab} index={0}>
        {endpointRows.length > 0 ? (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <SortableTableHead columns={ENDPOINT_COLUMNS} onSort={sortEndpoints} getSortDirection={endpointSortDir} />
              <TableBody>
                {sortedEndpoints.map((row, idx) => {
                  const color = getSemanticStatusColor(row.status);
                  return (
                    <TableRow key={`${row.path}-${idx}`} hover>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.method}
                          color={row.method === 'POST' || row.method === 'PUT' ? 'secondary' : 'default'}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'ui-monospace, monospace' }}>{row.path}</TableCell>
                      <TableCell>
                        <Chip size="small" label={row.status} color={color} variant={color === 'default' ? 'outlined' : 'filled'} />
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color:
                            row.latencyMs == null
                              ? 'text.secondary'
                              : row.latencyMs > 2000
                                ? 'error.main'
                                : row.latencyMs > 800
                                  ? 'warning.main'
                                  : 'success.main',
                          fontWeight: 600,
                        }}
                      >
                        {row.latencyMs ?? '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : endpoints ? (
          <StructuredDataView data={endpoints} title="Endpoints / service map" />
        ) : (
          <Alert severity="info">No endpoint payload.</Alert>
        )}
      </TabPanel>
      <TabPanel value={subTab} index={1}>
        {perf ? <StructuredDataView data={perf} title="Performance (internal)" /> : <Alert severity="info">No internal performance payload.</Alert>}
      </TabPanel>
      <TabPanel value={subTab} index={2}>
        {perfExt ? <StructuredDataView data={perfExt} title="Performance (external)" /> : <Alert severity="info">No external performance payload.</Alert>}
      </TabPanel>
      <TabPanel value={subTab} index={3}>
        {regime ? <StructuredDataView data={regime} title="Regime scoring" /> : <Alert severity="info">No regime scoring payload.</Alert>}
      </TabPanel>
      <TabPanel value={subTab} index={4}>
        <Stack spacing={2}>
          {endpoints && <StructuredDataView data={endpoints} title="Endpoints / service map" />}
          {perf && <StructuredDataView data={perf} title="Performance (internal)" />}
          {perfExt && <StructuredDataView data={perfExt} title="Performance (external)" />}
          {regime && <StructuredDataView data={regime} title="Regime scoring" />}
        </Stack>
      </TabPanel>
        </Box>
      </Box>
    </Box>
  );
};

const LEARNING_OBS_POLL_MS = 60_000;

const ObservabilityLearningTab: React.FC = () => {
  const [learning, setLearning] = useState<unknown>(null);
  const [utilization, setUtilization] = useState<unknown>(null);
  const [coverage, setCoverage] = useState<unknown>(null);
  const [insights, setInsights] = useState<LearningInsightsResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<ArmLeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [l, u, c, i, lb] = await Promise.allSettled([
        seedDashboardService.getArmsObservabilityLearning(),
        seedDashboardService.getArmsObservabilityUtilization(),
        seedDashboardService.getCandidatesObservabilityCoverage(),
        seedDashboardService.getLearningInsights(),
        seedDashboardService.getArmLeaderboard(7),
      ]);
      setLearning(l.status === 'fulfilled' ? l.value : null);
      setUtilization(u.status === 'fulfilled' ? u.value : null);
      setCoverage(c.status === 'fulfilled' ? c.value : null);
      setInsights(i.status === 'fulfilled' ? (i.value as LearningInsightsResponse) : null);
      setLeaderboard(lb.status === 'fulfilled' ? (lb.value as ArmLeaderboardResponse) : null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load learning data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), LEARNING_OBS_POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const hasAnyData =
    insights != null || leaderboard != null || learning != null || utilization != null || coverage != null;

  if (loading && !hasAnyData && !error) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }
  if (error && !hasAnyData) {
    return (
      <Alert severity="error" action={<Button onClick={() => void load()}>Retry</Button>}>
        {error}
      </Alert>
    );
  }
  return (
    <Box sx={{ p: 1 }}>
      <LearningObservabilityHub
        insights={insights}
        leaderboard={leaderboard}
        learning={learning}
        utilization={utilization}
        coverage={coverage}
        loading={loading}
        onRefresh={() => void load()}
      />
    </Box>
  );
};

const ObservabilityPage: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box
      sx={{
        p: 3,
        minHeight: '100%',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      }}
    >
      <PageHero
        title="Observability"
        subtitle="Read-only telemetry: pulse, pipeline, trading economics (charges & timing), service map, and learning. Edit values in System settings → Seed."
        variant="teal"
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          This page is <strong>view-only</strong>. To edit API keys, workspace preferences, or Seed trading/platform config, go to{' '}
          <Button component={RouterLink} to="/settings" size="small" variant="outlined">
            System settings
          </Button>
          .
        </Typography>
      </Alert>

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          p: 1,
          display: 'flex',
          gap: 1,
          alignItems: 'stretch',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          orientation="vertical"
          variant="scrollable"
          sx={{
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: alpha('#00796b', 0.04),
            minWidth: 220,
            borderRadius: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.88rem', minHeight: 52, alignItems: 'flex-start' },
            '& .Mui-selected': { color: 'primary.main' },
          }}
        >
          <Tab icon={<Speed />} iconPosition="start" label="Pulse" />
          <Tab icon={<Storage />} iconPosition="start" label="Pipeline & storage" />
          <Tab icon={<Savings />} iconPosition="start" label="Trading economics" />
          <Tab icon={<Map />} iconPosition="start" label="Service map" />
          <Tab icon={<Psychology />} iconPosition="start" label="Learning & arms" />
        </Tabs>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <TabPanel value={tab} index={0}>
            <ObservabilityPulseTab />
          </TabPanel>
          <TabPanel value={tab} index={1}>
            <SystemControl embedMode contentLayout="sections" />
          </TabPanel>
          <TabPanel value={tab} index={2}>
            <SeedTradingEconomyPanel />
          </TabPanel>
          <TabPanel value={tab} index={3}>
            <ObservabilityServiceMapTab />
          </TabPanel>
          <TabPanel value={tab} index={4}>
            <ObservabilityLearningTab />
          </TabPanel>
        </Box>
      </Box>
    </Box>
  );
};

export default ObservabilityPage;
