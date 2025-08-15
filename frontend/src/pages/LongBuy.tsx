import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Badge,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Avatar,
  Stack,
  Fab
} from '@mui/material';
import {
  Refresh,
  ShowChart,
  Info,
  AccountBalance,
  TrendingUp,
  TrendingDown,
  AutoAwesome,
  Search,
  Code,
  PlayArrow,
  Stop,
  CheckCircle,
  Warning,
  Psychology,
  Analytics,
  Timeline,
  Settings
} from '@mui/icons-material';
import { useBackgroundRefresh } from '../hooks/useBackgroundRefresh';
import ThemeRecommendationsService, { ThemeRecommendationRequest } from '../services/ThemeRecommendationsService';
import { recommendationAPIService } from '../services/RecommendationAPIService';
import AutoRefreshCountdown from '../components/AutoRefreshCountdown';

interface LongBuyRecommendation {
  symbol: string;
  companyName: string;
  name: string;
  score: number;
  currentPrice: number;
  price: number;
  target: number;
  stopLoss: number;
  change: number;
  changePercent: number;
  per_change: number;
  volume: number;
  sector: string;
  riskLevel: 'low' | 'medium' | 'high';
  holdingPeriod: string;
  technicalSignals: string[];
  fundamentalScore: number;
  dividendYield: number;
  peRatio: number;
  realTimeData?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const LongBuy: React.FC = () => {
  const [recommendations, setRecommendations] = useState<LongBuyRecommendation[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [aiMode, setAiMode] = useState(true); // AI mode on by default
  const [autoRefresh, setAutoRefresh] = useState(true); // Auto refresh on by default
  const [showAdvancedMode, setShowAdvancedMode] = useState(false);
  const [advancedTabValue, setAdvancedTabValue] = useState(0);
  
  // Theme recommendations state
  const [useThemeRecommendations, setUseThemeRecommendations] = useState(false);
  const [marketCondition, setMarketCondition] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [timePeriod, setTimePeriod] = useState<'short_term' | 'medium_term' | 'long_term'>('long_term');

  // Advanced mode states
  const [queryText, setQueryText] = useState('');
  const [isQueryRunning, setIsQueryRunning] = useState(false);

  const fetchRecommendationsData = async (forceRefresh: boolean = false) => {
    try {
      // Try new recommendation API service first
      console.log(`🎯 [${new Date().toISOString()}] LongBuy: Using new recommendation API service`);
      
      try {
        const recommendationResponse = await recommendationAPIService.getLongBuyRecommendations({
          max_recommendations: 50,
          min_score: 80.0,
          risk_profile: 'conservative',
          include_metadata: true
        });

        if (recommendationResponse.status === 'success' && recommendationResponse.recommendations) {
          console.log(`✅ [${new Date().toISOString()}] LongBuy: Received ${recommendationResponse.recommendations.length} recommendations from new API`);
          
          // Transform the response to match our interface
          const transformedRecommendations: LongBuyRecommendation[] = recommendationResponse.recommendations.map(rec => ({
            symbol: rec.symbol,
            companyName: rec.name,
            name: rec.name,
            score: rec.score,
            currentPrice: rec.price,
            price: rec.price,
            target: rec.price * 1.15, // Default 15% target for long-term
            stopLoss: rec.price * 0.90, // Default 10% stop loss for long-term
            change: rec.price * (rec.change_percent / 100),
            changePercent: rec.change_percent,
            per_change: rec.change_percent,
            volume: rec.volume,
            sector: rec.sector,
            riskLevel: rec.score >= 85 ? 'low' : rec.score >= 75 ? 'medium' : 'high',
            holdingPeriod: 'weeks to months',
            technicalSignals: [],
            fundamentalScore: rec.analysis?.fundamental_score || 0,
            dividendYield: 0,
            peRatio: rec.metadata?.pe_ratio || 0
          }));

          setRecommendations(transformedRecommendations);
          return;
        } else {
          console.warn(`⚠️ [${new Date().toISOString()}] LongBuy: New API returned no recommendations, falling back to theme recommendations`);
        }
      } catch (newApiError) {
        console.warn(`⚠️ [${new Date().toISOString()}] LongBuy: New recommendation API failed, falling back to theme recommendations:`, newApiError);
      }

      // Use theme recommendations if enabled
      if (useThemeRecommendations) {
        console.log(`🎯 [${new Date().toISOString()}] LongBuy: Using theme recommendations`);
        
        const themeService = ThemeRecommendationsService.getInstance();
        const themeRequest: ThemeRecommendationRequest = {
          max_recommendations: 50
        };

        const themeResponse = await themeService.getThemeRecommendations('longterm', themeRequest);
        
        if (themeResponse.success && themeResponse.recommendations) {
          console.log(`✅ [${new Date().toISOString()}] LongBuy: Received ${themeResponse.recommendations.length} theme recommendations`);
          setRecommendations(themeResponse.recommendations as LongBuyRecommendation[]);
          return;
        } else {
          console.error(`❌ [${new Date().toISOString()}] LongBuy: Theme recommendations failed:`, themeResponse.error);
        }
      }

      // Regular recommendations fallback via centralized service
      console.log(`🔄 [${new Date().toISOString()}] LongBuy: Fallback to recommendation endpoint`);
      const fallback = await recommendationAPIService.getLongBuyRecommendations({
        max_recommendations: 50,
        min_score: 80.0,
        risk_profile: 'conservative',
        include_metadata: true
      });

      if (fallback.status === 'success' && fallback.recommendations) {
        const transformed: LongBuyRecommendation[] = fallback.recommendations.map(rec => ({
          symbol: rec.symbol,
          companyName: rec.name,
          name: rec.name,
          score: rec.score,
          currentPrice: rec.price,
          price: rec.price,
          target: rec.price * 1.15, // Default 15% target for long-term
          stopLoss: rec.price * 0.90, // Default 10% stop loss for long-term
          change: rec.price * (rec.change_percent / 100),
          changePercent: rec.change_percent,
          per_change: rec.change_percent,
          volume: rec.volume,
          sector: rec.sector,
          riskLevel: rec.score >= 80 ? 'low' : rec.score >= 70 ? 'medium' : 'high',
          holdingPeriod: 'weeks to months',
          technicalSignals: [],
          fundamentalScore: rec.analysis?.fundamental_score || 0,
          dividendYield: 0,
          peRatio: 0,
          realTimeData: false
        }));
        setRecommendations(transformed);
      } else {
        throw new Error(fallback.error || 'Fallback recommendation call failed');
      }
    } catch (err: any) {
      console.error(`❌ [${new Date().toISOString()}] LongBuy: Failed to fetch recommendations:`, {
        error: err.message,
        forceRefresh,
        aiMode,
        timestamp: new Date().toISOString()
      });
      
      setRecommendations([]);
    }
  };

  const {
    loading,
    error,
    backgroundRefreshQueue,
    lastRefreshTime,
    fetchData,
    handleVariantsChange,
  } = useBackgroundRefresh(fetchRecommendationsData, {
    autoRefreshInterval: autoRefresh ? 300000 : 0, // 5 minutes if auto refresh is on
    timeout: 30000,
    enableCaching: true,
    strategy: aiMode ? 'long-buy-ai' : 'long-buy',
    initialAutoRefresh: true
  });

  useEffect(() => {
    // initial fetch on mount
    fetchData(true);
  }, []);

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleActivateToggle = () => {
    setIsActive(!isActive);
  };

  const handleAiModeToggle = () => {
    setAiMode(!aiMode);
  };

  const handleAdvancedModeToggle = () => {
    setShowAdvancedMode(!showAdvancedMode);
  };

  const handleAdvancedTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setAdvancedTabValue(newValue);
  };

  const handleThemeRecommendations = async () => {
    try {
      const themeService = ThemeRecommendationsService.getInstance();
      const themeRequest: ThemeRecommendationRequest = {
        market_condition: marketCondition,
        risk_tolerance: riskTolerance,
        time_period: timePeriod,
        max_recommendations: 50
      };

      const themeResponse = await themeService.getThemeRecommendations('longterm', themeRequest);
      
      if (themeResponse.success && themeResponse.recommendations) {
        setRecommendations(themeResponse.recommendations as LongBuyRecommendation[]);
      } else {
        console.error('Theme recommendations failed:', themeResponse.error);
      }
    } catch (error) {
      console.error('Error fetching theme recommendations:', error);
    }
  };

  const handleQueryTest = async () => {
    if (!queryText.trim()) return;
    
    setIsQueryRunning(true);
    try {
      // Simulate query execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Query executed:', queryText);
      // TODO: Implement actual query execution
    } catch (error) {
      console.error('Query execution failed:', error);
    } finally {
      setIsQueryRunning(false);
    }
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
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'success' : 'error';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Modern Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <Timeline sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Long Buy AI
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                AI-powered long-term investing with fundamental analysis
              </Typography>
            </Box>
          </Box>
          
          <Stack direction="row" spacing={2} alignItems="center">
            {/* AI Mode Badge */}
            <Badge badgeContent="AI" color="primary">
              <Chip
                icon={<AutoAwesome />}
                label="AI Mode Active"
                color="primary"
                variant="filled"
                sx={{ fontWeight: 'bold' }}
              />
            </Badge>
            
            {/* Live Status */}
            <Chip
              icon={isActive ? <CheckCircle /> : <Warning />}
              label={isActive ? 'Live' : 'Paused'}
              color={isActive ? 'success' : 'warning'}
              variant="outlined"
            />
            
            {/* Advanced Mode Toggle */}
            <Button
              variant={showAdvancedMode ? "contained" : "outlined"}
              startIcon={<Settings />}
              onClick={handleAdvancedModeToggle}
              size="small"
            >
              Advanced Mode
            </Button>
            
            {/* Refresh Button */}
            <AutoRefreshCountdown
              lastRefreshTime={lastRefreshTime}
              intervalMs={300000}
              loading={loading}
              autoRefreshEnabled={autoRefresh}
              onForceRefresh={() => fetchData(true)}
              onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
            />
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
              sx={{ minWidth: 120 }}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Stack>
        </Box>

        {/* Status Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Timeline sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h6" gutterBottom>Total Stocks</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{recommendations.length}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  AI Selected
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Analytics sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h6" gutterBottom>High Score (80+)</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {recommendations.filter(r => r.score >= 80).length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Premium picks</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <ShowChart sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h6" gutterBottom>Live Prices</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {recommendations.filter(r => r.currentPrice > 0).length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Real-time data</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Psychology sx={{ fontSize: 32, mb: 1 }} />
                <Typography variant="h6" gutterBottom>Avg Score</Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {recommendations.length > 0 
                    ? Math.round(recommendations.reduce((sum, r) => sum + r.score, 0) / recommendations.length)
                    : 0
                  }
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  AI Confidence
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Advanced Mode Section */}
      {showAdvancedMode && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              Advanced Mode
            </Typography>
            
            <Tabs value={advancedTabValue} onChange={handleAdvancedTabChange} sx={{ mb: 2 }}>
              <Tab label="Theme-Based Selection" icon={<Analytics />} />
              <Tab label="Query Testing" icon={<Code />} />
            </Tabs>

            <TabPanel value={advancedTabValue} index={0}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Market Condition</InputLabel>
                    <Select
                      value={marketCondition}
                      onChange={(e) => setMarketCondition(e.target.value as 'bullish' | 'bearish' | 'neutral')}
                      label="Market Condition"
                    >
                      <MenuItem value="bullish">Bullish</MenuItem>
                      <MenuItem value="bearish">Bearish</MenuItem>
                      <MenuItem value="neutral">Neutral</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Risk Tolerance</InputLabel>
                    <Select
                      value={riskTolerance}
                      onChange={(e) => setRiskTolerance(e.target.value as 'low' | 'moderate' | 'high')}
                      label="Risk Tolerance"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="moderate">Moderate</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Time Period</InputLabel>
                    <Select
                      value={timePeriod}
                      onChange={(e) => setTimePeriod(e.target.value as 'short_term' | 'medium_term' | 'long_term')}
                      label="Time Period"
                    >
                      <MenuItem value="short_term">Short Term</MenuItem>
                      <MenuItem value="medium_term">Medium Term</MenuItem>
                      <MenuItem value="long_term">Long Term</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    variant="contained"
                    startIcon={<Search />}
                    onClick={handleThemeRecommendations}
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? 'Searching...' : 'Get Theme Stocks'}
                  </Button>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={advancedTabValue} index={1}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Test long-term investment queries and algorithms
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Query</InputLabel>
                      <Select
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        label="Query"
                        placeholder="Enter your long-term investment query..."
                      >
                        <MenuItem value="value_investing">Value Investing Strategy</MenuItem>
                        <MenuItem value="growth_investing">Growth Investing Strategy</MenuItem>
                        <MenuItem value="dividend_investing">Dividend Investing Strategy</MenuItem>
                        <MenuItem value="custom">Custom Query...</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      startIcon={isQueryRunning ? <Stop /> : <PlayArrow />}
                      onClick={handleQueryTest}
                      disabled={isQueryRunning || !queryText}
                      fullWidth
                    >
                      {isQueryRunning ? 'Running Query...' : 'Test Query'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          </CardContent>
        </Card>
      )}

      {/* Loading and Error States */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            AI is analyzing long-term investment patterns...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to fetch recommendations: {error}
        </Alert>
      )}

