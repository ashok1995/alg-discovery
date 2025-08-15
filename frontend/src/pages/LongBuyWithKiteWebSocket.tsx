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
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
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
  Stop
} from '@mui/icons-material';
import VariantsSelector from '../components/VariantsSelector';
import { useAppCache } from '../hooks/useAppCache';
import { useKiteWebSocket } from '../hooks/useKiteWebSocket';
import { KiteWebSocketConfig } from '../services/KiteWebSocketService';
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

const LongBuyWithKiteWebSocket: React.FC = () => {
  const [recommendations, setRecommendations] = useState<LongBuyRecommendation[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [forceRefresh, setForceRefresh] = useState(false);
  const [kitePrices, setKitePrices] = useState<Map<string, any>>(new Map());
  const [showKiteConfig, setShowKiteConfig] = useState(false);
  const [kiteConfig, setKiteConfig] = useState<KiteWebSocketConfig>({
    apiKey: process.env.REACT_APP_KITE_API_KEY || '',
    accessToken: process.env.REACT_APP_KITE_ACCESS_TOKEN || ''
  });

  // Use the new app-level cache hook
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

  // Use the Kite WebSocket hook
  const {
    isConnected: kiteConnected,
    isConnecting: kiteConnecting,
    stats: kiteStats,
    connect: connectKite,
    disconnect: disconnectKite,
    subscribeToInstruments,
    unsubscribeFromInstruments,
    getSubscribedSymbols
  } = useKiteWebSocket({
    autoConnect: false,
    onPriceUpdate: (priceData) => {
      const symbol = priceData.symbol;
      if (symbol) {
        setKitePrices(prev => new Map(prev).set(symbol, {
          price: priceData.last_price,
          change: priceData.change,
          changePercent: priceData.change_percent,
          volume: priceData.volume,
          timestamp: priceData.timestamp,
          source: 'kite_websocket'
        }));
      }
    }
  });

  // Fetch recommendations from API
  const fetchRecommendationsData = async (forceRefresh: boolean = false) => {
    try {
      console.log(`🔄 [${new Date().toISOString()}] LongBuyWithKiteWebSocket: Fetching recommendations via centralized service`);

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

        console.log(`✅ [${new Date().toISOString()}] LongBuyWithKiteWebSocket: Received ${transformed.length} recommendations`);
        
        // Cache the recommendations
        const symbols = transformed.map((r: any) => r.symbol);
        cacheRecommendation(
          transformed,
          symbols,
          selectedVariants,
          15 * 60 * 1000 // 15 minutes cache
        );
        
        setRecommendations(transformed);
        
        // Subscribe to Kite WebSocket for these symbols
        if (kiteConnected && symbols.length > 0) {
          // Note: In a real implementation, you'd need to map symbols to instrument tokens
          // For now, we'll use placeholder instrument tokens
          const instruments = symbols.map((symbol: string, index: number) => ({
            instrument_token: 1000000 + index, // Placeholder tokens
            symbol
          }));
          subscribeToInstruments(instruments);
        }
      } else {
        throw new Error(fallback.error || 'Fallback recommendation call failed');
      }
    } catch (err: any) {
      console.error(`❌ [${new Date().toISOString()}] LongBuyWithKiteWebSocket: Failed to fetch recommendations:`, {
        error: err.message,
        forceRefresh,
        selectedVariants,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Load recommendations from cache or API
  useEffect(() => {
    if (cachedRecommendation && !forceRefresh) {
      console.log('✅ Using cached recommendations');
      setRecommendations(cachedRecommendation.data);
    } else {
      console.log('🔄 Fetching fresh recommendations');
      fetchRecommendationsData(forceRefresh);
      setForceRefresh(false);
    }
  }, [cachedRecommendation, forceRefresh, selectedVariants]);

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
      await connectKite(kiteConfig);
    } catch (error) {
      console.error('Failed to connect to Kite:', error);
    }
  };

  const handleKiteDisconnect = () => {
    disconnectKite();
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
    const kitePrice = kitePrices.get(symbol);
    if (kitePrice) {
      return {
        price: kitePrice.price,
        change: kitePrice.change,
        changePercent: kitePrice.changePercent,
        volume: kitePrice.volume,
        lastUpdated: kitePrice.timestamp,
        source: kitePrice.source
      };
    }
    return null;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with cache and Kite status */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Long Buy Recommendations (Kite WebSocket)
          <Badge 
            badgeContent={cacheHit ? 'CACHED' : 'FRESH'} 
            color={cacheHit ? 'success' : 'info'}
            sx={{ ml: 2 }}
          >
            <Cached />
          </Badge>
          <Badge 
            badgeContent={kiteConnected ? 'KITE LIVE' : 'KITE OFFLINE'} 
            color={kiteConnected ? 'success' : 'error'}
            sx={{ ml: 1 }}
          >
            {kiteConnected ? <Wifi /> : <WifiOff />}
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
          {kiteConnected ? (
            <Button
              variant="contained"
              color="error"
              startIcon={<Stop />}
              onClick={handleKiteDisconnect}
            >
              Disconnect Kite
            </Button>
          ) : (
            <Button
              variant="contained"
              color="success"
              startIcon={<PlayArrow />}
              onClick={handleKiteConnect}
              disabled={kiteConnecting}
            >
              {kiteConnecting ? 'Connecting...' : 'Connect Kite'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Cache and Kite Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
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
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Kite WebSocket Stats
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Status: {kiteConnected ? 'Connected' : 'Disconnected'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Subscribed Symbols: {kiteStats.subscribedSymbols}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Message: {kiteStats.lastMessageTime ? new Date(kiteStats.lastMessageTime).toLocaleTimeString() : 'Never'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Real-time Prices
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Kite Prices: {kitePrices.size}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Connection ID: {kiteStats.connectionId || 'N/A'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Reconnect Attempts: {kiteStats.reconnectAttempts}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loading indicator */}
      {(cacheLoading || kiteConnecting) && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>
            {cacheLoading ? 'Loading recommendations...' : 'Connecting to Kite...'}
          </Typography>
        </Box>
      )}

      {/* Kite Connection Alert */}
      {!kiteConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Kite WebSocket is not connected. Connect to get real-time price updates.
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
                    source: 'api'
                  };

                  return (
                    <TableRow key={recommendation.symbol}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {recommendation.symbol}
                        </Typography>
                        {enhancedPrice && (
                          <Chip 
                            size="small" 
                            label={enhancedPrice.source} 
                            color={enhancedPrice.source === 'kite_websocket' ? 'success' : 'info'}
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
                      </TableCell>
                      
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          color={getChangeColor(displayPrice.change)}
                        >
                          {displayPrice.change >= 0 ? '+' : ''}{displayPrice.change.toFixed(2)} 
                          ({displayPrice.changePercent.toFixed(2)}%)
                        </Typography>
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
              if (kiteConnected) {
                handleKiteDisconnect();
              }
            }}
            variant="contained"
          >
            Save & Reconnect
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LongBuyWithKiteWebSocket; 