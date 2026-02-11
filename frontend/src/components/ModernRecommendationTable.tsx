import React from 'react';
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
  LinearProgress,
  CircularProgress,
  IconButton,
  Tooltip,
  Alert,
  Grid,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Info as InfoIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import { UIRecommendationResponse, UIStockRecommendation } from '../types/apiModels';

interface ModernRecommendationTableProps {
  data: UIRecommendationResponse | null;
  loading?: boolean;
  error?: string | null;
}

const ModernRecommendationTable: React.FC<ModernRecommendationTableProps> = ({
  data,
  loading = false,
  error = null
}) => {
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#4caf50'; // Green
    if (score >= 60) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Poor';
  };

  const getTrendIcon = (trend?: string) => {
    if (!trend) return <TrendingFlatIcon />;
    
    const trendLower = trend.toLowerCase();
    if (trendLower.includes('up') || trendLower.includes('bull')) {
      return <TrendingUpIcon color="success" />;
    }
    if (trendLower.includes('down') || trendLower.includes('bear')) {
      return <TrendingDownIcon color="error" />;
    }
    return <TrendingFlatIcon color="action" />;
  };

  const getMarketCapColor = (marketCap?: string): string => {
    switch (marketCap) {
      case 'largecap': return '#2196f3';
      case 'midcap': return '#ff9800';
      case 'smallcap': return '#9c27b0';
      default: return '#757575';
    }
  };

  const formatNumber = (value?: number): string => {
    if (value === undefined || value === null) return 'N/A';
    return value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  };

  const formatCurrency = (value?: number): string => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    }
    if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return `₹${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <Card sx={{ maxWidth: 1200, margin: '0 auto', mt: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <CircularProgress size={24} sx={{ mr: 2 }} />
            <Typography variant="h6">Loading recommendations...</Typography>
          </Box>
          <LinearProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ maxWidth: 1200, margin: '0 auto', mt: 2 }}>
        <CardContent>
          <Alert severity="error">
            <Typography variant="h6" gutterBottom>
              Error Loading Recommendations
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.success) {
    return (
      <Card sx={{ maxWidth: 1200, margin: '0 auto', mt: 2 }}>
        <CardContent>
          <Alert severity="warning">
            <Typography variant="h6" gutterBottom>
              No Recommendations Available
            </Typography>
            <Typography variant="body2">
              {data?.error_message || 'Please try adjusting your criteria and try again.'}
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const { stocks, total_count, avg_score, score_range, market_condition, strategy_used, execution_time } = data;

  return (
    <Card sx={{ maxWidth: 1200, margin: '0 auto', mt: 2 }}>
      <CardContent>
        {/* Header with Summary */}
        <Box mb={3}>
          <Typography variant="h5" gutterBottom>
            📊 Recommendation Results
          </Typography>
          
          <Grid container spacing={2} mb={2}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {total_count}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Stocks
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {avg_score ? avg_score.toFixed(1) : 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Avg Score
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {strategy_used || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Strategy Used
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h4" color="primary">
                  {execution_time ? `${execution_time.toFixed(2)}s` : 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Execution Time
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Additional Info */}
          <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
            {market_condition && (
              <Chip 
                label={`Market: ${market_condition}`} 
                color={market_condition === 'bullish' ? 'success' : market_condition === 'bearish' ? 'error' : 'default'}
                size="small"
              />
            )}
            {score_range && (
              <Chip 
                label={`Score Range: ${score_range[0].toFixed(1)} - ${score_range[1].toFixed(1)}`} 
                color="primary"
                size="small"
              />
            )}
          </Box>

          <Divider />
        </Box>

        {/* Recommendations Table */}
        <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell><strong>Symbol</strong></TableCell>
                <TableCell align="right"><strong>Score</strong></TableCell>
                <TableCell align="right"><strong>Price</strong></TableCell>
                <TableCell align="center"><strong>Sector</strong></TableCell>
                <TableCell align="center"><strong>Market Cap</strong></TableCell>
                <TableCell align="right"><strong>RSI</strong></TableCell>
                <TableCell align="center"><strong>Trend</strong></TableCell>
                <TableCell align="right"><strong>Volume</strong></TableCell>
                <TableCell align="right"><strong>Change %</strong></TableCell>
                <TableCell align="right"><strong>PE Ratio</strong></TableCell>
                <TableCell align="right"><strong>PB Ratio</strong></TableCell>
                <TableCell align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stocks.map((stock: UIStockRecommendation, index: number) => (
                <TableRow key={stock.symbol} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {stock.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        #{index + 1}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Box display="flex" alignItems="center" justifyContent="flex-end">
                      <Box mr={1}>
                        <LinearProgress
                          variant="determinate"
                          value={stock.score}
                          sx={{
                            width: 60,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: 'rgba(0,0,0,0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getScoreColor(stock.score),
                              borderRadius: 4,
                            },
                          }}
                        />
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="subtitle2" fontWeight="bold" color={getScoreColor(stock.score)}>
                          {stock.score.toFixed(1)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getScoreLabel(stock.score)}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography variant="subtitle2" fontWeight="bold">
                      {formatCurrency(stock.price)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center">
                    <Chip 
                      label={stock.sector || 'N/A'} 
                      size="small" 
                      variant="outlined"
                    />
                  </TableCell>
                  
                  <TableCell align="center">
                    {stock.market_cap && (
                      <Chip 
                        label={stock.market_cap.toUpperCase()} 
                        size="small" 
                        sx={{ 
                          backgroundColor: getMarketCapColor(stock.market_cap),
                          color: 'white',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatNumber(stock.rsi)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center">
                    <Tooltip title={stock.trend || 'No trend data'}>
                      <IconButton size="small">
                        {getTrendIcon(stock.trend)}
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatNumber(stock.volume)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      color={stock.change_percent && stock.change_percent >= 0 ? 'success.main' : 'error.main'}
                      fontWeight="bold"
                    >
                      {stock.change_percent ? `${stock.change_percent > 0 ? '+' : ''}${stock.change_percent.toFixed(2)}%` : 'N/A'}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatNumber(stock.pe_ratio)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatNumber(stock.pb_ratio)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell align="center">
                    <Tooltip title="Add to Watchlist">
                      <IconButton size="small">
                        <StarBorderIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <InfoIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Footer with Additional Metrics */}
        {stocks.length > 0 && (
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary" align="center">
              Showing {stocks.length} of {total_count} recommendations
              {execution_time && ` • Generated in ${execution_time.toFixed(2)} seconds`}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ModernRecommendationTable;
