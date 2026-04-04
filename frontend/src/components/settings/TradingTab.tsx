import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
  Alert,
} from '@mui/material';
import { Settings as SettingsIcon, Speed, InfoOutlined } from '@mui/icons-material';
import type { SystemSettings } from './types';

interface TradingTabProps {
  settings: SystemSettings;
  onSettingChange: (key: keyof SystemSettings, value: SystemSettings[keyof SystemSettings]) => void;
}

const MAX_RESULTS_OPTIONS = [10, 20, 50, 100] as const;

const TradingTab: React.FC<TradingTabProps> = ({ settings, onSettingChange }) => {
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

      <Grid item xs={12}>
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Session &amp; market timing</strong> (entry/exit cutoffs and per–trade-type slippage) are centralized on{' '}
            <Box component={RouterLink} to="/observability" sx={{ fontWeight: 700 }}>Observability → Trading economics</Box>{' '}
            (read-only) and edited via <strong>System settings → Seed (advanced) → Trading</strong> (<em>opener</em>).
            Local “position window” hints were removed to avoid duplicating Seed rules.
          </Typography>
        </Alert>
      </Grid>
    </Grid>
  );
};

export default TradingTab;
