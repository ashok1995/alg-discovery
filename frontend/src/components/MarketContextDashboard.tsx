/**
 * Market Context Dashboard
 * Displays market intelligence, stock data, and trading analysis
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  ShowChart as ShowChartIcon,
} from '@mui/icons-material';
import { useMarketContext } from '../hooks/useMarketContext';

interface MarketContextDashboardProps {
  className?: string;
}

const MarketContextDashboard: React.FC<MarketContextDashboardProps> = ({ className }) => {
  const {
    marketIntelligence,
    marketIntelligenceLoading,
    marketIntelligenceError,
    refreshMarketIntelligence,
    stockData,
    stockDataLoading,
    stockDataError,
    fetchStockData,
    systemHealth,
    systemHealthLoading,
    systemHealthError,
    refreshSystemHealth,
    isHealthy,
    lastUpdated,
  } = useMarketContext();

  const [selectedHorizon, setSelectedHorizon] = useState<'intraday' | 'swing' | 'positional'>('swing');
  const [selectedSymbols] = useState(['INFY', 'TCS', 'RELIANCE', 'HDFC', 'ICICIBANK']);

  // Auto-refresh market intelligence
  useEffect(() => {
    refreshMarketIntelligence(selectedHorizon);
    const interval = setInterval(() => {
      refreshMarketIntelligence(selectedHorizon);
    }, 300000); // 5 minutes

    return () => clearInterval(interval);
  }, [selectedHorizon, refreshMarketIntelligence]);

  // Auto-refresh stock data
  useEffect(() => {
    fetchStockData(selectedSymbols);
    const interval = setInterval(() => {
      fetchStockData(selectedSymbols);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [selectedSymbols, fetchStockData]);

  // Auto-refresh system health
  useEffect(() => {
    refreshSystemHealth();
    const interval = setInterval(() => {
      refreshSystemHealth();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [refreshSystemHealth]);

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'success';
    if (score >= 50) return 'warning';
    return 'error';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'bullish':
        return <TrendingUpIcon color="success" />;
      case 'bearish':
        return <TrendingDownIcon color="error" />;
      default:
        return <ShowChartIcon color="action" />;
    }
  };

  const formatPrice = (price: number) => {
    return `₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <Box className={className}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Market Context Dashboard
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refreshMarketIntelligence(selectedHorizon)}
            disabled={marketIntelligenceLoading}
          >
            Refresh Intelligence
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchStockData(selectedSymbols)}
            disabled={stockDataLoading}
          >
            Refresh Stocks
          </Button>
        </Box>
      </Box>

      {/* System Health Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <SecurityIcon color={isHealthy ? 'success' : 'error'} />
            <Typography variant="h6">
              System Status: {isHealthy ? 'Healthy' : 'Unhealthy'}
            </Typography>
            {systemHealthLoading && <CircularProgress size={20} />}
            {lastUpdated && (
              <Typography variant="caption" color="text.secondary">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
            )}
          </Box>
          {systemHealthError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {systemHealthError}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Market Intelligence */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" component="h2">
              Market Intelligence
            </Typography>
            <Box display="flex" gap={1}>
              {(['intraday', 'swing', 'positional'] as const).map((horizon) => (
                <Chip
                  key={horizon}
                  label={horizon.charAt(0).toUpperCase() + horizon.slice(1)}
                  onClick={() => setSelectedHorizon(horizon)}
                  color={selectedHorizon === horizon ? 'primary' : 'default'}
                  variant={selectedHorizon === horizon ? 'filled' : 'outlined'}
                />
              ))}
            </Box>
          </Box>

          {marketIntelligenceLoading && <LinearProgress />}
          {marketIntelligenceError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {marketIntelligenceError}
            </Alert>
          )}

          {marketIntelligence && (
            <Grid container spacing={3}>
              {/* Trading Environment Score */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <AssessmentIcon color="primary" />
                      <Typography variant="subtitle1">Trading Score</Typography>
                    </Box>
                    <Typography variant="h4" color={getScoreColor(marketIntelligence.trading_environment_score)}>
                      {marketIntelligence.trading_environment_score.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      / 100
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* NIFTY Intelligence */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      {getTrendIcon(marketIntelligence.nifty_intelligence.primary_trend)}
                      <Typography variant="subtitle1">NIFTY Trend</Typography>
                    </Box>
                    <Typography variant="h6" color={marketIntelligence.nifty_intelligence.primary_trend === 'bullish' ? 'success.main' : 'error.main'}>
                      {marketIntelligence.nifty_intelligence.primary_trend.toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatPrice(marketIntelligence.nifty_intelligence.current_level)} 
                      ({formatPercentage(marketIntelligence.nifty_intelligence.change_percent)})
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Global Sentiment */}
              <Grid item xs={12} md={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <SpeedIcon color="info" />
                      <Typography variant="subtitle1">Global Sentiment</Typography>
                    </Box>
                    <Chip
                      label={marketIntelligence.global_sentiment.risk_on ? 'Risk-On' : 'Risk-Off'}
                      color={marketIntelligence.global_sentiment.risk_on ? 'success' : 'error'}
                      variant="filled"
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Score: {marketIntelligence.global_sentiment.sentiment_score.toFixed(1)}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Sector Leadership */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Sector Leadership
                </Typography>
                <Grid container spacing={1}>
                  {marketIntelligence.sector_leadership.slice(0, 8).map((sector, index) => (
                    <Grid item key={sector.sector}>
                      <Chip
                        label={`${sector.sector} (${sector.score.toFixed(1)})`}
                        color={getScoreColor(sector.score)}
                        variant="outlined"
                        size="small"
                        icon={getTrendIcon(sector.trend)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* Stock Data */}
      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" gutterBottom>
            Real-time Stock Prices
          </Typography>

          {stockDataLoading && <LinearProgress />}
          {stockDataError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {stockDataError}
            </Alert>
          )}

          {stockData && stockData.stocks && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">Change %</TableCell>
                    <TableCell align="right">Volume</TableCell>
                    <TableCell align="right">High</TableCell>
                    <TableCell align="right">Low</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockData.stocks.map((stock) => (
                    <TableRow key={stock.symbol} hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {stock.symbol}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatPrice(stock.last_price)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={stock.change >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatPrice(stock.change)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={stock.change_percent >= 0 ? 'success.main' : 'error.main'}
                        >
                          {formatPercentage(stock.change_percent)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {stock.volume.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatPrice(stock.high)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatPrice(stock.low)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {stockData && (
            <Box mt={2}>
              <Typography variant="caption" color="text.secondary">
                Successfully fetched {stockData.successful_symbols} stocks, 
                {stockData.failed_symbols > 0 && ` ${stockData.failed_symbols} failed`}
                {stockData.errors && stockData.errors.length > 0 && (
                  <Box component="span" ml={1}>
                    Errors: {stockData.errors.join(', ')}
                  </Box>
                )}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MarketContextDashboard;




