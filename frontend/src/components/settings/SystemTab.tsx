import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  alpha,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Security,
  Refresh,
  Save,
  CloudDownload,
} from '@mui/icons-material';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type { SeedSystemSettingsResponse, TradingSettingsResponse } from '../../types/apiModels';
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

  const [systemSettings, setSystemSettings] = useState<SeedSystemSettingsResponse | null>(null);
  const [systemDraft, setSystemDraft] = useState<SeedSystemSettingsResponse | null>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemSaving, setSystemSaving] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [systemSaveStatus, setSystemSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [metaOpen, setMetaOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState('');
  const [metaJson, setMetaJson] = useState<Record<string, unknown> | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [editCapital, setEditCapital] = useState<number>(100000);
  const [editMaxPerSector, setEditMaxPerSector] = useState<number>(3);
  const [editVixHalt, setEditVixHalt] = useState<number>(25);
  const [editVixReduce, setEditVixReduce] = useState<number>(18);
  const [editBuyCutoff, setEditBuyCutoff] = useState<string>('13:00');
  const [editSellCutoff, setEditSellCutoff] = useState<string>('14:30');

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
      setEditBuyCutoff(config.opener.intraday_entry_cutoff_buy);
      setEditSellCutoff(config.opener.intraday_entry_cutoff_sell);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load trading config');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSystem = useCallback(async () => {
    setSystemLoading(true);
    setSystemError(null);
    try {
      const sys = await seedDashboardService.getSystemSettings();
      setSystemSettings(sys);
      setSystemDraft(sys);
    } catch (err: unknown) {
      setSystemError(err instanceof Error ? err.message : 'Failed to load system settings');
    } finally {
      setSystemLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadSystem();
  }, [loadConfig, loadSystem]);

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
          intraday_entry_cutoff_buy: editBuyCutoff,
          intraday_entry_cutoff_sell: editSellCutoff,
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

  const numOr = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

  const handleSaveSystem = async () => {
    if (!systemDraft) return;
    setSystemSaving(true);
    setSystemSaveStatus('idle');
    try {
      await seedDashboardService.updateSystemSettings(systemDraft);
      setSystemSaveStatus('success');
      await loadSystem();
      setTimeout(() => setSystemSaveStatus('idle'), 3000);
    } catch {
      setSystemSaveStatus('error');
      setTimeout(() => setSystemSaveStatus('idle'), 3000);
    } finally {
      setSystemSaving(false);
    }
  };

  const openMeta = async (title: string, fetcher: () => Promise<Record<string, unknown>>) => {
    setMetaOpen(true);
    setMetaTitle(title);
    setMetaJson(null);
    setMetaError(null);
    setMetaLoading(true);
    try {
      const res = await fetcher();
      setMetaJson(res);
    } catch (err: unknown) {
      setMetaError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setMetaLoading(false);
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
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openMeta('Seed Trading Schema', () => seedDashboardService.getTradingSettingsSchema())}
                  disabled={loading}
                >
                  Schema
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openMeta('Seed Trading Form', () => seedDashboardService.getTradingSettingsForm())}
                  disabled={loading}
                >
                  Form
                </Button>
                <Button size="small" startIcon={<Refresh />} onClick={loadConfig} disabled={loading}>
                  Reload
                </Button>
              </Box>
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
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Buy Cutoff"
                      type="time"
                      value={editBuyCutoff}
                      onChange={(e) => setEditBuyCutoff(e.target.value)}
                      margin="normal"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Sell Cutoff"
                      type="time"
                      value={editSellCutoff}
                      onChange={(e) => setEditSellCutoff(e.target.value)}
                      margin="normal"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>

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

      {/* Seed System Settings (API limits, thresholds) */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
              <Box display="flex" alignItems="center">
                <Security sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Seed System Settings</Typography>
              </Box>
              <Box display="flex" gap={1} alignItems="center">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openMeta('Seed System Schema', () => seedDashboardService.getSystemSettingsSchema())}
                  disabled={systemLoading}
                >
                  Schema
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => openMeta('Seed System Form', () => seedDashboardService.getSystemSettingsForm())}
                  disabled={systemLoading}
                >
                  Form
                </Button>
                <Button size="small" startIcon={<Refresh />} onClick={loadSystem} disabled={systemLoading}>
                  Reload
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={systemSaving ? <CircularProgress size={16} color="inherit" /> : <Save />}
                  onClick={handleSaveSystem}
                  disabled={systemSaving || !systemDraft}
                >
                  {systemSaving ? 'Saving…' : 'Save'}
                </Button>
              </Box>
            </Box>

            {systemLoading && <Box display="flex" justifyContent="center" py={2}><CircularProgress size={24} /></Box>}
            {systemError && <Alert severity="error" sx={{ mb: 2 }}>{systemError}</Alert>}
            {systemSaveStatus === 'success' && <Alert severity="success" sx={{ mb: 2 }}>System settings saved to seed service</Alert>}
            {systemSaveStatus === 'error' && <Alert severity="error" sx={{ mb: 2 }}>Failed to save system settings</Alert>}

            {systemDraft && (
              <>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>API Limits (common)</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Default Limit"
                      type="number"
                      value={numOr(systemDraft.api_limits.limit_default, 20)}
                      onChange={(e) =>
                        setSystemDraft((prev) =>
                          prev
                            ? { ...prev, api_limits: { ...prev.api_limits, limit_default: Number(e.target.value) } }
                            : prev,
                        )
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Max Limit"
                      type="number"
                      value={numOr(systemDraft.api_limits.limit_max, 50)}
                      onChange={(e) =>
                        setSystemDraft((prev) =>
                          prev
                            ? { ...prev, api_limits: { ...prev.api_limits, limit_max: Number(e.target.value) } }
                            : prev,
                        )
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Default Dashboard Days"
                      type="number"
                      value={numOr(systemDraft.api_limits.dashboard_days_default, 7)}
                      onChange={(e) =>
                        setSystemDraft((prev) =>
                          prev
                            ? { ...prev, api_limits: { ...prev.api_limits, dashboard_days_default: Number(e.target.value) } }
                            : prev,
                        )
                      }
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      size="small"
                      label="Default Proximity %"
                      type="number"
                      value={numOr(systemDraft.api_limits.proximity_threshold_default, 2.0)}
                      onChange={(e) =>
                        setSystemDraft((prev) =>
                          prev
                            ? { ...prev, api_limits: { ...prev.api_limits, proximity_threshold_default: Number(e.target.value) } }
                            : prev,
                        )
                      }
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" fontWeight={700} mb={1}>Raw (read-only preview)</Typography>
                <Box
                  component="pre"
                  sx={{
                    fontSize: 12,
                    overflow: 'auto',
                    maxHeight: 280,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  {JSON.stringify(systemSettings, null, 2)}
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Schema/Form viewer */}
      <Dialog open={metaOpen} onClose={() => setMetaOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>{metaTitle}</DialogTitle>
        <DialogContent dividers>
          {metaLoading && <Box display="flex" justifyContent="center" py={2}><CircularProgress /></Box>}
          {metaError && <Alert severity="error" sx={{ mb: 2 }}>{metaError}</Alert>}
          {metaJson && (
            <Box component="pre" sx={{ fontSize: 12, overflow: 'auto', maxHeight: 520, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              {JSON.stringify(metaJson, null, 2)}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMetaOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Charges & Slippage read-only overview */}
      {tradingConfig && (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Security sx={{ verticalAlign: 'middle', mr: 1 }} />
                Trading Charges & Slippage Config
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>Brokerage & Charges</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small">
                      <TableBody>
                        {Object.entries(tradingConfig.charges).map(([key, val]) => (
                          <TableRow key={key}>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{key.replace(/_/g, ' ')}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={typeof val === 'number' ? val.toString() : String(val)}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.72rem' }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>Max Slippage per Trade Type</Typography>
                  <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Trade Type</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Max Slippage %</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>Cooldown (h)</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(tradingConfig.opener.max_slippage_pct).map(([tt, slip]) => (
                          <TableRow key={tt}>
                            <TableCell sx={{ fontSize: '0.8rem' }}>{tt.replace(/_/g, ' ')}</TableCell>
                            <TableCell align="right">
                              <Chip
                                label={`${slip}%`}
                                size="small"
                                sx={{
                                  fontSize: '0.72rem',
                                  bgcolor: alpha(slip <= 1.5 ? '#4caf50' : slip <= 3 ? '#ff9800' : '#f44336', 0.12),
                                  color: slip <= 1.5 ? 'success.dark' : slip <= 3 ? 'warning.dark' : 'error.dark',
                                }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ fontSize: '0.8rem' }}>
                              {tradingConfig.opener.cooldown_hours[tt] ?? 0}h
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" fontWeight={600} mb={1}>Score Allocation Tiers</Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {tradingConfig.capital.score_tiers.map(([score, fraction]) => (
                      <Chip
                        key={score}
                        label={`≥${score}: ${(fraction * 100).toFixed(0)}%`}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: alpha(score >= 90 ? '#4caf50' : score >= 80 ? '#8bc34a' : score >= 70 ? '#ff9800' : '#ff5722', 0.12),
                          color: score >= 90 ? 'success.dark' : score >= 80 ? '#558b2f' : score >= 70 ? 'warning.dark' : 'error.dark',
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      )}

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
