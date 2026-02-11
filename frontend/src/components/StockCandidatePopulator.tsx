import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';
import {
  stockCandidatePopulatorService,
  PopulationConfig,
  PopulationResponse,
  CandidateDetail,
  TradingTheme,
  CacheStatsResponse,
} from '../services/stockCandidatePopulatorService';

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

  // Configuration state
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

  // Check connection on component mount
  useEffect(() => {
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const checkConnection = async () => {
    try {
      const connected = await stockCandidatePopulatorService.testConnection();
      setIsConnected(connected);
      
      if (connected) {
        await loadServiceInfo();
      }
    } catch (error) {
      console.error('Connection check failed:', error);
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
    } catch (error) {
      console.error('Failed to load service info:', error);
    }
  };

  const handlePopulateCandidates = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await stockCandidatePopulatorService.populateCandidates(strategyName, config);
      setPopulationResult(result);
      
      // Get detailed candidates
      const candidatesResponse = await stockCandidatePopulatorService.getCandidatesForTheme(
        'swing_buy',
        result.candidates_count
      );
      
      setCandidates(candidatesResponse.candidates);
      
      // Update cache stats
      await loadServiceInfo();
      
      // Notify parent component
      if (onCandidatesGenerated) {
        onCandidatesGenerated(candidatesResponse.candidates);
      }
      
    } catch (error) {
      console.error('Population failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to populate candidates');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      await stockCandidatePopulatorService.clearCache();
      await loadServiceInfo();
      setError(null);
    } catch (error) {
      console.error('Cache clear failed:', error);
      setError('Failed to clear cache');
    }
  };

  const handleRefresh = async () => {
    await checkConnection();
    await loadServiceInfo();
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!isConnected) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error">
            <Typography variant="h6">Connection Error</Typography>
            <Typography>
              Unable to connect to Stock Candidate Populator API. Please ensure the server is running on port 8018.
            </Typography>
            <Button
              variant="contained"
              onClick={handleRefresh}
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
      {/* Header */}
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
                onClick={handleRefresh}
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

      {/* Configuration */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Configuration
            </Typography>
            <Button
              variant="text"
              onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
              endIcon={<ExpandMoreIcon />}
            >
              {showAdvancedConfig ? 'Hide' : 'Show'} Advanced
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Strategy Name"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Candidates"
                type="number"
                value={config.max_candidates}
                onChange={(e) => setConfig({ ...config, max_candidates: Number(e.target.value) })}
                margin="normal"
              />
            </Grid>

            {showAdvancedConfig && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Min Market Cap (crores)"
                    type="number"
                    value={config.min_market_cap}
                    onChange={(e) => setConfig({ ...config, min_market_cap: Number(e.target.value) })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Market Cap (crores)"
                    type="number"
                    value={config.max_market_cap}
                    onChange={(e) => setConfig({ ...config, max_market_cap: Number(e.target.value) })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Min Price"
                    type="number"
                    value={config.min_price}
                    onChange={(e) => setConfig({ ...config, min_price: Number(e.target.value) })}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Price"
                    type="number"
                    value={config.max_price}
                    onChange={(e) => setConfig({ ...config, max_price: Number(e.target.value) })}
                    margin="normal"
                  />
                </Grid>
              </>
            )}

            <Grid item xs={12}>
              <Box display="flex" flexWrap="wrap" gap={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.include_nse_only}
                      onChange={(e) => setConfig({ ...config, include_nse_only: e.target.checked })}
                    />
                  }
                  label="NSE Only"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.exclude_etfs}
                      onChange={(e) => setConfig({ ...config, exclude_etfs: e.target.checked })}
                    />
                  }
                  label="Exclude ETFs"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.exclude_penny_stocks}
                      onChange={(e) => setConfig({ ...config, exclude_penny_stocks: e.target.checked })}
                    />
                  }
                  label="Exclude Penny Stocks"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.enable_real_time_pricing}
                      onChange={(e) => setConfig({ ...config, enable_real_time_pricing: e.target.checked })}
                    />
                  }
                  label="Real-time Pricing"
                />
              </Box>
            </Grid>
          </Grid>

          <Box mt={2}>
            <Button
              variant="contained"
              onClick={handlePopulateCandidates}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <TrendingUpIcon />}
              size="large"
            >
              {isLoading ? 'Populating...' : 'Populate Candidates'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
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

            {/* Candidates Table */}
            {candidates.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Generated Candidates ({candidates.length})
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Symbol</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Sector</TableCell>
                        <TableCell align="right">Market Cap</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell>Exchange</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {candidates.map((candidate, index) => (
                        <TableRow key={`${candidate.symbol}-${index}`} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight="bold">
                              {candidate.symbol}
                            </Typography>
                          </TableCell>
                          <TableCell>{candidate.name}</TableCell>
                          <TableCell>{candidate.sector}</TableCell>
                          <TableCell align="right">
                            {candidate.market_cap > 0 ? formatCurrency(candidate.market_cap * 10000000) : 'N/A'}
                          </TableCell>
                          <TableCell align="right">
                            {candidate.current_price > 0 ? formatCurrency(candidate.current_price) : 'N/A'}
                          </TableCell>
                          <TableCell>{candidate.exchange}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cache Statistics */}
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
                <Typography variant="h6">
                  {cacheStats.cache_size}
                </Typography>
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