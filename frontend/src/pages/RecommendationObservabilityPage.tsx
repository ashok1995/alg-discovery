import React, { useCallback, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Skeleton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Refresh,
  Storage,
  CheckCircle,
  Error as ErrorIcon,
  Dns,
  HealthAndSafety,
  ShowChart,
} from '@mui/icons-material';
import {
  fetchObservabilityDb,
  fetchPipelineHealth,
  fetchScoreBinPerformance,
} from '../services/RecommendationV2Service';
import type { ObservabilityDbResponse } from '../types/apiModels';
import type { PipelineHealthResponse } from '../types/apiModels';
import type { ScoreBinPerformanceItem } from '../types/apiModels';

const RecommendationObservabilityPage: React.FC = () => {
  const [dbData, setDbData] = useState<ObservabilityDbResponse | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineHealthResponse | null>(null);
  const [scoreBinData, setScoreBinData] = useState<ScoreBinPerformanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scoreBinDays, setScoreBinDays] = useState(30);
  const [scoreBinTradeType, setScoreBinTradeType] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [db, pipeline, scoreBin] = await Promise.all([
        fetchObservabilityDb(),
        fetchPipelineHealth(),
        fetchScoreBinPerformance({ days: scoreBinDays, trade_type: scoreBinTradeType || undefined }),
      ]);
      setDbData(db);
      setPipelineData(pipeline);
      setScoreBinData(scoreBin);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load observability data');
      setDbData(null);
      setPipelineData(null);
      setScoreBinData([]);
    } finally {
      setLoading(false);
    }
  }, [scoreBinDays, scoreBinTradeType]);

  React.useEffect(() => {
    load();
  }, [load]);

  const pipelineHealthy = pipelineData?.status === 'healthy';
  const stockUniverse = dbData?.stock_universe ?? pipelineData?.pipeline?.stock_universe;
  const rankedStocksRaw = dbData?.ranked_stocks ?? pipelineData?.pipeline?.ranked_stocks;
  const rankedStocksByType: Record<string, number> =
    rankedStocksRaw && typeof rankedStocksRaw === 'object' && 'by_trade_type' in rankedStocksRaw
      ? (rankedStocksRaw as { by_trade_type?: Record<string, number> }).by_trade_type ?? {}
      : (rankedStocksRaw as Record<string, number> | undefined) ?? {};
  const byScenario = dbData?.by_scenario ?? pipelineData?.pipeline?.stock_universe_by_scenario;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HealthAndSafety sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h5" fontWeight={600}>
            Recommendation Service Observability
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={18} /> : <Refresh />}
          onClick={load}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Pipeline Health */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <HealthAndSafety color="action" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Pipeline Status
                </Typography>
              </Box>
              {loading && !pipelineData ? (
                <Skeleton variant="rounded" height={40} />
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {pipelineHealthy ? (
                    <Chip icon={<CheckCircle />} label="Healthy" color="success" size="small" />
                  ) : (
                    <Chip icon={<ErrorIcon />} label={pipelineData?.status ?? 'Unknown'} color="error" size="small" />
                  )}
                  {pipelineData?.pipeline?.orchestrator?.orchestrator?.market_hours != null && (
                    <Chip
                      label={pipelineData.pipeline.orchestrator.orchestrator.market_hours ? 'Market open' : 'Market closed'}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Storage color="action" />
                <Typography variant="subtitle1" fontWeight={600}>
                  Stock Universe
                </Typography>
              </Box>
              {loading && !stockUniverse ? (
                <Skeleton variant="rounded" height={40} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {stockUniverse ? `${stockUniverse.active ?? 0} active / ${stockUniverse.total ?? 0} total` : '—'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Last updated
              </Typography>
              {loading && !dbData && !pipelineData ? (
                <Skeleton variant="rounded" height={24} />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {(dbData?.timestamp ?? pipelineData?.timestamp) ? new Date(dbData?.timestamp ?? pipelineData?.timestamp ?? '').toLocaleString() : '—'}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ranked stocks by trade type */}
      {Object.keys(rankedStocksByType).length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Dns color="action" />
              <Typography variant="subtitle1" fontWeight={600}>
                Ranked Stocks by Trade Type
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(rankedStocksByType).map(([tt, count]) => (
                <Chip key={tt} label={`${tt}: ${count}`} size="small" variant="outlined" />
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* By scenario (prod observability/db) */}
      {byScenario && Object.keys(byScenario).length > 0 && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Universe by Scenario
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Trade Type</TableCell>
                    <TableCell align="right">Active</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Indicators</TableCell>
                    <TableCell align="right">Ranked</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(byScenario).map(([tt, sc]: [string, unknown]) => {
                    const s = sc as Record<string, unknown>;
                    const univ = (s.stock_universe ?? s) as { active?: number; total?: number };
                    const indicators = s.stock_indicators_count as number | undefined;
                    const ranked = (s.ranked_stocks_count ?? rankedStocksByType[tt]) as number | undefined;
                    return (
                      <TableRow key={tt}>
                        <TableCell>{tt}</TableCell>
                        <TableCell align="right">{univ?.active ?? '—'}</TableCell>
                        <TableCell align="right">{univ?.total ?? '—'}</TableCell>
                        <TableCell align="right">{indicators ?? '—'}</TableCell>
                        <TableCell align="right">{ranked ?? '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Score Bin Performance */}
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShowChart color="action" />
              <Typography variant="subtitle1" fontWeight={600}>
                Score Bin Performance (Self-Learning)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Days</InputLabel>
                <Select
                  value={scoreBinDays}
                  label="Days"
                  onChange={(e) => setScoreBinDays(e.target.value as number)}
                >
                  <MenuItem value={7}>7</MenuItem>
                  <MenuItem value={14}>14</MenuItem>
                  <MenuItem value={30}>30</MenuItem>
                  <MenuItem value={60}>60</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Trade Type</InputLabel>
                <Select
                  value={scoreBinTradeType}
                  label="Trade Type"
                  onChange={(e) => setScoreBinTradeType(e.target.value)}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="intraday_buy">Intraday Buy</MenuItem>
                  <MenuItem value="intraday_sell">Intraday Sell</MenuItem>
                  <MenuItem value="swing_buy">Swing Buy</MenuItem>
                  <MenuItem value="short">Short</MenuItem>
                  <MenuItem value="positional">Positional</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
          {loading && scoreBinData.length === 0 ? (
            <Skeleton variant="rounded" height={160} />
          ) : scoreBinData.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No score bin data.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Score Bin</TableCell>
                    <TableCell>Trade Type</TableCell>
                    <TableCell>Horizon</TableCell>
                    <TableCell align="right">Avg Return %</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">Success Rate %</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scoreBinData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.score_bin}</TableCell>
                      <TableCell>{row.trade_type}</TableCell>
                      <TableCell>{row.horizon}</TableCell>
                      <TableCell align="right" sx={{ color: row.avg_return_pct >= 0 ? 'success.main' : 'error.main' }}>
                        {row.avg_return_pct.toFixed(2)}%
                      </TableCell>
                      <TableCell align="right">{row.count}</TableCell>
                      <TableCell align="right">{row.success_rate_pct.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default RecommendationObservabilityPage;
