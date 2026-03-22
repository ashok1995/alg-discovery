import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Button,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Refresh,
  Save,
  CloudDownload,
} from '@mui/icons-material';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type { TradingSettingsResponse } from '../../types/apiModels';
import type { SystemSettings } from './types';

interface SystemTabProps {
  settings: SystemSettings;
  onSettingChange: (key: keyof SystemSettings, value: SystemSettings[keyof SystemSettings]) => void;
}

const SystemTab: React.FC<SystemTabProps> = ({ settings, onSettingChange }) => {
  const [tradingConfig, setTradingConfig] = useState<TradingSettingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [editCapital, setEditCapital] = useState<number>(100000);
  const [editMaxPerSector, setEditMaxPerSector] = useState<number>(3);
  const [editVixHalt, setEditVixHalt] = useState<number>(25);
  const [editVixReduce, setEditVixReduce] = useState<number>(18);
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await seedDashboardService.getTradingSettings();
      setTradingConfig(config);
      setEditCapital(config.capital.capital_per_stock);
      setEditMaxPerSector(config.opener.max_per_sector);
      setEditVixHalt(config.opener.vix_halt_buy_threshold);
      setEditVixReduce(config.opener.vix_reduce_threshold);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load trading config');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSaveConfig = async () => {
    setSaving(true);
    setSaveStatus('idle');
    try {
      await seedDashboardService.updateTradingSettings({
        capital: {
          capital_per_stock: editCapital,
          score_tiers: tradingConfig?.capital.score_tiers ?? [],
          fallback_fraction: tradingConfig?.capital.fallback_fraction ?? 0.15,
        },
        opener: {
          max_per_sector: editMaxPerSector,
          vix_halt_buy_threshold: editVixHalt,
          vix_reduce_threshold: editVixReduce,
          intraday_entry_cutoff_buy: tradingConfig?.opener.intraday_entry_cutoff_buy ?? '13:00',
          intraday_entry_cutoff_sell: tradingConfig?.opener.intraday_entry_cutoff_sell ?? '14:30',
          max_slippage_pct: tradingConfig?.opener.max_slippage_pct ?? {},
          cooldown_hours: tradingConfig?.opener.cooldown_hours ?? {},
        },
      } as Partial<TradingSettingsResponse>);
      setSaveStatus('success');
      loadConfig();
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: unknown) {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Grid container spacing={3}>
      {/* Local System Config */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SettingsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Local System Configuration</Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.debugMode}
                  onChange={(e) => onSettingChange('debugMode', e.target.checked)}
                />
              }
              label="Debug Mode"
            />
            <TextField
              fullWidth
              select
              label="Log Level"
              value={settings.logLevel}
              onChange={(e) => onSettingChange('logLevel', e.target.value as SystemSettings['logLevel'])}
              margin="normal"
              SelectProps={{ native: true }}
            >
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </TextField>
          </CardContent>
        </Card>
      </Grid>

      {/* Seed Trading Config - loaded from API */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center">
                <CloudDownload sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Seed Service Config</Typography>
              </Box>
              <Button size="small" startIcon={<Refresh />} onClick={loadConfig} disabled={loading}>
                Reload
              </Button>
            </Box>

            {loading && <Box display="flex" justifyContent="center" py={2}><CircularProgress size={28} /></Box>}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {saveStatus === 'success' && <Alert severity="success" sx={{ mb: 2 }}>Config saved to seed service</Alert>}
            {saveStatus === 'error' && <Alert severity="error" sx={{ mb: 2 }}>Failed to save config</Alert>}

            {tradingConfig && !loading && (
              <>
                <TextField
                  fullWidth
                  label="Capital per Stock (₹)"
                  type="number"
                  value={editCapital}
                  onChange={(e) => setEditCapital(parseFloat(e.target.value) || 0)}
                  margin="normal"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Max Positions per Sector"
                  type="number"
                  value={editMaxPerSector}
                  onChange={(e) => setEditMaxPerSector(parseInt(e.target.value) || 0)}
                  margin="normal"
                  size="small"
                />
                <TextField
                  fullWidth
                  label="VIX Halt Buy Threshold"
                  type="number"
                  value={editVixHalt}
                  onChange={(e) => setEditVixHalt(parseFloat(e.target.value) || 0)}
                  margin="normal"
                  size="small"
                  helperText="Stop opening new buys when VIX exceeds this"
                />
                <TextField
                  fullWidth
                  label="VIX Reduce Threshold"
                  type="number"
                  value={editVixReduce}
                  onChange={(e) => setEditVixReduce(parseFloat(e.target.value) || 0)}
                  margin="normal"
                  size="small"
                />
                <Alert severity="info" sx={{ mt: 1 }}>
                  Intraday entry cutoffs and per–trade-type slippage/cooldowns are shown under{' '}
                  <strong>Observability → Trading economics</strong>. Edit them via{' '}
                  <strong>System settings → Seed (advanced) → Trading</strong> (opener section or JSON).
                </Alert>

                <Box display="flex" justifyContent="flex-end" mt={2}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                    onClick={handleSaveConfig}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save to Seed Service'}
                  </Button>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Tracker & Learning Config (read-only) */}
      {tradingConfig && (
        <Grid item xs={12}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Position Tracker Config</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(tradingConfig.tracker as Record<string, unknown>).map(([key, val]) => (
                          <TableRow key={key}>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{key.replace(/_/g, ' ')}</TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.8rem' }}>
                              {typeof val === 'object' && val !== null ? (
                                <Box display="flex" gap={0.5} flexWrap="wrap" justifyContent="flex-end">
                                  {Object.entries(val as Record<string, unknown>).map(([k, v]) => (
                                    <Chip key={k} label={`${k.replace(/_/g, ' ')}: ${v}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />
                                  ))}
                                </Box>
                              ) : (
                                <Chip label={String(val)} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                              )}
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
                  <Typography variant="h6" gutterBottom>ML / Learning Config</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(tradingConfig.learning as Record<string, unknown>).map(([key, val]) => (
                          <TableRow key={key}>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{key.replace(/_/g, ' ')}</TableCell>
                            <TableCell align="right">
                              <Chip label={String(val)} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      )}
    </Grid>
  );
};

export default SystemTab;
