/**
 * Read-only Seed trading economics: charges + per–trade-type opener (slippage, cooldown) + intraday cutoffs.
 * Single observability surface — not editable here (edit via System settings → Seed → opener / capital).
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
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
  Grid,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type { TradingSettingsResponse } from '../../types/apiModels';

const SeedTradingEconomyPanel: React.FC = () => {
  const [cfg, setCfg] = useState<TradingSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const c = await seedDashboardService.getTradingSettings();
      setCfg(c);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load trading settings');
      setCfg(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tradeTypes = cfg?.opener?.max_slippage_pct
    ? Object.keys(cfg.opener.max_slippage_pct).sort()
    : [];

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="subtitle1" fontWeight={800}>
          Trading economics (Seed — read-only)
        </Typography>
        <Button size="small" startIcon={<Refresh />} onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </Box>
      <Alert severity="info" sx={{ mb: 2 }}>
        Brokerage / STT / fees and per–trade-type risk windows live here for visibility only. To change values, use{' '}
        <strong>System settings → Seed (advanced) → Trading</strong> (sections <em>opener</em>, <em>capital</em> —{' '}
        <em>charges</em> is hidden there; use JSON view if you must edit the charges map).
      </Alert>
      {loading && !cfg && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {cfg && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" display="block" gutterBottom>
              Charges map (GET /api/v2/settings/trading → charges)
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(cfg.charges ?? {}).map(([k, v]) => (
                    <TableRow key={k}>
                      <TableCell sx={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{k.replace(/_/g, ' ')}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" label={typeof v === 'number' ? String(v) : JSON.stringify(v)} variant="outlined" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
          <Grid item xs={12} md={7}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" textTransform="uppercase" display="block" gutterBottom>
              Market timing &amp; risk by trade type (opener)
            </Typography>
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
              <Typography variant="body2" fontWeight={700} gutterBottom>
                Intraday entry cutoffs (global)
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Buy entries by <Chip size="small" label={cfg.opener.intraday_entry_cutoff_buy} sx={{ mx: 0.5 }} />
                · Sell entries by <Chip size="small" label={cfg.opener.intraday_entry_cutoff_sell} sx={{ mx: 0.5 }} />
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                VIX reduce / halt: {cfg.opener.vix_reduce_threshold} / {cfg.opener.vix_halt_buy_threshold} · Max per sector: {cfg.opener.max_per_sector}
              </Typography>
            </Paper>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Trade type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Max slippage %</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>Cooldown (h)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tradeTypes.map((tt) => (
                    <TableRow key={tt}>
                      <TableCell sx={{ textTransform: 'capitalize', fontSize: '0.8rem' }}>{tt.replace(/_/g, ' ')}</TableCell>
                      <TableCell align="right">{cfg.opener.max_slippage_pct[tt] ?? '—'}</TableCell>
                      <TableCell align="right">{cfg.opener.cooldown_hours[tt] ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default SeedTradingEconomyPanel;
