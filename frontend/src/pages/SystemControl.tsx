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
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Refresh, CheckCircle, Error as ErrorIcon, Storage, Speed, Memory } from '@mui/icons-material';
import TabPanel from '../components/ui/TabPanel';
import StructuredDataView from '../components/ui/StructuredDataView';
import { seedDashboardService } from '../services/SeedDashboardService';
import type { PipelineHealthResponse, ObservabilityDbResponse, RegistryStatsResponse } from '../types/apiModels';

const TRADE_TYPES = ['intraday_buy', 'intraday_sell', 'swing_buy', 'short_buy', 'long_term'];

function renderOrchestratorTable(data: Record<string, unknown>): React.ReactElement {
  const rows = Object.entries(data);
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Component</TableCell>
            <TableCell>Status / Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(([k, v]) => {
            const text = typeof v === 'string' ? v : JSON.stringify(v);
            const normalized = text.toLowerCase();
            const color =
              normalized.includes('error') || normalized.includes('fail')
                ? 'error'
                : normalized.includes('ok') || normalized.includes('healthy') || normalized.includes('success')
                  ? 'success'
                  : 'default';
            return (
              <TableRow key={k}>
                <TableCell>{k.replace(/_/g, ' ')}</TableCell>
                <TableCell>
                  <Chip size="small" label={text} color={color} variant={color === 'default' ? 'outlined' : 'filled'} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

interface SystemControlProps {
  /** When true, hide the page title (e.g. when embedded in System Settings). */
  embedMode?: boolean;
  /** `sections` = stacked accordions (no inner tab bar). `tabs` = classic sub-tabs. */
  contentLayout?: 'tabs' | 'sections';
}

const SystemControl: React.FC<SystemControlProps> = ({ embedMode = false, contentLayout = 'tabs' }) => {
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
    <Box p={embedMode ? 2 : 3}>
      {!embedMode && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4">System Control</Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchSystemData} color="primary"><Refresh /></IconButton>
          </Tooltip>
        </Box>
      )}
      {embedMode && (
        <Box display="flex" justifyContent="flex-end" alignItems="center" mb={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchSystemData} color="primary" size="small"><Refresh /></IconButton>
          </Tooltip>
        </Box>
      )}

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

      {contentLayout === 'tabs' ? (
        <>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Pipeline Health" />
            <Tab label="DB Observability" />
            <Tab label="Registry Stats" />
          </Tabs>

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
                  renderOrchestratorTable(pipeline.orchestrator as Record<string, unknown>)
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

          <TabPanel value={tab} index={1}>
        {observability ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Stock Universe</Typography>
                  <Typography variant="body2">Total: {String(observability.stock_universe.total ?? '—')}</Typography>
                  <Typography variant="body2">Active: {String(observability.stock_universe.active ?? '—')}</Typography>
                  <Typography variant="body2">Inactive: {String(observability.stock_universe.inactive ?? '—')}</Typography>
                  <Typography variant="body2">Added (24h): {String(observability.stock_universe.recently_added_24h ?? '—')}</Typography>
                  <Typography variant="body2">Evicted (24h): {String(observability.stock_universe.recently_evicted_24h ?? '—')}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Stock Indicators</Typography>
                  <Typography variant="body2">Total: {String(observability.stock_indicators.total ?? '—')}</Typography>
                  {observability.stock_indicators.by_trade_type != null &&
                    typeof observability.stock_indicators.by_trade_type === 'object' && (
                    <Box mt={1}>
                      {Object.entries(observability.stock_indicators.by_trade_type as Record<string, unknown>).map(([tt, cnt]) => (
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
                  <Typography variant="body2">Total: {String(observability.ranked_stocks.total ?? '—')}</Typography>
                  {observability.ranked_stocks.by_trade_type != null &&
                    typeof observability.ranked_stocks.by_trade_type === 'object' && (
                    <Box mt={1}>
                      {Object.entries(observability.ranked_stocks.by_trade_type as Record<string, unknown>).map(([tt, cnt]) => (
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
                            <TableCell align="right">{String((data.stock_universe as Record<string, unknown>).active ?? '—')}</TableCell>
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
                    <StructuredDataView data={observability.pipeline_operations} />
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        ) : (
          <Typography color="text.secondary">No observability data available.</Typography>
        )}
          </TabPanel>

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
                  <StructuredDataView data={registryStats} />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        ) : (
          <Typography color="text.secondary">No registry stats available.</Typography>
        )}
          </TabPanel>
        </>
      ) : (
        <Box>
          <Accordion
            defaultExpanded
            disableGutters
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1, '&:before': { display: 'none' } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={700}>Pipeline health &amp; ranked universe</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
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
                        renderOrchestratorTable(pipeline.orchestrator as Record<string, unknown>)
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
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={700}>Database observability</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              {observability ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Stock Universe</Typography>
                        <Typography variant="body2">Total: {String(observability.stock_universe.total ?? '—')}</Typography>
                        <Typography variant="body2">Active: {String(observability.stock_universe.active ?? '—')}</Typography>
                        <Typography variant="body2">Inactive: {String(observability.stock_universe.inactive ?? '—')}</Typography>
                        <Typography variant="body2">Added (24h): {String(observability.stock_universe.recently_added_24h ?? '—')}</Typography>
                        <Typography variant="body2">Evicted (24h): {String(observability.stock_universe.recently_evicted_24h ?? '—')}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>Stock Indicators</Typography>
                        <Typography variant="body2">Total: {String(observability.stock_indicators.total ?? '—')}</Typography>
                        {observability.stock_indicators.by_trade_type != null &&
                          typeof observability.stock_indicators.by_trade_type === 'object' && (
                          <Box mt={1}>
                            {Object.entries(observability.stock_indicators.by_trade_type as Record<string, unknown>).map(([tt, cnt]) => (
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
                        <Typography variant="body2">Total: {String(observability.ranked_stocks.total ?? '—')}</Typography>
                        {observability.ranked_stocks.by_trade_type != null &&
                          typeof observability.ranked_stocks.by_trade_type === 'object' && (
                          <Box mt={1}>
                            {Object.entries(observability.ranked_stocks.by_trade_type as Record<string, unknown>).map(([tt, cnt]) => (
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
                                  <TableCell align="right">{String((data.stock_universe as Record<string, unknown>).active ?? '—')}</TableCell>
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
                          <StructuredDataView data={observability.pipeline_operations} />
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              ) : (
                <Typography color="text.secondary">No observability data available.</Typography>
              )}
            </AccordionDetails>
          </Accordion>

          <Accordion disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={700}>Query registry</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
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
                        <StructuredDataView data={registryStats} />
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <Typography color="text.secondary">No registry stats available.</Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Box>
  );
};

export default SystemControl;
