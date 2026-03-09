import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import { Refresh, CheckCircle, Error as ErrorIcon, Storage, Speed, Memory } from '@mui/icons-material';
import TabPanel from '../components/ui/TabPanel';
import { seedDashboardService } from '../services/SeedDashboardService';
import type { PipelineHealthResponse, ObservabilityDbResponse, RegistryStatsResponse } from '../types/apiModels';

const TRADE_TYPES = ['intraday_buy', 'intraday_sell', 'swing_buy', 'short', 'positional'];

const SystemControl: React.FC = () => {
  const [pipelineHealth, setPipelineHealth] = useState<PipelineHealthResponse | null>(null);
  const [observability, setObservability] = useState<ObservabilityDbResponse | null>(null);
  const [registryStats, setRegistryStats] = useState<RegistryStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const fetchSystemData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [healthRes, obsRes, regRes] = await Promise.allSettled([
        seedDashboardService.getPipelineHealth(),
        seedDashboardService.getObservabilityDb(),
        seedDashboardService.getRegistryStats(),
      ]);
      if (healthRes.status === 'fulfilled') setPipelineHealth(healthRes.value);
      if (obsRes.status === 'fulfilled') setObservability(obsRes.value);
      if (regRes.status === 'fulfilled') setRegistryStats(regRes.value);

      const allFailed = [healthRes, obsRes].every((r) => r.status === 'rejected');
      if (allFailed) setError('Failed to connect to seed-stocks-service. Is it running?');
    } catch (err) {
      setError('Failed to fetch system data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 15000);
    return () => clearInterval(interval);
  }, [fetchSystemData]);

  if (loading && !pipelineHealth) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const pipeline = pipelineHealth?.pipeline;
  const rankedStocks = (pipeline?.ranked_stocks ?? {}) as Record<string, number>;
  const universeByScenario = (pipeline?.stock_universe_by_scenario ?? {}) as Record<string, { active: number; total: number }>;

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">System Control</Typography>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchSystemData} color="primary"><Refresh /></IconButton>
        </Tooltip>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Status Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              {pipelineHealth?.status === 'healthy' ? (
                <CheckCircle color="success" fontSize="large" />
              ) : (
                <ErrorIcon color="error" fontSize="large" />
              )}
              <Typography variant="h6">{pipelineHealth?.status?.toUpperCase() ?? 'UNKNOWN'}</Typography>
              <Typography variant="caption" color="text.secondary">Pipeline Status</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Storage color="primary" fontSize="large" />
              <Typography variant="h6">
                {Object.values(rankedStocks).reduce((a, b) => a + b, 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">Total Ranked Stocks</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Speed color="info" fontSize="large" />
              <Typography variant="h6">{registryStats?.total_queries ?? '—'}</Typography>
              <Typography variant="caption" color="text.secondary">Total Queries</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Memory color="warning" fontSize="large" />
              <Typography variant="h6">{registryStats?.arm_queries ?? '—'}</Typography>
              <Typography variant="caption" color="text.secondary">ARM Queries</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Pipeline Health" />
        <Tab label="DB Observability" />
        <Tab label="Registry Stats" />
      </Tabs>

      {/* Pipeline Health Tab */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Ranked Stocks by Trade Type</Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Trade Type</TableCell>
                        <TableCell align="right">Ranked</TableCell>
                        <TableCell align="right">Universe (Active / Total)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {TRADE_TYPES.map((tt) => (
                        <TableRow key={tt}>
                          <TableCell>{tt.replace(/_/g, ' ')}</TableCell>
                          <TableCell align="right">
                            <Chip label={rankedStocks[tt] ?? 0} size="small" color="primary" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">
                            {universeByScenario[tt]
                              ? `${universeByScenario[tt].active} / ${universeByScenario[tt].total}`
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Orchestrator Status</Typography>
                {pipeline?.orchestrator ? (
                  <Box component="pre" sx={{ fontSize: 12, overflow: 'auto', maxHeight: 400, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    {JSON.stringify(pipeline.orchestrator, null, 2)}
                  </Box>
                ) : (
                  <Typography color="text.secondary">No orchestrator data available.</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
          {pipelineHealth?.errors && pipelineHealth.errors.length > 0 && (
            <Grid item xs={12}>
              <Alert severity="warning">
                Pipeline errors: {pipelineHealth.errors.join(', ')}
              </Alert>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* DB Observability Tab */}
      <TabPanel value={tab} index={1}>
        {observability ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Stock Universe</Typography>
                  <Typography variant="body2">Total: {(observability.stock_universe as any)?.total ?? '—'}</Typography>
                  <Typography variant="body2">Active: {(observability.stock_universe as any)?.active ?? '—'}</Typography>
                  <Typography variant="body2">Inactive: {(observability.stock_universe as any)?.inactive ?? '—'}</Typography>
                  <Typography variant="body2">Added (24h): {(observability.stock_universe as any)?.recently_added_24h ?? '—'}</Typography>
                  <Typography variant="body2">Evicted (24h): {(observability.stock_universe as any)?.recently_evicted_24h ?? '—'}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Stock Indicators</Typography>
                  <Typography variant="body2">Total: {(observability.stock_indicators as any)?.total ?? '—'}</Typography>
                  {(observability.stock_indicators as any)?.by_trade_type && (
                    <Box mt={1}>
                      {Object.entries((observability.stock_indicators as any).by_trade_type).map(([tt, cnt]) => (
                        <Typography key={tt} variant="body2">{tt.replace(/_/g, ' ')}: {String(cnt)}</Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Ranked Stocks</Typography>
                  <Typography variant="body2">Total: {(observability.ranked_stocks as any)?.total ?? '—'}</Typography>
                  {(observability.ranked_stocks as any)?.by_trade_type && (
                    <Box mt={1}>
                      {Object.entries((observability.ranked_stocks as any).by_trade_type).map(([tt, cnt]) => (
                        <Typography key={tt} variant="body2">{tt.replace(/_/g, ' ')}: {String(cnt)}</Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>By Scenario</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Scenario</TableCell>
                          <TableCell align="right">Universe (Active)</TableCell>
                          <TableCell align="right">Indicators</TableCell>
                          <TableCell align="right">Ranked</TableCell>
                          <TableCell>Pipeline Last Run</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(observability.by_scenario).map(([sc, data]) => (
                          <TableRow key={sc}>
                            <TableCell>{sc.replace(/_/g, ' ')}</TableCell>
                            <TableCell align="right">{(data.stock_universe as any)?.active ?? '—'}</TableCell>
                            <TableCell align="right">{data.stock_indicators_count}</TableCell>
                            <TableCell align="right">{data.ranked_stocks_count}</TableCell>
                            <TableCell>
                              {data.pipeline_last_run ? (
                                <Box>
                                  {Object.entries(data.pipeline_last_run).map(([comp, time]) => (
                                    <Typography key={comp} variant="caption" display="block">
                                      {comp}: {time}
                                    </Typography>
                                  ))}
                                </Box>
                              ) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            {observability.pipeline_operations && Object.keys(observability.pipeline_operations).length > 0 && (
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>Pipeline Operations</Typography>
                    <Box component="pre" sx={{ fontSize: 12, overflow: 'auto', maxHeight: 400, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {JSON.stringify(observability.pipeline_operations, null, 2)}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        ) : (
          <Typography color="text.secondary">No observability data available.</Typography>
        )}
      </TabPanel>

      {/* Registry Stats Tab */}
      <TabPanel value={tab} index={2}>
        {registryStats ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="primary">{registryStats.total_queries}</Typography>
                  <Typography variant="subtitle1">Total Queries</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="success.main">{registryStats.active_queries}</Typography>
                  <Typography variant="subtitle1">Active Queries</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h3" color="info.main">{registryStats.arm_queries}</Typography>
                  <Typography variant="subtitle1">ARM Queries</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Full Registry Stats</Typography>
                  <Box component="pre" sx={{ fontSize: 12, overflow: 'auto', maxHeight: 400, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    {JSON.stringify(registryStats, null, 2)}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Typography color="text.secondary">No registry stats available.</Typography>
        )}
      </TabPanel>
    </Box>
  );
};

export default SystemControl;
