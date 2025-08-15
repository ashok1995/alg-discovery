/**
 * Unified Recommendation Table Component
 * =====================================
 * 
 * A comprehensive table component that displays recommendations with real-time
 * Zerodha price integration. Can be used across all recommendation pages:
 * - Swing Buy AI
 * - Swing Buy (regular)
 * - Intraday
 * - Long-term
 * - Short-term
 * 
 * Features:
 * - Real-time price updates
 * - Technical indicators display
 * - Price alerts and notifications
 * - Sorting and filtering
 * - Auto-refresh functionality
 * - Connection status monitoring
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Grid,
  Alert,
  LinearProgress,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Switch,
  FormControlLabel,
  TableSortLabel,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack
} from '@mui/material';
import {
  Refresh,
  ShowChart,
  SignalCellular4Bar,
  WifiOff,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Search,
  Visibility,
  Wifi,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';

import {
  unifiedRecommendationService,
  UnifiedRecommendation,
  UnifiedRecommendationRequest,
  RecommendationType,
  ConnectionStatus
} from '../services/unifiedRecommendationService';

interface UnifiedRecommendationTableProps {
  recommendationType: RecommendationType;
  title?: string;
  description?: string;
  autoRefresh?: boolean;
  refreshInterval?: number; // seconds
  showRealTimePrices?: boolean;
  showTechnicalIndicators?: boolean;
  showAlerts?: boolean;
  maxRecommendations?: number;
  minScore?: number;
  onRecommendationClick?: (recommendation: UnifiedRecommendation) => void;
  onRefresh?: (recommendations: UnifiedRecommendation[]) => void;
  customFilters?: {
    sector?: string[];
    riskLevel?: string[];
    marketCap?: string[];
  };
}

interface SortConfig {
  field: keyof UnifiedRecommendation;
  direction: 'asc' | 'desc';
}

const UnifiedRecommendationTable: React.FC<UnifiedRecommendationTableProps> = ({
  recommendationType,
  title,
  description,
  autoRefresh = true,
  refreshInterval = 30,
  showRealTimePrices = true,
  showTechnicalIndicators = true,
  showAlerts = true,
  maxRecommendations = 50,
  minScore = 10,
  onRecommendationClick,
  onRefresh,
  customFilters
}) => {
  // State management
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [recommendations, setRecommendations] = useState<UnifiedRecommendation[]>([]);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  
  // UI state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [stockDetailDialogOpen, setStockDetailDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<UnifiedRecommendation | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'score', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSector, setFilterSector] = useState<string>('all');
  const [filterRiskLevel, setFilterRiskLevel] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchAndSetRecommendations = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const request: UnifiedRecommendationRequest = {
        type: recommendationType,
        limit: maxRecommendations,
        min_score: minScore,
        force_refresh: forceRefresh,
        include_real_time_prices: showRealTimePrices,
        include_technical_indicators: showTechnicalIndicators,
        include_alerts: showAlerts
      };
      const response = await unifiedRecommendationService.getRecommendations(request);
      if (response.success) {
        setRecommendations(response.data.recommendations);
        if (onRefresh) onRefresh(response.data.recommendations);
      } else {
        setError(response.error || 'An unknown error occurred.');
        setRecommendations([]);
      }
      setLastRefreshTime(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [recommendationType, maxRecommendations, minScore, showRealTimePrices, showTechnicalIndicators, showAlerts, onRefresh]);

  const updateConnectionStatus = useCallback(async () => {
    try {
      const status = await unifiedRecommendationService.getConnectionStatus();
      setConnectionStatus(status);
    } catch (err) {
      // Handle error silently for status updates
    }
  }, []);

  useEffect(() => {
    const initializeComponent = async () => {
      console.log(`🚀 Initializing ${recommendationType} recommendation table`);
      
      // Test connection
      const isConnected = await unifiedRecommendationService.testConnection();
      if (!isConnected) {
        setError('Unable to connect to the recommendation service');
        setLoading(false);
        return;
      }

      // Fetch initial recommendations
      await fetchAndSetRecommendations(false);
      
      // Update connection status
      await updateConnectionStatus();
    };

    initializeComponent();
  }, [recommendationType, fetchAndSetRecommendations, updateConnectionStatus]);

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => fetchAndSetRecommendations(false), refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchAndSetRecommendations]);

  // Update connection status periodically
  useEffect(() => {
    const statusInterval = setInterval(updateConnectionStatus, 15000); // every 15s
    return () => clearInterval(statusInterval);
  }, [updateConnectionStatus]);

  // Filtered and sorted recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(rec => 
        rec.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.sector.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sector filter
    if (filterSector !== 'all') {
      filtered = filtered.filter(rec => rec.sector === filterSector);
    }

    // Apply risk level filter
    if (filterRiskLevel !== 'all') {
      filtered = filtered.filter(rec => rec.riskLevel === filterRiskLevel);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [recommendations, searchTerm, filterSector, filterRiskLevel, sortConfig]);

  // Handle sort
  const handleSort = (field: keyof UnifiedRecommendation) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle refresh
  const handleRefresh = () => {
    fetchAndSetRecommendations(true);
  };

  // Handle stock click
  const handleStockClick = (stock: UnifiedRecommendation) => {
    setSelectedStock(stock);
    setStockDetailDialogOpen(true);
    if (onRecommendationClick) {
      onRecommendationClick(stock);
    }
  };

  // Handle row expansion
  const handleRowExpand = (symbol: string) => {
    const currentExpanded = Array.from(expandedRows);
    const newExpanded = new Set(currentExpanded);
    if (newExpanded.has(symbol)) {
      newExpanded.delete(symbol);
    } else {
      newExpanded.add(symbol);
    }
    setExpandedRows(newExpanded);
  };

  // Get risk color
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  // Get change color
  const getChangeColor = (change: number) => {
    if (change > 0) return 'success';
    if (change < 0) return 'error';
    return 'default';
  };

  // Get connection icon
  const getConnectionIcon = () => {
    if (!connectionStatus) return <WifiOff sx={{ color: 'error.main' }} />;
    switch (connectionStatus.status) {
      case 'connected':
        return <Wifi sx={{ color: 'success.main' }} />;
      case 'connecting':
        return <SignalCellular4Bar sx={{ color: 'warning.main' }} />;
      case 'disconnected':
      case 'error':
        return <WifiOff sx={{ color: 'error.main' }} />;
      default:
        return <WifiOff sx={{ color: 'error.main' }} />;
    }
  };

  // Get unique sectors for filter
  const uniqueSectors = useMemo(() => {
    const sectors = Array.from(new Set(recommendations.map(rec => rec.sector)));
    return sectors.sort();
  }, [recommendations]);

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom>
                {title || `${recommendationType.replace('_', ' ').toUpperCase()} Recommendations`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {description || `Real-time ${recommendationType} trading recommendations with live market data`}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center">
                {/* Connection Status */}
                <Tooltip title={`Connection: ${connectionStatus?.status || 'Disconnected'}`}>
                  <IconButton onClick={() => setShowConnectionDetails(!showConnectionDetails)}>
                    {getConnectionIcon()}
                  </IconButton>
                </Tooltip>

                {/* Auto-refresh Toggle */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoRefresh}
                      onChange={(e) => {
                        // This would need to be handled by parent component
                        console.log('Auto-refresh toggled:', e.target.checked);
                      }}
                    />
                  }
                  label="Auto-refresh"
                />

                {/* Refresh Button */}
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </Stack>
            </Grid>
          </Grid>

          {/* Connection Details */}
          {showConnectionDetails && connectionStatus && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>Connection Status</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">Status: {connectionStatus.status}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">Ticks: {connectionStatus.ticksReceived}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">Subscriptions: {connectionStatus.activeSubscriptions}</Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">Last Update: {connectionStatus.lastUpdate}</Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search symbols, companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Sector</InputLabel>
                <Select
                  value={filterSector}
                  onChange={(e) => setFilterSector(e.target.value)}
                  label="Sector"
                >
                  <MenuItem value="all">All Sectors</MenuItem>
                  {uniqueSectors.map(sector => (
                    <MenuItem key={sector} value={sector}>{sector}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Risk Level</InputLabel>
                <Select
                  value={filterRiskLevel}
                  onChange={(e) => setFilterRiskLevel(e.target.value)}
                  label="Risk Level"
                >
                  <MenuItem value="all">All Risks</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={showFilters ? <ExpandLess /> : <ExpandMore />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Typography variant="body2" color="text.secondary">
                Showing {filteredRecommendations.length} of {recommendations.length} recommendations
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <Box sx={{ width: '100%', mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Loading {recommendationType} recommendations...
          </Typography>
        </Box>
      )}

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Recommendations Table */}
      {!loading && !error && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Company</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.field === 'score'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('score')}
                  >
                    Score
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.field === 'currentPrice'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('currentPrice')}
                  >
                    Price
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.field === 'changePercent'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('changePercent')}
                  >
                    Change %
                  </TableSortLabel>
                </TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Stop Loss</TableCell>
                <TableCell>Risk</TableCell>
                <TableCell>Sector</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRecommendations.map((recommendation) => (
                <React.Fragment key={recommendation.symbol}>
                  <TableRow 
                    hover 
                    onClick={() => handleStockClick(recommendation)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="body2" fontWeight="bold">
                          {recommendation.symbol}
                        </Typography>
                        {recommendation.realTimeData && (
                          <Chip 
                            size="small" 
                            label="LIVE" 
                            color="success" 
                            variant="outlined"
                          />
                        )}
                        {recommendation.priceAlert && (
                          <Chip 
                            size="small" 
                            label="ALERT" 
                            color="warning" 
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {recommendation.companyName}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={`${recommendation.score.toFixed(1)}`}
                        color={getScoreColor(recommendation.score)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ₹{recommendation.currentPrice.toFixed(2)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color={getChangeColor(recommendation.changePercent)}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        {recommendation.changePercent > 0 ? <TrendingUp fontSize="small" /> : 
                         recommendation.changePercent < 0 ? <TrendingDown fontSize="small" /> : 
                         <TrendingFlat fontSize="small" />}
                        {recommendation.changePercent.toFixed(2)}%
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        ₹{recommendation.target.toFixed(2)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" color="error.main">
                        ₹{recommendation.stopLoss.toFixed(2)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        label={recommendation.riskLevel}
                        color={getRiskColor(recommendation.riskLevel)}
                        size="small"
                      />
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2">
                        {recommendation.sector}
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="View Details">
                          <IconButton size="small">
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Chart">
                          <IconButton size="small">
                            <ShowChart />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Expand">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRowExpand(recommendation.symbol);
                            }}
                          >
                            {expandedRows.has(recommendation.symbol) ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                  
                  {/* Expanded Row */}
                  {expandedRows.has(recommendation.symbol) && (
                    <TableRow>
                      <TableCell colSpan={10}>
                        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Typography variant="h6" gutterBottom>Technical Indicators</Typography>
                              {recommendation.technicalIndicators ? (
                                <Stack spacing={1}>
                                  <Typography variant="body2">RSI: {recommendation.technicalIndicators.rsi.toFixed(2)}</Typography>
                                  <Typography variant="body2">MACD: {recommendation.technicalIndicators.macd}</Typography>
                                  <Typography variant="body2">Bollinger Bands: {recommendation.technicalIndicators.bollingerBands}</Typography>
                                  <Typography variant="body2">Moving Averages: {recommendation.technicalIndicators.movingAverages}</Typography>
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary">No technical data available</Typography>
                              )}
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                              <Typography variant="h6" gutterBottom>AI Analysis</Typography>
                              {recommendation.aiScore ? (
                                <Stack spacing={1}>
                                  <Typography variant="body2">AI Score: {recommendation.aiScore.toFixed(2)}</Typography>
                                  <Typography variant="body2">Recommendation: {recommendation.recommendation}</Typography>
                                  <Typography variant="body2">Confidence: {recommendation.confidence?.toFixed(1)}%</Typography>
                                </Stack>
                              ) : (
                                <Typography variant="body2" color="text.secondary">No AI analysis available</Typography>
                              )}
                            </Grid>
                          </Grid>
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Stock Detail Dialog */}
      <Dialog
        open={stockDetailDialogOpen}
        onClose={() => setStockDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedStock?.symbol} - {selectedStock?.companyName}
        </DialogTitle>
        <DialogContent>
          {selectedStock && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Price Information</Typography>
                <Typography>Current Price: ₹{selectedStock.currentPrice.toFixed(2)}</Typography>
                <Typography>Target: ₹{selectedStock.target.toFixed(2)}</Typography>
                <Typography>Stop Loss: ₹{selectedStock.stopLoss.toFixed(2)}</Typography>
                <Typography>Change: {selectedStock.changePercent.toFixed(2)}%</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6">Analysis</Typography>
                <Typography>Score: {selectedStock.score.toFixed(1)}</Typography>
                <Typography>Risk Level: {selectedStock.riskLevel}</Typography>
                <Typography>Sector: {selectedStock.sector}</Typography>
                <Typography>Volume: {selectedStock.volume.toLocaleString()}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStockDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Notifications */}
      <Snackbar
        open={!!notification}
        autoHideDuration={6000}
        onClose={() => setNotification(null)}
      >
        <Alert 
          onClose={() => setNotification(null)} 
          severity={notification?.type || 'info'}
        >
          {notification?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UnifiedRecommendationTable; 