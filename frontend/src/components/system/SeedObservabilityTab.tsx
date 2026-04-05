import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { seedObservabilityService } from '../../services/SeedObservabilityService';
import type {
  EndpointsResponse,
  ExternalPerformanceResponse,
  RegimeScoringObservabilityResponse,
  SeedEndpointPerformanceResponse,
  StreamConnectionsResponse,
} from '../../types/apiModels';

const SeedObservabilityTab: React.FC = () => {
  const [windowMinutes, setWindowMinutes] = useState(60);
  const [routes, setRoutes] = useState<EndpointsResponse | null>(null);
  const [perf, setPerf] = useState<SeedEndpointPerformanceResponse | null>(null);
  const [external, setExternal] = useState<ExternalPerformanceResponse | null>(null);
  const [regime, setRegime] = useState<RegimeScoringObservabilityResponse | null>(null);
  const [streams, setStreams] = useState<StreamConnectionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, p, e, rs, sc] = await Promise.all([
        seedObservabilityService.getRegisteredRoutes(),
        seedObservabilityService.getEndpointPerformance(windowMinutes),
        seedObservabilityService.getExternalPerformance(windowMinutes),
        seedObservabilityService.getRegimeScoringObservability(),
        seedObservabilityService.getStreamConnections(),
      ]);
      setRoutes(r);
      setPerf(p);
      setExternal(e);
      setRegime(rs);
      setStreams(sc);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load observability');
    } finally {
      setLoading(false);
    }
  }, [windowMinutes]);

  useEffect(() => {
    load();
  }, [load]);

  const slowest = useMemo(() => {
    const list = perf?.endpoints ?? [];
    return [...list].sort((a, b) => b.avg_ms - a.avg_ms).slice(0, 25);
  }, [perf?.endpoints]);

  const mostErrors = useMemo(() => {
    const list = perf?.endpoints ?? [];
    return [...list].sort((a, b) => b.error_count - a.error_count).slice(0, 15);
  }, [perf?.endpoints]);

  const byScenario = regime?.by_scenario ? Object.entries(regime.by_scenario) : [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Seed Observability</Typography>
          <Typography variant="caption" color="text.secondary">Endpoints registry, latency stats, external calls, regime scoring, streams</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Window (min)</InputLabel>
            <Select value={windowMinutes} label="Window (min)" onChange={(e) => setWindowMinutes(Number(e.target.value))}>
              {[15, 30, 60, 120, 240].map((m) => (
                <MenuItem key={m} value={m}>{m}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {loading && <CircularProgress size={16} />}
          <Chip size="small" variant="outlined" label="auto-refresh on window change" />
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>Registered routes</Typography>
              {loading && !routes ? (
                <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} />
              ) : routes ? (
                <>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip size="small" label={`${routes.total} total`} />
                    <Chip size="small" variant="outlined" label={`${new Set(routes.routes.flatMap((r) => r.tags)).size} tags`} />
                  </Box>
                  <TableContainer sx={{ maxHeight: 320 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Method</TableCell>
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Path</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {routes.routes.slice(0, 40).map((r) => (
                          <TableRow key={`${r.method}-${r.path}`} hover>
                            <TableCell sx={{ py: 0.5 }}>
                              <Chip size="small" label={r.method} variant="outlined" />
                            </TableCell>
                            <TableCell sx={{ py: 0.5 }}>
                              <Typography variant="body2" fontSize="0.74rem">{r.path}</Typography>
                              {r.tags.length > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  {r.tags.slice(0, 3).join(', ')}{r.tags.length > 3 ? '…' : ''}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </>
              ) : (
                <Typography color="text.secondary">No data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight={800}>Endpoint performance</Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {perf && <Chip size="small" label={`${perf.total_tracked_routes} tracked`} />}
                  {perf && <Chip size="small" variant="outlined" label={`uptime: ${(perf.uptime_seconds / 3600).toFixed(1)}h`} />}
                </Box>
              </Box>
              {loading && !perf ? (
                <Skeleton variant="rectangular" height={220} sx={{ borderRadius: 2 }} />
              ) : perf ? (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={7}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                      Slowest (avg ms)
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <TableContainer sx={{ maxHeight: 280 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Route</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Avg</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>p95</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Err</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {slowest.map((m) => (
                            <TableRow key={m.route} hover>
                              <TableCell sx={{ py: 0.5 }}>
                                <Typography variant="body2" fontSize="0.74rem">{m.route}</Typography>
                                <Typography variant="caption" color="text.secondary">{m.count} req</Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 0.5 }}>{m.avg_ms.toFixed(0)}</TableCell>
                              <TableCell align="right" sx={{ py: 0.5 }}>{m.p95_ms.toFixed(0)}</TableCell>
                              <TableCell align="right" sx={{ py: 0.5 }}>
                                <Chip
                                  size="small"
                                  label={m.error_count}
                                  color={m.error_count > 0 ? 'warning' : 'default'}
                                  variant={m.error_count > 0 ? 'filled' : 'outlined'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                  <Grid item xs={12} md={5}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase">
                      Most errors (count)
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <TableContainer sx={{ maxHeight: 280 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Route</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Err</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {mostErrors.map((m) => (
                            <TableRow key={m.route} hover>
                              <TableCell sx={{ py: 0.5 }}>
                                <Typography variant="body2" fontSize="0.74rem">{m.route}</Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ py: 0.5 }}>
                                <Chip size="small" label={m.error_count} color={m.error_count > 0 ? 'warning' : 'default'} />
                              </TableCell>
                            </TableRow>
                          ))}
                          {mostErrors.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} align="center" sx={{ py: 3 }}>
                                <Typography color="text.secondary">No errors recorded</Typography>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Grid>
                </Grid>
              ) : (
                <Typography color="text.secondary">No data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>External calls</Typography>
              {loading && !external ? (
                <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
              ) : external ? (
                <TableContainer sx={{ maxHeight: 320 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Service</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Avg ms</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Err</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {external.services.map((s) => (
                        <TableRow key={s.service_call} hover>
                          <TableCell sx={{ py: 0.5 }}>
                            <Typography variant="body2" fontSize="0.74rem">{s.service_call}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.count} calls</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 0.5 }}>{s.avg_ms.toFixed(0)}</TableCell>
                          <TableCell align="right" sx={{ py: 0.5 }}>
                            <Chip size="small" label={s.error_count} color={s.error_count > 0 ? 'warning' : 'default'} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">No data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight={800}>Stream connections</Typography>
                <Chip size="small" label={`${streams?.active_connections ?? 0} active`} />
              </Box>
              {loading && !streams ? (
                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
              ) : streams ? (
                <>
                  <Typography variant="body2" color="text.secondary" mb={1}>
                    Generated at: {streams.generated_at ? new Date(streams.generated_at).toLocaleString('en-IN') : '—'}
                  </Typography>
                  <Box display="flex" gap={0.7} flexWrap="wrap">
                    {(streams.connection_ids ?? []).slice(0, 20).map((id) => (
                      <Chip key={id} size="small" variant="outlined" label={id} />
                    ))}
                    {(streams.connection_ids ?? []).length === 0 && (
                      <Typography variant="body2" color="text.secondary">No active connections</Typography>
                    )}
                  </Box>
                </>
              ) : (
                <Typography color="text.secondary">No data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>Regime scoring observability</Typography>
              {loading && !regime ? (
                <Skeleton variant="rectangular" height={160} sx={{ borderRadius: 2 }} />
              ) : regime ? (
                <>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1.5}>
                    <Chip size="small" label={`timestamp: ${new Date(regime.timestamp).toLocaleString('en-IN')}`} variant="outlined" />
                  </Box>
                  <Grid container spacing={1.5}>
                    {byScenario.map(([sc, v]) => (
                      <Grid item xs={12} sm={6} md={3} key={sc}>
                        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                          <CardContent sx={{ p: 1.5 }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">
                              {sc.replace(/_/g, ' ')}
                            </Typography>
                            <Typography variant="subtitle2" fontWeight={900} sx={{ mt: 0.5 }}>
                              Favorability: {v.regime_favorability.toFixed(3)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Score adj: {v.context_score_adjustment.toFixed(2)}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </>
              ) : (
                <Typography color="text.secondary">No data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SeedObservabilityTab;

