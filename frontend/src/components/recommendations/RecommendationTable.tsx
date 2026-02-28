import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  IconButton,
  Chip,
  Fade,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  alpha,
} from '@mui/material';
import { Info, AddCircleOutline, RemoveCircleOutline } from '@mui/icons-material';
import type { DynamicRecommendationItem, PositionStatusResponse } from '../../types/apiModels';
import { getScoreColor } from '../../utils/recommendationUtils';
import { seedPositionService } from '../../services/SeedPositionService';
import type { StrategyConfigItem } from '../../config/recommendationsConfig';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';

export interface RecommendationTableProps {
  recommendations: DynamicRecommendationItem[];
  strategyConfig: Record<string, StrategyConfigItem>;
  selectedStrategy: string;
  selectedRisk: 'low' | 'medium' | 'high';
  minScore: number;
  lastRefreshTime: Date | null;
  loading: boolean;
}

const strategyToTradeType: Record<string, string> = {
  swing: 'swing_buy',
  swing_buy: 'swing_buy',
  intraday_buy: 'intraday_buy',
  intraday_sell: 'intraday_sell',
  long_term: 'positional',
  positional: 'positional',
  short_term: 'short',
  short: 'short',
  short_term_buy: 'short',
};

type ColKey = 'symbol' | 'score' | 'current_price' | 'change_percent' | 'entry_price' | 'stop_loss' | 'target_1' | 'sector' | 'risk_level' | 'reason' | 'position';

