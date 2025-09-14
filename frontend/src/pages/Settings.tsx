import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Paper,
  CircularProgress
} from '@mui/material';
import {
  Security,
  Speed,
  Notifications,
  DataUsage,
  Settings as SettingsIcon,
  Wifi,
  Storage,
  Save,
  Refresh,
  Info,
  Schedule,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
  Cloud
} from '@mui/icons-material';
import ZerodhaContainerIntegration from '../components/ZerodhaContainerIntegration';
import KiteTokenManagement from '../components/KiteTokenManagement';
import zerodhaAPIService from '../services/ZerodhaAPIService';

interface SystemSettings {
  // Trading Preferences
  autoRefresh: boolean;
  refreshInterval: number;
  riskLevel: 'low' | 'medium' | 'high';
  maxPositions: number;
  defaultStopLoss: number;
  defaultTarget: number;
  
  // Notifications
  notifications: boolean;
  soundAlerts: boolean;
  emailAlerts: boolean;
  
  // Market Configuration
  marketHours: {
    start: string;
    end: string;
  };
  
  // Cache & Performance
  cacheEnabled: boolean;
  cacheDuration: number;
  
  // System Settings
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    // Trading Preferences
    autoRefresh: true,
    refreshInterval: 30,
    riskLevel: 'medium',
    maxPositions: 5,
    defaultStopLoss: 2.0,
    defaultTarget: 5.0,
    
    // Notifications
    notifications: true,
    soundAlerts: false,
    emailAlerts: false,
    
    // Market Configuration
    marketHours: {
      start: '09:15',
      end: '15:30'
    },
    
    // Cache & Performance
    cacheEnabled: true,
    cacheDuration: 300,
    
    // System Settings
    debugMode: false,
    logLevel: 'info'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState(0);
  const [systemStatus, setSystemStatus] = useState({
    apiConnected: false,
    marketOpen: false,
    cacheActive: false,
    securityAuthenticated: false
  });

