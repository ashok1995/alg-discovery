import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Refresh,
  Schedule,
  Wifi,
  WifiOff,
  Settings
} from '@mui/icons-material';
import SwingTable from '../components/SwingTable';
import VariantsSelector from '../components/VariantsSelector';
import { useBackgroundRefresh } from '../hooks/useBackgroundRefresh';
import RefreshStatus from '../components/RefreshStatus';

const SwingRecommendations: React.FC = () => {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Unified fetch logic
  const fetchRecommendationsData = async (forceRefresh: boolean = false) => {
    try {
      const payload: Record<string, any> = {
        strategy_type: 'swing-buy',
        limit: 50,
        force_refresh: forceRefresh,
      };
      if (Object.keys(selectedVariants).length > 0) {
        payload.combination = selectedVariants;
      }
      const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
      const res = await fetch(`${baseUrl}/api/strategy/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error('❌ Failed to fetch swing recommendations:', err);
      setRecommendations([]);
      throw err; // Propagate for the hook to handle
    }
  };

  // Background refresh hook
  const {
    loading,
    error,
    backgroundRefreshQueue,
    lastRefreshTime,
    fetchData,
    handleVariantsChange,
  } = useBackgroundRefresh(fetchRecommendationsData, {
    autoRefreshInterval: autoRefresh ? 30000 : 0,
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData]);

  const handleRefresh = () => fetchData(true);

  const handleAutoRefreshToggle = () => setAutoRefresh(!autoRefresh);

  const handleVariantsChangeWrapper = (variants: Record<string, string>) => {
    setSelectedVariants(variants);
    handleVariantsChange(variants);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Real-Time Swing Recommendations
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Live swing trading recommendations with auto-refresh functionality.
      </Typography>

      {/* Status Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6">Status</Typography>
              
              {/* API Health */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {error ? (
                  <WifiOff sx={{ color: 'error.main' }} />
                ) : (
                  <Wifi sx={{ color: 'success.main' }} />
                )}
                <Typography variant="body2" color={error ? 'error.main' : 'success.main'}>
                  {error ? 'API Disconnected' : 'API Connected'}
                </Typography>
              </Box>

              {/* Market Hours */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule sx={{ color: 'info.main' }} />
                <Typography variant="body2" color="info.main">
                  Market Hours
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
              {/* Variants Selector */}
              <VariantsSelector
                strategyType="swing-buy"
                onVariantsChange={handleVariantsChangeWrapper}
                disabled={loading}
              />
              
              {/* Auto Refresh Toggle */}
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={handleAutoRefreshToggle}
                    color="primary"
                  />
                }
                label="Auto Refresh"
              />
              
              {/* Refresh Button */}
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={16} /> : <Refresh />}
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
              
              {/* Settings Button */}
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => {/* Handle settings */}}
              >
                Settings
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {`Failed to load recommendations: ${error}`}
        </Alert>
      )}

      {/* Recommendations Table */}
      <SwingTable 
        recommendations={recommendations} 
        isLoading={loading} 
      />

      <RefreshStatus 
        loading={loading}
        backgroundRefreshQueue={backgroundRefreshQueue}
        lastRefreshTime={lastRefreshTime}
      />
    </Container>
  );
};

export default SwingRecommendations; 