const COLUMNS: ColumnDef<ColKey>[] = [
  { key: 'symbol', label: 'Symbol', sortable: true, minWidth: 100 },
  { key: 'score', label: 'Score', align: 'right', sortable: true },
  { key: 'current_price', label: 'Price (₹)', align: 'right', sortable: true },
  { key: 'change_percent', label: 'Change %', align: 'right', sortable: true },
  { key: 'entry_price', label: 'Entry', align: 'right', sortable: false },
  { key: 'stop_loss', label: 'SL', align: 'right', sortable: false },
  { key: 'target_1', label: 'Target', align: 'right', sortable: false },
  { key: 'sector', label: 'Sector', sortable: true },
  { key: 'risk_level', label: 'Risk', sortable: true },
  { key: 'reason', label: 'Signal / Reason', sortable: false, minWidth: 160 },
  { key: 'position', label: 'Actions', sortable: false },
];

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
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const tradeType = strategyToTradeType[selectedStrategy] || 'swing_buy';

  const { sortedData, requestSort, getSortDirection } = useSortableData<DynamicRecommendationItem, ColKey>(
    recommendations,
    { key: 'score', direction: 'desc' },
  );

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
      await seedPositionService.openPosition({ symbol, trade_type: tradeType, entry_price: entryPrice, quantity: 0 });
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

  const meta = (item: DynamicRecommendationItem) => (item.metadata ?? {}) as Record<string, unknown>;

  return (
    <Fade in={!loading}>
      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Box p={2} display="flex" justifyContent="space-between" alignItems="center" sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="h6" fontWeight={700} sx={{ color: config?.color }}>
              {config?.label} Recommendations
            </Typography>
            <Chip label={`${recommendations.length} stocks`} size="small" sx={{ bgcolor: config?.color, color: 'white', fontWeight: 600 }} />
            <Chip label={`Risk: ${selectedRisk}`} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
          </Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Typography variant="caption" color="text.secondary">Min Score: {minScore}</Typography>
            <Typography variant="caption" color="text.secondary">
              Updated: {lastRefreshTime?.toLocaleTimeString()}
            </Typography>
          </Box>
        </Box>

        <TableContainer sx={{ maxHeight: 'calc(100vh - 380px)', minHeight: 400 }}>
          <Table size="small" stickyHeader>
            <SortableTableHead columns={COLUMNS} onSort={requestSort} getSortDirection={getSortDirection} />
            <TableBody>
              {sortedData.map((item) => {
                const posStatus = positionStatuses[item.symbol];
                const isOpen = posStatus?.open_position === true;
                const price = item.current_price || item.last_price || 0;
                const m = meta(item);
                const entryPrice = (m.entry_price as number) ?? price;
                const sl = m.stop_loss as number | undefined;
                const t1 = m.target_1 as number | undefined;
                const t2 = m.target_2 as number | undefined;
                const reason = (m.reason as string) || '';
                const trend = m.trend as string | undefined;

                return (
                  <React.Fragment key={item.symbol}>
                    <TableRow hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Box
                            sx={{
                              width: 32, height: 32, borderRadius: 1.5,
                              bgcolor: alpha(config?.color || '#1976d2', 0.1),
                              color: config?.color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, fontSize: '0.8rem',
                            }}
                          >
                            {item.symbol.charAt(0)}
                          </Box>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{item.symbol}</Typography>
                            <Typography variant="caption" color="text.secondary">NSE</Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={item.score?.toFixed(0) || '—'}
                          size="small"
                          sx={{ bgcolor: getScoreColor(item.score || 0), color: 'white', fontWeight: 700, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>₹{price.toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${(item.change_percent || 0) >= 0 ? '+' : ''}${(item.change_percent || 0).toFixed(2)}%`}
                          size="small"
                          sx={{
                            fontWeight: 700, fontSize: '0.72rem',
                            bgcolor: (item.change_percent || 0) >= 0 ? alpha('#4caf50', 0.12) : alpha('#f44336', 0.12),
                            color: (item.change_percent || 0) >= 0 ? 'success.dark' : 'error.dark',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">₹{entryPrice.toFixed(2)}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="error.main">{sl ? `₹${sl.toFixed(2)}` : '—'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="success.main">{t1 ? `₹${t1.toFixed(2)}` : '—'}</Typography>
                        {t2 && <Typography variant="caption" color="text.secondary" display="block">T2: ₹{t2.toFixed(2)}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip label={item.sector || '—'} size="small" variant="outlined" sx={{ fontSize: '0.68rem' }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.risk_level || 'medium'}
                          size="small"
                          sx={{
                            fontWeight: 600, fontSize: '0.68rem', textTransform: 'capitalize',
                            bgcolor: item.risk_level === 'low' ? alpha('#4caf50', 0.12) : item.risk_level === 'high' ? alpha('#f44336', 0.12) : alpha('#ff9800', 0.12),
                            color: item.risk_level === 'low' ? 'success.dark' : item.risk_level === 'high' ? 'error.dark' : 'warning.dark',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {trend && <Chip label={trend} size="small" variant="outlined" sx={{ fontSize: '0.65rem', mr: 0.5, mb: 0.25 }} />}
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem', lineHeight: 1.3, display: 'block' }}>
                          {reason.length > 50 ? reason.slice(0, 50) + '...' : reason || '—'}
                        </Typography>
                        <IconButton size="small" onClick={() => setExpandedRow(expandedRow === item.symbol ? null : item.symbol)}>
                          <Info sx={{ fontSize: '0.9rem', color: 'primary.main' }} />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} alignItems="center">
                          {actionLoading === item.symbol ? (
                            <CircularProgress size={18} />
                          ) : isOpen ? (
                            <Button size="small" variant="outlined" color="error" startIcon={<RemoveCircleOutline sx={{ fontSize: '0.85rem' }} />} onClick={() => handleClosePosition(item.symbol)} sx={{ fontSize: '0.68rem', py: 0.25 }}>
                              Close
                            </Button>
                          ) : (
                            <Button size="small" variant="outlined" color="success" startIcon={<AddCircleOutline sx={{ fontSize: '0.85rem' }} />} onClick={() => handleOpenPosition(item.symbol, entryPrice)} sx={{ fontSize: '0.68rem', py: 0.25 }}>
                              Open
                            </Button>
                          )}
                          {posStatus && (
                            <Chip
                              label={isOpen ? 'OPEN' : posStatus.position_status.replace(/_/g, ' ')}
                              size="small"
                              color={isOpen ? 'success' : posStatus.position_status === 'ranked' ? 'info' : 'default'}
                              variant={isOpen ? 'filled' : 'outlined'}
                              sx={{ fontSize: '0.65rem' }}
                            />
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                    {expandedRow === item.symbol && (
                      <TableRow>
                        <TableCell colSpan={COLUMNS.length} sx={{ bgcolor: 'grey.50', py: 1.5, px: 3 }}>
                          <Box display="flex" gap={3} flexWrap="wrap">
                            <>
                              <Box>
                                <Typography variant="caption" color="text.secondary">Entry</Typography>
                                <Typography variant="body2" fontWeight={600}>₹{entryPrice.toFixed(2)}</Typography>
                              </Box>
                              {sl && <Box><Typography variant="caption" color="text.secondary">Stop Loss</Typography><Typography variant="body2" fontWeight={600} color="error.main">₹{sl.toFixed(2)}</Typography></Box>}
                              {t1 && <Box><Typography variant="caption" color="text.secondary">Target 1</Typography><Typography variant="body2" fontWeight={600} color="success.main">₹{t1.toFixed(2)}</Typography></Box>}
                              {t2 && <Box><Typography variant="caption" color="text.secondary">Target 2</Typography><Typography variant="body2" fontWeight={600} color="success.main">₹{t2.toFixed(2)}</Typography></Box>}
                              {m.risk_reward_ratio != null && <Box><Typography variant="caption" color="text.secondary">R:R</Typography><Typography variant="body2" fontWeight={600}>{(m.risk_reward_ratio as number).toFixed(2)}</Typography></Box>}
                              {m.max_hold_days != null && <Box><Typography variant="caption" color="text.secondary">Max Hold</Typography><Typography variant="body2" fontWeight={600}>{m.max_hold_days as number}d</Typography></Box>}
                              {item.rsi != null && <Box><Typography variant="caption" color="text.secondary">RSI(14)</Typography><Typography variant="body2" fontWeight={600}>{item.rsi.toFixed(1)}</Typography></Box>}
                              {m.relative_volume != null && <Box><Typography variant="caption" color="text.secondary">Rel Volume</Typography><Typography variant="body2" fontWeight={600}>{(m.relative_volume as number).toFixed(2)}x</Typography></Box>}
                              {m.market_regime && <Box><Typography variant="caption" color="text.secondary">Regime</Typography><Typography variant="body2" fontWeight={600} textTransform="capitalize">{String(m.market_regime)}</Typography></Box>}
                            </>
                          </Box>
                          {reason && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              <b>Reason:</b> {reason}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>{snackbar.message}</Alert>
        </Snackbar>
      </Paper>
    </Fade>
  );
};

export default RecommendationTable;
