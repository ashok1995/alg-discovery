import React from 'react';
import { Box } from '@mui/material';
import PageHero from '../components/layout/PageHero';
import HomeMarketMoversTab from '../components/home/HomeMarketMoversTab';

const MarketMoversPage: React.FC = () => {
  return (
    <Box
      sx={{
        p: 3,
        minHeight: '100%',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      }}
    >
      <PageHero
        title="Market Movers"
        subtitle="Top gainers, top losers, and most traded — filter by period."
        variant="blue"
      />

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          p: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <HomeMarketMoversTab />
      </Box>
    </Box>
  );
};

export default MarketMoversPage;
