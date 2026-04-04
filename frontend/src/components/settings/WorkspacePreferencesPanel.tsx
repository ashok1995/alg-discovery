/**
 * Local app preferences (browser): trading UI, notifications, performance, developer toggles.
 * Persisted via WorkspacePreferencesProvider + localStorage on Save.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Speed, Notifications, DataUsage, Settings as SettingsIcon, Save, Refresh } from '@mui/icons-material';
import TradingTab from './TradingTab';
import NotificationsTab from './NotificationsTab';
import PerformanceTab from './PerformanceTab';
import SystemTab from './SystemTab';
import type { SystemSettings } from './types';
import { useWorkspacePreferences } from '../../context/WorkspacePreferencesContext';

const WorkspacePreferencesPanel: React.FC = () => {
  const { settings, setSettings, saveToStorage, resetToDefaults } = useWorkspacePreferences();
  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSettingChange = (key: keyof SystemSettings, value: SystemSettings[keyof SystemSettings]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSaveStatus('saving');
    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      saveToStorage();
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, px: 0.5 }}>
        These options are stored in <strong>this browser</strong> (localStorage) when you save — not on Seed. Use{' '}
        <strong>Seed trading</strong> / <strong>Seed platform</strong> tabs for server-side configuration.
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        All preference sections are expanded by default so first-time users can discover lower settings.
      </Alert>
      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.5 }}>
        <Chip size="small" label="Trading & refresh" />
        <Chip size="small" label="Notifications" />
        <Chip size="small" label="Performance & cache" />
        <Chip size="small" label="Developer & logging" />
      </Stack>

      {saveStatus === 'success' && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveStatus('idle')}>
          Preferences saved to this browser.
        </Alert>
      )}
      {saveStatus === 'error' && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveStatus('idle')}>
          Save failed. Try again.
        </Alert>
      )}

      <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px 8px 0 0', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Speed sx={{ mr: 1, color: 'primary.main' }} />
          <Typography fontWeight={700}>Trading &amp; refresh</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <TradingTab settings={settings} onSettingChange={handleSettingChange} />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderTop: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Notifications sx={{ mr: 1, color: 'primary.main' }} />
          <Typography fontWeight={700}>Notifications</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <NotificationsTab settings={settings} onSettingChange={handleSettingChange} />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderTop: 'none', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <DataUsage sx={{ mr: 1, color: 'primary.main' }} />
          <Typography fontWeight={700}>Performance &amp; cache</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <PerformanceTab settings={settings} onSettingChange={handleSettingChange} />
        </AccordionDetails>
      </Accordion>

      <Accordion defaultExpanded disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderTop: 'none', borderRadius: '0 0 8px 8px', '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <SettingsIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography fontWeight={700}>Developer &amp; logging</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <SystemTab settings={settings} onSettingChange={handleSettingChange} />
        </AccordionDetails>
      </Accordion>

      <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button variant="outlined" startIcon={<Refresh />} onClick={() => resetToDefaults()}>
          Reset to defaults
        </Button>
        <Button variant="contained" startIcon={<Save />} onClick={() => void handleSave()} disabled={isLoading || saveStatus === 'saving'}>
          {saveStatus === 'saving' ? 'Saving…' : 'Save preferences'}
        </Button>
      </Box>
    </Box>
  );
};

export default WorkspacePreferencesPanel;