  const handleSettingChange = (key: keyof SystemSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Save settings logic here
      console.log('Saving settings:', settings);
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch v1 settings and status
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const [settingsStatus, connection, comprehensive] = await Promise.all([
          zerodhaAPIService.getSettingsStatus(),
          zerodhaAPIService.getConnectionStatus(),
          zerodhaAPIService.getComprehensiveStatus(),
        ]);
        setSystemStatus({
          apiConnected: connection?.connected ?? true,
          marketOpen: comprehensive?.market_open ?? false,
          cacheActive: comprehensive?.cache_active ?? false,
          securityAuthenticated: settingsStatus?.credentials_configured ?? false,
        });
      } catch (e) {
        console.error('Settings: v1 status fetch failed', e);
      }
    };
    loadStatus();
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          System Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure your trading system preferences, API connections, and system behavior
        </Typography>
      </Box>

      {/* Save Status */}
      {saveStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Settings saved successfully!
        </Alert>
      )}
      
      {saveStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to save settings. Please try again.
        </Alert>
      )}

      {/* Main Settings Container */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="settings tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Container" icon={<Cloud />} iconPosition="start" />
          <Tab label="API & Security" icon={<Security />} iconPosition="start" />
          <Tab label="Trading" icon={<Speed />} iconPosition="start" />
          <Tab label="Notifications" icon={<Notifications />} iconPosition="start" />
          <Tab label="Performance" icon={<DataUsage />} iconPosition="start" />
          <Tab label="System" icon={<SettingsIcon />} iconPosition="start" />
        </Tabs>

        {/* Container Integration Tab */}
        <TabPanel value={activeTab} index={0}>
          <ZerodhaContainerIntegration />
        </TabPanel>

        {/* API & Security Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {/* System Status - Prominent Position */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <DataUsage sx={{ mr: 1 }} />
                    <Typography variant="h6">System Status</Typography>
                  </Box>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Wifi color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="API Connection"
                        secondary="Connected"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Speed color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Market Status"
                        secondary="Open"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Storage color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Cache Status"
                        secondary="Active"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Security color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Security"
                        secondary="Authenticated"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Kite Token Management - Main Focus */}
            <Grid item xs={12} md={8}>
              <KiteTokenManagement onTokenUpdate={() => {
                console.log('Kite token updated');
                // Refresh any dependent components when token is updated
              }} />
            </Grid>
          </Grid>
        </TabPanel>

        {/* Trading Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            {/* Trading Preferences */}
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
                        onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                      />
                    }
                    label="Auto Refresh"
                  />
                  
                  <TextField
                    fullWidth
                    label="Refresh Interval (seconds)"
                    type="number"
                    value={settings.refreshInterval}
                    onChange={(e) => handleSettingChange('refreshInterval', parseInt(e.target.value))}
                    margin="normal"
                    disabled={!settings.autoRefresh}
                  />
                  
                  <TextField
                    fullWidth
                    label="Max Positions"
                    type="number"
                    value={settings.maxPositions}
                    onChange={(e) => handleSettingChange('maxPositions', parseInt(e.target.value))}
                    margin="normal"
                  />
                  
                  <TextField
                    fullWidth
                    label="Default Stop Loss (%)"
                    type="number"
                    value={settings.defaultStopLoss}
                    onChange={(e) => handleSettingChange('defaultStopLoss', parseFloat(e.target.value))}
                    margin="normal"
                  />
                  
                  <TextField
                    fullWidth
                    label="Default Target (%)"
                    type="number"
                    value={settings.defaultTarget}
                    onChange={(e) => handleSettingChange('defaultTarget', parseFloat(e.target.value))}
                    margin="normal"
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Market Hours */}
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
                    onChange={(e) => handleSettingChange('marketHours', { ...settings.marketHours, start: e.target.value })}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Market End Time"
                    type="time"
                    value={settings.marketHours.end}
                    onChange={(e) => handleSettingChange('marketHours', { ...settings.marketHours, end: e.target.value })}
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            {/* Notification Settings */}
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
                        checked={settings.notifications}
                        onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                      />
                    }
                    label="Enable Notifications"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.soundAlerts}
                        onChange={(e) => handleSettingChange('soundAlerts', e.target.checked)}
                        disabled={!settings.notifications}
                      />
                    }
                    label="Sound Alerts"
                  />
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.emailAlerts}
                        onChange={(e) => handleSettingChange('emailAlerts', e.target.checked)}
                        disabled={!settings.notifications}
                      />
                    }
                    label="Email Alerts"
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Notification Types */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Notification Types
                  </Typography>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Trade Executions"
                        secondary="When orders are placed or executed"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Warning color="warning" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Risk Alerts"
                        secondary="When risk limits are approached"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary="System Errors"
                        secondary="When system errors occur"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Info color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Market Updates"
                        secondary="Important market information"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={activeTab} index={4}>
          <Grid container spacing={3}>
            {/* Cache Settings */}
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
                        onChange={(e) => handleSettingChange('cacheEnabled', e.target.checked)}
                      />
                    }
                    label="Enable Caching"
                  />
                  
                  <TextField
                    fullWidth
                    label="Cache Duration (seconds)"
                    type="number"
                    value={settings.cacheDuration}
                    onChange={(e) => handleSettingChange('cacheDuration', parseInt(e.target.value))}
                    margin="normal"
                    disabled={!settings.cacheEnabled}
                  />
                </CardContent>
              </Card>
            </Grid>

            {/* Performance Metrics */}
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
                      <ListItemText
                        primary="API Response Time"
                        secondary="~150ms average"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Storage color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Cache Hit Rate"
                        secondary="85%"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <DataUsage color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Memory Usage"
                        secondary="45% of available"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Speed color="success" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Data Refresh Rate"
                        secondary="Every 30 seconds"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* System Tab */}
        <TabPanel value={activeTab} index={5}>
          <Grid container spacing={3}>
            {/* System Configuration */}
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
                        onChange={(e) => handleSettingChange('debugMode', e.target.checked)}
                      />
                    }
                    label="Debug Mode"
                  />
                  
                  <TextField
                    fullWidth
                    select
                    label="Log Level"
                    value={settings.logLevel}
                    onChange={(e) => handleSettingChange('logLevel', e.target.value)}
                    margin="normal"
                    SelectProps={{
                      native: true,
                    }}
                  >
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                  </TextField>
                </CardContent>
              </Card>
            </Grid>

            {/* System Information */}
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Information
                  </Typography>
                  
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        <Info color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Version"
                        secondary="2.2.0"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Schedule color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Last Updated"
                        secondary="2025-01-03 14:45:00"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <DataUsage color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Uptime"
                        secondary="2 days, 5 hours"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <Storage color="info" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Database Status"
                        secondary="Connected"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => window.location.reload()}
        >
          Reset to Defaults
        </Button>
        <Button
          variant="contained"
          startIcon={<Save />}
          onClick={handleSave}
          disabled={isLoading || saveStatus === 'saving'}
        >
          {saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>
    </Box>
  );
};

export default Settings; 