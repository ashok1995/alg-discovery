import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
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
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Divider,
  Badge,
  Avatar,
  Stack,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  TrendingUp,
  Psychology,
  Refresh,
  AutoAwesome,
  Analytics,
  ShowChart,
  Visibility,
  VisibilityOff,
  Timeline,
  Settings,
  Search,
  Code,
  PlayArrow,
  Stop,
  Speed,
  TrendingDown,
  CheckCircle,
  Warning,
  Info
} from '@mui/icons-material';
import VariantsSelector from '../components/VariantsSelector';
import { useBackgroundRefresh } from '../hooks/useBackgroundRefresh';
import DataCacheManager from '../services/DataCacheManager';
import ThemeRecommendationsService, { ThemeRecommendationRequest } from '../services/ThemeRecommendationsService';
import { recommendationAPIService } from '../services/RecommendationAPIService';
import AutoRefreshCountdown from '../components/AutoRefreshCountdown';

interface SwingBuyRecommendation {
  symbol: string;
  companyName: string;
  name: string;
  score: number;
  currentPrice: number;
  target: number;
  stopLoss: number;
  change: number;
  changePercent: number;
  volume: number;
  sector: string;
  riskLevel: 'low' | 'medium' | 'high';
  holdingPeriod: string;
  technicalSignals: string[];
  momentum: number;
  volatility: number;
  aiScore?: number;
  aiConfidence?: number;
  aiAnalysis?: string;
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

const SwingBuy: React.FC = () => {
  const [recommendations, setRecommendations] = useState<SwingBuyRecommendation[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [aiMode, setAiMode] = useState(true); // AI mode on by default
  const [autoRefresh, setAutoRefresh] = useState(true); // Auto refresh on by default
  const [showAdvancedMode, setShowAdvancedMode] = useState(false);
  const [advancedTabValue, setAdvancedTabValue] = useState(0);
  
  // Theme recommendations state
  const [useThemeRecommendations] = useState(false);
  const [marketCondition, setMarketCondition] = useState<'bullish' | 'bearish' | 'neutral'>('neutral');
  const [riskTolerance, setRiskTolerance] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [timePeriod, setTimePeriod] = useState<'short_term' | 'medium_term' | 'long_term'>('medium_term');

  // Advanced mode states
  const [queryText, setQueryText] = useState('');
  const [isQueryRunning, setIsQueryRunning] = useState(false);

  // Unified fetch logic that handles both regular and theme recommendations
  const fetchRecommendationsData = async (forceRefresh: boolean = false) => {
    try {
      // Check cache first if not forcing refresh and not using theme recommendations
      if (!forceRefresh && !useThemeRecommendations) {
        const cacheManager = DataCacheManager.getInstance();
        const cacheKey = aiMode ? 'swing-buy-ai' : 'swing-buy';
        const cached = cacheManager.getCache(cacheKey, {});
        if (cached && Array.isArray(cached) && cached.length > 0) {
          console.log(`💾 [${new Date().toISOString()}] SwingBuy: Using cached data (${cached.length} items, AI: ${aiMode})`);
          setRecommendations(cached as SwingBuyRecommendation[]);
          return; // Exit early, no API call needed
        }
      }

      // Try new recommendation API service first
      console.log(`🎯 [${new Date().toISOString()}] SwingBuy: Using new recommendation API service`);
      
      try {
        const serviceInfo = recommendationAPIService.getServiceInfo();
        const swingUrl = `${serviceInfo.baseUrl}${serviceInfo.endpoints.SWING}`;
        const swingPayload = {
          max_recommendations: 50,
          min_score: 70.0,
          risk_profile: 'moderate' as const,
          include_metadata: true
        };

        console.groupCollapsed('[SwingBuy] REQUEST POST %s', swingUrl);
        console.log('time:', new Date().toISOString());
        console.log('payload:', swingPayload);
        console.groupEnd();

        const recommendationResponse = await recommendationAPIService.getSwingRecommendations(swingPayload);

        console.groupCollapsed('[SwingBuy] RESPONSE %s', swingUrl);
        console.log('time:', new Date().toISOString());
        console.log('status:', recommendationResponse.status);
        console.log('total_count:', recommendationResponse.total_count);
        console.log('execution_time:', `${recommendationResponse.execution_time}ms`);
        console.groupEnd();

        if (recommendationResponse.status === 'success' && recommendationResponse.recommendations) {
          console.log(`✅ [${new Date().toISOString()}] SwingBuy: Received ${recommendationResponse.recommendations.length} recommendations from new API`);
          
          // Transform the response to match our interface
          const transformedRecommendations: SwingBuyRecommendation[] = recommendationResponse.recommendations.map(rec => ({
            symbol: rec.symbol,
            companyName: rec.name,
            name: rec.name,
            score: rec.score,
            currentPrice: rec.price ?? 0,
            target: (rec.price ?? 0) * 1.05, // Default 5% target for swing
            stopLoss: (rec.price ?? 0) * 0.95, // Default 5% stop loss for swing
            change: (rec.price ?? 0) * (rec.change_percent / 100),
            changePercent: rec.change_percent,
            volume: rec.volume,
            sector: rec.sector,
            riskLevel: rec.score >= 80 ? 'low' : rec.score >= 70 ? 'medium' : 'high',
            holdingPeriod: '3-10 days',
            technicalSignals: [],
            momentum: rec.analysis?.technical_score || 0,
            volatility: 0,
            aiScore: rec.analysis?.technical_score,
            aiConfidence: rec.score,
            aiAnalysis: rec.analysis ? `Technical: ${rec.analysis.technical_score}, Fundamental: ${rec.analysis.fundamental_score}` : undefined
          }));

          setRecommendations(transformedRecommendations);
          return;
        } else {
          console.warn(`⚠️ [${new Date().toISOString()}] SwingBuy: New API returned no recommendations`);
          throw new Error('Recommendation API returned no recommendations');
        }
      } catch (newApiError: any) {
        const serviceInfo = recommendationAPIService.getServiceInfo();
        const swingUrl = `${serviceInfo.baseUrl}${serviceInfo.endpoints.SWING}`;
        console.groupCollapsed('[SwingBuy] ERROR %s', swingUrl);
        console.log('time:', new Date().toISOString());
        console.log('message:', newApiError?.message || newApiError);
        console.groupEnd();
        console.warn(`⚠️ [${new Date().toISOString()}] SwingBuy: New recommendation API failed, falling back to theme recommendations:`, newApiError);
      }

      // Use theme recommendations if enabled
      if (useThemeRecommendations) {
        console.log(`🎯 [${new Date().toISOString()}] SwingBuy: Using theme recommendations`);
        
        const themeService = ThemeRecommendationsService.getInstance();
        const themeRequest: ThemeRecommendationRequest = {
          max_recommendations: 50
        };

        const themeResponse = await themeService.getThemeRecommendations('swing', themeRequest);
        
        if (themeResponse.success && themeResponse.recommendations) {
          console.log(`✅ [${new Date().toISOString()}] SwingBuy: Received ${themeResponse.recommendations.length} theme recommendations`);
          setRecommendations(themeResponse.recommendations as SwingBuyRecommendation[]);
          return;
        } else {
          console.error(`❌ [${new Date().toISOString()}] SwingBuy: Theme recommendations failed:`, themeResponse.error);
        }
      }

      // Regular recommendations fallback via centralized service
      throw new Error('Recommendation API is down or returned an invalid response');
    } catch (err: any) {
      console.error(`❌ [${new Date().toISOString()}] SwingBuy: Failed to fetch recommendations:`, {
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
    autoRefreshInterval: autoRefresh ? 120000 : 0, // 2 minutes if auto refresh is on
    timeout: 30000,
    enableCaching: true,
    strategy: aiMode ? 'swing-buy-ai' : 'swing-buy',
    initialAutoRefresh: true
  });

  useEffect(() => {
    // On mount, fetch immediately to avoid waiting until next interval
    fetchData(true);
  }, []);

  const handleRefresh = () => {
    fetchData(true);
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

      const themeResponse = await themeService.getThemeRecommendations('swing', themeRequest);
      
      if (themeResponse.success && themeResponse.recommendations) {
        setRecommendations(themeResponse.recommendations as SwingBuyRecommendation[]);
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

  // const getRiskColor = (riskLevel: string) => {
  //   switch (riskLevel) {
  //     case 'low': return 'success';
  //     case 'medium': return 'warning';
  //     case 'high': return 'error';
  //     default: return 'default';
  //   }
  // };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'success' : 'error';
  };

  // const getAiConfidenceColor = (confidence: number) => {
  //   if (confidence >= 80) return 'success';
  //   if (confidence >= 60) return 'warning';
  //   return 'error';
  // };

  return (
    <Box sx={{ p: 3 }}>
      {/* Modern Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
              <AutoAwesome sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Swing Buy AI
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                AI-powered swing trading with real-time market analysis
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
            <AutoRefreshCountdown
              lastRefreshTime={lastRefreshTime}
              intervalMs={120000}
              loading={loading}
              autoRefreshEnabled={autoRefresh}
              onForceRefresh={() => fetchData(true)}
              onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
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
                <TrendingUp sx={{ fontSize: 32, mb: 1 }} />
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
                  Test swing-related queries and algorithms
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>Query</InputLabel>
                      <Select
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        label="Query"
                        placeholder="Enter your swing trading query..."
                      >
                        <MenuItem value="momentum_swing">Momentum Swing Strategy</MenuItem>
                        <MenuItem value="breakout_swing">Breakout Swing Strategy</MenuItem>
                        <MenuItem value="mean_reversion">Mean Reversion Strategy</MenuItem>
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
            AI is analyzing market patterns...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to fetch recommendations: {error}
        </Alert>
      )}

      {/* Recommendations Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoAwesome />
            AI-Powered Swing Recommendations
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
                    <TableCell><strong>Company</strong></TableCell>
                    <TableCell><strong>Score</strong></TableCell>
                    <TableCell><strong>Price</strong></TableCell>
                    <TableCell><strong>Change</strong></TableCell>
                    <TableCell><strong>Volume</strong></TableCell>
                    <TableCell><strong>Sector</strong></TableCell>
                    <TableCell><strong>Actions</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recommendations.map((recommendation, index) => (
                    <TableRow key={`${recommendation.symbol}-${index}`} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {recommendation.symbol}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {recommendation.companyName || recommendation.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={recommendation.score.toFixed(1)}
                          color={getScoreColor(recommendation.score)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          ₹{recommendation.currentPrice?.toFixed(2) || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {recommendation.changePercent >= 0 ? (
                            <TrendingUp color="success" fontSize="small" />
                          ) : (
                            <TrendingDown color="error" fontSize="small" />
                          )}
                          <Typography 
                            variant="body2" 
                            color={getChangeColor(recommendation.changePercent)}
                            sx={{ fontWeight: 'bold' }}
                          >
                            {recommendation.changePercent >= 0 ? '+' : ''}{recommendation.changePercent?.toFixed(2) || 0}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {recommendation.volume?.toLocaleString() || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip label={recommendation.sector || 'Unknown'} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary">
                              <ShowChart />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Add to Watchlist">
                            <IconButton size="small" color="secondary">
                              <Visibility />
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

export default SwingBuy; 