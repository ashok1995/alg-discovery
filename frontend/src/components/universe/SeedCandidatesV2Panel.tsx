/**
 * Seed /api/v2/candidates* — list, coverage, kite-gap, status & match (see candidates-ui-integration.md).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Grid,
  IconButton,
  Tooltip,
  Link,
  Snackbar,
} from '@mui/material';
import { Refresh, OpenInNew, Link as LinkIcon, Sync } from '@mui/icons-material';
import { API_CONFIG } from '../../config/api';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type {
  CandidateOutV2,
  CandidateDetailOutV2,
  CoverageOutV2,
  KiteGapOutV2,
  CandidateStatusV2,
} from '../../types/candidatesV2';

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'watchlist', label: 'Watchlist' },
  { value: 'blacklisted', label: 'Blacklisted' },
];

const CAP_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'Any cap' },
  { value: 'large', label: 'Large' },
  { value: 'mid', label: 'Mid' },
  { value: 'small', label: 'Small' },
];

const formatNum = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

const SeedCandidatesV2Panel: React.FC = () => {
  const [list, setList] = useState<CandidateOutV2[]>([]);
  const [coverage, setCoverage] = useState<CoverageOutV2 | null>(null);
  const [kiteGap, setKiteGap] = useState<KiteGapOutV2 | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [status, setStatus] = useState('');
  const [sector, setSector] = useState('');
  const [cap, setCap] = useState('');
  const [limit, setLimit] = useState(100);

  const [detail, setDetail] = useState<CandidateDetailOutV2 | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [matchSymbol, setMatchSymbol] = useState<string | null>(null);
  const [matchToken, setMatchToken] = useState('');
  const [matchKiteSym, setMatchKiteSym] = useState('');
  const [matchBusy, setMatchBusy] = useState(false);

  const [syncBusy, setSyncBusy] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [cov, gap, rows] = await Promise.all([
        seedDashboardService.getCandidatesObservabilityCoverage(),
        seedDashboardService.getCandidatesKiteGap(80),
        seedDashboardService.listCandidates({
          ...(status ? { status } : {}),
          ...(sector.trim() ? { sector: sector.trim() } : {}),
          ...(cap ? { market_cap_category: cap } : {}),
          limit: Math.min(500, Math.max(1, limit)),
        }),
      ]);
      setCoverage(cov);
      setKiteGap(gap);
      setList(Array.isArray(rows) ? rows : []);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load candidates');
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [status, sector, cap, limit]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const openDetail = async (symbol: string) => {
    try {
      const d = await seedDashboardService.getCandidateDetail(symbol, 26);
      setDetail(d);
      setDetailOpen(true);
    } catch (e: unknown) {
      setSnack({
        open: true,
        msg: e instanceof Error ? e.message : 'Detail load failed',
        severity: 'error',
      });
    }
  };

  const changeStatus = async (symbol: string, next: CandidateStatusV2) => {
    try {
      await seedDashboardService.updateCandidateStatus(symbol, { status: next });
      setSnack({ open: true, msg: `${symbol} → ${next}`, severity: 'success' });
      await loadAll();
    } catch (e: unknown) {
      setSnack({
        open: true,
        msg: e instanceof Error ? e.message : 'Status update failed',
        severity: 'error',
      });
    }
  };

  const submitMatch = async () => {
    if (!matchSymbol) return;
    const token = matchToken.trim() ? parseInt(matchToken, 10) : NaN;
    const hasToken = Number.isFinite(token) && token >= 1;
    const hasKite = matchKiteSym.trim().length > 0;
    if (!hasToken && !hasKite) {
      setSnack({ open: true, msg: 'Enter instrument_token and/or kite_symbol', severity: 'error' });
      return;
    }
    setMatchBusy(true);
    try {
      const body: { instrument_token?: number; kite_symbol?: string } = {};
      if (hasToken) body.instrument_token = token;
      if (hasKite) body.kite_symbol = matchKiteSym.trim();
      const out = await seedDashboardService.updateCandidateKiteMatch(matchSymbol, body);
      setSnack({
        open: true,
        msg: `Matched ${out.symbol} · chart URL updated`,
        severity: 'success',
      });
      setMatchSymbol(null);
      setMatchToken('');
      setMatchKiteSym('');
      await loadAll();
    } catch (e: unknown) {
      setSnack({
        open: true,
        msg: e instanceof Error ? e.message : 'Match failed',
        severity: 'error',
      });
    } finally {
      setMatchBusy(false);
    }
  };

  const runSync = async () => {
    if (!window.confirm('Run full candidate sync? This may take a minute.')) return;
    setSyncBusy(true);
    try {
      const r = await seedDashboardService.syncCandidates();
      setSnack({
        open: true,
        msg: `Sync: +${r.discovered_candidates} candidates, ${r.fundamentals_refreshed} fundamentals refreshed`,
        severity: 'success',
      });
      await loadAll();
    } catch (e: unknown) {
      setSnack({
        open: true,
        msg: e instanceof Error ? e.message : 'Sync failed',
        severity: 'error',
      });
    } finally {
      setSyncBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>
            Candidate registry (API v2)
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            <code>/api/v2/candidates</code>, observability, Kite match — Seed base{' '}
            <code>{API_CONFIG.SEED_API_BASE_URL}</code>
          </Typography>
        </Box>
        <Box display="flex" gap={1} flexWrap="wrap">
          <Tooltip title="POST /api/v2/candidates/sync">
            <Button
              size="small"
              variant="outlined"
              startIcon={syncBusy ? <CircularProgress size={14} /> : <Sync />}
              onClick={() => void runSync()}
              disabled={syncBusy}
              sx={{ textTransform: 'none' }}
            >
              Force sync
            </Button>
          </Tooltip>
          <Button
            size="small"
            variant="contained"
            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <Refresh />}
            onClick={() => void loadAll()}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {err && (
        <Alert severity="error" onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      {/* Coverage KPIs */}
      {coverage && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase">
            Coverage — GET /api/v2/candidates/observability/coverage
          </Typography>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" fontWeight={800}>{coverage.total_candidates}</Typography>
              <Typography variant="caption" color="text.secondary">Total candidates</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" fontWeight={800}>{coverage.sectors_covered}</Typography>
              <Typography variant="caption" color="text.secondary">Sectors</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="h6" fontWeight={800} color="warning.main">
                {(coverage.stale_fundamentals_pct ?? 0).toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">Stale fundamentals</Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box display="flex" gap={0.5} flexWrap="wrap">
                {Object.entries(coverage.by_status || {}).map(([k, v]) => (
                  <Chip key={k} size="small" label={`${k}: ${v}`} variant="outlined" sx={{ textTransform: 'capitalize' }} />
                ))}
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Kite gap */}
      {kiteGap && (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" display="block" gutterBottom>
            Kite gap — GET /api/v2/candidates/observability/kite-gap (missing instrument_token: {kiteGap.missing_instrument_token_count})
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Scan count</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(kiteGap.items ?? []).slice(0, 15).map((row) => (
                  <TableRow key={row.symbol}>
                    <TableCell>
                      <Typography fontWeight={700} fontSize="0.8rem">{row.symbol}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        CI: {row.chartink_symbol ?? '—'} · Kite: {row.kite_symbol ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.scan_count}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<LinkIcon />}
                        onClick={() => {
                          setMatchSymbol(row.symbol);
                          setMatchKiteSym(row.kite_symbol ?? row.symbol);
                          setMatchToken('');
                        }}
                        sx={{ textTransform: 'none' }}
                      >
                        Link Kite
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                {STATUS_FILTERS.map((o) => (
                  <MenuItem key={o.value || 'all'} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              size="small"
              fullWidth
              label="Sector (exact)"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <FormControl size="small" fullWidth>
              <InputLabel>Cap</InputLabel>
              <Select value={cap} label="Cap" onChange={(e) => setCap(e.target.value)}>
                {CAP_FILTERS.map((o) => (
                  <MenuItem key={o.value || 'any'} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={2}>
            <TextField
              size="small"
              fullWidth
              type="number"
              label="Limit"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value) || 100)}
              inputProps={{ min: 1, max: 500 }}
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button fullWidth variant="outlined" onClick={() => void loadAll()} disabled={loading} sx={{ textTransform: 'none' }}>
              Apply
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* List */}
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell>Cap</TableCell>
              <TableCell align="right">Scan</TableCell>
              <TableCell>Token</TableCell>
              <TableCell>Chart</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading && list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : (
              list.map((c) => (
                <TableRow key={c.symbol} hover>
                  <TableCell>
                    <Typography fontWeight={700} fontSize="0.8rem">{c.symbol}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block" noWrap title={c.name ?? ''}>
                      {c.name ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={c.candidate_status ?? '—'}
                      sx={{ textTransform: 'capitalize', fontSize: '0.65rem' }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 120 }} title={c.sector ?? ''}>
                    <Typography variant="body2" fontSize="0.75rem" noWrap>{c.sector ?? '—'}</Typography>
                  </TableCell>
                  <TableCell>{c.market_cap_category ?? '—'}</TableCell>
                  <TableCell align="right">{c.scan_count}</TableCell>
                  <TableCell>{c.instrument_token != null ? String(c.instrument_token) : '—'}</TableCell>
                  <TableCell>
                    {c.chart_url ? (
                      <Tooltip title="Open chart">
                        <IconButton size="small" href={c.chart_url} target="_blank" rel="noopener noreferrer">
                          <OpenInNew fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => void openDetail(c.symbol)} sx={{ textTransform: 'none', mr: 0.5 }}>
                      Detail
                    </Button>
                    <FormControl size="small" sx={{ minWidth: 118 }}>
                      <InputLabel id={`st-${c.symbol}`}>Status</InputLabel>
                      <Select
                        labelId={`st-${c.symbol}`}
                        label="Status"
                        value={
                          c.candidate_status === 'active' ||
                          c.candidate_status === 'watchlist' ||
                          c.candidate_status === 'blacklisted'
                            ? c.candidate_status
                            : ''
                        }
                        onChange={(e) => {
                          const v = e.target.value as CandidateStatusV2;
                          if (v && v !== c.candidate_status) void changeStatus(c.symbol, v);
                        }}
                        sx={{ fontSize: '0.72rem', height: 32 }}
                      >
                        <MenuItem value="" disabled sx={{ fontSize: '0.72rem' }}>
                          <em>Unset</em>
                        </MenuItem>
                        <MenuItem value="active">active</MenuItem>
                        <MenuItem value="watchlist">watchlist</MenuItem>
                        <MenuItem value="blacklisted">blacklisted</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary">
        PE / PB / ROE: open row <strong>Detail</strong> — GET <code>/api/v2/candidates/&lt;symbol&gt;</code>
        {list.length > 0 ? ` · Showing ${list.length} rows` : ''}
      </Typography>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{detail?.symbol ?? 'Candidate'}</DialogTitle>
        <DialogContent dividers>
          {detail && (
            <Box display="flex" flexDirection="column" gap={2}>
              <Grid container spacing={1}>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Sector</Typography><Typography variant="body2">{detail.sector ?? '—'}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">Market cap (cr)</Typography><Typography variant="body2">{formatNum(detail.market_cap_cr)}</Typography></Grid>
                <Grid item xs={6} sm={4}><Typography variant="caption" color="text.secondary">PE / PB / ROE</Typography><Typography variant="body2">{formatNum(detail.fundamentals.pe_ratio)} / {formatNum(detail.fundamentals.pb_ratio)} / {formatNum(detail.fundamentals.roe)}</Typography></Grid>
              </Grid>
              {detail.chart_url && (
                <Link href={detail.chart_url} target="_blank" rel="noopener noreferrer">
                  Open chart <OpenInNew sx={{ fontSize: 14, verticalAlign: 'middle' }} />
                </Link>
              )}
              <Typography variant="caption" fontWeight={700}>Fundamentals history ({detail.fundamentals_history?.length ?? 0} weeks)</Typography>
              <TableContainer sx={{ maxHeight: 240 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell align="right">PE</TableCell>
                      <TableCell align="right">ROE</TableCell>
                      <TableCell align="right">M cap cr</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(detail.fundamentals_history ?? []).slice(0, 20).map((h) => (
                      <TableRow key={h.snapshot_date}>
                        <TableCell>{h.snapshot_date}</TableCell>
                        <TableCell align="right">{formatNum(h.pe_ratio)}</TableCell>
                        <TableCell align="right">{formatNum(h.roe)}</TableCell>
                        <TableCell align="right">{formatNum(h.market_cap_cr)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!matchSymbol} onClose={() => !matchBusy && setMatchSymbol(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Link Kite — {matchSymbol}</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} sx={{ pt: 1 }}>
            <TextField
              label="instrument_token"
              type="number"
              fullWidth
              size="small"
              value={matchToken}
              onChange={(e) => setMatchToken(e.target.value)}
              helperText="From Kite instruments API / CSV"
            />
            <TextField
              label="kite_symbol (optional)"
              fullWidth
              size="small"
              value={matchKiteSym}
              onChange={(e) => setMatchKiteSym(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMatchSymbol(null)} disabled={matchBusy}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitMatch()} disabled={matchBusy}>
            {matchBusy ? <CircularProgress size={18} /> : 'PUT /match'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.msg}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
};

export default SeedCandidatesV2Panel;
