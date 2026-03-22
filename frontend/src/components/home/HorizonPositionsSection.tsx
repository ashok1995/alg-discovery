import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Skeleton,
  CircularProgress,
  alpha,
  FormControl,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Refresh,
  FiberManualRecord,
} from '@mui/icons-material';
import type { TrackedPositionItem, PositionsSummaryResponse } from '../../types/apiModels';
import { seedDashboardService } from '../../services/SeedDashboardService';
import { displayReturnPctForRow, openUnrealizedPnlDisplay } from '../../utils/positionDisplayUtils';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';
import SymbolLink from '../ui/SymbolLink';

interface HorizonData {
  positions: TrackedPositionItem[];
  summary: PositionsSummaryResponse | null;
  loading: boolean;
}

type PosKey = 'symbol' | 'entry_price' | 'current_price' | 'stop_loss' | 'target_1' | 'status' | 'return_pct'
  | 'risk_reward_ratio' | 'score_bin' | 'sector' | 'opened_at' | 'duration_minutes' | 'source_arm' | 'unrealized_pnl';

const COLUMNS: ColumnDef<PosKey>[] = [
  { key: 'symbol', label: 'Symbol', sortable: true, minWidth: 110 },
  { key: 'entry_price', label: 'Entry', align: 'right', sortable: true },
  { key: 'current_price', label: 'LTP', align: 'right', sortable: true },
  { key: 'stop_loss', label: 'SL', align: 'right', sortable: true },
  { key: 'target_1', label: 'Target', align: 'right', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'return_pct', label: 'Return %', align: 'right', sortable: true },
  { key: 'unrealized_pnl', label: 'Unreal P&L', align: 'right', sortable: true },
  { key: 'risk_reward_ratio', label: 'R:R', align: 'right', sortable: true },
  { key: 'duration_minutes', label: 'Duration', align: 'right', sortable: true },
  { key: 'source_arm', label: 'ARM', sortable: true },
  { key: 'score_bin', label: 'Score', sortable: true },
  { key: 'sector', label: 'Sector', sortable: true },
  { key: 'opened_at', label: 'Opened', sortable: true },
];

interface HorizonDef {
  key: string;
  label: string;
  shortLabel: string;
  tradeType: string;
  color: string;
  description: string;
}

const HORIZONS: HorizonDef[] = [
  { key: 'intra_buy', label: 'Intraday Buy', shortLabel: 'ID Buy', tradeType: 'intraday_buy', color: '#4caf50', description: 'Intraday long positions' },
  { key: 'intra_sell', label: 'Intraday Sell', shortLabel: 'ID Sell', tradeType: 'intraday_sell', color: '#f44336', description: 'Intraday short positions' },
  { key: 'short', label: 'Short Term', shortLabel: 'Short', tradeType: 'short_buy', color: '#e91e63', description: 'Short-duration trades (1-5 days)' },
  { key: 'swing', label: 'Swing', shortLabel: 'Swing', tradeType: 'swing_buy', color: '#ff9800', description: 'Swing trades (days to weeks)' },
  { key: 'long', label: 'Long Term', shortLabel: 'Long', tradeType: 'long_term', color: '#2196f3', description: 'Positional & long-duration holdings' },
];

const PERIOD_OPTIONS = [1, 3, 5, 10, 20, 30] as const;

const formatDuration = (minutes: number | null): string => {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
};

const statusChip = (status: string) => {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    open: { color: '#1976d2', bg: alpha('#1976d2', 0.1), label: 'Open' },
    stop_hit: { color: '#f44336', bg: alpha('#f44336', 0.1), label: 'Stop Hit' },
    target_hit: { color: '#4caf50', bg: alpha('#4caf50', 0.1), label: 'Target Hit' },
    closed: { color: '#9e9e9e', bg: alpha('#9e9e9e', 0.1), label: 'Closed' },
    expired: { color: '#ff9800', bg: alpha('#ff9800', 0.1), label: 'Expired' },
  };
  const s = map[status] ?? { color: '#9e9e9e', bg: '#f5f5f5', label: status.replace(/_/g, ' ') };
  return (
    <Chip
      icon={<FiberManualRecord sx={{ fontSize: 8 }} />}
      label={s.label}
      size="small"
      sx={{ fontWeight: 600, fontSize: '0.68rem', height: 22, bgcolor: s.bg, color: s.color, textTransform: 'capitalize', '& .MuiChip-icon': { color: s.color } }}
    />
  );
};

