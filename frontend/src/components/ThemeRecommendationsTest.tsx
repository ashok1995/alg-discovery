import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Chip
} from '@mui/material';
import ThemeRecommendationsService from '../services/ThemeRecommendationsService';

const ThemeRecommendationsTest: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testThemeRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    setTestResults(null);

    try {
      console.log('🧪 Testing theme recommendations API...');
      
      const themeService = ThemeRecommendationsService.getInstance();
      
      // Test 1: Check service status
      const status = await themeService.getServiceStatus();
      console.log('📊 Service status:', status);
      
      // Test 2: Test theme recommendations with default values and include_real_time_analysis: false
      const response = await themeService.getThemeRecommendations('swing', {
        // Using default values as requested
        max_recommendations: 3
        // include_real_time_analysis is automatically set to false in the service
      });
      
      console.log('🎯 Theme recommendations response:', response);
      
      setTestResults({
        status,
        response,
        timestamp: new Date().toISOString()
      });
      
    } catch (err: any) {
      console.error('❌ Test failed:', err);
      setError(err.message || 'Test failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🧪 Theme Recommendations API Test
        </Typography>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Testing with default values and include_real_time_analysis: false
        </Typography>
        
        <Button
          variant="contained"
          onClick={testThemeRecommendations}
          disabled={isLoading}
          sx={{ mb: 2 }}
        >
          {isLoading ? <CircularProgress size={20} /> : 'Test Theme Recommendations'}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {testResults && (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Test Results ({testResults.timestamp})
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Service Status</Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip 
                    label={`Theme API: ${testResults.status.themeApi.status}`}
                    color={testResults.status.themeApi.status === 'connected' ? 'success' : 'error'}
                    sx={{ mr: 1, mb: 1 }}
                  />
                  <Chip 
                    label={`Strategies API: ${testResults.status.strategiesApi.status}`}
                    color={testResults.status.strategiesApi.status === 'connected' ? 'success' : 'error'}
                    sx={{ mr: 1, mb: 1 }}
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="h6">API URLs</Typography>
                <Typography variant="body2" color="text.secondary">
                  Theme API: {testResults.status.themeApi.url}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Strategies API: {testResults.status.strategiesApi.url}
                </Typography>
              </Grid>
            </Grid>

            {testResults.response && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Recommendations Response</Typography>
                <Typography variant="body2" color="text.secondary">
                  Success: {testResults.response.success ? '✅' : '❌'}
                </Typography>
                {testResults.response.recommendations && (
                  <Typography variant="body2" color="text.secondary">
                    Recommendations: {testResults.response.recommendations.length} items
                  </Typography>
                )}
                {testResults.response.error && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    Error: {testResults.response.error}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ThemeRecommendationsTest; 