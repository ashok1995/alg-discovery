import React from 'react';
import { API_CONFIG } from '../config/api';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Skeleton,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Remove,
  Wifi,
  WifiOff,
  OpenInNew,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { SwingRecommendation } from '../types/swingRecommendations';

interface SwingTableProps {
  recommendations: SwingRecommendation[];
  isLoading: boolean;
}

const SwingTable: React.FC<SwingTableProps> = ({ recommendations, isLoading }) => {
  if (isLoading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Skeleton variant="text" width="25%" height={32} sx={{ mb: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={48} />
          ))}
        </Box>
      </Paper>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <TrendingUpIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Recommendations Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Check back during market hours for swing trading recommendations.
        </Typography>
      </Paper>
    );
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />;
    if (change < 0) return <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />;
    return <Remove sx={{ fontSize: 16, color: 'text.disabled' }} />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'success.main';
    if (change < 0) return 'error.main';
    return 'text.primary';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getPriceSourceIcon = (source?: string) => {
    if (source === 'zerodha_real_time') {
      return <Wifi sx={{ fontSize: 12, color: 'success.main' }} />;
    }
    return <WifiOff sx={{ fontSize: 12, color: 'text.disabled' }} />;
  };

  const calculateVolumeInCrore = (rec: SwingRecommendation) => {
    if (rec.volume_in_crore !== undefined) {
      return rec.volume_in_crore;
    }
    return (rec.volume * rec.price) / 10000000;
  };

  const getChartUrl = (rec: SwingRecommendation) => {
    // Use the new chart_url field if available, otherwise fallback to Chartink
    if (rec.chart_url) {
      return rec.chart_url;
    }
    return `${API_CONFIG.EXTERNAL.CHARTINK.STOCKS_URL}?symbol=${rec.symbol}`;
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Swing Trading Recommendations
        </Typography>
        <Chip 
          label={`${recommendations.length} stocks`} 
          color="primary" 
          size="small" 
        />
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Change %</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Volume (Cr)</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Categories</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recommendations.map((rec, index) => (
              <TableRow key={`${rec.symbol}-${index}`} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {rec.symbol}
                    </Typography>
                    <Tooltip title={rec.chart_url ? "Open in Kite" : "Open in Chartink"}>
                      <IconButton
                        size="small"
                        href={getChartUrl(rec)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <OpenInNew sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" fontWeight="medium">
                      ₹{rec.price.toFixed(2)}
                    </Typography>
                    {getPriceSourceIcon(rec.price_source)}
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {getChangeIcon(rec.per_change)}
                    <Typography 
                      variant="body2" 
                      fontWeight="medium"
                      color={getChangeColor(rec.per_change)}
                    >
                      {rec.per_change > 0 ? '+' : ''}{rec.per_change.toFixed(2)}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={(rec.final_score || rec.score).toFixed(1)}
                    color={getScoreColor(rec.final_score || rec.score)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {calculateVolumeInCrore(rec).toFixed(2)} Cr
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={rec.recommendation_type} 
                    color="primary" 
                    size="small" 
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {rec.categories.slice(0, 2).map((category, idx) => (
                      <Chip
                        key={idx}
                        label={category}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    ))}
                    {rec.categories.length > 2 && (
                      <Chip
                        label={`+${rec.categories.length - 2}`}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default SwingTable; 