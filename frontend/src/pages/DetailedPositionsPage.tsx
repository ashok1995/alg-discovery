import React, { useState } from 'react';
import { Box, Tabs, Tab, alpha } from '@mui/material';
import { ShowChart, Psychology } from '@mui/icons-material';
import TabPanel from '../components/ui/TabPanel';
import PositionsTab from '../components/dashboard/PositionsTab';
import PageHero from '../components/layout/PageHero';

const DetailedPositionsPage: React.FC = () => {
  const [tab, setTab] = useState(0);

  return (
    <Box
      sx={{
        p: 3,
        minHeight: '100%',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      }}
    >
      <PageHero
        title="Positions"
        subtitle="Paper trading & learning — filter by trade type, ARM, status, and period."
        variant="blue"
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
            bgcolor: alpha('#1976d2', 0.04),
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.95rem', minHeight: 52 },
            '& .Mui-selected': { color: 'primary.main' },
          }}
        >
          <Tab icon={<ShowChart />} iconPosition="start" label="Paper Trading" />
          <Tab icon={<Psychology />} iconPosition="start" label="Learning" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 0 }}>
            <PositionsTab lockCategory="paper_trade" />
          </Box>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 0 }}>
            <PositionsTab lockCategory="learning" />
          </Box>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default DetailedPositionsPage;
