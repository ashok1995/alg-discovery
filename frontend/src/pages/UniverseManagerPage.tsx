import React, { useState } from 'react';
import { Box, Tabs, Tab, Snackbar, Alert, alpha, Typography } from '@mui/material';
import { Storage, FilterList, Hub } from '@mui/icons-material';
import TabPanel from '../components/ui/TabPanel';
import PageHero from '../components/layout/PageHero';
import StockMappingManager from './StockMappingManager';
import StockCandidatePopulator from '../components/StockCandidatePopulator';
import SeedUniverseHealthPanel from '../components/universe/SeedUniverseHealthPanel';
import SeedCandidatesV2Panel from '../components/universe/SeedCandidatesV2Panel';
import type { CandidateDetail } from '../services/stockCandidatePopulatorService';

const UniverseManagerPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  const handleCandidatesGenerated = (candidates: CandidateDetail[]) => {
    setNotification({
      open: true,
      message: `Successfully generated ${candidates.length} stock candidates!`,
      severity: 'success',
    });
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
        title="Universe Manager"
        subtitle="Seed universe health (dashboard API), stock symbol mappings, and candidate pipeline."
        variant="teal"
      />

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
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: alpha('#00796b', 0.04),
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.95rem', minHeight: 52 },
            '& .Mui-selected': { color: 'primary.main' },
          }}
        >
          <Tab icon={<Hub />} iconPosition="start" label="Seed universe" />
          <Tab icon={<Storage />} iconPosition="start" label="Stock mapping" />
          <Tab icon={<FilterList />} iconPosition="start" label="Candidates" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <SeedUniverseHealthPanel />
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 0 }}>
            <StockMappingManager />
          </Box>
        </TabPanel>
        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <SeedCandidatesV2Panel />
            <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
                Legacy theme populator (8180 / populator API)
              </Typography>
              <StockCandidatePopulator onCandidatesGenerated={handleCandidatesGenerated} />
            </Box>
          </Box>
        </TabPanel>
      </Box>

      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setNotification((p) => ({ ...p, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UniverseManagerPage;
