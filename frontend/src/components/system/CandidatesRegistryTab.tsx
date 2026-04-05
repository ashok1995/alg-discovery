import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
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
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { Refresh, Sync, Link as LinkIcon, Save } from '@mui/icons-material';
import { seedCandidatesService } from '../../services/SeedCandidatesService';
import type {
  CandidateDetailOut,
  CandidateOut,
  CoverageOut,
  KiteGapOut,
  KiteMatchIn,
  KiteMatchOut,
  SyncResultOut,
} from '../../types/apiModels';
import SymbolLink from '../ui/SymbolLink';

const statusColor = (status: string | null | undefined) => {
  const s = (status ?? 'unknown').toLowerCase();
  if (s === 'active') return '#4caf50';
  if (s === 'watchlist') return '#ff9800';
  if (s === 'blacklisted') return '#f44336';
  return '#607d8b';
};

const CandidatesRegistryTab: React.FC = () => {
  const [coverage, setCoverage] = useState<CoverageOut | null>(null);
  const [kiteGap, setKiteGap] = useState<KiteGapOut | null>(null);
  const [candidates, setCandidates] = useState<CandidateOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResultOut | null>(null);

  const [status, setStatus] = useState('');
  const [sector, setSector] = useState('');
  const [cap, setCap] = useState('');
  const [limit, setLimit] = useState(200);
  const [q, setQ] = useState('');

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [detail, setDetail] = useState<CandidateDetailOut | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [statusDraft, setStatusDraft] = useState<string>('active');
  const [statusSaving, setStatusSaving] = useState(false);

  const [matchDraft, setMatchDraft] = useState<KiteMatchIn>({ exchange: 'NSE' });
  const [matchSaving, setMatchSaving] = useState(false);
  const [matchResult, setMatchResult] = useState<KiteMatchOut | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cov, gap, list] = await Promise.all([
        seedCandidatesService.getCoverage(),
        seedCandidatesService.getKiteGap(100),
        seedCandidatesService.listCandidates({
          status: status || undefined,
          sector: sector || undefined,
          market_cap_category: cap || undefined,
          limit,
        }),
      ]);
      setCoverage(cov);
      setKiteGap(gap);
      setCandidates(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  }, [cap, limit, sector, status]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return candidates;
    return candidates.filter((c) => c.symbol.toLowerCase().includes(qq));
  }, [candidates, q]);

  const openCandidate = async (symbol: string) => {
    setSelectedSymbol(symbol);
    setDetail(null);
    setDetailError(null);
    setMatchResult(null);
    setDetailLoading(true);
    try {
      const d = await seedCandidatesService.getCandidate(symbol);
      setDetail(d);
      setStatusDraft(d.candidate_status ?? 'active');
      setMatchDraft({
        instrument_token: d.instrument_token,
        kite_symbol: d.kite_symbol,
        chartink_symbol: d.chartink_symbol,
        exchange: d.exchange ?? 'NSE',
      });
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load candidate');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedSymbol(null);
    setDetail(null);
    setDetailError(null);
    setMatchResult(null);
  };

  const forceSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await seedCandidatesService.forceSync();
      setSyncResult(res);
      await loadAll();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const saveStatus = async () => {
    if (!selectedSymbol) return;
    setStatusSaving(true);
    try {
      const updated = await seedCandidatesService.updateCandidateStatus(selectedSymbol, { status: statusDraft });
      setDetail((prev) => (prev ? { ...prev, candidate_status: updated.candidate_status } : prev));
      await loadAll();
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  };

  const saveMatch = async () => {
    if (!selectedSymbol) return;
    setMatchSaving(true);
    setMatchResult(null);
    try {
      const res = await seedCandidatesService.upsertKiteMatch(selectedSymbol, matchDraft);
      setMatchResult(res);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              instrument_token: res.instrument_token,
              kite_symbol: res.kite_symbol,
              chartink_symbol: res.chartink_symbol,
              exchange: res.exchange,
              chart_url: res.chart_url,
            }
          : prev,
      );
      await loadAll();
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to update match');
    } finally {
      setMatchSaving(false);
    }
  };

  const counts = coverage?.by_status ? Object.entries(coverage.by_status) : [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={800}>Candidate Registry</Typography>
          <Typography variant="caption" color="text.secondary">Seed candidate universe, fundamentals coverage, and Kite mapping</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search symbol…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ width: 240 }}
          />
          <Button
            size="small"
            variant="contained"
            startIcon={syncing ? <CircularProgress size={14} color="inherit" /> : <Sync fontSize="small" />}
            onClick={forceSync}
            disabled={syncing}
            sx={{ textTransform: 'none', fontWeight: 800 }}
          >
            {syncing ? 'Syncing…' : 'Sync now'}
          </Button>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={loadAll} disabled={loading}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {syncResult && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Sync complete — discovered {syncResult.discovered_candidates}, refreshed {syncResult.fundamentals_refreshed}, snapshots {syncResult.history_snapshots_inserted} ({syncResult.snapshot_date})
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={800} gutterBottom>Coverage</Typography>
              {loading && !coverage ? (
                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
              ) : coverage ? (
                <>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip label={`${coverage.total_candidates} total`} size="small" variant="outlined" />
                    <Chip label={`${coverage.sectors_covered} sectors`} size="small" variant="outlined" />
                    <Chip
                      label={`${coverage.stale_fundamentals_pct.toFixed(1)}% stale fundamentals`}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: alpha(coverage.stale_fundamentals_pct < 10 ? '#4caf50' : '#ff9800', 0.12),
                        color: coverage.stale_fundamentals_pct < 10 ? 'success.dark' : 'warning.dark',
                      }}
                    />
                  </Box>
                  <Box display="flex" gap={0.7} flexWrap="wrap">
                    {counts.map(([k, v]) => {
                      const c = statusColor(k);
                      return (
                        <Chip
                          key={k}
                          label={`${k}: ${v}`}
                          size="small"
                          sx={{ fontWeight: 700, bgcolor: alpha(c, 0.12), color: c, textTransform: 'capitalize' }}
                        />
                      );
                    })}
                  </Box>
                </>
              ) : (
                <Typography color="text.secondary">No coverage data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle1" fontWeight={800}>Kite mapping gaps</Typography>
                <Chip size="small" label={`${kiteGap?.missing_instrument_token_count ?? 0} missing token`} />
              </Box>
              {loading && !kiteGap ? (
                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 2 }} />
              ) : kiteGap ? (
                <TableContainer sx={{ maxHeight: 220 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Symbol</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Scans</TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Last seen</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {kiteGap.items.slice(0, 25).map((i) => (
                        <TableRow key={i.symbol} hover sx={{ cursor: 'pointer' }} onClick={() => openCandidate(i.symbol)}>
                          <TableCell sx={{ py: 0.5 }}>
                            <Typography fontWeight={700} fontSize="0.78rem">{i.symbol}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 0.5 }}>{i.scan_count}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {i.last_seen_in_scan_at ? new Date(i.last_seen_in_scan_at).toLocaleDateString('en-IN') : '—'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      {kiteGap.items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 3 }}>
                            <Typography color="text.secondary">No gaps</Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">No gap data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
            <Typography variant="subtitle1" fontWeight={800}>Candidates</Typography>
            <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="watchlist">watchlist</MenuItem>
                  <MenuItem value="blacklisted">blacklisted</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" label="Sector" value={sector} onChange={(e) => setSector(e.target.value)} sx={{ width: 180 }} />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Cap</InputLabel>
                <Select value={cap} label="Cap" onChange={(e) => setCap(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="large">large</MenuItem>
                  <MenuItem value="mid">mid</MenuItem>
                  <MenuItem value="small">small</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Limit</InputLabel>
                <Select value={limit} label="Limit" onChange={(e) => setLimit(Number(e.target.value))}>
                  {[50, 100, 200, 300, 500].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                </Select>
              </FormControl>
              <Button size="small" variant="outlined" onClick={loadAll} disabled={loading} sx={{ textTransform: 'none' }}>
                Apply
              </Button>
              {loading && <CircularProgress size={16} />}
              <Chip size="small" label={`${filtered.length} shown`} variant="outlined" />
            </Box>
          </Box>

          <TableContainer sx={{ maxHeight: 520 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Symbol</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Sector</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Cap</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Scans</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Last seen</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Kite token</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton variant="rectangular" height={24} sx={{ borderRadius: 1 }} /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  filtered.map((c) => {
                    const col = statusColor(c.candidate_status);
                    return (
                      <TableRow key={c.symbol} hover sx={{ cursor: 'pointer' }} onClick={() => openCandidate(c.symbol)}>
                        <TableCell sx={{ py: 0.6 }}>
                          <SymbolLink symbol={c.symbol} chartUrl={c.chart_url ?? undefined} exchange={c.exchange ?? undefined} />
                        </TableCell>
                        <TableCell sx={{ py: 0.6 }}>
                          <Chip
                            label={(c.candidate_status ?? 'unknown').replace(/_/g, ' ')}
                            size="small"
                            sx={{ fontSize: '0.62rem', height: 18, fontWeight: 700, bgcolor: alpha(col, 0.12), color: col, textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.6 }}>{c.sector ?? '—'}</TableCell>
                        <TableCell sx={{ py: 0.6 }}>{c.market_cap_category ?? '—'}</TableCell>
                        <TableCell align="right" sx={{ py: 0.6 }}>{c.scan_count}</TableCell>
                        <TableCell sx={{ py: 0.6 }}>
                          <Typography variant="caption" color="text.secondary">
                            {c.last_seen_in_scan_at ? new Date(c.last_seen_in_scan_at).toLocaleDateString('en-IN') : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 0.6 }}>
                          <Chip
                            label={c.instrument_token != null ? 'Yes' : 'No'}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.62rem', height: 18, fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {!loading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No candidates match the filters</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Candidate detail dialog */}
      <Dialog open={Boolean(selectedSymbol)} onClose={closeDetail} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>{selectedSymbol ?? 'Candidate'}</DialogTitle>
        <DialogContent dividers>
          {detailLoading && <Box display="flex" justifyContent="center" py={2}><CircularProgress /></Box>}
          {detailError && <Alert severity="error" sx={{ mb: 2 }}>{detailError}</Alert>}
          {detail && (
            <>
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                <Chip label={detail.exchange ?? '—'} size="small" variant="outlined" />
                {detail.sector && <Chip label={detail.sector} size="small" variant="outlined" />}
                {detail.market_cap_category && <Chip label={detail.market_cap_category} size="small" variant="outlined" />}
                <Chip label={`${detail.scan_count} scans`} size="small" variant="outlined" />
              </Box>

              <Typography variant="subtitle2" fontWeight={800} gutterBottom>Actions</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={800} gutterBottom>Candidate status</Typography>
                      <Box display="flex" gap={1} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <InputLabel>Status</InputLabel>
                          <Select value={statusDraft} label="Status" onChange={(e) => setStatusDraft(String(e.target.value))}>
                            <MenuItem value="active">active</MenuItem>
                            <MenuItem value="watchlist">watchlist</MenuItem>
                            <MenuItem value="blacklisted">blacklisted</MenuItem>
                          </Select>
                        </FormControl>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={statusSaving ? <CircularProgress size={14} color="inherit" /> : <Save fontSize="small" />}
                          onClick={saveStatus}
                          disabled={statusSaving}
                          sx={{ textTransform: 'none', fontWeight: 800 }}
                        >
                          Save
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight={800} gutterBottom>Kite / Chartink match</Typography>
                      <Grid container spacing={1}>
                        <Grid item xs={6}>
                          <TextField
                            size="small"
                            label="instrument_token"
                            type="number"
                            fullWidth
                            value={matchDraft.instrument_token ?? ''}
                            onChange={(e) =>
                              setMatchDraft((p) => ({ ...p, instrument_token: e.target.value ? Number(e.target.value) : null }))
                            }
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            size="small"
                            label="exchange"
                            fullWidth
                            value={matchDraft.exchange ?? ''}
                            onChange={(e) => setMatchDraft((p) => ({ ...p, exchange: e.target.value || null }))}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            size="small"
                            label="kite_symbol"
                            fullWidth
                            value={matchDraft.kite_symbol ?? ''}
                            onChange={(e) => setMatchDraft((p) => ({ ...p, kite_symbol: e.target.value || null }))}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            size="small"
                            label="chartink_symbol"
                            fullWidth
                            value={matchDraft.chartink_symbol ?? ''}
                            onChange={(e) => setMatchDraft((p) => ({ ...p, chartink_symbol: e.target.value || null }))}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={matchSaving ? <CircularProgress size={14} /> : <LinkIcon fontSize="small" />}
                            onClick={saveMatch}
                            disabled={matchSaving}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                          >
                            Update match
                          </Button>
                        </Grid>
                      </Grid>
                      {matchResult && (
                        <Alert severity="success" sx={{ mt: 1 }}>
                          Updated. Chart URL: <a href={matchResult.chart_url} target="_blank" rel="noreferrer">{matchResult.chart_url}</a>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ mb: 2 }} />

              <Typography variant="subtitle2" fontWeight={800} gutterBottom>Fundamentals</Typography>
              <Grid container spacing={1.5} sx={{ mb: 2 }}>
                {[
                  ['P/E', detail.fundamentals.pe_ratio],
                  ['P/B', detail.fundamentals.pb_ratio],
                  ['ROE', detail.fundamentals.roe],
                  ['D/E', detail.fundamentals.debt_to_equity],
                  ['Op margin', detail.fundamentals.operating_margin],
                  ['Profit margin', detail.fundamentals.profit_margin],
                ].map(([label, val]) => (
                  <Grid item xs={6} sm={2} key={label}>
                    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                      <CardContent sx={{ p: 1.2, textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>{label}</Typography>
                        <Typography variant="subtitle2" fontWeight={900}>
                          {typeof val === 'number' ? val.toFixed(2) : '—'}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle2" fontWeight={800} gutterBottom>Fundamentals history</Typography>
              <TableContainer sx={{ maxHeight: 320, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>P/E</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>P/B</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Mcap (Cr)</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Last price</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Source</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {detail.fundamentals_history.slice(0, 30).map((h) => (
                      <TableRow key={h.snapshot_date} hover>
                        <TableCell sx={{ py: 0.5 }}>{new Date(h.snapshot_date).toLocaleDateString('en-IN')}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{h.pe_ratio != null ? h.pe_ratio.toFixed(2) : '—'}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{h.pb_ratio != null ? h.pb_ratio.toFixed(2) : '—'}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{h.market_cap_cr != null ? h.market_cap_cr.toFixed(0) : '—'}</TableCell>
                        <TableCell align="right" sx={{ py: 0.5 }}>{h.last_price != null ? `₹${h.last_price.toFixed(2)}` : '—'}</TableCell>
                        <TableCell sx={{ py: 0.5 }}>{h.data_source}</TableCell>
                      </TableRow>
                    ))}
                    {detail.fundamentals_history.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                          <Typography color="text.secondary">No history</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDetail}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CandidatesRegistryTab;

