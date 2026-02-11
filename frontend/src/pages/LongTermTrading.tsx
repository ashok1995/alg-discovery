import React, { useState, useEffect, useCallback } from 'react';
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
  TableSortLabel,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  Refresh,
  ShowChart,
  TrendingUp,
  TrendingDown,
  Assessment,
  FilterList,
  Settings
} from '@mui/icons-material';
import VariantsSelector from '../components/VariantsSelector';

import { 
  longTermAPIService, 
  LongTermRecommendation,
  LongTermRequest,
  LongTermAnalysis
} from '../services/LongTermAPIService';

interface LongTermTradingProps {}

const LongTermTrading: React.FC<LongTermTradingProps> = () => {
  const [recommendations, setRecommendations] = useState<LongTermRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stockDetailDialogOpen, setStockDetailDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<LongTermRecommendation | null>(null);
  const [stockAnalysis, setStockAnalysis] = useState<LongTermAnalysis | null>(null);
  const [sortBy, setSortBy] = useState<'score' | 'longTermPotential' | 'growthProjection' | 'dividendYield'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  // Request parameters
  const [requestParams] = useState<LongTermRequest>({
    limit: 50,
    min_score: 10.0,
    force_refresh: false,
    strategy: 'balanced',
    risk_tolerance: 'moderate',
    investment_horizon: 24
  });

  // Filter states
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Fetch recommendations from the API
  const fetchRecommendations = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const params: LongTermRequest = {
        ...requestParams,
        force_refresh: forceRefresh,
        variants: selectedVariants // Include selected variants in the request
      };

      console.log('🔄 Fetching long-term recommendations with params:', params);
      
      const response = await longTermAPIService.getRecommendations(params);
      
      if (response.success && response.data.recommendations) {
        setRecommendations(response.data.recommendations);
        
        console.log(`✅ Fetched ${response.data.recommendations.length} long-term recommendations`);
        
        // Show success notification
        setNotification({
          message: `Successfully fetched ${response.data.recommendations.length} long-term recommendations`,
          type: 'success'
        });
      } else {
        throw new Error(response.error || 'Failed to fetch recommendations');
      }
    } catch (error: any) {
      console.error('❌ Error fetching long-term recommendations:', error);
      setError(error.message);
      setNotification({
        message: `Failed to fetch long-term recommendations: ${error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [requestParams, selectedVariants]);

  // Initialize component
  useEffect(() => {
    fetchRecommendations(false);
  }, [fetchRecommendations]);

  // Set up auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const intervalId = setInterval(() => {
        if (!loading) {
          fetchRecommendations(false);
        }
      }, 60000); // Refresh every minute for long-term recommendations

      return () => {
        if (intervalId) {
          clearInterval(intervalId);
        }
      };
    }
  }, [autoRefresh, loading, fetchRecommendations]);

  const handleStockClick = async (stock: LongTermRecommendation) => {
    setSelectedStock(stock);
    setStockDetailDialogOpen(true);
    
    try {
      const analysis = await longTermAPIService.getAnalysis(stock.symbol);
      if (analysis.success) {
        setStockAnalysis(analysis.data);
      }
    } catch (error) {
      console.error('Error fetching stock analysis:', error);
    }
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleVariantsChange = (variants: Record<string, string>) => {
    console.log('Long Term Trading variants changed:', variants);
    setSelectedVariants(variants);
    
    // Trigger background refresh with new variants - non-blocking
    setTimeout(() => {
      fetchRecommendations(true);
    }, 100); // Small delay to ensure UI updates first
  };

  const getFilteredRecommendations = () => {
    let filtered = recommendations;

    // Apply filters
    if (strategyFilter !== 'all') {
      filtered = filtered.filter(rec => (rec as any).strategy === strategyFilter);
    }
    if (riskFilter !== 'all') {
      filtered = filtered.filter(rec => rec.riskLevel === riskFilter);
    }
    if (sectorFilter !== 'all') {
      filtered = filtered.filter(rec => rec.sector === sectorFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'score':
          aValue = a.score;
          bValue = b.score;
          break;
        case 'longTermPotential':
          aValue = a.longTermPotential;
          bValue = b.longTermPotential;
          break;
        case 'growthProjection':
          aValue = a.growthProjection;
          bValue = b.growthProjection;
          break;
        case 'dividendYield':
          aValue = a.dividendYield;
          bValue = b.dividendYield;
          break;
        default:
          aValue = a.score;
          bValue = b.score;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'success';
    if (change < 0) return 'error';
    return 'default';
  };

  const filteredRecommendations = getFilteredRecommendations();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Long Term Trading Recommendations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          AI-powered long-term investment opportunities (12+ months) with comprehensive fundamental and technical analysis
        </Typography>
      </Box>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={() => fetchRecommendations(true)}
                disabled={loading}
              >
                Refresh
              </Button>
            </Grid>
            <Grid item>
              <VariantsSelector
                strategyType="long-term"
                onVariantsChange={handleVariantsChange}
                disabled={loading}
              />
            </Grid>
            <Grid item>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    color="primary"
                  />
                }
                label="Auto Refresh"
              />
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => setShowFilters(!showFilters)}
              >
                Filters
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                startIcon={<Settings />}
                onClick={() => {/* Handle settings */}}
              >
                Settings
              </Button>
            </Grid>
            <Grid item xs />
            <Grid item>
              <Typography variant="body2" color="text.secondary">
                Last updated: {new Date().toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filters */}
      {showFilters && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Strategy</InputLabel>
                  <Select
                    value={strategyFilter}
                    onChange={(e) => setStrategyFilter(e.target.value)}
                    label="Strategy"
                  >
                    <MenuItem value="all">All Strategies</MenuItem>
                    <MenuItem value="growth">Growth</MenuItem>
                    <MenuItem value="value">Value</MenuItem>
                    <MenuItem value="dividend">Dividend</MenuItem>
                    <MenuItem value="balanced">Balanced</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Risk Level</InputLabel>
                  <Select
                    value={riskFilter}
                    onChange={(e) => setRiskFilter(e.target.value)}
                    label="Risk Level"
                  >
                    <MenuItem value="all">All Risks</MenuItem>
                    <MenuItem value="low">Low</MenuItem>
                    <MenuItem value="medium">Medium</MenuItem>
                    <MenuItem value="high">High</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sector</InputLabel>
                  <Select
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    label="Sector"
                  >
                    <MenuItem value="all">All Sectors</MenuItem>
                    {Array.from(new Set(recommendations.map(rec => rec.sector))).map(sector => (
                      <MenuItem key={sector} value={sector}>{sector}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <Typography variant="body2" color="text.secondary">
                  Showing {filteredRecommendations.length} of {recommendations.length} recommendations
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Loading and Error States */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Fetching latest long-term trading recommendations...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Long Term Strategy Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Long Term Trading Strategy:</strong> These recommendations are designed for long-term investments (12+ months) focusing on fundamentally strong companies with growth potential, 
          dividend yields, and sustainable competitive advantages. Ideal for investors looking for wealth creation over extended periods.
        </Typography>
      </Alert>

      {/* Recommendations Table */}
      <Card>
        <CardContent>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Top {filteredRecommendations.length} Long Term Opportunities
            </Typography>
            <Chip
              label={`${filteredRecommendations.filter(r => r.score >= 80).length} High Quality`}
              color="success"
              size="small"
            />
          </Box>

          <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Stock</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'score'}
                      direction={sortOrder}
                      onClick={() => handleSort('score')}
                    >
                      Score
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Current Price</TableCell>
                  <TableCell>Change</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'longTermPotential'}
                      direction={sortOrder}
                      onClick={() => handleSort('longTermPotential')}
                    >
                      Long Term Potential
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'growthProjection'}
                      direction={sortOrder}
                      onClick={() => handleSort('growthProjection')}
                    >
                      Growth Projection
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={sortBy === 'dividendYield'}
                      direction={sortOrder}
                      onClick={() => handleSort('dividendYield')}
                    >
                      Dividend Yield
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Risk</TableCell>
                  <TableCell>Strategy</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRecommendations.map((stock) => (
                  <TableRow 
                    key={stock.symbol}
                    hover
                    onClick={() => handleStockClick(stock)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {stock.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stock.companyName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${stock.score.toFixed(1)}`}
                        color={getScoreColor(stock.score)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        ₹{stock.currentPrice.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {stock.changePercent > 0 ? <TrendingUp color="success" /> : <TrendingDown color="error" />}
                        <Typography
                          variant="body2"
                          color={getChangeColor(stock.changePercent)}
                          fontWeight="bold"
                        >
                          {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="success.main">
                        ₹{stock.target.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${stock.longTermPotential.toFixed(1)}%`}
                        color={stock.longTermPotential >= 20 ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={stock.growthProjection >= 15 ? 'success.main' : 'text.secondary'}>
                        {stock.growthProjection.toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={(stock.dividendYield || 0) > 2 ? 'success.main' : 'text.secondary'}>
                        {(stock.dividendYield || 0).toFixed(2)}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={stock.riskLevel}
                        color={getRiskColor(stock.riskLevel)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={(stock as any).strategy || 'N/A'}
                        color="primary"
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Chart">
                          <IconButton size="small">
                            <ShowChart />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="View Analysis">
                          <IconButton size="small">
                            <Assessment />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

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
          {selectedStock && stockAnalysis && (
            <Box>
              <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 2 }}>
                <Tab label="Overview" />
                <Tab label="Fundamental Analysis" />
                <Tab label="Technical Analysis" />
                <Tab label="Risk Assessment" />
              </Tabs>
              
              {activeTab === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6">Price Information</Typography>
                    <Typography>Current Price: ₹{selectedStock.currentPrice.toFixed(2)}</Typography>
                    <Typography>Target: ₹{selectedStock.target.toFixed(2)}</Typography>
                    <Typography>Change: {selectedStock.changePercent.toFixed(2)}%</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6">Analysis</Typography>
                    <Typography>Score: {selectedStock.score.toFixed(1)}</Typography>
                    <Typography>Risk Level: {selectedStock.riskLevel}</Typography>
                    <Typography>Strategy: {(selectedStock as any).strategy || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              )}
              
              {activeTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>Fundamental Analysis</Typography>
                  <Typography>Long Term Potential: {selectedStock.longTermPotential.toFixed(1)}%</Typography>
                  <Typography>Growth Projection: {selectedStock.growthProjection.toFixed(1)}%</Typography>
                  <Typography>Dividend Yield: {(selectedStock.dividendYield || 0).toFixed(2)}%</Typography>
                  {(stockAnalysis as any)?.fundamentalMetrics && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1">Key Metrics:</Typography>
                      <Typography>P/E Ratio: {(stockAnalysis as any).fundamentalMetrics.peRatio}</Typography>
                      <Typography>P/B Ratio: {(stockAnalysis as any).fundamentalMetrics.pbRatio}</Typography>
                      <Typography>ROE: {(stockAnalysis as any).fundamentalMetrics.roe}%</Typography>
                    </Box>
                  )}
                </Box>
              )}
              
              {activeTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>Technical Analysis</Typography>
                  {(stockAnalysis as any)?.technicalIndicators && (
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography>RSI: {(stockAnalysis as any).technicalIndicators.rsi}</Typography>
                        <Typography>MACD: {(stockAnalysis as any).technicalIndicators.macd}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography>Moving Averages: {(stockAnalysis as any).technicalIndicators.movingAverages}</Typography>
                        <Typography>Support/Resistance: {(stockAnalysis as any).technicalIndicators.supportResistance}</Typography>
                      </Grid>
                    </Grid>
                  )}
                </Box>
              )}
              
              {activeTab === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom>Risk Assessment</Typography>
                  {(stockAnalysis as any)?.riskFactors && (
                    <Box>
                      <Typography variant="subtitle1">Risk Factors:</Typography>
                      {(stockAnalysis as any).riskFactors.map((factor: string, index: number) => (
                        <Typography key={index} color="error">• {factor}</Typography>
                      ))}
                    </Box>
                  )}
                  {(stockAnalysis as any)?.opportunities && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle1">Opportunities:</Typography>
                      {(stockAnalysis as any).opportunities.map((opportunity: string, index: number) => (
                        <Typography key={index} color="success.main">• {opportunity}</Typography>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>
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

export default LongTermTrading; 