      {/* Long-term Strategy Info */}
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Long-term Strategy:</strong> These recommendations are designed for long-term investing with holding periods of weeks to months. 
          Focus on stocks with strong fundamentals, consistent growth, and solid financial health.
        </Typography>
      </Alert>

      {/* Recommendations Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome />
            AI-Powered Long Buy Recommendations
            <Chip 
              label={`${recommendations.length} stocks`} 
              size="small" 
              color="primary" 
              sx={{ ml: 1 }}
            />
          </Typography>

          {recommendations.length === 0 && !loading ? (
            <Alert severity="info">
              No recommendations available. Try refreshing or adjusting your criteria.
            </Alert>
          ) : (
            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Stock</strong></TableCell>
                    <TableCell><strong>Score</strong></TableCell>
                    <TableCell><strong>Current Price</strong></TableCell>
                    <TableCell><strong>Change</strong></TableCell>
                    <TableCell><strong>Target</strong></TableCell>
                    <TableCell><strong>Stop Loss</strong></TableCell>
                    <TableCell><strong>Fundamental Score</strong></TableCell>
                    <TableCell><strong>P/E Ratio</strong></TableCell>
                    <TableCell><strong>Risk</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recommendations.map((stock) => (
                    <TableRow 
                      key={stock.symbol}
                      hover
                      sx={{ cursor: 'default' }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {stock.symbol}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {stock.companyName || stock.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${(stock.score || 0).toFixed(1)}`}
                          color={getScoreColor(stock.score) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          ₹{(stock.currentPrice || 0).toFixed(2)}
                        </Typography>
                        {stock.realTimeData && (
                          <Chip label="Live" size="small" color="success" sx={{ mt: 0.5 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {stock.change >= 0 ? (
                            <TrendingUp color="success" fontSize="small" />
                          ) : (
                            <TrendingDown color="error" fontSize="small" />
                          )}
                          <Typography
                            variant="body2"
                            color={getChangeColor(stock.change) as any}
                            fontWeight="bold"
                          >
                            {(stock.change || 0) >= 0 ? '+' : ''}{(stock.change || 0).toFixed(2)} ({(stock.changePercent || 0).toFixed(2)}%)
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="success.main">
                          ₹{(stock.target || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="error.main">
                          ₹{(stock.stopLoss || 0).toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${(stock.fundamentalScore || 0).toFixed(1)}`}
                          color={stock.fundamentalScore >= 80 ? 'success' : stock.fundamentalScore >= 60 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {(stock.peRatio || 0).toFixed(1)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={stock.riskLevel}
                          color={getRiskColor(stock.riskLevel) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Chart">
                            <IconButton size="small">
                              <ShowChart />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="More Info">
                            <IconButton size="small">
                              <Info />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Floating Action Button for Quick Actions */}
      <Fab
        color="primary"
        aria-label="quick actions"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={handleRefresh}
      >
        <Refresh />
      </Fab>
    </Box>
  );
};

export default LongBuy;