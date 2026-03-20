import React from 'react';
import {
  Card,
  CardContent,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Divider,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Slider,
} from '@mui/material';
import { Settings as SettingsIcon, Speed, Schedule, InfoOutlined } from '@mui/icons-material';
import type { SystemSettings } from './types';

interface TradingTabProps {
  settings: SystemSettings;
  onSettingChange: (key: keyof SystemSettings, value: SystemSettings[keyof SystemSettings]) => void;
}

const MAX_RESULTS_OPTIONS = [10, 20, 50, 100] as const;

const TradingTab: React.FC<TradingTabProps> = ({ settings, onSettingChange }) => {
  const pw = settings.positionWindows;

  const setIntraday = (patch: Partial<SystemSettings['positionWindows']['intraday']>): void => {
    onSettingChange('positionWindows', {
      ...settings.positionWindows,
      intraday: { ...settings.positionWindows.intraday, ...patch },
    });
  };

  const setOther = (patch: Partial<SystemSettings['positionWindows']['other']>): void => {
    onSettingChange('positionWindows', {
      ...settings.positionWindows,
      other: { ...settings.positionWindows.other, ...patch },
    });
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
              <InfoOutlined color="info" fontSize="small" sx={{ mt: 0.25 }} />
              <Typography variant="body2" color="text.secondary">
                <strong>Auto refresh</strong> applies to the <strong>Recommendations</strong> page: data refetches on a timer{' '}
                <strong>only while you stay on that route</strong> and the <strong>browser tab is visible</strong>. Navigating away
                stops timers for that page — other screens are not polled in the background.
              </Typography>
            </Box>
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SettingsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Auto refresh</Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoRefresh}
                  onChange={(e) => onSettingChange('autoRefresh', e.target.checked)}
                />
              }
              label="Enable timed refresh on Recommendations"
            />
            <TextField
              fullWidth
              label="Interval (seconds)"
              type="number"
              value={settings.refreshInterval}
              onChange={(e) => onSettingChange('refreshInterval', Math.max(5, parseInt(e.target.value, 10) || 30))}
              margin="normal"
              disabled={!settings.autoRefresh}
              helperText="Minimum 5s. Uses your device clock; visible tab only."
              inputProps={{ min: 5 }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Speed sx={{ mr: 1 }} />
              <Typography variant="h6">Recommendations (Seed API)</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Seed OpenAPI: <code>trade_type</code>, <code>limit</code>, <code>min_score</code> only — no <code>risk_level</code>{' '}
              on GET /v2/recommendations.
            </Typography>
            <Typography gutterBottom>Min score: {settings.recommendationsMinScore}</Typography>
            <Slider
              value={settings.recommendationsMinScore}
              onChange={(_, v) => onSettingChange('recommendationsMinScore', v as number)}
              min={50}
              max={95}
              step={5}
              valueLabelDisplay="auto"
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth size="small">
              <InputLabel>Max results (limit)</InputLabel>
              <Select
                value={settings.recommendationsMaxResults}
                label="Max results (limit)"
                onChange={(e) => onSettingChange('recommendationsMaxResults', Number(e.target.value))}
              >
                {MAX_RESULTS_OPTIONS.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SettingsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Trading defaults</Typography>
            </Box>
            <TextField
              fullWidth
              label="Max positions"
              type="number"
              value={settings.maxPositions}
              onChange={(e) => onSettingChange('maxPositions', parseInt(e.target.value, 10) || 0)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Default stop loss (%)"
              type="number"
              value={settings.defaultStopLoss}
              onChange={(e) => onSettingChange('defaultStopLoss', parseFloat(e.target.value) || 0)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Default target (%)"
              type="number"
              value={settings.defaultTarget}
              onChange={(e) => onSettingChange('defaultTarget', parseFloat(e.target.value) || 0)}
              margin="normal"
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule sx={{ mr: 1 }} />
              <Typography variant="h6">Intraday — session &amp; cutoffs</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Local UI hints for open/close (e.g. 9:30–15:25 session, entry by 14:30, exit by 15:22). Seed opener rules remain
              authoritative on the server.
            </Typography>
            <TextField
              fullWidth
              label="Session open"
              type="time"
              value={pw.intraday.sessionOpen}
              onChange={(e) => setIntraday({ sessionOpen: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Session close"
              type="time"
              value={pw.intraday.sessionClose}
              onChange={(e) => setIntraday({ sessionClose: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Latest new entry"
              type="time"
              value={pw.intraday.entryCutoff ?? '14:30'}
              onChange={(e) => setIntraday({ entryCutoff: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Latest exit"
              type="time"
              value={pw.intraday.exitCutoff ?? '15:22'}
              onChange={(e) => setIntraday({ exitCutoff: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Schedule sx={{ mr: 1 }} />
              <Typography variant="h6">Swing / long / short — session</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Wider window for non-intraday styles (e.g. 9:15–15:29). Optional entry/exit cutoffs if you add them later.
            </Typography>
            <TextField
              fullWidth
              label="Session open"
              type="time"
              value={pw.other.sessionOpen}
              onChange={(e) => setOther({ sessionOpen: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Session close"
              type="time"
              value={pw.other.sessionClose}
              onChange={(e) => setOther({ sessionClose: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Latest new entry (optional)"
              type="time"
              value={pw.other.entryCutoff ?? ''}
              onChange={(e) => setOther({ entryCutoff: e.target.value || undefined })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              helperText="Leave empty to use session close"
            />
            <TextField
              fullWidth
              label="Latest exit (optional)"
              type="time"
              value={pw.other.exitCutoff ?? ''}
              onChange={(e) => setOther({ exitCutoff: e.target.value || undefined })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default TradingTab;
