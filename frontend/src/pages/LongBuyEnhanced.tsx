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
  Badge
} from '@mui/material';
import {
  Refresh,
  ShowChart,
  Info,
  AccountBalance,
  Cached,
  Wifi,
  WifiOff
} from '@mui/icons-material';
import VariantsSelector from '../components/VariantsSelector';
import RefreshStatus from '../components/RefreshStatus';
import { useAppCache } from '../hooks/useAppCache';
import { useSharedPrices } from '../hooks/useSharedPrices';
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

const LongBuyEnhanced: React.FC = () => {
  const [recommendations, setRecommendations] = useState<LongBuyRecommendation[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [forceRefresh, setForceRefresh] = useState(false);

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

  // Use the shared price management hook
  const {
    prices,
    priceData,
    stats: priceStats,
    requestSymbol,
    releaseSymbol,
    getPrice,
    forceUpdate: forcePriceUpdate,
    isLoading: priceLoading,
    lastUpdated: priceLastUpdated,
    isWebSocketConnected,
    initializeWebSocket
  } = useSharedPrices({
    symbols: recommendations.map(r => r.symbol),
    priority: 'high',
    autoRefresh: true,
    refreshInterval: 2000 // 2 seconds
  }, 'LongBuyEnhanced');

  // Fetch recommendations from API
  const fetchRecommendationsData = async (forceRefresh: boolean = false) => {
    try {
      console.log(`🔄 [${new Date().toISOString()}] LongBuyEnhanced: Fallback to recommendation endpoint`);
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
      console.error(`❌ [${new Date().toISOString()}] LongBuyEnhanced: Failed to fetch recommendations:`, err);
      setRecommendations([]);
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

  // Initialize WebSocket when component mounts
  useEffect(() => {
    const initializeWebSocketConnection = async () => {
      try {
        // You would get these from your auth system
        const apiKey = process.env.REACT_APP_KITE_API_KEY || '';
        const accessToken = process.env.REACT_APP_KITE_ACCESS_TOKEN || '';
        
        if (apiKey && accessToken) {
          await initializeWebSocket(apiKey, accessToken);
        }
      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
      }
    };

    initializeWebSocketConnection();
  }, [initializeWebSocket]);

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
    const priceData = getPrice(symbol);
    if (priceData) {
      return {
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
        volume: priceData.volume,
        lastUpdated: priceData.lastUpdated,
        source: priceData.source
      };
    }
    return null;
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with cache status */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Long Buy Recommendations
          <Badge 
            badgeContent={cacheHit ? 'CACHED' : 'FRESH'} 
            color={cacheHit ? 'success' : 'info'}
            sx={{ ml: 2 }}
          >
            <Cached />
          </Badge>
          <Badge 
            badgeContent={isWebSocketConnected ? 'LIVE' : 'OFFLINE'} 
            color={isWebSocketConnected ? 'success' : 'error'}
            sx={{ ml: 1 }}
          >
            {isWebSocketConnected ? <Wifi /> : <WifiOff />}
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
        </Box>
      </Box>

      {/* Cache and Price Statistics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
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
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Price Statistics
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Symbols: {priceStats.totalSymbols}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cache Hit Rate: {priceStats.cacheHitRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last Update: {priceLastUpdated ? new Date(priceLastUpdated).toLocaleTimeString() : 'Never'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loading indicator */}
      {(cacheLoading || priceLoading) && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1 }}>
            {cacheLoading ? 'Loading recommendations...' : 'Updating prices...'}
          </Typography>
        </Box>
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
                    source: 'api' as const
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
                            color={enhancedPrice.source === 'websocket' ? 'success' : 'info'}
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
    </Box>
  );
};

export default LongBuyEnhanced; 