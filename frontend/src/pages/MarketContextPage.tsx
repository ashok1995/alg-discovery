/**
 * Market Context Page
 * Hosts the Market Context Dashboard
 */

import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import MarketContextDashboard from '../components/MarketContextDashboard';

const MarketContextPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Box mb={3}>
          <Typography variant="h3" component="h1" gutterBottom>
            Market Intelligence & Context
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Real-time market intelligence, stock data, and trading analysis powered by Kite Services
          </Typography>
        </Box>
        
        <MarketContextDashboard />
      </Paper>
    </Container>
  );
};

export default MarketContextPage;




