import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  Divider,
} from '@mui/material';
import { Refresh as RefreshIcon, Clear as ClearIcon, Storage as StorageIcon } from '@mui/icons-material';
import {
  stockCandidatePopulatorService,
  PopulationConfig,
  PopulationResponse,
  CandidateDetail,
  TradingTheme,
  CacheStatsResponse,
} from '../services/stockCandidatePopulatorService';
import CandidateTable from './candidates/CandidateTable';
import CandidateFilters from './candidates/CandidateFilters';

interface StockCandidatePopulatorProps {
  onCandidatesGenerated?: (candidates: CandidateDetail[]) => void;
}

const StockCandidatePopulator: React.FC<StockCandidatePopulatorProps> = ({
  onCandidatesGenerated,
}) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [populationResult, setPopulationResult] = useState<PopulationResponse | null>(null);
  const [candidates, setCandidates] = useState<CandidateDetail[]>([]);
  const [cacheStats, setCacheStats] = useState<CacheStatsResponse | null>(null);
  const [availableThemes, setAvailableThemes] = useState<TradingTheme[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState<boolean>(false);
  const [config, setConfig] = useState<PopulationConfig>({
    max_candidates: 100,
    min_market_cap: 0,
    max_market_cap: 1000000,
    include_nse_only: true,
    exclude_etfs: true,
    exclude_penny_stocks: false,
    min_price: 0,
    max_price: 10000,
    enable_real_time_pricing: false,
    enable_metadata_enrichment: false,
  });
  const [strategyName, setStrategyName] = useState<string>('default');

  const checkConnection = async () => {
    try {
      const connected = await stockCandidatePopulatorService.testConnection();
      setIsConnected(connected);
      if (connected) await loadServiceInfo();
    } catch {
      setIsConnected(false);
      setError('Failed to connect to Stock Candidate Populator API');
    }
  };

  const loadServiceInfo = async () => {
    try {
      const [themes, cache] = await Promise.all([
        stockCandidatePopulatorService.getAvailableThemes(),
        stockCandidatePopulatorService.getCacheStats(),
      ]);
      setAvailableThemes(themes.available_themes);
      setCacheStats(cache);
    } catch (err) {
      console.error('Failed to load service info:', err);
    }
  };

  const handlePopulateCandidates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await stockCandidatePopulatorService.populateCandidates(
        strategyName,
        config
      );
      setPopulationResult(result);
      const candidatesResponse = await stockCandidatePopulatorService.getCandidatesForTheme(
        'swing_buy',
        result.candidates_count
      );
      setCandidates(candidatesResponse.candidates);
      await loadServiceInfo();
      onCandidatesGenerated?.(candidatesResponse.candidates);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to populate candidates'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await stockCandidatePopulatorService.clearCache();
      await loadServiceInfo();
      setError(null);
    } catch {
      setError('Failed to clear cache');
    }
  };

  const formatNumber = (num: number) => new Intl.NumberFormat('en-IN').format(num);
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);

  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isConnected) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <Typography variant="h6">Connection Error</Typography>
            <Typography>
              Unable to connect to Stock Candidate Populator API. Please ensure the server is
              running on port 8018.
            </Typography>
            <Button
              variant="contained"
              onClick={checkConnection}
              startIcon={<RefreshIcon />}
              sx={{ mt: 2 }}
            >
              Retry Connection
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h5" gutterBottom>
                Stock Candidate Populator
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate stock candidates using Kite mapping data
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                onClick={checkConnection}
                startIcon={<RefreshIcon />}
                size="small"
              >
                Refresh
              </Button>
              <Button
                variant="outlined"
                onClick={handleClearCache}
                startIcon={<ClearIcon />}
                size="small"
                color="warning"
              >
                Clear Cache
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <CandidateFilters
        strategyName={strategyName}
        config={config}
        showAdvancedConfig={showAdvancedConfig}
        isLoading={isLoading}
        onStrategyNameChange={setStrategyName}
        onConfigChange={setConfig}
        onToggleAdvanced={() => setShowAdvancedConfig(!showAdvancedConfig)}
        onPopulate={handlePopulateCandidates}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {populationResult && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Population Results
            </Typography>
            <Grid container spacing={2} mb={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Total Candidates
                </Typography>
                <Typography variant="h6">
                  {formatNumber(populationResult.total_candidates)}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Filtered Candidates
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatNumber(populationResult.filtered_candidates)}
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Population Time
                </Typography>
                <Typography variant="h6">
                  {populationResult.population_time.toFixed(3)}s
                </Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Cache Hit
                </Typography>
                <Chip
                  label={populationResult.cache_hit ? 'Yes' : 'No'}
                  color={populationResult.cache_hit ? 'success' : 'default'}
                  size="small"
                />
              </Grid>
            </Grid>
            <Divider sx={{ my: 2 }} />
            {candidates.length > 0 && (
              <CandidateTable candidates={candidates} formatCurrency={formatCurrency} />
            )}
          </CardContent>
        </Card>
      )}

      {cacheStats && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Cache Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Cache Size
                </Typography>
                <Typography variant="h6">{cacheStats.cache_size}</Typography>
              </Grid>
              <Grid item xs={6} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Cache Keys
                </Typography>
                <Typography variant="body2">
                  {cacheStats.cache_keys.join(', ') || 'None'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Available Themes
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {availableThemes.map((theme) => (
                    <Chip key={theme} label={theme} size="small" />
                  ))}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default StockCandidatePopulator;
