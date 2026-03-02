import React from 'react';
import {
  Card,
  CardContent,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Box,
} from '@mui/material';
import { Settings as SettingsIcon, Info, Schedule, DataUsage, Storage } from '@mui/icons-material';
import type { SystemSettings } from './types';

interface SystemTabProps {
  settings: SystemSettings;
  onSettingChange: (key: keyof SystemSettings, value: SystemSettings[keyof SystemSettings]) => void;
}

const SystemTab: React.FC<SystemTabProps> = ({ settings, onSettingChange }) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <SettingsIcon sx={{ mr: 1 }} />
              <Typography variant="h6">System Configuration</Typography>
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
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>System Information</Typography>
            <List dense>
              <ListItem>
                <ListItemIcon><Info color="info" /></ListItemIcon>
                <ListItemText primary="Version" secondary="2.2.0" />
              </ListItem>
              <ListItem>
                <ListItemIcon><Schedule color="info" /></ListItemIcon>
                <ListItemText primary="Last Updated" secondary="2025-01-03 14:45:00" />
              </ListItem>
              <ListItem>
                <ListItemIcon><DataUsage color="info" /></ListItemIcon>
                <ListItemText primary="Uptime" secondary="2 days, 5 hours" />
              </ListItem>
              <ListItem>
                <ListItemIcon><Storage color="info" /></ListItemIcon>
                <ListItemText primary="Database Status" secondary="Connected" />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SystemTab;
