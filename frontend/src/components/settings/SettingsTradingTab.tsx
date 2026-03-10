import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Settings as SettingsIcon, Speed } from '@mui/icons-material';
import type { SystemSettings } from './types';

interface SettingsTradingTabProps {
  settings: SystemSettings;
  onSettingChange: (key: keyof SystemSettings, value: SystemSettings[keyof SystemSettings]) => void;
}

const SettingsTradingTab: React.FC<SettingsTradingTabProps> = ({ settings, onSettingChange }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SettingsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">Trading Preferences</Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoRefresh}
                  onChange={(e) => onSettingChange('autoRefresh', e.target.checked)}
                />
              }
              label="Auto Refresh"
            />
            <TextField
              fullWidth
              label="Refresh Interval (seconds)"
              type="number"
              value={settings.refreshInterval}
              onChange={(e) => onSettingChange('refreshInterval', parseInt(e.target.value) || 30)}
              margin="normal"
              disabled={!settings.autoRefresh}
            />
            <TextField
              fullWidth
              label="Max Positions"
              type="number"
              value={settings.maxPositions}
              onChange={(e) => onSettingChange('maxPositions', parseInt(e.target.value) || 5)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Default Stop Loss (%)"
              type="number"
              value={settings.defaultStopLoss}
              onChange={(e) => onSettingChange('defaultStopLoss', parseFloat(e.target.value) || 2)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Default Target (%)"
              type="number"
              value={settings.defaultTarget}
              onChange={(e) => onSettingChange('defaultTarget', parseFloat(e.target.value) || 5)}
              margin="normal"
            />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Speed sx={{ mr: 1 }} />
              <Typography variant="h6">Market Hours</Typography>
            </Box>
            <TextField
              fullWidth
              label="Market Start Time"
              type="time"
              value={settings.marketHours.start}
              onChange={(e) =>
                onSettingChange('marketHours', {
                  ...settings.marketHours,
                  start: e.target.value,
                })
              }
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Market End Time"
              type="time"
              value={settings.marketHours.end}
              onChange={(e) =>
                onSettingChange('marketHours', {
                  ...settings.marketHours,
                  end: e.target.value,
                })
              }
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SettingsTradingTab;
