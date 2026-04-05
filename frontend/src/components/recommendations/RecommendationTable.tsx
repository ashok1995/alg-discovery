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
  Chip,
  Fade,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  alpha,
} from '@mui/material';
import { AddCircleOutline, RemoveCircleOutline, Warning } from '@mui/icons-material';
import type { DynamicRecommendationItem, PositionStatusResponse } from '../../types/apiModels';
import { StrategyType } from '../../types/tradingEnums';
import { getScoreColor } from '../../utils/recommendationUtils';
import { seedPositionService } from '../../services/SeedPositionService';
import type { StrategyConfigItem } from '../../config/recommendationsConfig';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';
import SymbolLink from '../ui/SymbolLink';
import { useWorkspacePreferences } from '../../context/WorkspacePreferencesContext';
import { canOpenPositionInWindow } from '../../utils/positionWindowUtils';
import { pickChartUrlFromRecommendationSource } from '../../services/recommendationTransformers';

export interface RecommendationTableProps {
  recommendations: DynamicRecommendationItem[];
  strategyConfig: Record<string, StrategyConfigItem>;
  selectedStrategy: string;
  minScore: number;
  lastRefreshTime: Date | null;
  loading: boolean;
}

/** Seed OpenAPI trade_type: long_term (not positional) */
const strategyToTradeType: Record<string, string> = {
  swing: 'swing_buy',
  swing_buy: 'swing_buy',
  intraday_buy: 'intraday_buy',
  intraday_sell: 'intraday_sell',
  long_term: 'long_term',
  positional: 'long_term',
  short_term: 'short_buy',
  short: 'short_buy',
  short_term_buy: 'short_buy',
};

type ColKey = 'symbol' | 'score' | 'current_price' | 'change_percent' | 'entry_price' | 'stop_loss' | 'target_1' | 'signals' | 'sector' | 'position';

const COLUMNS: ColumnDef<ColKey>[] = [
  { key: 'symbol', label: 'Symbol', sortable: true, minWidth: 120 },
  { key: 'score', label: 'Score', align: 'right', sortable: true },
  { key: 'current_price', label: 'Price (₹)', align: 'right', sortable: true },
  { key: 'change_percent', label: 'Change %', align: 'right', sortable: true },
  { key: 'entry_price', label: 'Entry / SL / Targets', align: 'left', sortable: false, minWidth: 180 },
  { key: 'signals', label: 'Signals', sortable: false, minWidth: 200 },
  { key: 'sector', label: 'Sector / Regime', sortable: true },
  { key: 'position', label: 'Actions', sortable: false },
];

const SIGNAL_COLORS: Record<string, string> = {
  bullish_confirmation: '#4caf50',
  above_vwap: '#2196f3',
  volume_surge: '#ff9800',
  volume_rising: '#ff9800',
  rsi_momentum: '#9c27b0',
  above_sma20: '#00bcd4',
  macd_bullish: '#8bc34a',
  high_volume: '#ff9800',
  below_vwap: '#f44336',
  bearish_confirmation: '#f44336',
  macd_bearish: '#e91e63',
  below_sma20: '#ff5722',
  near_support: '#4caf50',
  mean_reversion: '#673ab7',
  oversold_bounce: '#009688',
};

