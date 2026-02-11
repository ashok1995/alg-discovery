import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Refresh,
  Info,
  Error,
  ShowChart
} from '@mui/icons-material';
import { zerodhaMarketService } from '../services/zerodhaMarketService';

interface MarketDataDisplayProps {
  symbols?: string[];
  showTopGainersLosers?: boolean;
  showMarketBreadth?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const MarketDataDisplay: React.FC<MarketDataDisplayProps> = ({
  symbols = [],
  showTopGainersLosers = true,
  showMarketBreadth = true,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marketSummary, setMarketSummary] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchMarketData = async () => {
    setLoading(true);
    setError(null);

    try {
      const summary = await zerodhaMarketService.getMarketSummary(symbols);
      setMarketSummary(summary);
      setLastUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching market data:', error);
      setError('Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketData();

    if (autoRefresh) {
      const interval = setInterval(fetchMarketData, refreshInterval);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchMarketData is stable, symbols/autoRefresh/refreshInterval drive effect
  }, [symbols, autoRefresh, refreshInterval]);

  const getChangeColor = (change: string) => {
    const changeValue = parseFloat(change);
    if (changeValue > 0) return 'success';
    if (changeValue < 0) return 'error';
    return 'default';
  };

  const getChangeIcon = (change: string) => {
    const changeValue = parseFloat(change);
    if (changeValue > 0) return <TrendingUp color="success" />;
    if (changeValue < 0) return <TrendingDown color="error" />;
    return <Info color="info" />;
  };

  if (loading && !marketSummary) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading market data...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <ShowChart sx={{ mr: 1 }} />
          <Typography variant="h6">Market Data</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {lastUpdate && (
            <Typography variant="body2" color="text.secondary">
              Last update: {lastUpdate}
            </Typography>
          )}
          <IconButton onClick={fetchMarketData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Market Breadth */}
        {showMarketBreadth && marketSummary?.topGainersLosers?.success && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Market Breadth
                </Typography>
                {marketSummary.topGainersLosers.data && (
                  <Box>
                    <Grid container spacing={2}>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="success.main">
                            {marketSummary.topGainersLosers.data.market_breadth.advancing}
                          </Typography>
                          <Typography variant="body2">Advancing</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="error.main">
                            {marketSummary.topGainersLosers.data.market_breadth.declining}
                          </Typography>
                          <Typography variant="body2">Declining</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={4}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="text.secondary">
                            {marketSummary.topGainersLosers.data.market_breadth.unchanged}
                          </Typography>
                          <Typography variant="body2">Unchanged</Typography>
                        </Box>
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        Total: {marketSummary.topGainersLosers.data.total_instruments_analyzed}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Top Gainers */}
        {showTopGainersLosers && marketSummary?.topGainersLosers?.success && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Gainers
                </Typography>
                {marketSummary.topGainersLosers.data && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Symbol</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Change %</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {marketSummary.topGainersLosers.data.top_gainers.slice(0, 5).map((item: any) => (
                          <TableRow key={item.instrument_token}>
                            <TableCell component="th" scope="row">
                              {item.tradingsymbol}
                            </TableCell>
                            <TableCell align="right">{item.last_price}</TableCell>
                            <TableCell align="right">
                              <Chip
                                icon={getChangeIcon(item.percentage_change)}
                                label={`+${item.percentage_change}%`}
                                color={getChangeColor(item.percentage_change) as any}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Top Losers */}
        {showTopGainersLosers && marketSummary?.topGainersLosers?.success && (
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Losers
                </Typography>
                {marketSummary.topGainersLosers.data && (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Symbol</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="right">Change %</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {marketSummary.topGainersLosers.data.top_losers.slice(0, 5).map((item: any) => (
                          <TableRow key={item.instrument_token}>
                            <TableCell component="th" scope="row">
                              {item.tradingsymbol}
                            </TableCell>
                            <TableCell align="right">{item.last_price}</TableCell>
                            <TableCell align="right">
                              <Chip
                                icon={getChangeIcon(item.percentage_change)}
                                label={`${item.percentage_change}%`}
                                color={getChangeColor(item.percentage_change) as any}
                                size="small"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Individual Symbol Data */}
        {symbols.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Symbol Data
                </Typography>
                <Grid container spacing={2}>
                  {symbols.map((symbol) => {
                    const symbolData = marketSummary?.marketData?.[symbol];
                    return (
                      <Grid item xs={12} sm={6} md={4} key={symbol}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1" gutterBottom>
                              {symbol}
                            </Typography>
                            {symbolData?.success ? (
                              <Box>
                                <Typography variant="h5">
                                  ₹{symbolData.data?.quote?.last_price}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                                  {getChangeIcon(symbolData.data?.quote?.change_percent.toString())}
                                  <Typography
                                    variant="body2"
                                    color={getChangeColor(symbolData.data?.quote?.change_percent.toString())}
                                    sx={{ ml: 1 }}
                                  >
                                    {symbolData.data?.quote?.change_percent > 0 ? '+' : ''}
                                    {symbolData.data?.quote?.change_percent}%
                                  </Typography>
                                </Box>
                                <Typography variant="caption" color="text.secondary">
                                  Vol: {symbolData.data?.quote?.volume?.toLocaleString()}
                                </Typography>
                              </Box>
                            ) : (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Error color="error" sx={{ mr: 1 }} />
                                <Typography variant="body2" color="error">
                                  {symbolData?.error || 'Failed to load'}
                                </Typography>
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default MarketDataDisplay; 