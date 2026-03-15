import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Tabs,
  Tab,
  Paper,
} from '@mui/material';
import {
  Security,
  Speed,
  Notifications,
  DataUsage,
  Settings as SettingsIcon,
  Save,
  Refresh,
} from '@mui/icons-material';
import TabPanel from '../components/ui/TabPanel';
import ApiSecurityTab from '../components/settings/ApiSecurityTab';
import TradingTab from '../components/settings/TradingTab';
import NotificationsTab from '../components/settings/NotificationsTab';
import PerformanceTab from '../components/settings/PerformanceTab';
import SystemTab from '../components/settings/SystemTab';
import type { SystemSettings } from '../components/settings/types';

const DEFAULT_SETTINGS: SystemSettings = {
  autoRefresh: true,
  refreshInterval: 30,
  riskLevel: 'medium',
  maxPositions: 5,
  defaultStopLoss: 2.0,
  defaultTarget: 5.0,
  notifications: true,
  soundAlerts: false,
  emailAlerts: false,
  marketHours: { start: '09:15', end: '15:30' },
  cacheEnabled: true,
  cacheDuration: 300,
  debugMode: false,
  logLevel: 'info',
};

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState(4);
  const [, setSystemStatus] = useState({
    apiConnected: false,
    marketOpen: false,
    cacheActive: false,
    securityAuthenticated: false,
  });

  const handleSettingChange = (key: keyof SystemSettings, value: SystemSettings[keyof SystemSettings]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Saving settings:', settings);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving settings', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSystemStatus({
      apiConnected: false,
      marketOpen: false,
      cacheActive: true,
      securityAuthenticated: false,
    });
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>System Settings</Typography>
        <Typography variant="body1" color="text.secondary">
          Configure your trading system preferences, API connections, and system behavior
        </Typography>
      </Box>

      {saveStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 3 }}>Settings saved successfully!</Alert>
      )}
      {saveStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 3 }}>Failed to save settings. Please try again.</Alert>
      )}

      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          aria-label="settings tabs"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="API & Security" icon={<Security />} iconPosition="start" />
          <Tab label="Trading" icon={<Speed />} iconPosition="start" />
          <Tab label="Notifications" icon={<Notifications />} iconPosition="start" />
          <Tab label="Performance" icon={<DataUsage />} iconPosition="start" />
          <Tab label="System" icon={<SettingsIcon />} iconPosition="start" />
        </Tabs>

        <TabPanel value={activeTab} index={0}>
          <ApiSecurityTab />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <TradingTab settings={settings} onSettingChange={handleSettingChange} />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <NotificationsTab settings={settings} onSettingChange={handleSettingChange} />
        </TabPanel>
        <TabPanel value={activeTab} index={3}>
          <PerformanceTab settings={settings} onSettingChange={handleSettingChange} />
        </TabPanel>
        <TabPanel value={activeTab} index={4}>
          <SystemTab settings={settings} onSettingChange={handleSettingChange} />
        </TabPanel>
      </Paper>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => window.location.reload()}>
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