const formatSignalLabel = (key: string): string =>
  key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const RecommendationTable: React.FC<RecommendationTableProps> = ({
  recommendations,
  strategyConfig,
  selectedStrategy,
  minScore,
  lastRefreshTime,
  loading
}) => {
  const { settings: workspace } = useWorkspacePreferences();
  const config = strategyConfig[selectedStrategy];
  const isIntradayStrategy =
    selectedStrategy === StrategyType.INTRADAY_BUY || selectedStrategy === StrategyType.INTRADAY_SELL;
  const sessionWindow = isIntradayStrategy ? workspace.positionWindows.intraday : workspace.positionWindows.other;
  const now = new Date();
  const openAllowed = canOpenPositionInWindow(now, sessionWindow, isIntradayStrategy);
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
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: `Failed to open: ${err instanceof Error ? err.message : 'Unknown error'}`,
        severity: 'error',
      });
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
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: `Failed to close: ${err instanceof Error ? err.message : 'Unknown error'}`,
        severity: 'error',
      });
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
                const t3 = m.target_3 as number | undefined;
                const reason = (m.reason as string) || '';
                const signals = (m.signals as Record<string, boolean>) || {};
                const isStale = m.is_stale === true;
                const chartUrl = pickChartUrlFromRecommendationSource(item as unknown as Record<string, unknown>);
                const marketRegime = m.market_regime as string | undefined;
                const rr = m.risk_reward_ratio as number | undefined;
                const relVol = m.relative_volume as number | undefined;
                const volTrend = m.volume_trend as string | undefined;
                const entryWindowStart = m.entry_window_start as string | undefined;
                const entryWindowEnd = m.entry_window_end as string | undefined;

                const activeSignals = Object.entries(signals).filter(([, v]) => v);

                return (
                  <React.Fragment key={item.symbol}>
                    <TableRow
                      hover
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' },
                        ...(isStale ? { opacity: 0.7 } : {}),
                      }}
                      onClick={() => setExpandedRow(expandedRow === item.symbol ? null : item.symbol)}
                    >
                      {/* Symbol — clickable to chart */}
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <SymbolLink
                            symbol={item.symbol}
                            chartUrl={chartUrl}
                            accentColor={config?.color}
                            showAvatar
                            useApiChartOnly
                          />
                          {isStale && (
                            <Tooltip title="Data may be stale" arrow>
                              <Warning sx={{ fontSize: '0.9rem', color: 'warning.main' }} />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>

                      {/* Score badge */}
                      <TableCell align="right">
                        <Chip
                          label={item.score?.toFixed(0) || '—'}
                          size="small"
                          sx={{ bgcolor: getScoreColor(item.score || 0), color: 'white', fontWeight: 700, fontSize: '0.75rem' }}
                        />
                      </TableCell>

                      {/* Price */}
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>₹{price.toFixed(2)}</Typography>
                      </TableCell>

                      {/* Change % */}
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

                      {/* Entry / SL / Targets */}
                      <TableCell>
                        <Box display="flex" gap={1.5} alignItems="baseline" flexWrap="wrap">
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block" lineHeight={1}>Entry</Typography>
                            <Typography variant="body2" fontWeight={600}>₹{entryPrice.toFixed(2)}</Typography>
                          </Box>
                          {sl && (
                            <Box>
                              <Typography variant="caption" color="error.main" display="block" lineHeight={1}>SL</Typography>
                              <Typography variant="body2" fontWeight={600} color="error.main">₹{sl.toFixed(2)}</Typography>
                            </Box>
                          )}
                          {t1 && (
                            <Box>
                              <Typography variant="caption" color="success.main" display="block" lineHeight={1}>T1</Typography>
                              <Typography variant="body2" fontWeight={600} color="success.main">₹{t1.toFixed(2)}</Typography>
                            </Box>
                          )}
                          {rr != null && (
                            <Tooltip title="Risk:Reward Ratio" arrow>
                              <Chip label={`R:R ${rr.toFixed(1)}`} size="small" variant="outlined" sx={{ fontSize: '0.65rem', height: 20 }} />
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>

                      {/* Signal chips */}
                      <TableCell>
                        <Box display="flex" gap={0.4} flexWrap="wrap" maxWidth={250}>
                          {activeSignals.slice(0, 4).map(([key]) => (
                            <Chip
                              key={key}
                              label={formatSignalLabel(key)}
                              size="small"
                              sx={{
                                fontSize: '0.6rem',
                                height: 20,
                                bgcolor: alpha(SIGNAL_COLORS[key] || '#9e9e9e', 0.12),
                                color: SIGNAL_COLORS[key] || 'text.secondary',
                                fontWeight: 600,
                              }}
                            />
                          ))}
                          {activeSignals.length > 4 && (
                            <Chip label={`+${activeSignals.length - 4}`} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 20 }} />
                          )}
                          {activeSignals.length === 0 && reason && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.68rem' }}>
                              {reason.length > 60 ? reason.slice(0, 60) + '...' : reason}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Sector / Regime */}
                      <TableCell>
                        <Box display="flex" flexDirection="column" gap={0.3}>
                          <Chip label={item.sector || '—'} size="small" variant="outlined" sx={{ fontSize: '0.68rem', width: 'fit-content' }} />
                          {marketRegime && (
                            <Chip
                              label={marketRegime}
                              size="small"
                              sx={{
                                fontSize: '0.6rem', height: 18, textTransform: 'capitalize', width: 'fit-content',
                                bgcolor: marketRegime === 'bullish' ? alpha('#4caf50', 0.12) : marketRegime === 'bearish' ? alpha('#f44336', 0.12) : alpha('#ff9800', 0.12),
                                color: marketRegime === 'bullish' ? 'success.dark' : marketRegime === 'bearish' ? 'error.dark' : 'warning.dark',
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <Box display="flex" gap={0.5} alignItems="center">
                          {actionLoading === item.symbol ? (
                            <CircularProgress size={18} />
                          ) : isOpen ? (
                            <Button size="small" variant="outlined" color="error" startIcon={<RemoveCircleOutline sx={{ fontSize: '0.85rem' }} />} onClick={(e) => { e.stopPropagation(); handleClosePosition(item.symbol); }} sx={{ fontSize: '0.68rem', py: 0.25 }}>
                              Close
                            </Button>
                          ) : (
                            <Tooltip
                              title={
                                openAllowed
                                  ? 'Open tracked position'
                                  : 'Outside your workspace session / entry window (see System settings → Workspace preferences)'
                              }
                            >
                              <span>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  disabled={!openAllowed || actionLoading !== null}
                                  startIcon={<AddCircleOutline sx={{ fontSize: '0.85rem' }} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleOpenPosition(item.symbol, entryPrice);
                                  }}
                                  sx={{ fontSize: '0.68rem', py: 0.25 }}
                                >
                                  Open
                                </Button>
                              </span>
                            </Tooltip>
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

                    {/* Expanded detail row */}
                    {expandedRow === item.symbol && (
                      <TableRow>
                        <TableCell colSpan={COLUMNS.length} sx={{ bgcolor: 'grey.50', py: 1.5, px: 3 }}>
                          <Box display="flex" gap={3} flexWrap="wrap" alignItems="flex-start">
                            <Box>
                              <Typography variant="caption" color="text.secondary">Entry</Typography>
                              <Typography variant="body2" fontWeight={600}>₹{entryPrice.toFixed(2)}</Typography>
                            </Box>
                            {sl && <Box><Typography variant="caption" color="text.secondary">Stop Loss</Typography><Typography variant="body2" fontWeight={600} color="error.main">₹{sl.toFixed(2)}</Typography></Box>}
                            {t1 && <Box><Typography variant="caption" color="text.secondary">Target 1</Typography><Typography variant="body2" fontWeight={600} color="success.main">₹{t1.toFixed(2)}</Typography></Box>}
                            {t2 && <Box><Typography variant="caption" color="text.secondary">Target 2</Typography><Typography variant="body2" fontWeight={600} color="success.main">₹{t2.toFixed(2)}</Typography></Box>}
                            {t3 && <Box><Typography variant="caption" color="text.secondary">Target 3</Typography><Typography variant="body2" fontWeight={600} color="success.main">₹{t3.toFixed(2)}</Typography></Box>}
                            {rr != null && <Box><Typography variant="caption" color="text.secondary">R:R</Typography><Typography variant="body2" fontWeight={600}>{rr.toFixed(2)}</Typography></Box>}
                            {m.max_hold_days != null && <Box><Typography variant="caption" color="text.secondary">Max Hold</Typography><Typography variant="body2" fontWeight={600}>{m.max_hold_days as number}d</Typography></Box>}
                            {item.rsi != null && <Box><Typography variant="caption" color="text.secondary">RSI(14)</Typography><Typography variant="body2" fontWeight={600}>{item.rsi.toFixed(1)}</Typography></Box>}
                            {relVol != null && <Box><Typography variant="caption" color="text.secondary">Rel Volume</Typography><Typography variant="body2" fontWeight={600}>{relVol.toFixed(2)}x</Typography></Box>}
                            {volTrend && <Box><Typography variant="caption" color="text.secondary">Vol Trend</Typography><Chip label={volTrend} size="small" sx={{ fontSize: '0.65rem', height: 20, textTransform: 'capitalize' }} /></Box>}
                            {marketRegime && <Box><Typography variant="caption" color="text.secondary">Regime</Typography><Typography variant="body2" fontWeight={600} textTransform="capitalize">{marketRegime}</Typography></Box>}
                            {entryWindowStart && entryWindowEnd && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">Entry Window</Typography>
                                <Typography variant="body2" fontWeight={600}>
                                  {new Date(entryWindowStart).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                  {' — '}
                                  {new Date(entryWindowEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                </Typography>
                              </Box>
                            )}
                          </Box>

                          {activeSignals.length > 0 && (
                            <Box mt={1} display="flex" gap={0.5} flexWrap="wrap">
                              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, lineHeight: 2.2 }}>Signals:</Typography>
                              {activeSignals.map(([key]) => (
                                <Chip
                                  key={key}
                                  label={formatSignalLabel(key)}
                                  size="small"
                                  sx={{
                                    fontSize: '0.65rem', height: 22,
                                    bgcolor: alpha(SIGNAL_COLORS[key] || '#9e9e9e', 0.12),
                                    color: SIGNAL_COLORS[key] || 'text.secondary',
                                    fontWeight: 600,
                                  }}
                                />
                              ))}
                            </Box>
                          )}

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
