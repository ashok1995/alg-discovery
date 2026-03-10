import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  FormControlLabel,
  Switch,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box
} from '@mui/material';
import { Notifications, CheckCircle, Warning, Error as ErrorIcon, Info } from '@mui/icons-material';

interface NotificationSettingsTabProps {
  notifications: boolean;
  soundAlerts: boolean;
  emailAlerts: boolean;
  onSettingChange: (key: string, value: boolean) => void;
}

const NotificationSettingsTab: React.FC<NotificationSettingsTabProps> = ({
  notifications,
  soundAlerts,
  emailAlerts,
  onSettingChange
}) => (
  <Grid container spacing={3}>
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Notifications sx={{ mr: 1 }} />
            <Typography variant="h6">Notification Settings</Typography>
          </Box>
          <FormControlLabel
            control={
              <Switch
                checked={notifications}
                onChange={(e) => onSettingChange('notifications', e.target.checked)}
              />
            }
            label="Enable Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={soundAlerts}
                onChange={(e) => onSettingChange('soundAlerts', e.target.checked)}
                disabled={!notifications}
              />
            }
            label="Sound Alerts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={emailAlerts}
                onChange={(e) => onSettingChange('emailAlerts', e.target.checked)}
                disabled={!notifications}
              />
            }
            label="Email Alerts"
          />
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={6}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Notification Types
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText primary="Trade Executions" secondary="When orders are placed or executed" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Warning color="warning" /></ListItemIcon>
              <ListItemText primary="Risk Alerts" secondary="When risk limits are approached" />
            </ListItem>
            <ListItem>
              <ListItemIcon><ErrorIcon color="error" /></ListItemIcon>
              <ListItemText primary="System Errors" secondary="When system errors occur" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Info color="info" /></ListItemIcon>
              <ListItemText primary="Market Updates" secondary="Important market information" />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Grid>
  </Grid>
);

export default NotificationSettingsTab;
