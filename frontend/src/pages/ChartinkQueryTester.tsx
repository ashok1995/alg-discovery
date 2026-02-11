import React, { useState, useEffect } from 'react';
import { API_CONFIG, getServiceUrl } from '../config/api';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tabs,
  Tab,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Refresh,
  TrendingUp,
  Speed,
  Analytics,
  Settings,
  ExpandMore,
  Info,
  Warning,
  CheckCircle,
  Error,
  Timeline,
  BarChart,
  AutoFixHigh,
  Psychology,
  Schedule,
  Business
} from '@mui/icons-material';

interface MarketStatus {
  current_status: string;
  current_session: string;
  is_trading_hours: boolean;
  is_market_day: boolean;
  current_time_ist: string;
  should_avoid_chartink_calls: boolean;
  recommended_cache_ttl: number;
}

interface QueryTestRequest {
  horizontal_filters: string[];
  vertical_filters: string[];
  custom_query?: string;
  force_refresh: boolean;
  track_performance: boolean;
}

interface QueryTestResponse {
  query_id: string;
  execution_time_ms: number;
  stocks_found: number;
  cache_hit: boolean;
  market_status: string;
  query_string?: string;
  results: any[];
}

const ChartinkQueryTester: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [selectedHorizontalFilters, setSelectedHorizontalFilters] = useState<string[]>([]);
  const [selectedVerticalFilters, setSelectedVerticalFilters] = useState<string[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  const [forceRefresh, setForceRefresh] = useState(false);
  const [trackPerformance, setTrackPerformance] = useState(true);
  
  // Query execution state
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentQueryResult, setCurrentQueryResult] = useState<QueryTestResponse | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryTestResponse[]>([]);
  const [executionProgress, setExecutionProgress] = useState(0);
  
  // Error handling
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // API base URL
  const API_BASE = `${getServiceUrl(API_CONFIG.PORTS.CHARTINK_API)}/api/chartink-analytics`;

  // Fetch market status
  const fetchMarketStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/market-status`);
      if (response.ok) {
        const data = await response.json();
        setMarketStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch market status:', err);
    }
  };

  // Execute single query
  const executeQuery = async () => {
    if (!selectedHorizontalFilters.length && !selectedVerticalFilters.length && !customQuery) {
      setError('Please select at least one filter or provide a custom query');
      return;
    }

    setIsExecuting(true);
    setExecutionProgress(0);
    setError(null);
    setSuccess(null);

    try {
      const request: QueryTestRequest = {
        horizontal_filters: selectedHorizontalFilters,
        vertical_filters: selectedVerticalFilters,
        custom_query: customQuery || undefined,
        force_refresh: forceRefresh,
        track_performance: trackPerformance
      };

      setExecutionProgress(25);

      const response = await fetch(`${API_BASE}/test-query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      setExecutionProgress(75);

      if (response.ok) {
        const result: QueryTestResponse = await response.json();
        setCurrentQueryResult(result);
        setQueryHistory(prev => [result, ...prev.slice(0, 9)]); // Keep last 10
        setSuccess(`Query executed successfully! Found ${result.stocks_found} stocks in ${result.execution_time_ms.toFixed(2)}ms`);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to execute query');
      }
    } catch (err) {
      setError('Network error while executing query');
    } finally {
      setIsExecuting(false);
      setExecutionProgress(100);
    }
  };

  // Initialize component
  useEffect(() => {
    fetchMarketStatus();
    
    // Refresh market status every minute
    const interval = setInterval(fetchMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get market status color
  const getMarketStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'success';
      case 'closed': return 'error';
      case 'pre_market': return 'warning';
      case 'post_market': return 'info';
      default: return 'default';
    }
  };

  // Render market status card
  const renderMarketStatus = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="div">
            Market Status
          </Typography>
          <IconButton onClick={fetchMarketStatus} size="small">
            <Refresh />
          </IconButton>
        </Box>
        
        {marketStatus ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" gap={1}>
                <Chip 
                  label={marketStatus.current_status.toUpperCase()} 
                  color={getMarketStatusColor(marketStatus.current_status) as any}
                  size="small"
                />
                <Typography variant="body2" color="text.secondary">
                  {marketStatus.current_session}
                </Typography>
              </Box>
              
              <Typography variant="body2" sx={{ mt: 1 }}>
                {marketStatus.is_trading_hours ? 'Trading Hours' : 'Outside Trading Hours'}
              </Typography>
              
              {marketStatus.should_avoid_chartink_calls && (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Chartink calls should be avoided - using cache recommended
                </Alert>
              )}
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Current Time: {new Date(marketStatus.current_time_ist).toLocaleTimeString()}
              </Typography>
            </Grid>
          </Grid>
        ) : (
          <CircularProgress size={20} />
        )}
      </CardContent>
    </Card>
  );

  // Render query builder
  const renderQueryBuilder = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Query Builder
        </Typography>
        
        <Grid container spacing={2}>
          {/* Horizontal Filters */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Horizontal Filters</InputLabel>
              <Select
                multiple
                value={selectedHorizontalFilters}
                onChange={(e) => setSelectedHorizontalFilters(e.target.value as string[])}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="nifty_50">Nifty 50</MenuItem>
                <MenuItem value="nifty_200">Nifty 200</MenuItem>
                <MenuItem value="large_cap">Large Cap</MenuItem>
                <MenuItem value="mid_cap">Mid Cap</MenuItem>
                <MenuItem value="small_cap">Small Cap</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Vertical Filters */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Vertical Filters</InputLabel>
              <Select
                multiple
                value={selectedVerticalFilters}
                onChange={(e) => setSelectedVerticalFilters(e.target.value as string[])}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                <MenuItem value="rsi_bullish">RSI Bullish</MenuItem>
                <MenuItem value="sma_20_breakout">SMA 20 Breakout</MenuItem>
                <MenuItem value="volume_surge">Volume Surge</MenuItem>
                <MenuItem value="macd_bullish">MACD Bullish</MenuItem>
                <MenuItem value="bollinger_breakout">Bollinger Breakout</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Custom Query */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Custom Query (Optional)"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="Enter custom Chartink query string..."
              helperText="Leave empty to use modular filters above"
            />
          </Grid>

          {/* Options */}
          <Grid item xs={12}>
            <Box display="flex" gap={2} flexWrap="wrap">
              <FormControlLabel
                control={
                  <Switch
                    checked={forceRefresh}
                    onChange={(e) => setForceRefresh(e.target.checked)}
                  />
                }
                label="Force Refresh"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={trackPerformance}
                    onChange={(e) => setTrackPerformance(e.target.checked)}
                  />
                }
                label="Track Performance"
              />
            </Box>
          </Grid>

          {/* Execute Button */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={executeQuery}
              disabled={isExecuting}
              sx={{ minWidth: 120 }}
            >
              {isExecuting ? <CircularProgress size={20} /> : 'Execute Query'}
            </Button>
          </Grid>
        </Grid>

        {/* Execution Progress */}
        {isExecuting && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress variant="determinate" value={executionProgress} />
            <Typography variant="caption" color="text.secondary">
              Executing query... {executionProgress}%
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Render query results
  const renderQueryResults = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Query Results
        </Typography>
        
        {currentQueryResult ? (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Typography variant="subtitle1">Query ID:</Typography>
                <Chip label={currentQueryResult.query_id} size="small" />
              </Box>
              
              <Box display="flex" alignItems="center" gap={2} mb={1}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Speed fontSize="small" />
                  <Typography variant="body2">
                    {currentQueryResult.execution_time_ms.toFixed(2)}ms
                  </Typography>
                </Box>
                
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Business fontSize="small" />
                  <Typography variant="body2">
                    {currentQueryResult.stocks_found} stocks
                  </Typography>
                </Box>
                
                <Chip
                  label={currentQueryResult.cache_hit ? 'Cache Hit' : 'Cache Miss'}
                  color={currentQueryResult.cache_hit ? 'success' : 'warning'}
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Market Status: {currentQueryResult.market_status}
              </Typography>
            </Grid>
            
            {/* Results Table */}
            {currentQueryResult.results.length > 0 && (
              <Grid item xs={12}>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Symbol</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Change %</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {currentQueryResult.results.slice(0, 10).map((stock, index) => (
                        <TableRow key={index}>
                          <TableCell>{stock.symbol || stock.nsecode}</TableCell>
                          <TableCell>{stock.name || stock.company_name}</TableCell>
                          <TableCell>{stock.price || stock.close}</TableCell>
                          <TableCell>{stock.change_percent || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {currentQueryResult.results.length > 10 && (
                  <Typography variant="caption" color="text.secondary">
                    Showing first 10 of {currentQueryResult.results.length} results
                  </Typography>
                )}
              </Grid>
            )}
          </Grid>
        ) : (
          <Typography color="text.secondary">
            No query results yet. Execute a query to see results.
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  // Render query history
  const renderQueryHistory = () => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Query History
        </Typography>
        
        {queryHistory.length > 0 ? (
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Query ID</TableCell>
                  <TableCell>Execution Time</TableCell>
                  <TableCell>Stocks Found</TableCell>
                  <TableCell>Cache Hit</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {queryHistory.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.query_id}</TableCell>
                    <TableCell>{result.execution_time_ms.toFixed(2)}ms</TableCell>
                    <TableCell>{result.stocks_found}</TableCell>
                    <TableCell>
                      <Chip
                        label={result.cache_hit ? 'Yes' : 'No'}
                        color={result.cache_hit ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{result.market_status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography color="text.secondary">
            No query history yet.
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Chartink Query Tester & Analytics
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Test, analyze, and optimize Chartink queries with market-aware caching and progressive learning.
      </Typography>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Market Status */}
      {renderMarketStatus()}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab label="Query Builder" icon={<PlayArrow />} />
          <Tab label="Query History" icon={<Timeline />} />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          {renderQueryBuilder()}
          {renderQueryResults()}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {renderQueryHistory()}
        </Box>
      )}
    </Container>
  );
};

export default ChartinkQueryTester; 