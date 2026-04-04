import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { Refresh, PlayArrow } from '@mui/icons-material';
import TabPanel from '../components/ui/TabPanel';
import JsonCard from '../components/ui/JsonCard';
import seedAdvancedMonitoringService from '../services/SeedAdvancedMonitoringService';
import seedRateLimitingService from '../services/SeedRateLimitingService';
import seedDataQualityService from '../services/SeedDataQualityService';
import seedRegimeService from '../services/SeedRegimeService';
import seedLearningGovernanceService from '../services/SeedLearningGovernanceService';
import seedExecutionQualityService from '../services/SeedExecutionQualityService';
import seedPortfolioRiskService from '../services/SeedPortfolioRiskService';
import seedAttributionAnalyticsService from '../services/SeedAttributionAnalyticsService';
import seedSystemOptimizationService from '../services/SeedSystemOptimizationService';
import seedYahooFreeTierService from '../services/SeedYahooFreeTierService';
import seedBacktestingService from '../services/SeedBacktestingService';
import { seedDashboardService } from '../services/SeedDashboardService';

type LoadState = { loading: boolean; error: string | null; data: unknown };

const empty: LoadState = { loading: false, error: null, data: null };

function SeedOps(): React.ReactElement {
  const [tab, setTab] = useState(0);

  const [advancedMon, setAdvancedMon] = useState<LoadState>(empty);
  const [rateLim, setRateLim] = useState<LoadState>(empty);
  const [dq, setDq] = useState<LoadState>(empty);
  const [regime, setRegime] = useState<LoadState>(empty);
  const [learning, setLearning] = useState<LoadState>(empty);
  const [execQ, setExecQ] = useState<LoadState>(empty);
  const [portfolio, setPortfolio] = useState<LoadState>(empty);
  const [attrib, setAttrib] = useState<LoadState>(empty);
  const [sysOpt, setSysOpt] = useState<LoadState>(empty);
  const [yahoo, setYahoo] = useState<LoadState>(empty);
  const [backtest, setBacktest] = useState<LoadState>(empty);
  const [utils, setUtils] = useState<LoadState>(empty);

  const [alertSeverity, setAlertSeverity] = useState('');
  const [alertAck, setAlertAck] = useState<'any' | 'true' | 'false'>('any');
  const [includeDetails, setIncludeDetails] = useState(false);

  const [rateServiceName, setRateServiceName] = useState('seed');

  const [dqDays, setDqDays] = useState(30);
  const [dqDimension, setDqDimension] = useState('freshness');
  const [dqTable, setDqTable] = useState('ranked_stocks');

  const [regimeDays, setRegimeDays] = useState(90);

  const [learningLookbackDays, setLearningLookbackDays] = useState(30);
  const [rollbackVersion, setRollbackVersion] = useState('');
  const [rollbackConfirm, setRollbackConfirm] = useState(false);

  const [liqSymbol, setLiqSymbol] = useState('RELIANCE');
  const [batchLiqSymbols, setBatchLiqSymbols] = useState('RELIANCE,TCS,INFY');
  const [slipDays, setSlipDays] = useState(90);
  const [slipTradeType, setSlipTradeType] = useState('');

  const [riskSymbol, setRiskSymbol] = useState('RELIANCE');
  const [riskTradeType, setRiskTradeType] = useState('swing_buy');
  const [riskAllocation, setRiskAllocation] = useState(100000);
  const [riskSector, setRiskSector] = useState('');

  const [attribStart, setAttribStart] = useState('2025-01-01');
  const [attribEnd, setAttribEnd] = useState('2025-12-31');

  const [cpuDuration, setCpuDuration] = useState(120);
  const [workloadType, setWorkloadType] = useState('analytics');
  const [workerMultiplier, setWorkerMultiplier] = useState(1.0);

  const [backtestDays, setBacktestDays] = useState(30);
  const [backtestTradeType, setBacktestTradeType] = useState('intraday_buy');
  const [backtestMinScore, setBacktestMinScore] = useState(60);
  const [backtestRunStart, setBacktestRunStart] = useState('2024-01-01');
  const [backtestRunEnd, setBacktestRunEnd] = useState('2024-12-31');

  const [alertId, setAlertId] = useState('');
  const [monPost, setMonPost] = useState<LoadState>(empty);
  const [ratePost, setRatePost] = useState<LoadState>(empty);
  const [yahooPost, setYahooPost] = useState<LoadState>(empty);
  const [sysPost, setSysPost] = useState<LoadState>(empty);
  const [redisUrl, setRedisUrl] = useState('');
  const [rateWorkerId, setRateWorkerId] = useState('');
  const [parallelTaskType, setParallelTaskType] = useState('analytics');
  const [parallelParamsJson, setParallelParamsJson] = useState('{}');

  const utilsActions = useMemo(
    () => [
      { key: 'getAllSettings', label: 'GET /api/v2/settings', run: () => seedDashboardService.getAllSettings() },
      { key: 'dashboardOverview', label: 'GET /api/v2/dashboard/overview', run: () => seedDashboardService.getDashboardOverview({ include_positions: true, include_learning: true }) },
      { key: 'charges', label: 'GET /api/v2/dashboard/charges-calculator', run: () => seedDashboardService.getChargesCalculator({ entry_price: 100, exit_price: 105, quantity: 100, is_intraday: true }) },
      { key: 'exportMarketContextUrl', label: 'GET /api/v2/export/market-context.csv (URL)', run: async () => ({ url: seedDashboardService.getExportUrl('market-context', { days: 7 }) }) },
    ],
    [],
  );

  const load = useCallback(async (setter: (s: LoadState) => void, fn: () => Promise<unknown>) => {
    setter({ loading: true, error: null, data: null });
    try {
      const data = await fn();
      setter({ loading: false, error: null, data });
    } catch (err) {
      setter({ loading: false, error: err instanceof Error ? err.message : 'Request failed', data: null });
    }
  }, []);

  const sectionHeader = (title: string, subtitle: string, state: LoadState, onRun: () => void) => (
    <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
          <Box>
            <Typography variant="h6" fontWeight={900}>{title}</Typography>
            <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={state.loading ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
            onClick={onRun}
            disabled={state.loading}
          >
            Load
          </Button>
        </Box>
        {state.error && <Alert severity="error" sx={{ mt: 2 }}>{state.error}</Alert>}
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Box mb={2}>
        <Typography variant="h4" fontWeight={900}>Seed Ops</Typography>
        <Typography variant="body2" color="text.secondary">
          Operational dashboards and admin actions for Seed Stocks Service v2 endpoints.
        </Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 2 }}>
        <Tab label="Advanced Monitoring" />
        <Tab label="Rate Limiting" />
        <Tab label="Data Quality" />
        <Tab label="Regime" />
        <Tab label="Learning Governance" />
        <Tab label="Execution Quality" />
        <Tab label="Portfolio Risk" />
        <Tab label="Attribution" />
        <Tab label="System Optimization" />
        <Tab label="Yahoo Free Tier" />
        <Tab label="Backtesting" />
        <Tab label="Utilities" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader(
              'Advanced monitoring',
              'system-health, performance-metrics, dashboard, alerts',
              advancedMon,
              () =>
                load(setAdvancedMon, async () => {
                  const [systemHealth, perf, dash, alerts] = await Promise.all([
                    seedAdvancedMonitoringService.getSystemHealth({ include_details: includeDetails }),
                    seedAdvancedMonitoringService.getPerformanceMetrics(),
                    seedAdvancedMonitoringService.getMonitoringDashboard(),
                    seedAdvancedMonitoringService.getAlerts({
                      severity: alertSeverity || undefined,
                      acknowledged: alertAck === 'any' ? undefined : alertAck === 'true',
                      limit: 50,
                    }),
                  ]);
                  return { systemHealth, perf, dash, alerts };
                }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>Filters</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" label="Severity" value={alertSeverity} onChange={(e) => setAlertSeverity(e.target.value)} fullWidth />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Acknowledged</InputLabel>
                      <Select
                        value={alertAck}
                        label="Acknowledged"
                        onChange={(e) => setAlertAck(e.target.value as 'any' | 'true' | 'false')}
                      >
                        <MenuItem value="any">Any</MenuItem>
                        <MenuItem value="true">True</MenuItem>
                        <MenuItem value="false">False</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Include details</InputLabel>
                      <Select value={includeDetails ? 'true' : 'false'} label="Include details" onChange={(e) => setIncludeDetails(e.target.value === 'true')}>
                        <MenuItem value="false">No</MenuItem>
                        <MenuItem value="true">Yes</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Alert actions
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  label="Alert ID"
                  value={alertId}
                  onChange={(e) => setAlertId(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={!alertId.trim() || monPost.loading}
                    onClick={() =>
                      load(setMonPost, () => seedAdvancedMonitoringService.acknowledgeAlert(alertId.trim()))
                    }
                  >
                    Acknowledge
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    disabled={!alertId.trim() || monPost.loading}
                    onClick={() =>
                      load(setMonPost, () => seedAdvancedMonitoringService.resolveAlert(alertId.trim()))
                    }
                  >
                    Resolve
                  </Button>
                </Box>
                {monPost.error && <Alert severity="error" sx={{ mt: 1 }}>{monPost.error}</Alert>}
                {monPost.data != null && (
                  <Box mt={2}>
                    <JsonCard title="Last alert action response" data={monPost.data} maxHeight={240} />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {advancedMon.data != null ? <JsonCard title="Response" data={advancedMon.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={1}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('Rate limiting', 'status/health/limits/usage-report + service status', rateLim, () =>
              load(setRateLim, async () => {
                const [status, health, limits, usage, svc] = await Promise.all([
                  seedRateLimitingService.getStatus(),
                  seedRateLimitingService.getHealth(),
                  seedRateLimitingService.getLimits(),
                  seedRateLimitingService.getUsageReport(),
                  seedRateLimitingService.getServiceStatus(rateServiceName),
                ]);
                return { status, health, limits, usage, service: { name: rateServiceName, data: svc } };
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>Service selector</Typography>
                <TextField size="small" fullWidth label="Service name" value={rateServiceName} onChange={(e) => setRateServiceName(e.target.value)} />
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Admin (confirm in browser)
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  label="Redis URL (optional)"
                  value={redisUrl}
                  onChange={(e) => setRedisUrl(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <TextField
                  size="small"
                  fullWidth
                  label="Worker ID (optional)"
                  value={rateWorkerId}
                  onChange={(e) => setRateWorkerId(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      if (!window.confirm('Initialize / reinitialize rate limiting?')) return;
                      load(setRatePost, () =>
                        seedRateLimitingService.initialize({
                          redis_url: redisUrl || undefined,
                          worker_id: rateWorkerId || undefined,
                        }),
                      );
                    }}
                  >
                    Initialize
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => {
                      if (!window.confirm(`Reset rate limiting for "${rateServiceName}"?`)) return;
                      load(setRatePost, () => seedRateLimitingService.resetService(rateServiceName));
                    }}
                  >
                    Reset service
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      if (!window.confirm('Shutdown rate limiting system?')) return;
                      load(setRatePost, () => seedRateLimitingService.shutdown());
                    }}
                  >
                    Shutdown
                  </Button>
                </Box>
                {ratePost.error && <Alert severity="error" sx={{ mt: 1 }}>{ratePost.error}</Alert>}
                {ratePost.data != null && (
                  <Box mt={2}>
                    <JsonCard title="Last rate-limit action response" data={ratePost.data} maxHeight={240} />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {rateLim.data != null ? <JsonCard title="Response" data={rateLim.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={2}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('Data quality', 'assessment/dashboard/dimension/table/trends', dq, () =>
              load(setDq, async () => {
                const [dashboard, trends, dim, table] = await Promise.all([
                  seedDataQualityService.getDashboard(),
                  seedDataQualityService.getTrends(dqDays),
                  seedDataQualityService.getDimensionAnalysis(dqDimension),
                  seedDataQualityService.getTableReport(dqTable),
                ]);
                return { dashboard, trends, dimension: { key: dqDimension, data: dim }, table: { name: dqTable, data: table } };
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>Inputs</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label="Trends days" type="number" value={dqDays} onChange={(e) => setDqDays(Number(e.target.value) || 0)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label="Dimension" value={dqDimension} onChange={(e) => setDqDimension(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label="Table name" value={dqTable} onChange={(e) => setDqTable(e.target.value)} />
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Button variant="outlined" startIcon={<PlayArrow />} onClick={() => load(setDq, () => seedDataQualityService.getAssessment())}>
                  Run full assessment
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {dq.data != null ? <JsonCard title="Response" data={dq.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={3}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('Regime analysis', 'current-regime/signals/analysis/performance', regime, () =>
              load(setRegime, async () => {
                const [current, signals, analysis, perf] = await Promise.all([
                  seedRegimeService.getCurrentRegime(),
                  seedRegimeService.getSignals(),
                  seedRegimeService.getAnalysis(regimeDays),
                  seedRegimeService.getPerformance(regimeDays),
                ]);
                return { current, signals, analysis, performance: perf };
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>Inputs</Typography>
                <TextField size="small" fullWidth label="Days" type="number" value={regimeDays} onChange={(e) => setRegimeDays(Number(e.target.value) || 0)} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {regime.data != null ? <JsonCard title="Response" data={regime.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={4}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('Learning governance', 'status/health/arm-performance/evaluate/rollback', learning, () =>
              load(setLearning, async () => {
                const [gov, health, arms] = await Promise.all([
                  seedLearningGovernanceService.getGovernanceStatus(),
                  seedLearningGovernanceService.getLearningHealth({ include_recommendations: false }),
                  seedLearningGovernanceService.getArmPerformance(learningLookbackDays),
                ]);
                return { governance: gov, health, armPerformance: arms };
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>Actions</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label="Lookback days" type="number" value={learningLookbackDays} onChange={(e) => setLearningLookbackDays(Number(e.target.value) || 0)} />
                  </Grid>
                  <Grid item xs={12} sm={8}>
                    <Button variant="outlined" startIcon={<PlayArrow />} onClick={() => load(setLearning, () => seedLearningGovernanceService.evaluatePerformance(learningLookbackDays))}>
                      Trigger evaluation
                    </Button>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Rollback target version (optional)" value={rollbackVersion} onChange={(e) => setRollbackVersion(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl size="small" fullWidth>
                      <InputLabel>Confirm</InputLabel>
                      <Select value={rollbackConfirm ? 'true' : 'false'} label="Confirm" onChange={(e) => setRollbackConfirm(e.target.value === 'true')}>
                        <MenuItem value="false">False</MenuItem>
                        <MenuItem value="true">True</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <Button
                      color="error"
                      variant="contained"
                      onClick={() =>
                        load(setLearning, () =>
                          seedLearningGovernanceService.forceRollback({
                            confirm: rollbackConfirm,
                            target_version: rollbackVersion || undefined,
                          }),
                        )
                      }
                    >
                      Rollback
                    </Button>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Alert severity="warning">Rollback affects learning state and requires confirm=true.</Alert>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {learning.data != null ? <JsonCard title="Response" data={learning.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={5}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('Execution quality', 'quality-report/liquidity/batch-liquidity/slippage', execQ, () =>
              load(setExecQ, async () => {
                const [quality, liq, batch, slip] = await Promise.all([
                  seedExecutionQualityService.getQualityReport(30),
                  seedExecutionQualityService.getLiquidityAnalysis(liqSymbol),
                  seedExecutionQualityService.getBatchLiquidity(batchLiqSymbols),
                  seedExecutionQualityService.getSlippageAnalysis({ days: slipDays, trade_type: slipTradeType || undefined }),
                ]);
                return { quality, liquidity: liq, batchLiquidity: batch, slippage: slip };
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>Inputs</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Liquidity symbol" value={liqSymbol} onChange={(e) => setLiqSymbol(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Batch symbols CSV" value={batchLiqSymbols} onChange={(e) => setBatchLiqSymbols(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Slippage days" type="number" value={slipDays} onChange={(e) => setSlipDays(Number(e.target.value) || 0)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Trade type (optional)" value={slipTradeType} onChange={(e) => setSlipTradeType(e.target.value)} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {execQ.data != null ? <JsonCard title="Response" data={execQ.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={6}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('Portfolio risk', 'risk-status + risk-check', portfolio, () =>
              load(setPortfolio, async () => {
                const [status, check] = await Promise.all([
                  seedPortfolioRiskService.getRiskStatus(),
                  seedPortfolioRiskService.riskCheck({
                    symbol: riskSymbol,
                    trade_type: riskTradeType,
                    allocation: riskAllocation,
                    sector: riskSector || undefined,
                  }),
                ]);
                return { status, check };
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>Risk-check inputs</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Symbol" value={riskSymbol} onChange={(e) => setRiskSymbol(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Trade type" value={riskTradeType} onChange={(e) => setRiskTradeType(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Allocation" type="number" value={riskAllocation} onChange={(e) => setRiskAllocation(Number(e.target.value) || 0)} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Sector (optional)" value={riskSector} onChange={(e) => setRiskSector(e.target.value)} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {portfolio.data != null ? <JsonCard title="Response" data={portfolio.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={7}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('Performance attribution', 'summary/breakdown/analysis', attrib, () =>
              load(setAttrib, async () => {
                const [summary, breakdown, analysis] = await Promise.all([
                  seedAttributionAnalyticsService.getAttributionSummary(90),
                  seedAttributionAnalyticsService.getArmPerformanceBreakdown({ days: 90, min_trades: 5 }),
                  seedAttributionAnalyticsService.runAttributionAnalysis({
                    start_date: attribStart,
                    end_date: attribEnd,
                    dimensions: ['arm', 'sector', 'trade_type', 'score_bin'],
                  }),
                ]);
                return { summary, breakdown, analysis };
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>Analysis window</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="Start date" type="date" value={attribStart} onChange={(e) => setAttribStart(e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField size="small" fullWidth label="End date" type="date" value={attribEnd} onChange={(e) => setAttribEnd(e.target.value)} InputLabelProps={{ shrink: true }} />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {attrib.data != null ? <JsonCard title="Response" data={attrib.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={8}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('System optimization', 'metrics/health/cpu/optimize + tune', sysOpt, () =>
              load(setSysOpt, async () => {
                const [metrics, health, cpu, optimize, tune] = await Promise.all([
                  seedSystemOptimizationService.getMetrics(),
                  seedSystemOptimizationService.getHealth(),
                  seedSystemOptimizationService.getCpuUtilization(cpuDuration),
                  seedSystemOptimizationService.getOptimizeRecommendations(workloadType),
                  seedSystemOptimizationService.tune({ worker_multiplier: workerMultiplier }),
                ]);
                return { metrics, health, cpu, optimize, tune };
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>Inputs</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label="CPU duration (s)" type="number" value={cpuDuration} onChange={(e) => setCpuDuration(Number(e.target.value) || 0)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label="Workload type" value={workloadType} onChange={(e) => setWorkloadType(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label="Worker multiplier" type="number" value={workerMultiplier} onChange={(e) => setWorkerMultiplier(Number(e.target.value) || 0)} />
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Parallel execution & shutdown
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  label="task_type"
                  value={parallelTaskType}
                  onChange={(e) => setParallelTaskType(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <TextField
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  label="parameters (JSON object)"
                  value={parallelParamsJson}
                  onChange={(e) => setParallelParamsJson(e.target.value)}
                  sx={{ mb: 1 }}
                />
                <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      let parameters: Record<string, unknown> | undefined;
                      try {
                        const parsed = JSON.parse(parallelParamsJson) as unknown;
                        parameters =
                          parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                            ? (parsed as Record<string, unknown>)
                            : undefined;
                      } catch {
                        alert('Invalid JSON for parameters');
                        return;
                      }
                      load(setSysPost, () =>
                        seedSystemOptimizationService.parallelExecution({
                          task_type: parallelTaskType,
                          parameters,
                        }),
                      );
                    }}
                  >
                    Parallel execution
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      if (!window.confirm('Shutdown CPU optimizer / system optimization service?')) return;
                      load(setSysPost, () => seedSystemOptimizationService.shutdown());
                    }}
                  >
                    Shutdown optimizer
                  </Button>
                </Box>
                <Alert severity="warning">
                  Tuning runs on Load; parallel-exec/shutdown responses appear below.
                </Alert>
                {sysPost.error && <Alert severity="error" sx={{ mt: 1 }}>{sysPost.error}</Alert>}
                {sysPost.data != null && (
                  <Box mt={2}>
                    <JsonCard title="Last system action response" data={sysPost.data} maxHeight={240} />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {sysOpt.data != null ? <JsonCard title="Response" data={sysOpt.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={9}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('Yahoo free tier controls', 'usage/quota/report', yahoo, () =>
              load(setYahoo, async () => {
                const [usage, quota, report] = await Promise.all([
                  seedYahooFreeTierService.getUsage(),
                  seedYahooFreeTierService.getQuotaCheck(),
                  seedYahooFreeTierService.getOptimizationReport(),
                ]);
                return { usage, quota, report };
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Admin (confirm in browser)
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Button
                    size="small"
                    variant="outlined"
                    color="warning"
                    onClick={() => {
                      if (!window.confirm('Reset Yahoo daily request counter?')) return;
                      load(setYahooPost, () => seedYahooFreeTierService.resetDailyCounter());
                    }}
                  >
                    Reset daily counter
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => {
                      if (!window.confirm('Clear Yahoo Finance cache?')) return;
                      load(setYahooPost, () => seedYahooFreeTierService.clearCache());
                    }}
                  >
                    Clear cache
                  </Button>
                </Box>
                {yahooPost.error && <Alert severity="error" sx={{ mt: 1 }}>{yahooPost.error}</Alert>}
                {yahooPost.data != null && (
                  <Box mt={2}>
                    <JsonCard title="Last Yahoo admin response" data={yahooPost.data} maxHeight={240} />
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {yahoo.data != null ? <JsonCard title="Response" data={yahoo.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={10}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('Backtesting', 'quick + compare', backtest, () =>
              load(setBacktest, async () => {
                const [quick, compare] = await Promise.all([
                  seedBacktestingService.quickBacktest(backtestDays, { trade_type: backtestTradeType, min_score: backtestMinScore }),
                  seedBacktestingService.compareStrategies(),
                ]);
                return { quick, compare };
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>Quick inputs</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label="Days" type="number" value={backtestDays} onChange={(e) => setBacktestDays(Number(e.target.value) || 0)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label="Trade type" value={backtestTradeType} onChange={(e) => setBacktestTradeType(e.target.value)} />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField size="small" fullWidth label="Min score" type="number" value={backtestMinScore} onChange={(e) => setBacktestMinScore(Number(e.target.value) || 0)} />
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1}>
                  Full historical run
                </Typography>
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  <Grid item xs={6}>
                    <TextField
                      size="small"
                      fullWidth
                      label="Start"
                      type="date"
                      value={backtestRunStart}
                      onChange={(e) => setBacktestRunStart(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      size="small"
                      fullWidth
                      label="End"
                      type="date"
                      value={backtestRunEnd}
                      onChange={(e) => setBacktestRunEnd(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  disabled={backtest.loading}
                  onClick={() =>
                    load(setBacktest, () =>
                      seedBacktestingService.runBacktest({
                        start_date: backtestRunStart,
                        end_date: backtestRunEnd,
                        trade_types: ['intraday_buy', 'swing_buy'],
                      }),
                    )
                  }
                >
                  POST /api/v2/backtesting/run
                </Button>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {backtest.data != null ? <JsonCard title="Response" data={backtest.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tab} index={11}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {sectionHeader('Utilities', 'Wire previously client-only endpoints', utils, () =>
              load(setUtils, async () => {
                const out: Record<string, unknown> = {};
                for (const a of utilsActions) out[a.key] = await a.run();
                return out;
              }),
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight={800} mb={1}>What this does</Typography>
                <Typography variant="body2" color="text.secondary">
                  Calls `GET /api/v2/settings`, `GET /api/v2/dashboard/overview`, `GET /api/v2/dashboard/charges-calculator`,
                  and generates a market-context CSV export URL.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            {utils.data != null ? <JsonCard title="Response" data={utils.data} /> : null}
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
}

export default SeedOps;

