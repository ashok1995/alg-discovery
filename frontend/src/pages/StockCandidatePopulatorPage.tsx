import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Breadcrumbs,
  Link,
  Alert,
  Snackbar,
} from '@mui/material';
import { Home as HomeIcon, TrendingUp as TrendingUpIcon } from '@mui/icons-material';
import StockCandidatePopulator from '../components/StockCandidatePopulator';
import { CandidateDetail } from '../services/stockCandidatePopulatorService';

const StockCandidatePopulatorPage: React.FC = () => {
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const handleCandidatesGenerated = (candidates: CandidateDetail[]) => {
    setNotification({
      open: true,
      message: `Successfully generated ${candidates.length} stock candidates!`,
      severity: 'success',
    });
  };

  const handleNotificationClose = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="xl">
      {/* Breadcrumbs */}
      <Box sx={{ mb: 3, mt: 2 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link
            underline="hover"
            color="inherit"
            href="/"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Home
          </Link>
          <Typography
            sx={{ display: 'flex', alignItems: 'center' }}
            color="text.primary"
          >
            <TrendingUpIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Stock Candidate Populator
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Page Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Stock Candidate Populator
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Generate and filter stock candidates using comprehensive Kite mapping data. 
          This tool helps you identify potential trading opportunities based on various 
          criteria including market cap, price range, sector, and exchange filters.
        </Typography>
        
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Key Features:
          </Typography>
          <ul>
            <li>
              <Typography variant="body2">
                <strong>Comprehensive Data:</strong> Access to 20,000+ stocks from NSE and BSE
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Advanced Filtering:</strong> Filter by market cap, price range, sector, and exchange
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Real-time Performance:</strong> Fast population with caching for optimal performance
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Multiple Themes:</strong> Support for swing, intraday, and long-term trading strategies
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Cache Management:</strong> Intelligent caching with statistics and manual control
              </Typography>
            </li>
          </ul>
        </Box>
      </Paper>

      {/* Main Component */}
      <StockCandidatePopulator onCandidatesGenerated={handleCandidatesGenerated} />

      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleNotificationClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleNotificationClose}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StockCandidatePopulatorPage; 