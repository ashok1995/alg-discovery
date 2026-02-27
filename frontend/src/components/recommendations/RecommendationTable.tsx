import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
  Fade,
  Zoom,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import { Info, Share, StarBorder, AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';
import type { DynamicRecommendationItem, PositionStatusResponse } from '../../types/apiModels';
import { getScoreColor } from '../../utils/recommendationUtils';
import { seedPositionService } from '../../services/SeedPositionService';
import type { StrategyConfigItem } from '../../config/recommendationsConfig';

export interface RecommendationTableProps {
  recommendations: DynamicRecommendationItem[];
  strategyConfig: Record<string, StrategyConfigItem>;
  selectedStrategy: string;
  selectedRisk: 'low' | 'medium' | 'high';
  minScore: number;
  lastRefreshTime: Date | null;
  loading: boolean;
}

const riskColorMap: Record<string, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336'
};

const strategyToTradeType: Record<string, string> = {
  swing: 'swing_buy',
  swing_buy: 'swing_buy',
  intraday_buy: 'intraday_buy',
  intraday_sell: 'intraday_sell',
  long_term: 'positional',
  positional: 'positional',
  short_term: 'short',
  short: 'short',
};

const RecommendationTable: React.FC<RecommendationTableProps> = ({
  recommendations,
  strategyConfig,
  selectedStrategy,
  selectedRisk,
  minScore,
  lastRefreshTime,
  loading
}) => {
  const config = strategyConfig[selectedStrategy];
  const [positionStatuses, setPositionStatuses] = useState<Record<string, PositionStatusResponse>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const tradeType = strategyToTradeType[selectedStrategy] || 'swing_buy';

  const fetchPositionStatuses = useCallback(async () => {
    if (recommendations.length === 0) return;
    const results: Record<string, PositionStatusResponse> = {};
    const settled = await Promise.allSettled(
      recommendations.slice(0, 20).map((r) =>
        seedPositionService.getPositionStatus(r.symbol, tradeType)
      )
    );
    settled.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        results[recommendations[idx].symbol] = res.value;
      }
    });
    setPositionStatuses(results);
  }, [recommendations, tradeType]);

  useEffect(() => {
    fetchPositionStatuses();
  }, [fetchPositionStatuses]);

  const handleOpenPosition = async (symbol: string, entryPrice: number) => {
    setActionLoading(symbol);
    try {
      await seedPositionService.openPosition({
        symbol,
        trade_type: tradeType,
        entry_price: entryPrice,
        quantity: 0,
      });
      setSnackbar({ open: true, message: `Position opened: ${symbol}`, severity: 'success' });
      fetchPositionStatuses();
    } catch (err: any) {
      setSnackbar({ open: true, message: `Failed to open: ${err.message}`, severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClosePosition = async (symbol: string) => {
    setActionLoading(symbol);
    try {
      await seedPositionService.closePosition({ symbol, trade_type: tradeType });
      setSnackbar({ open: true, message: `Position closed: ${symbol}`, severity: 'success' });
      fetchPositionStatuses();
    } catch (err: any) {
      setSnackbar({ open: true, message: `Failed to close: ${err.message}`, severity: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <Fade in={!loading}>
      <Paper elevation={2} sx={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
        <Box
          p={2}
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          sx={{ borderBottom: '1px solid #e0e0e0' }}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: config?.color }}>
              {config?.label} Recommendations
            </Typography>
            <Chip
              label={`${recommendations.length} stocks`}
              size="small"
              sx={{ backgroundColor: config?.color, color: 'white' }}
            />
            <Chip
              label={`Risk: ${selectedRisk.toUpperCase()}`}
              size="small"
              variant="outlined"
              sx={{ borderColor: riskColorMap[selectedRisk], color: riskColorMap[selectedRisk] }}
            />
          </Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="body2" color="text.secondary">Min Score: {minScore}</Typography>
            <Typography variant="body2" color="text.secondary">
              Last updated: {lastRefreshTime?.toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>
        <TableContainer sx={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Symbol</TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Company</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Score</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Price</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Change %</TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Sector</TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Risk</TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Position</TableCell>
                <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recommendations.map((item, index) => {
                const posStatus = positionStatuses[item.symbol];
                const isOpen = posStatus?.open_position === true;
                const price = item.current_price || item.last_price || 0;

                return (
                  <Zoom in={!loading} timeout={300 + index * 100} key={item.symbol}>
                    <TableRow hover sx={{ '&:hover': { backgroundColor: '#f8f9fa' } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ width: 36, height: 36, mr: 1.5, bgcolor: config?.color, fontSize: '0.9rem', fontWeight: 'bold' }}>
                            {item.symbol.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="bold" sx={{ fontSize: '0.9rem' }}>
                              {item.symbol}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>NSE</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.85rem', fontWeight: 'medium' }}>
                          {item.company_name || 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={item.score?.toFixed(1) || 'N/A'}
                          size="small"
                          sx={{ backgroundColor: getScoreColor(item.score || 0), color: 'white', fontWeight: 'bold', fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                          ₹{price.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            color: (item.change_percent || 0) >= 0 ? '#2e7d32' : '#d32f2f'
                          }}
                        >
                          {(item.change_percent || 0) >= 0 ? '+' : ''}{(item.change_percent || 0).toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.sector || 'N/A'} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.risk_level || 'medium'}
                          size="small"
                          sx={{
                            backgroundColor: riskColorMap[item.risk_level || 'medium'] || '#ff9800',
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: 'bold'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {posStatus ? (
                          <Chip
                            label={isOpen ? 'OPEN' : posStatus.position_status.replace(/_/g, ' ')}
                            size="small"
                            color={isOpen ? 'success' : posStatus.position_status === 'ranked' ? 'info' : 'default'}
                            variant={isOpen ? 'filled' : 'outlined'}
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ) : (
                          <Typography variant="caption" color="text.secondary">—</Typography>
                        )}
                        {posStatus?.rank && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            Rank #{posStatus.rank}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} alignItems="center">
                          {actionLoading === item.symbol ? (
                            <CircularProgress size={20} />
                          ) : isOpen ? (
                            <Tooltip title="Close Position">
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<RemoveCircleOutline sx={{ fontSize: '0.9rem' }} />}
                                onClick={() => handleClosePosition(item.symbol)}
                                sx={{ fontSize: '0.7rem', py: 0.25, minWidth: 0 }}
                              >
                                Close
                              </Button>
                            </Tooltip>
                          ) : (
                            <Tooltip title="Open Position">
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                startIcon={<AddCircleOutline sx={{ fontSize: '0.9rem' }} />}
                                onClick={() => handleOpenPosition(item.symbol, price)}
                                sx={{ fontSize: '0.7rem', py: 0.25, minWidth: 0 }}
                              >
                                Open
                              </Button>
                            </Tooltip>
                          )}
                          <Tooltip title="View Details">
                            <IconButton size="small" sx={{ color: '#1976d2' }}><Info sx={{ fontSize: '1rem' }} /></IconButton>
                          </Tooltip>
                          <Tooltip title="Add to Watchlist">
                            <IconButton size="small" sx={{ color: '#ff9800' }}><StarBorder sx={{ fontSize: '1rem' }} /></IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  </Zoom>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Paper>
    </Fade>
  );
};

export default RecommendationTable;
