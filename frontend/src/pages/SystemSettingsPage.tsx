/**
 * System settings — configuration only (single point: set values).
 * Dual tier: Essentials (connections + workspace) | Seed (advanced trading/platform).
 * Read-only telemetry lives on Observability page.
 */

import React, { useState } from 'react';
import { Box, Tabs, Tab, alpha, Alert, Button, Typography, ToggleButtonGroup, ToggleButton, Paper, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { VpnKey, Tune, Savings, AdminPanelSettings, Visibility } from '@mui/icons-material';
import TabPanel from '../components/ui/TabPanel';
import PageHero from '../components/layout/PageHero';
import ApiSecurityTab from '../components/settings/ApiSecurityTab';
import WorkspacePreferencesPanel from '../components/settings/WorkspacePreferencesPanel';
import SeedSettingsEditor from '../components/settings/SeedSettingsEditor';

type SettingsTier = 'essentials' | 'seed';

const SystemSettingsPage: React.FC = () => {
  const [tier, setTier] = useState<SettingsTier>('essentials');
  const [tab, setTab] = useState(0);

  const handleTierChange = (_: React.MouseEvent<HTMLElement>, newTier: SettingsTier | null) => {
    if (newTier !== null) {
      setTier(newTier);
      setTab(0);
    }
  };

  return (
    <Box
      sx={{
        p: 3,
        minHeight: '100%',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      }}
    >
      <PageHero
        title="System settings"
        subtitle="Configure connections and Seed service. View-only telemetry is on the Observability page."
        variant="teal"
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          To <strong>see</strong> pipeline health, DB stats, and monitor data (no editing), open{' '}
          <Button component={RouterLink} to="/observability" size="small" variant="outlined" startIcon={<Visibility />}>
            Observability
          </Button>
          .
        </Typography>
      </Alert>

      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
          Choose what to configure
        </Typography>
        <ToggleButtonGroup
          value={tier}
          exclusive
          onChange={handleTierChange}
          aria-label="Settings tier"
          fullWidth
          sx={{ '& .MuiToggleButton-root': { py: 1.25, textTransform: 'none', fontWeight: 600 } }}
        >
          <ToggleButton value="essentials" aria-label="Essentials">
            Essentials
          </ToggleButton>
          <ToggleButton value="seed" aria-label="Seed (advanced)">
            Seed (advanced)
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {tier === 'essentials' ? (
          <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              orientation="vertical"
              variant="scrollable"
              sx={{
                borderRight: 1,
                borderColor: 'divider',
                bgcolor: alpha('#00796b', 0.04),
                minWidth: 230,
                borderRadius: 2,
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.88rem', minHeight: 52, alignItems: 'flex-start' },
                '& .Mui-selected': { color: 'primary.main' },
              }}
            >
              <Tab icon={<VpnKey />} iconPosition="start" label="API & connections" />
              <Tab icon={<Tune />} iconPosition="start" label="Workspace preferences" />
            </Tabs>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <TabPanel value={tab} index={0}>
                <Box sx={{ p: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Parent: Essentials / Child: API & connections
                  </Typography>
                  <ApiSecurityTab />
                </Box>
              </TabPanel>
              <TabPanel value={tab} index={1}>
                <Box sx={{ px: 2, pb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Parent: Essentials / Child: Workspace preferences
                  </Typography>
                  <WorkspacePreferencesPanel />
                </Box>
              </TabPanel>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              orientation="vertical"
              variant="scrollable"
              sx={{
                borderRight: 1,
                borderColor: 'divider',
                bgcolor: alpha('#00796b', 0.04),
                minWidth: 230,
                borderRadius: 2,
                '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.88rem', minHeight: 52, alignItems: 'flex-start' },
                '& .Mui-selected': { color: 'primary.main' },
              }}
            >
              <Tab icon={<Savings />} iconPosition="start" label="Seed trading rules" />
              <Tab icon={<AdminPanelSettings />} iconPosition="start" label="Seed platform limits" />
            </Tabs>
            <Box sx={{ flex: 1, minWidth: 0, bgcolor: alpha('#00796b', 0.02) }}>
              <TabPanel value={tab} index={0}>
                <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 2 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      mb: 2,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" fontWeight={800}>
                        Trading rules on Seed
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Capital tiers, entry rules, charges, and learning blocks. Changes apply to the Seed service after save — not this browser only.
                      </Typography>
                    </Stack>
                  </Paper>
                  <SeedSettingsEditor variant="trading" />
                </Box>
              </TabPanel>
              <TabPanel value={tab} index={1}>
                <Box sx={{ px: { xs: 1.5, sm: 2.5 }, py: 2 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      mb: 2,
                      p: 1.5,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Stack spacing={0.5}>
                      <Typography variant="subtitle1" fontWeight={800}>
                        Platform &amp; API limits
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Rate limits, observability, and alert-related settings. Use the left <strong>Jump to section</strong> list to navigate long forms.
                      </Typography>
                    </Stack>
                  </Paper>
                  <SeedSettingsEditor variant="system" />
                </Box>
              </TabPanel>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default SystemSettingsPage;
