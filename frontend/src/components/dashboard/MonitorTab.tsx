import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { Refresh, Bolt, Psychology, Shield, Assessment } from '@mui/icons-material';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type {
  BatchAnalyzeResponse,
  DataHealthResponse,
  DataStatisticsResponse,
  LearningInsightsResponse,
  MarketPulseResponse,
  PerformancePulseResponse,
  PortfolioRiskResponse,
  ProfitProtectionResponse,
  TopPerformersTodayResponse,
} from '../../types/apiModels';

const fmtPct = (v: number | null | undefined) => (typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—');
const fmtMoney = (v: number | null | undefined) => (typeof v === 'number' && Number.isFinite(v) ? `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '—');

const MonitorTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [marketPulse, setMarketPulse] = useState<MarketPulseResponse | null>(null);
  const [performancePulse, setPerformancePulse] = useState<PerformancePulseResponse | null>(null);
  const [learningInsights, setLearningInsights] = useState<LearningInsightsResponse | null>(null);
  const [dataHealth, setDataHealth] = useState<DataHealthResponse | null>(null);
  const [portfolioRisk, setPortfolioRisk] = useState<PortfolioRiskResponse | null>(null);
  const [profitProtection, setProfitProtection] = useState<ProfitProtectionResponse | null>(null);
  const [topPerformers, setTopPerformers] = useState<TopPerformersTodayResponse | null>(null);
  const [dataStats, setDataStats] = useState<DataStatisticsResponse | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      seedDashboardService.getMarketPulse(),
      seedDashboardService.getPerformancePulse(),
      seedDashboardService.getLearningInsights(),
      seedDashboardService.getDataHealth(),
      seedDashboardService.getPortfolioRisk(),
      seedDashboardService.getProfitProtectionStatus(),
      seedDashboardService.getTopPerformersToday(12),
      seedDashboardService.getDataStatistics(),
    ]);

    const [mp, pp, li, dh, pr, prot, tp, ds] = results;

    if (mp.status === 'fulfilled') setMarketPulse(mp.value);
    if (pp.status === 'fulfilled') setPerformancePulse(pp.value);
    if (li.status === 'fulfilled') setLearningInsights(li.value);
    if (dh.status === 'fulfilled') setDataHealth(dh.value);
    if (pr.status === 'fulfilled') setPortfolioRisk(pr.value);
    if (prot.status === 'fulfilled') setProfitProtection(prot.value);
    if (tp.status === 'fulfilled') setTopPerformers(tp.value);
    if (ds.status === 'fulfilled') setDataStats(ds.value);

    const allFailed = results.every((r) => r.status === 'rejected');
    if (allFailed) setError('All monitor endpoints failed. Is seed-stocks-service reachable?');
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 60_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const healthCounts = useMemo(() => {
    const checks = dataHealth?.health_checks ?? [];
    const by: Record<string, number> = {};
    for (const c of checks) by[c.status] = (by[c.status] ?? 0) + 1;
    return by;
  }, [dataHealth?.health_checks]);

  // Bulk analyze tool
  const [symbolsText, setSymbolsText] = useState('');
  const [analyzeDays, setAnalyzeDays] = useState(30);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeRes, setAnalyzeRes] = useState<BatchAnalyzeResponse | null>(null);
  const [analyzeErr, setAnalyzeErr] = useState<string | null>(null);

  const analyzeSymbols = async () => {
    const symbols = symbolsText
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 20);
    if (symbols.length === 0) return;
    setAnalyzing(true);
    setAnalyzeErr(null);
    setAnalyzeRes(null);
    try {
      const res = await seedDashboardService.analyzeSymbols({
        symbols,
        days_lookback: analyzeDays,
      });
      setAnalyzeRes(res);
    } catch (err: unknown) {
      setAnalyzeErr(err instanceof Error ? err.message : 'Analyze failed');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={900}>Monitor</Typography>
          <Typography variant="caption" color="text.secondary">Real-time pulse + risk + health + batch tools</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          {loading && <CircularProgress size={16} />}
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchAll}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" gap={1} alignItems="center" mb={1}>
                <Bolt sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight={900}>Market pulse</Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Box display="flex" justifyContent="space-between" mb={0.8}>
                <Typography variant="caption" color="text.secondary">Regime</Typography>
                <Chip size="small" label={marketPulse?.market_regime ?? '—'} variant="outlined" />
              </Box>
              <Box display="flex" justifyContent="space-between" mb={0.8}>
                <Typography variant="caption" color="text.secondary">VIX India</Typography>
                <Typography variant="body2" fontWeight={800}>{marketPulse?.vix_india != null ? marketPulse.vix_india.toFixed(2) : '—'}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={0.8}>
                <Typography variant="caption" color="text.secondary">Nifty</Typography>
                <Typography variant="body2" fontWeight={900} color={(marketPulse?.nifty50_change_pct ?? 0) >= 0 ? 'success.main' : 'error.main'}>
                  {fmtPct(marketPulse?.nifty50_change_pct ?? null)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between" mb={0.8}>
                <Typography variant="caption" color="text.secondary">Market</Typography>
                <Chip
                  size="small"
                  label={marketPulse?.market_status ?? '—'}
                  sx={{
                    fontWeight: 800,
                    bgcolor: alpha((marketPulse?.market_status ?? '') === 'open' ? '#4caf50' : '#9e9e9e', 0.12),
                    color: (marketPulse?.market_status ?? '') === 'open' ? 'success.dark' : 'text.secondary',
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" gap={1} alignItems="center" mb={1}>
                <Assessment sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight={900}>Performance pulse</Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                <Chip size="small" label={`${performancePulse?.current_open_positions ?? '—'} open`} />
                <Chip size="small" variant="outlined" label={performancePulse?.generated_at ? new Date(performancePulse.generated_at).toLocaleTimeString('en-IN') : '—'} />
              </Box>
              {(performancePulse?.performance ?? []).map((p) => (
                <Box key={p.period} display="flex" justifyContent="space-between" mb={0.6}>
                  <Typography variant="caption" color="text.secondary">{p.period}</Typography>
                  <Typography variant="body2" fontWeight={900}>
                    {p.win_rate_pct.toFixed(0)}% win · {fmtPct(p.avg_return_pct)}
                  </Typography>
                </Box>
              ))}
              {(!performancePulse || (performancePulse.performance ?? []).length === 0) && (
                <Typography color="text.secondary">No pulse data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" gap={1} alignItems="center" mb={1}>
                <Psychology sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight={900}>Learning insights</Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                <Chip size="small" label={`${learningInsights?.total_arms ?? 0} arms`} variant="outlined" />
                <Chip
                  size="small"
                  label={learningInsights?.learning_health ?? '—'}
                  sx={{
                    fontWeight: 800,
                    bgcolor: alpha((learningInsights?.learning_health ?? '') === 'active' ? '#4caf50' : '#ff9800', 0.12),
                    color: (learningInsights?.learning_health ?? '') === 'active' ? 'success.dark' : 'warning.dark',
                  }}
                />
              </Box>
              {(learningInsights?.top_arms ?? []).slice(0, 6).map((a) => (
                <Box key={a.arm} display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight={700} fontSize="0.76rem">
                    {a.arm.replace(/_/g, ' ')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    w={a.weight.toFixed(3)} · c={(a.confidence * 100).toFixed(0)}%
                  </Typography>
                </Box>
              ))}
              {(!learningInsights || (learningInsights.top_arms ?? []).length === 0) && (
                <Typography color="text.secondary">No insights</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" gap={1} alignItems="center" mb={1}>
                <Shield sx={{ color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight={900}>Data health</Typography>
              </Box>
              <Divider sx={{ mb: 1.5 }} />
              <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                <Chip size="small" label={dataHealth?.overall_status ?? '—'} />
                <Chip size="small" variant="outlined" label={(dataHealth?.market_open ?? false) ? 'Market open' : 'Market closed'} />
              </Box>
              <Box display="flex" gap={0.6} flexWrap="wrap">
                {Object.entries(healthCounts).map(([k, v]) => (
                  <Chip key={k} size="small" variant="outlined" label={`${k}: ${v}`} />
                ))}
              </Box>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">Checks</Typography>
              <TableContainer component={Paper} elevation={0} sx={{ mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 220 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Component</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Staleness (h)</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(dataHealth?.health_checks ?? []).slice(0, 8).map((c) => (
                      <TableRow key={c.component} hover>
                        <TableCell sx={{ py: 0.5 }}>{c.component}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{c.staleness_hours != null ? c.staleness_hours.toFixed(1) : '—'}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Chip size="small" label={c.status} variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!dataHealth || (dataHealth.health_checks ?? []).length === 0) && (
                      <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>No checks</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={900} gutterBottom>Portfolio risk</Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
                <Chip size="small" label={`${portfolioRisk?.total_positions ?? 0} positions`} />
                <Chip size="small" variant="outlined" label={`Capital at risk: ${fmtMoney(portfolioRisk?.total_capital_at_risk)}`} />
              </Box>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Trade type</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Positions</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Capital</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {portfolioRisk?.risk_by_trade_type
                      ? Object.entries(portfolioRisk.risk_by_trade_type).map(([tt, v]) => (
                          <TableRow key={tt}>
                            <TableCell sx={{ py: 0.5 }}>{tt.replace(/_/g, ' ')}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5 }}>{v.positions}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5 }}>{fmtMoney(v.capital_at_risk)}</TableCell>
                          </TableRow>
                        ))
                      : (
                        <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3 }}>No risk data</TableCell></TableRow>
                      )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={900} gutterBottom>Profit protection</Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
                <Chip size="small" label={`${profitProtection?.positions_with_protection ?? 0}/${profitProtection?.total_positions ?? 0} protected`} />
                <Chip size="small" variant="outlined" label={`Total unrealized: ${fmtPct(profitProtection?.total_unrealized_return_pct ?? null)}`} />
              </Box>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 320 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Symbol</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Type</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Unreal %</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Peak %</TableCell>
                      <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Active</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(profitProtection?.positions ?? []).slice(0, 20).map((p) => (
                      <TableRow key={`${p.symbol}-${p.trade_type ?? ''}`} hover>
                        <TableCell sx={{ py: 0.5 }}>{p.symbol}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>{p.trade_type?.replace(/_/g, ' ') ?? '—'}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{fmtPct(p.unrealized_return_pct)}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{fmtPct(p.peak_unrealized_pct)}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>
                          <Chip size="small" label={p.protection_active ? 'Yes' : 'No'} color={p.protection_active ? 'success' : 'default'} variant={p.protection_active ? 'filled' : 'outlined'} />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!profitProtection || (profitProtection.positions ?? []).length === 0) && (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3 }}>No positions</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={7}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={900} gutterBottom>Top performers today</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">Best</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 280 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Symbol</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Return</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(topPerformers?.best_performers ?? []).slice(0, 10).map((p) => (
                          <TableRow key={`${p.symbol}-${p.trade_type ?? ''}`}>
                            <TableCell sx={{ py: 0.5 }}>{p.symbol}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5 }}>
                              <Typography fontWeight={900} color="success.main" fontSize="0.78rem">
                                {fmtPct(p.unrealized_return_pct ?? p.return_pct ?? null)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!topPerformers || (topPerformers.best_performers ?? []).length === 0) && (
                          <TableRow><TableCell colSpan={2} align="center" sx={{ py: 3 }}>—</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" fontWeight={800} color="text.secondary" textTransform="uppercase">Worst</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ mt: 1, border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 280 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Symbol</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>Return</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(topPerformers?.worst_performers ?? []).slice(0, 10).map((p) => (
                          <TableRow key={`${p.symbol}-${p.trade_type ?? ''}`}>
                            <TableCell sx={{ py: 0.5 }}>{p.symbol}</TableCell>
                            <TableCell align="right" sx={{ py: 0.5 }}>
                              <Typography fontWeight={900} color="error.main" fontSize="0.78rem">
                                {fmtPct(p.unrealized_return_pct ?? p.return_pct ?? null)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!topPerformers || (topPerformers.worst_performers ?? []).length === 0) && (
                          <TableRow><TableCell colSpan={2} align="center" sx={{ py: 3 }}>—</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={900} gutterBottom>Bulk analyze symbols</Typography>
              <Typography variant="caption" color="text.secondary">
                Uses Seed batch analysis (max 20 symbols).
              </Typography>
              <Box mt={1.5} display="flex" flexDirection="column" gap={1}>
                <TextField
                  size="small"
                  label="Symbols (comma-separated)"
                  value={symbolsText}
                  onChange={(e) => setSymbolsText(e.target.value)}
                  placeholder="RELIANCE, HDFCBANK, TCS"
                />
                <TextField
                  size="small"
                  type="number"
                  label="Days lookback"
                  value={analyzeDays}
                  onChange={(e) => setAnalyzeDays(Number(e.target.value) || 30)}
                />
                <Button
                  variant="contained"
                  onClick={analyzeSymbols}
                  disabled={analyzing || symbolsText.trim().length === 0}
                  startIcon={analyzing ? <CircularProgress size={14} color="inherit" /> : undefined}
                  sx={{ textTransform: 'none', fontWeight: 900 }}
                >
                  {analyzing ? 'Analyzing…' : 'Analyze'}
                </Button>
                {analyzeErr && <Alert severity="error">{analyzeErr}</Alert>}
                {analyzeRes && (
                  <Box>
                    <Chip size="small" label={`${analyzeRes.analyzed_symbols} analyzed`} sx={{ mb: 1 }} />
                    <Box component="pre" sx={{ fontSize: 12, maxHeight: 260, overflow: 'auto', bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                      {JSON.stringify(analyzeRes.analysis, null, 2)}
                    </Box>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={900} gutterBottom>Data statistics</Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                <Chip size="small" variant="outlined" label={`tables: ${dataStats ? Object.keys(dataStats.table_statistics ?? {}).length : 0}`} />
                <Chip size="small" label={dataStats?.database_health ?? '—'} />
              </Box>
              <Box component="pre" sx={{ fontSize: 12, maxHeight: 360, overflow: 'auto', bgcolor: 'grey.50', p: 1.5, borderRadius: 1 }}>
                {JSON.stringify(dataStats, null, 2)}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitorTab;

