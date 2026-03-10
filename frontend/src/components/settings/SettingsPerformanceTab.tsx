import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextField,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Storage, Speed, DataUsage } from '@mui/icons-material';
import type { SystemSettings } from './types';

interface SettingsPerformanceTabProps {
  settings: SystemSettings;
  onSettingChange: (key: keyof SystemSettings, value: SystemSettings[keyof SystemSettings]) => void;
}

const SettingsPerformanceTab: React.FC<SettingsPerformanceTabProps> = ({
  settings,
  onSettingChange,
}) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Storage sx={{ mr: 1 }} />
              <Typography variant="h6">Cache Settings</Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.cacheEnabled}
                  onChange={(e) => onSettingChange('cacheEnabled', e.target.checked)}
                />
              }
              label="Enable Caching"
            />
            <TextField
              fullWidth
              label="Cache Duration (seconds)"
              type="number"
              value={settings.cacheDuration}
              onChange={(e) => onSettingChange('cacheDuration', parseInt(e.target.value) || 300)}
              margin="normal"
              disabled={!settings.cacheEnabled}
            />
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <Speed color="success" />
                </ListItemIcon>
                <ListItemText primary="API Response Time" secondary="~150ms average" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Storage color="success" />
                </ListItemIcon>
                <ListItemText primary="Cache Hit Rate" secondary="85%" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <DataUsage color="success" />
                </ListItemIcon>
                <ListItemText primary="Memory Usage" secondary="45% of available" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Speed color="success" />
                </ListItemIcon>
                <ListItemText primary="Data Refresh Rate" secondary="Every 30 seconds" />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default SettingsPerformanceTab;
