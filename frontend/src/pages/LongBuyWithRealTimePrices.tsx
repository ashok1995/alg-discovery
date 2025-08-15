import React, { useState, useEffect, useCallback } from 'react';
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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import {
  Refresh,
  ShowChart,
  Info,
  AccountBalance,
  Cached,
  Wifi,
  WifiOff,
  Settings,
  PlayArrow,
  Stop,
  TrendingUp,
  TrendingDown,
  AccessTime
} from '@mui/icons-material';
import VariantsSelector from '../components/VariantsSelector';
import { useAppCache } from '../hooks/useAppCache';
import { useCentralizedPriceManager } from '../hooks/useCentralizedPriceManager';
import { KiteWebSocketConfig } from '../services/KiteWebSocketService';
import { StockPrice } from '../services/CentralizedPriceManager';
import { useBackgroundRefresh } from '../hooks/useBackgroundRefresh';
import { recommendationAPIService } from '../services/RecommendationAPIService';

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

const LongBuyWithRealTimePrices: React.FC = () => {
  const [recommendations, setRecommendations] = useState<LongBuyRecommendation[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [forceRefresh, setForceRefresh] = useState(false);
  const [showKiteConfig, setShowKiteConfig] = useState(false);
  const [kiteConfig, setKiteConfig] = useState<KiteWebSocketConfig>({
    apiKey: process.env.REACT_APP_KITE_API_KEY || '',
    accessToken: process.env.REACT_APP_KITE_ACCESS_TOKEN || ''
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Use the centralized price manager
  const {
    isConnected,
    isLoading: priceManagerLoading,
    stats: priceManagerStats,
    connect,
    disconnect,
    subscribeToSymbols,
    unsubscribeFromSymbols,
    getPrice,
    getPrices,
    isSubscribed,
    getSubscribedSymbols,
    loadSymbolMappings,
    fetchIncrementalMappings,
    checkExistingMappings
  } = useCentralizedPriceManager({
    autoConnect: false,
    autoLoadMappings: true,
    onPriceUpdate: (price: StockPrice) => {
      // Price updates are handled automatically by the centralized manager
      console.log(`📈 Real-time price update: ${price.symbol} - ₹${price.price}`);
    },
    onWebSocketConnected: () => {
      setSnackbar({
        open: true,
        message: '✅ Connected to Kite WebSocket for real-time prices',
        severity: 'success'
      });
    },
    onWebSocketDisconnected: () => {
      setSnackbar({
        open: true,
        message: '⚠️ Disconnected from Kite WebSocket',
        severity: 'warning'
      });
    },
    onError: (error) => {
      setSnackbar({
        open: true,
        message: `❌ WebSocket error: ${error.message || 'Unknown error'}`,
        severity: 'error'
      });
    }
  });

  // Use the app-level cache hook
  const {
    cachedRecommendation,
    cacheRecommendation,
    isLoading: cacheLoading,
    lastUpdated: cacheLastUpdated,
    cacheHit,
    stats: cacheStats,
    clearCache,
    refreshCache
  } = useAppCache({
    strategy: 'long-buy',
    variants: selectedVariants,
    autoRefresh: true,
    refreshInterval: 15 * 60 * 1000 // 15 minutes
  });

  // Fetch recommendations from API
  const fetchRecommendationsData = useCallback(async (forceRefresh: boolean = false) => {
    try {
      console.log(`🔄 [${new Date().toISOString()}] LongBuyWithRealTimePrices: Fetching recommendations via centralized service`);

      const fallback = await recommendationAPIService.getLongBuyRecommendations({
        max_recommendations: 50,
        min_score: 70.0,
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

        console.log(`✅ [${new Date().toISOString()}] LongBuyWithRealTimePrices: Received ${transformed.length} recommendations`);
        
        // Cache the recommendations
        const symbols = transformed.map((r: any) => r.symbol);
        cacheRecommendation(
          transformed,
          symbols,
          selectedVariants,
          15 * 60 * 1000 // 15 minutes cache
        );
        
        setRecommendations(transformed);
        
        // Subscribe to real-time price updates for these symbols
        if (isConnected && symbols.length > 0) {
          subscribeToSymbols(symbols);
          console.log(`📡 Subscribed to ${symbols.length} symbols for real-time updates`);
        }
      } else {
        throw new Error(fallback.error || 'Fallback recommendation call failed');
      }
    } catch (err: any) {
      console.error(`❌ [${new Date().toISOString()}] LongBuyWithRealTimePrices: Failed to fetch recommendations:`, {
        error: err.message,
        forceRefresh,
        selectedVariants,
        timestamp: new Date().toISOString()
      });
      
      setSnackbar({
        open: true,
        message: `❌ Failed to fetch recommendations: ${err.message}`,
        severity: 'error'
      });
    }
  }, [isConnected, selectedVariants, cacheRecommendation, subscribeToSymbols]);

  // Load recommendations from cache or API
  useEffect(() => {
    if (cachedRecommendation && !forceRefresh) {
      console.log('✅ Using cached recommendations');
      setRecommendations(cachedRecommendation.data);
      
      // Subscribe to symbols from cached recommendations
      const symbols = cachedRecommendation.data.map((r: any) => r.symbol);
      if (isConnected && symbols.length > 0) {
        subscribeToSymbols(symbols);
      }
    } else {
      console.log('🔄 Fetching fresh recommendations');
      fetchRecommendationsData(forceRefresh);
      setForceRefresh(false);
    }
  }, [cachedRecommendation, forceRefresh, isConnected, subscribeToSymbols, fetchRecommendationsData]);

  // Subscribe to symbols when WebSocket connects
  useEffect(() => {
    if (isConnected && recommendations.length > 0) {
      const symbols = recommendations.map(r => r.symbol);
      subscribeToSymbols(symbols);
    }
  }, [isConnected, recommendations, subscribeToSymbols]);

  const handleRefresh = () => {
    setForceRefresh(true);
  };

  const handleActivateToggle = () => {
    setIsActive(!isActive);
  };

  const handleVariantsChangeWrapper = (variants: Record<string, string>) => {
    setSelectedVariants(variants);
    setForceRefresh(true); // Force refresh when variants change
  };

  const handleKiteConnect = async () => {
    try {
      await connect(kiteConfig);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: `❌ Failed to connect: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleKiteDisconnect = () => {
    disconnect();
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
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
    return change >= 0 ? 'success' : 'error';
  };

  const getEnhancedPrice = (symbol: string) => {
    const realTimePrice = getPrice(symbol);
    if (realTimePrice) {
      return {
        price: realTimePrice.price,
        change: realTimePrice.change,
        changePercent: realTimePrice.changePercent,
        volume: realTimePrice.volume,
        lastUpdated: realTimePrice.lastUpdated,
        source: realTimePrice.source
      };
    }
    return null;
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 1) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with cache and price manager status */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Long Buy Recommendations (Real-Time Prices)
          <Badge 
            badgeContent={cacheHit ? 'CACHED' : 'FRESH'} 
            color={cacheHit ? 'success' : 'info'}
            sx={{ ml: 2 }}
          >
            <Cached />
          </Badge>
          <Badge 
            badgeContent={isConnected ? 'LIVE PRICES' : 'OFFLINE'} 
            color={isConnected ? 'success' : 'error'}
            sx={{ ml: 1 }}
          >
            {isConnected ? <Wifi /> : <WifiOff />}
          </Badge>
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControlLabel
            control={<Switch checked={isActive} onChange={handleActivateToggle} />}
            label="Auto Refresh"
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={cacheLoading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Settings />}
            onClick={() => setShowKiteConfig(true)}
          >
            Kite Config
          </Button>
          {isConnected ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<Stop />}
              onClick={handleKiteDisconnect}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayArrow />}
              onClick={handleKiteConnect}
              disabled={priceManagerLoading}
            >
              {priceManagerLoading ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cache Statistics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Hit Rate: {cacheStats.cacheHitRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Recommendations: {cacheStats.totalRecommendations}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Updated: {cacheLastUpdated ? new Date(cacheLastUpdated).toLocaleTimeString() : 'Never'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Price Manager Stats
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {isConnected ? 'Connected' : 'Disconnected'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Subscriptions: {priceManagerStats.activeSubscriptions}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Symbols: {priceManagerStats.totalSymbols}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Real-time Prices
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cache Hit Rate: {priceManagerStats.cacheHitRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Update: {priceManagerStats.lastUpdate ? formatTimeAgo(priceManagerStats.lastUpdate) : 'Never'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Memory Usage: {priceManagerStats.memoryUsage}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Subscriptions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Subscribed: {getSubscribedSymbols().length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Recommendations: {recommendations.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Real-time: {recommendations.filter(r => isSubscribed(r.symbol)).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loading indicator */}
      {(cacheLoading || priceManagerLoading) && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>
            {cacheLoading ? 'Loading recommendations...' : 'Connecting to price service...'}
          </Typography>
        </Box>
      )}

      {/* Connection Alert */}
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Price manager is not connected. Connect to get real-time price updates.
        </Alert>
      )}

      {/* Variants Selector */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Strategy Variants
          </Typography>
          <VariantsSelector
            strategyType="long-buy"
            onVariantsChange={handleVariantsChangeWrapper}
          />
        </CardContent>
      </Card>

      {/* Recommendations Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recommendations ({recommendations.length})
          </Typography>
          
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Score</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Change</TableCell>
                  <TableCell>Volume</TableCell>
                  <TableCell>Risk</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recommendations.map((recommendation) => {
                  const enhancedPrice = getEnhancedPrice(recommendation.symbol);
                  const displayPrice = enhancedPrice || {
                    price: recommendation.price,
                    change: recommendation.change,
                    changePercent: recommendation.changePercent,
                    volume: recommendation.volume,
                    lastUpdated: Date.now(),
                    source: 'api'
                  };

                  const isRealTime = enhancedPrice && enhancedPrice.source === 'websocket';

                  return (
                    <TableRow key={recommendation.symbol}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {recommendation.symbol}
                        </Typography>
                        {isRealTime && (
                          <Chip 
                            size="small" 
                            label="LIVE" 
                            color="success"
                            icon={<TrendingUp />}
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {recommendation.companyName || recommendation.name}
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
                          ₹{displayPrice.price.toFixed(2)}
                        </Typography>
                        {isRealTime && (
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(displayPrice.lastUpdated)}
                          </Typography>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {displayPrice.change >= 0 ? (
                            <TrendingUp color="success" fontSize="small" />
                          ) : (
                            <TrendingDown color="error" fontSize="small" />
                          )}
                          <Typography 
                            variant="body2" 
                            color={getChangeColor(displayPrice.change)}
                          >
                            {displayPrice.change >= 0 ? '+' : ''}{displayPrice.change.toFixed(2)} 
                            ({displayPrice.changePercent.toFixed(2)}%)
                          </Typography>
                        </Box>
                      </TableCell>
                      
                      <TableCell>
                        <Typography variant="body2">
                          {displayPrice.volume.toLocaleString()}
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Kite Configuration Dialog */}
      <Dialog open={showKiteConfig} onClose={() => setShowKiteConfig(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Kite WebSocket Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="API Key"
              value={kiteConfig.apiKey}
              onChange={(e) => setKiteConfig((prev: KiteWebSocketConfig) => ({ ...prev, apiKey: e.target.value }))}
              margin="normal"
              type="password"
            />
            <TextField
              fullWidth
              label="Access Token"
              value={kiteConfig.accessToken}
              onChange={(e) => setKiteConfig((prev: KiteWebSocketConfig) => ({ ...prev, accessToken: e.target.value }))}
              margin="normal"
              type="password"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowKiteConfig(false)}>Cancel</Button>
          <Button 
            onClick={() => {
              setShowKiteConfig(false);
              if (isConnected) {
                handleKiteDisconnect();
              }
            }}
            variant="contained"
          >
            Save & Reconnect
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default LongBuyWithRealTimePrices; 