const returnCell = (val: number | null) => {
  if (val == null) return <Typography variant="body2" color="text.disabled" fontSize="0.78rem">—</Typography>;
  return (
    <Typography variant="body2" fontWeight={700} fontSize="0.78rem" color={val > 0 ? 'success.main' : val < 0 ? 'error.main' : 'text.secondary'}>
      {val > 0 ? '+' : ''}{val.toFixed(2)}%
    </Typography>
  );
};

const KpiCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text.primary' }) => (
  <Box sx={{ textAlign: 'center', px: 1, py: 0.5 }}>
    <Typography variant="caption" color="text.secondary" fontWeight={500} fontSize="0.6rem" textTransform="uppercase" letterSpacing={0.5}>
      {label}
    </Typography>
    <Typography variant="subtitle2" fontWeight={800} color={color} sx={{ lineHeight: 1.2, mt: 0.2 }}>
      {value}
    </Typography>
  </Box>
);

const PositionsTable: React.FC<{ positions: TrackedPositionItem[] }> = ({ positions }) => {
  const { sortedData, requestSort, getSortDirection } = useSortableData<TrackedPositionItem, PosKey>(
    positions,
    { key: 'opened_at', direction: 'desc' },
  );

  return (
    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 420, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Table size="small" stickyHeader>
        <SortableTableHead columns={COLUMNS} onSort={requestSort} getSortDirection={getSortDirection} />
        <TableBody>
          {sortedData.map((p) => {
            const isOpen = p.status === 'open';
            const displayReturn = displayReturnPctForRow(p);
            const unrealDisplay = openUnrealizedPnlDisplay(p);
            return (
              <TableRow key={p.id} hover sx={{ '&:last-child td': { borderBottom: 0 }, bgcolor: isOpen ? alpha('#1976d2', 0.02) : undefined }}>
                <TableCell sx={{ py: 0.6 }}>
                  <SymbolLink symbol={p.symbol} chartUrl={p.chart_url} />
                </TableCell>
                <TableCell align="right" sx={{ py: 0.6 }}>
                  <Typography variant="body2" fontWeight={500} fontSize="0.8rem">₹{p.entry_price.toFixed(2)}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.6 }}>
                  {isOpen && p.current_price != null ? (
                    <Tooltip title="Live price" arrow>
                      <Typography variant="body2" fontWeight={600} fontSize="0.78rem" color="primary.main" sx={{ cursor: 'help' }}>
                        ₹{p.current_price.toFixed(2)}
                      </Typography>
                    </Tooltip>
                  ) : p.exit_price != null ? (
                    <Typography variant="body2" fontSize="0.78rem" color="text.secondary">₹{p.exit_price.toFixed(2)}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontSize="0.76rem">—</Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ py: 0.6 }}>
                  <Typography variant="body2" fontSize="0.78rem" color="error.main">₹{p.stop_loss?.toFixed(2) ?? '—'}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.6 }}>
                  <Tooltip title={`T2: ₹${p.target_2?.toFixed(2) ?? '—'} | T3: ₹${p.target_3?.toFixed(2) ?? '—'}`} arrow>
                    <Typography variant="body2" fontSize="0.78rem" color="success.main" sx={{ cursor: 'help' }}>
                      ₹{p.target_1?.toFixed(2) ?? '—'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ py: 0.6 }}>{statusChip(p.status)}</TableCell>
                <TableCell align="right" sx={{ py: 0.6 }}>{returnCell(displayReturn)}</TableCell>
                <TableCell align="right" sx={{ py: 0.6 }}>
                  {isOpen && unrealDisplay != null ? (
                    <Typography variant="body2" fontWeight={600} fontSize="0.76rem" color={unrealDisplay >= 0 ? 'success.main' : 'error.main'}>
                      ₹{unrealDisplay.toFixed(0)}
                    </Typography>
                  ) : !isOpen && p.net_pnl != null ? (
                    <Typography variant="body2" fontWeight={600} fontSize="0.76rem" color={p.net_pnl >= 0 ? 'success.main' : 'error.main'}>
                      ₹{p.net_pnl.toFixed(0)}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontSize="0.76rem">—</Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ py: 0.6 }}>
                  <Typography variant="body2" fontSize="0.78rem" fontWeight={500}>
                    {p.risk_reward_ratio != null ? p.risk_reward_ratio.toFixed(2) : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.6 }}>
                  <Tooltip title={p.duration_minutes != null ? `${p.duration_minutes.toFixed(1)} minutes` : 'N/A'} arrow>
                    <Typography variant="body2" fontSize="0.76rem" fontWeight={500} sx={{ cursor: 'help' }}>
                      {formatDuration(p.time_in_trade_minutes ?? p.duration_minutes)}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ py: 0.6 }}>
                  {p.source_arm ? (
                    <Tooltip title={p.source_arm} arrow>
                      <Chip label={p.source_arm.length > 14 ? p.source_arm.slice(0, 14) + '…' : p.source_arm} size="small" variant="outlined" sx={{ fontSize: '0.6rem', height: 20, fontWeight: 600 }} />
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontSize="0.72rem">—</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ py: 0.6 }}>
                  {p.score_bin ? (
                    <Chip label={p.score_bin.replace('_', '-')} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 20, fontWeight: 600 }} />
                  ) : '—'}
                </TableCell>
                <TableCell sx={{ py: 0.6 }}>
                  {p.sector ? (
                    <Chip label={p.sector} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 20, textTransform: 'capitalize' }} />
                  ) : '—'}
                </TableCell>
                <TableCell sx={{ py: 0.6 }}>
                  <Typography variant="body2" fontSize="0.72rem" color="text.secondary">
                    {p.opened_at ? new Date(p.opened_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
          {sortedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No positions for this trade type</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const CACHE_TTL = 120_000;

const initData: Record<string, HorizonData> = {};
HORIZONS.forEach((h) => { initData[h.key] = { positions: [], summary: null, loading: true }; });

export interface HorizonPositionsSectionProps {
  /** When provided with onSummaryDaysChange, section uses this value and does not render its own day selector (e.g. Dashboard single selector). */
  controlledSummaryDays?: number;
  onSummaryDaysChange?: (days: number) => void;
}

const HorizonPositionsSection: React.FC<HorizonPositionsSectionProps> = ({
  controlledSummaryDays,
  onSummaryDaysChange,
}) => {
  const [activeHorizon, setActiveHorizon] = useState('intra_buy');
  const [internalDays, setInternalDays] = useState<number>(1);
  const summaryDays = controlledSummaryDays ?? internalDays;
  const setSummaryDays = onSummaryDaysChange ?? setInternalDays;
  const showDaysSelector = controlledSummaryDays === undefined;
  const [horizonData, setHorizonData] = useState<Record<string, HorizonData>>(initData);
  const cacheTimestamps = useRef<Record<string, number>>({});

  const fetchHorizon = useCallback(async (horizon: HorizonDef, force = false) => {
    const cacheKey = `${horizon.key}-${summaryDays}`;
    const cached = cacheTimestamps.current[cacheKey];
    if (!force && cached && Date.now() - cached < CACHE_TTL) return;

    setHorizonData((prev) => ({
      ...prev,
      [horizon.key]: { ...prev[horizon.key], loading: true },
    }));

    try {
      const res = await seedDashboardService.getPositions({
        trade_type: horizon.tradeType,
        days: summaryDays,
        limit: 50,
      });
      setHorizonData((prev) => ({
        ...prev,
        [horizon.key]: {
          positions: res.positions,
          summary: res.summary,
          loading: false,
        },
      }));
      cacheTimestamps.current[cacheKey] = Date.now();
    } catch {
      setHorizonData((prev) => ({
        ...prev,
        [horizon.key]: { ...prev[horizon.key], loading: false },
      }));
    }
  }, [summaryDays]);

  useEffect(() => {
    HORIZONS.forEach((h) => fetchHorizon(h));
  }, [fetchHorizon]);

  const active = HORIZONS.find((h) => h.key === activeHorizon)!;
  const data = horizonData[activeHorizon];
  const summ = data.summary;

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>Trading Positions</Typography>
          <Typography variant="caption" color="text.secondary">
            Last {summaryDays} day{summaryDays > 1 ? 's' : ''} — all 5 trade types
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {showDaysSelector && (
            <FormControl size="small" sx={{ minWidth: 92 }}>
              <Select value={summaryDays} onChange={(e) => setSummaryDays(Number(e.target.value))} displayEmpty>
                {PERIOD_OPTIONS.map((d) => (
                  <MenuItem key={d} value={d}>{d}D</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <Tooltip title="Refresh all">
            <IconButton size="small" onClick={() => HORIZONS.forEach((h) => fetchHorizon(h, true))}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 5-way toggle */}
      <Box sx={{ px: 2.5, pb: 1.5 }}>
        <ToggleButtonGroup
          value={activeHorizon}
          exclusive
          onChange={(_, v) => v && setActiveHorizon(v)}
          size="small"
          sx={{
            width: '100%',
            '& .MuiToggleButton-root': { flex: 1, py: 0.5, textTransform: 'none', fontWeight: 600, fontSize: '0.74rem', px: 0.5 },
          }}
        >
          {HORIZONS.map((h) => {
            const hd = horizonData[h.key];
            const openCount = hd.summary?.open ?? 0;
            return (
              <ToggleButton key={h.key} value={h.key} sx={{ gap: 0.5 }}>
                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: h.color, flexShrink: 0 }} />
                {h.shortLabel}
                {!hd.loading && (
                  <Chip
                    label={`${openCount}`}
                    size="small"
                    sx={{ ml: 0.3, height: 16, minWidth: 22, fontSize: '0.58rem', fontWeight: 700, bgcolor: alpha(h.color, 0.1), color: h.color }}
                  />
                )}
              </ToggleButton>
            );
          })}
        </ToggleButtonGroup>
      </Box>

      {/* Summary KPI strip */}
      {summ && !data.loading && (
        <Box
          sx={{
            mx: 2.5,
            mb: 1.5,
            py: 0.3,
            px: 0.5,
            bgcolor: alpha(active.color, 0.03),
            borderRadius: 2,
            border: '1px solid',
            borderColor: alpha(active.color, 0.12),
            display: 'flex',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
          }}
        >
          <KpiCard label="Total" value={String(summ.total)} />
          <KpiCard label="Open" value={String(summ.open)} color="#1976d2" />
          <KpiCard label="Closed" value={String(summ.closed)} />
          <KpiCard
            label="Win Rate"
            value={summ.win_rate_pct != null ? `${summ.win_rate_pct.toFixed(0)}%` : '—'}
            color={summ.win_rate_pct != null && summ.win_rate_pct >= 50 ? '#4caf50' : '#f44336'}
          />
          <KpiCard
            label="Avg Return"
            value={summ.avg_return_pct != null ? `${summ.avg_return_pct > 0 ? '+' : ''}${summ.avg_return_pct.toFixed(2)}%` : '—'}
            color={summ.avg_return_pct != null && summ.avg_return_pct >= 0 ? '#4caf50' : '#f44336'}
          />
          <KpiCard
            label="Avg Duration"
            value={summ.avg_duration_hours != null && summ.avg_duration_hours >= 1
              ? `${summ.avg_duration_hours.toFixed(1)}h`
              : summ.avg_duration_min != null
                ? `${summ.avg_duration_min.toFixed(0)}m`
                : '—'}
          />
          <KpiCard
            label="Best"
            value={summ.best_return_pct != null ? `${summ.best_return_pct > 0 ? '+' : ''}${summ.best_return_pct.toFixed(1)}%` : '—'}
            color="#4caf50"
          />
          <KpiCard
            label="Worst"
            value={summ.worst_return_pct != null ? `${summ.worst_return_pct.toFixed(1)}%` : '—'}
            color="#f44336"
          />
          {summ.arm_distribution && Object.keys(summ.arm_distribution).length > 0 && (
            <KpiCard
              label="ARMs"
              value={Object.entries(summ.arm_distribution).map(([k, v]) => `${k}:${v}`).join(' ')}
            />
          )}
        </Box>
      )}

      {/* Description + loader */}
      <Box sx={{ px: 2.5, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary">{active.description}</Typography>
        {data.loading && <CircularProgress size={14} />}
      </Box>

      {/* Table */}
      <Box sx={{ px: 2.5, pb: 2.5 }}>
        {data.loading && data.positions.length === 0 ? (
          <Box>
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={30} sx={{ mb: 0.5, borderRadius: 1 }} />
            ))}
          </Box>
        ) : (
          <PositionsTable positions={data.positions} />
        )}
      </Box>
    </Paper>
  );
};

export default HorizonPositionsSection;
