import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Snackbar,
  Alert,
  TextField,
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
} from '@mui/material';
import { Refresh, FiberManualRecord, FileDownload, Search, Close as CloseIcon } from '@mui/icons-material';
import type { TrackedPositionItem, PositionsResponse } from '../../types/apiModels';
import { seedDashboardService } from '../../services/SeedDashboardService';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';
import SymbolLink from '../ui/SymbolLink';

type PosKey = 'symbol' | 'trade_type' | 'entry_price' | 'current_price' | 'stop_loss' | 'target_1'
  | 'status' | 'return_pct' | 'unrealized_pnl' | 'duration_minutes' | 'source_arm' | 'allocated_capital'
  | 'net_pnl' | 'score_bin' | 'sector' | 'opened_at';

const ALL_COLUMNS: ColumnDef<PosKey>[] = [
  { key: 'symbol', label: 'Symbol', sortable: true, minWidth: 110 },
  { key: 'trade_type', label: 'Type', sortable: true },
  { key: 'entry_price', label: 'Entry', align: 'right', sortable: true },
  { key: 'current_price', label: 'LTP', align: 'right', sortable: true },
  { key: 'stop_loss', label: 'SL', align: 'right', sortable: true },
  { key: 'target_1', label: 'Target', align: 'right', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'return_pct', label: 'Return %', align: 'right', sortable: true },
  { key: 'unrealized_pnl', label: 'Unreal P&L', align: 'right', sortable: true },
  { key: 'net_pnl', label: 'Net P&L', align: 'right', sortable: true },
  { key: 'duration_minutes', label: 'Duration', align: 'right', sortable: true },
  { key: 'source_arm', label: 'ARM', sortable: true },
  { key: 'allocated_capital', label: 'Capital', align: 'right', sortable: true },
  { key: 'score_bin', label: 'Score', sortable: true },
  { key: 'sector', label: 'Sector', sortable: true },
  { key: 'opened_at', label: 'Opened', sortable: true },
];

const TRADE_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'intraday_buy', label: 'Intraday Buy' },
  { value: 'intraday_sell', label: 'Intraday Sell' },
  { value: 'short_buy', label: 'Short' },
  { value: 'swing_buy', label: 'Swing' },
  { value: 'long_term', label: 'Long Term' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'open', label: 'Open' },
  { value: 'stop_hit', label: 'Stop Hit' },
  { value: 'target_3', label: 'Target Hit' },
  { value: 'force_exit', label: 'Force Exit' },
  { value: 'expired', label: 'Expired' },
];

const CATEGORIES = [
  { key: 'all', label: 'All Positions', desc: 'Every tracked position' },
  { key: 'learning', label: 'Learning', desc: 'ARM-sourced exploratory trades (reduced capital)' },
  { key: 'paper_trade', label: 'Paper Trade', desc: 'High-confidence full-capital positions (score 80-100)' },
] as const;

/** Lookback window for GET /api/v2/dashboard/positions (calendar days). */
const DAYS_OPTIONS = [1, 2, 3, 7, 14, 30, 60, 90] as const;

const formatDuration = (minutes: number | null): string => {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes.toFixed(0)}m`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`;
  return `${(minutes / 1440).toFixed(1)}d`;
};

const formatCurrency = (v: number | null): string => {
  if (v == null) return '—';
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toFixed(0)}`;
};

const statusChip = (status: string) => {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    open: { color: '#1976d2', bg: alpha('#1976d2', 0.1), label: 'Open' },
    stop_hit: { color: '#f44336', bg: alpha('#f44336', 0.1), label: 'Stop Hit' },
    target_3: { color: '#4caf50', bg: alpha('#4caf50', 0.1), label: 'Target Hit' },
    force_exit: { color: '#ff9800', bg: alpha('#ff9800', 0.1), label: 'Force Exit' },
    expired: { color: '#9e9e9e', bg: alpha('#9e9e9e', 0.1), label: 'Expired' },
    closed: { color: '#9e9e9e', bg: alpha('#9e9e9e', 0.1), label: 'Closed' },
  };
  const s = map[status] ?? { color: '#9e9e9e', bg: '#f5f5f5', label: status.replace(/_/g, ' ') };
  return (
    <Chip
      icon={<FiberManualRecord sx={{ fontSize: 7 }} />}
      label={s.label}
      size="small"
      sx={{ fontWeight: 600, fontSize: '0.65rem', height: 22, bgcolor: s.bg, color: s.color, '& .MuiChip-icon': { color: s.color } }}
    />
  );
};

const returnCell = (val: number | null) => {
  if (val == null) return <Typography variant="body2" color="text.disabled" fontSize="0.76rem">—</Typography>;
  return (
    <Typography variant="body2" fontWeight={700} fontSize="0.76rem" color={val > 0 ? 'success.main' : val < 0 ? 'error.main' : 'text.secondary'}>
      {val > 0 ? '+' : ''}{val.toFixed(2)}%
    </Typography>
  );
};

const pnlCell = (val: number | null) => {
  if (val == null) return <Typography variant="body2" color="text.disabled" fontSize="0.76rem">—</Typography>;
  return (
    <Typography variant="body2" fontWeight={600} fontSize="0.76rem" color={val > 0 ? 'success.main' : val < 0 ? 'error.main' : 'text.secondary'}>
      {formatCurrency(val)}
    </Typography>
  );
};

const KpiCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <Box sx={{ textAlign: 'center', px: 1.5, py: 0.5 }}>
    <Typography variant="caption" color="text.secondary" fontWeight={500} fontSize="0.6rem" textTransform="uppercase" letterSpacing={0.5}>
      {label}
    </Typography>
    <Typography variant="subtitle2" fontWeight={800} color={color || 'text.primary'} sx={{ lineHeight: 1.2, mt: 0.2 }}>
      {value}
    </Typography>
  </Box>
);

const TRADE_TYPE_SHORT: Record<string, string> = {
  intraday_buy: 'ID Buy',
  intraday_sell: 'ID Sell',
  short_buy: 'Short',
  swing_buy: 'Swing',
  long_term: 'Long',
};

interface PositionsTableProps {
  positions: TrackedPositionItem[];
  selectedIds?: Set<number>;
  onToggleSelect?: (id: number) => void;
}


const PositionsTable: React.FC<PositionsTableProps> = ({ positions, selectedIds, onToggleSelect }) => {
  const { sortedData, requestSort, getSortDirection } = useSortableData<TrackedPositionItem, PosKey>(
    positions,
    { key: 'opened_at', direction: 'desc' },
  );
  const selectable = !!onToggleSelect;

  return (
    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 520, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Table size="small" stickyHeader>
        <SortableTableHead columns={ALL_COLUMNS} onSort={requestSort} getSortDirection={getSortDirection} />
        <TableBody>
          {sortedData.map((p) => {
            const isOpen = p.status === 'open';
            const displayReturn = isOpen ? (p.current_return_pct ?? p.return_pct) : p.return_pct;
            const isSelected = selectedIds?.has(p.id) ?? false;

            return (
              <TableRow
                key={p.id}
                hover
                selected={isSelected}
                sx={{ bgcolor: isSelected ? alpha('#1976d2', 0.06) : isOpen ? alpha('#1976d2', 0.02) : undefined }}
              >
                <TableCell sx={{ py: 0.5 }}>
                  <Box display="flex" alignItems="center" gap={0.3}>
                    {selectable && isOpen && (
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onChange={() => onToggleSelect!(p.id)}
                        sx={{ p: 0.3, mr: 0.2 }}
                      />
                    )}
                    <SymbolLink symbol={p.symbol} chartUrl={p.chart_url} />
                  </Box>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  <Chip
                    label={TRADE_TYPE_SHORT[p.trade_type] || p.trade_type}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.6rem', height: 20, fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <Typography variant="body2" fontWeight={500} fontSize="0.78rem">₹{p.entry_price.toFixed(2)}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  {isOpen && p.current_price != null ? (
                    <Tooltip title="Live price from Kite" arrow>
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
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <Typography variant="body2" fontSize="0.76rem" color="error.main">₹{p.stop_loss?.toFixed(2) ?? '—'}</Typography>
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <Tooltip title={`T2: ₹${p.target_2?.toFixed(2) ?? '—'} | T3: ₹${p.target_3?.toFixed(2) ?? '—'}`} arrow>
                    <Typography variant="body2" fontSize="0.76rem" color="success.main" sx={{ cursor: 'help' }}>
                      ₹{p.target_1?.toFixed(2) ?? '—'}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>{statusChip(p.status)}</TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>{returnCell(displayReturn)}</TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  {isOpen ? pnlCell(p.unrealized_pnl) : <Typography variant="body2" color="text.disabled" fontSize="0.76rem">—</Typography>}
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  {!isOpen ? pnlCell(p.net_pnl) : <Typography variant="body2" color="text.disabled" fontSize="0.76rem">—</Typography>}
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  <Tooltip title={p.duration_minutes != null ? `${p.duration_minutes.toFixed(1)} minutes` : ''} arrow>
                    <Typography variant="body2" fontSize="0.74rem" fontWeight={500} sx={{ cursor: 'help' }}>
                      {formatDuration(p.time_in_trade_minutes ?? p.duration_minutes)}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  {p.source_arm ? (
                    <Tooltip title={p.source_arm} arrow>
                      <Chip label={p.source_arm.length > 12 ? p.source_arm.slice(0, 12) + '…' : p.source_arm} size="small" variant="outlined" sx={{ fontSize: '0.58rem', height: 20, fontWeight: 600 }} />
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontSize="0.72rem">—</Typography>
                  )}
                </TableCell>
                <TableCell align="right" sx={{ py: 0.5 }}>
                  {p.allocated_capital != null ? (
                    <Typography variant="body2" fontSize="0.74rem">{formatCurrency(p.allocated_capital)}</Typography>
                  ) : (
                    <Typography variant="body2" color="text.disabled" fontSize="0.72rem">—</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  {p.score_bin ? (
                    <Chip
                      label={p.score_bin.replace('_', '-')}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.58rem', height: 20, fontWeight: 600,
                        borderColor: p.score_bin === '80_100' ? '#4caf50' : p.score_bin === '60_80' ? '#ff9800' : undefined,
                        color: p.score_bin === '80_100' ? '#4caf50' : p.score_bin === '60_80' ? '#ff9800' : undefined,
                      }}
                    />
                  ) : '—'}
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  {p.sector ? (
                    <Chip label={p.sector} size="small" variant="outlined" sx={{ fontSize: '0.58rem', height: 20, textTransform: 'capitalize' }} />
                  ) : '—'}
                </TableCell>
                <TableCell sx={{ py: 0.5 }}>
                  <Typography variant="body2" fontSize="0.7rem" color="text.secondary">
                    {p.opened_at ? new Date(p.opened_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
          {sortedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={ALL_COLUMNS.length} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No positions match the selected filters</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const CACHE_TTL = 90_000;

const PositionsTab: React.FC = () => {
  const [category, setCategory] = useState<'all' | 'learning' | 'paper_trade'>('all');
  const [tradeType, setTradeType] = useState('');
  const [status, setStatus] = useState('');
  const [days, setDays] = useState(30);
  const [data, setData] = useState<PositionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<Map<string, { data: PositionsResponse; ts: number }>>(new Map());

  // Batch close state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchCloseOpen, setBatchCloseOpen] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TrackedPositionItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleBatchClose = async () => {
    setBatchLoading(true);
    try {
      const res = await seedDashboardService.batchClosePositions({
        position_ids: Array.from(selectedIds),
        reason: 'manual_close',
        fetch_live_prices: true,
      });
      setSnack({
        open: true,
        msg: `Closed ${res.successful}/${res.requested} positions${res.failed > 0 ? ` (${res.failed} failed)` : ''}`,
        severity: res.failed > 0 ? 'error' : 'success',
      });
      setSelectedIds(new Set());
      setBatchCloseOpen(false);
      await fetchData(true);
    } catch (err) {
      setSnack({ open: true, msg: 'Batch close failed', severity: 'error' });
    } finally {
      setBatchLoading(false);
    }
  };

  const handleSearch = async (q: string) => {
    if (!q.trim()) { setSearchResults(null); return; }
    setSearchLoading(true);
    try {
      const res = await seedDashboardService.searchPositions(q.trim(), 50);
      setSearchResults(res.results ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const displayPositions = searchResults !== null ? searchResults : (data?.positions ?? []);

  const cacheKey = `${category}|${tradeType}|${status}|${days}`;

  const fetchData = useCallback(async (force = false) => {
    const cached = cacheRef.current.get(cacheKey);
    if (!force && cached && Date.now() - cached.ts < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await seedDashboardService.getPositions({
        category: category === 'all' ? undefined : category,
        trade_type: tradeType || undefined,
        status: status || undefined,
        days,
        limit: 200,
      });
      setData(res);
      cacheRef.current.set(cacheKey, { data: res, ts: Date.now() });
    } catch {
      /* surface previous data if available */
    } finally {
      setLoading(false);
    }
  }, [cacheKey, category, tradeType, status, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const summ = data?.summary;

  return (
    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>Tracked Positions</Typography>
          <Typography variant="caption" color="text.secondary">
            Filter by category, type, status, and lookback (1d–90d)
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          {selectedIds.size > 0 && (
            <Button
              size="small"
              variant="contained"
              color="error"
              sx={{ fontSize: '0.72rem', textTransform: 'none', fontWeight: 700 }}
              onClick={() => setBatchCloseOpen(true)}
            >
              Close {selectedIds.size} selected
            </Button>
          )}
          <Tooltip title="Export positions as CSV">
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownload fontSize="small" />}
              sx={{ fontSize: '0.72rem', textTransform: 'none' }}
              component="a"
              href={seedDashboardService.getExportUrl('positions', {
                days,
                ...(tradeType ? { trade_type: tradeType } : {}),
              })}
              target="_blank"
              rel="noopener noreferrer"
            >
              CSV
            </Button>
          </Tooltip>
          <Tooltip title="Export outcomes as JSON">
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownload fontSize="small" />}
              sx={{ fontSize: '0.72rem', textTransform: 'none' }}
              component="a"
              href={seedDashboardService.getExportUrl('outcomes', { days })}
              target="_blank"
              rel="noopener noreferrer"
            >
              JSON
            </Button>
          </Tooltip>
          {loading && <CircularProgress size={16} />}
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={() => fetchData(true)}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Search bar */}
      <Box sx={{ px: 2.5, pb: 1 }}>
        <TextField
          size="small"
          placeholder="Search symbol or ARM…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!e.target.value.trim()) setSearchResults(null);
          }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(searchQuery); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {searchLoading ? <CircularProgress size={14} /> : <Search fontSize="small" />}
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => { setSearchQuery(''); setSearchResults(null); }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ width: 280, '& .MuiInputBase-root': { fontSize: '0.8rem' } }}
        />
        {searchResults !== null && (
          <Chip
            label={`${searchResults.length} search results`}
            size="small"
            onDelete={() => { setSearchQuery(''); setSearchResults(null); }}
            sx={{ ml: 1, fontWeight: 600 }}
          />
        )}
      </Box>

      {/* Category tabs */}
      <Box sx={{ px: 2.5, pb: 1 }}>
        <ToggleButtonGroup
          value={category}
          exclusive
          onChange={(_, v) => v && setCategory(v)}
          size="small"
          sx={{ '& .MuiToggleButton-root': { py: 0.5, px: 2, textTransform: 'none', fontWeight: 600, fontSize: '0.78rem' } }}
        >
          {CATEGORIES.map((c) => (
            <ToggleButton key={c.key} value={c.key}>
              <Tooltip title={c.desc} arrow>
                <span>{c.label}</span>
              </Tooltip>
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Filters row */}
      <Box sx={{ px: 2.5, pb: 1.5 }}>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Trade Type</InputLabel>
              <Select value={tradeType} label="Trade Type" onChange={(e) => setTradeType(e.target.value)}>
                {TRADE_TYPES.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
            <Chip
              label={`${data?.count ?? 0} results`}
              size="small"
              sx={{ fontWeight: 700 }}
            />
          </Grid>
          <Grid item xs={12}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
              Lookback
            </Typography>
            <ToggleButtonGroup
              value={days}
              exclusive
              onChange={(_, v) => v != null && setDays(v)}
              size="small"
              sx={{
                flexWrap: 'wrap',
                gap: 0.5,
                '& .MuiToggleButton-root': { px: 1, py: 0.4, fontSize: '0.72rem', fontWeight: 600 },
              }}
            >
              {DAYS_OPTIONS.map((d) => (
                <ToggleButton key={d} value={d}>{d}d</ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Box>

      {/* Summary KPI strip */}
      {summ && !loading && (
        <Box
          sx={{
            mx: 2.5, mb: 1.5, py: 0.3, px: 0.5,
            bgcolor: alpha('#1976d2', 0.03), borderRadius: 2,
            border: '1px solid', borderColor: alpha('#1976d2', 0.12),
            display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap',
          }}
        >
          <KpiCard label="Total" value={String(summ.total)} />
          <KpiCard label="Open" value={String(summ.open)} color="#1976d2" />
          <KpiCard label="Closed" value={String(summ.closed)} />
          <KpiCard
            label="Win Rate"
            value={summ.win_rate_pct != null ? `${summ.win_rate_pct.toFixed(0)}%` : '—'}
            color={(summ.win_rate_pct ?? 0) >= 50 ? '#4caf50' : '#f44336'}
          />
          <KpiCard
            label="Avg Return"
            value={summ.avg_return_pct != null ? `${summ.avg_return_pct > 0 ? '+' : ''}${summ.avg_return_pct.toFixed(2)}%` : '—'}
            color={(summ.avg_return_pct ?? 0) >= 0 ? '#4caf50' : '#f44336'}
          />
          <KpiCard
            label="Avg Duration"
            value={summ.avg_duration_hours != null && summ.avg_duration_hours >= 1
              ? `${summ.avg_duration_hours.toFixed(1)}h`
              : summ.avg_duration_min != null ? `${summ.avg_duration_min.toFixed(0)}m` : '—'}
          />
          {summ.total_capital_deployed != null && summ.total_capital_deployed > 0 && (
            <KpiCard label="Capital" value={formatCurrency(summ.total_capital_deployed)} />
          )}
          {summ.total_net_pnl != null && (
            <KpiCard
              label="Net P&L"
              value={formatCurrency(summ.total_net_pnl)}
              color={summ.total_net_pnl >= 0 ? '#4caf50' : '#f44336'}
            />
          )}
          {summ.total_charges != null && summ.total_charges > 0 && (
            <KpiCard label="Charges" value={formatCurrency(summ.total_charges)} color="#ff9800" />
          )}
          {summ.arm_distribution && Object.keys(summ.arm_distribution).length > 0 && (
            <KpiCard
              label="ARMs"
              value={`${Object.keys(summ.arm_distribution).length} strategies`}
            />
          )}
          {summ.gap_exits != null && summ.gap_exits > 0 && (
            <KpiCard label="Gap Exits" value={`${summ.gap_exits} (${summ.gap_exit_pct?.toFixed(0) ?? 0}%)`} color="#ff9800" />
          )}
        </Box>
      )}

      {/* ARM distribution chips (visible for learning/all when data exists) */}
      {summ?.arm_distribution && Object.keys(summ.arm_distribution).length > 0 && (
        <Box sx={{ px: 2.5, pb: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, lineHeight: 2 }}>ARMs:</Typography>
          {Object.entries(summ.arm_distribution).map(([arm, count]) => (
            <Chip key={arm} label={`${arm.replace(/_/g, ' ')} (${count})`} size="small" variant="outlined"
              sx={{ fontSize: '0.6rem', height: 20, fontWeight: 600, textTransform: 'capitalize' }}
            />
          ))}
        </Box>
      )}

      {/* Outcome distribution chips */}
      {summ?.outcome_distribution && Object.keys(summ.outcome_distribution).length > 0 && (
        <Box sx={{ px: 2.5, pb: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, lineHeight: 2 }}>Outcomes:</Typography>
          {Object.entries(summ.outcome_distribution).map(([outcome, count]) => {
            const oColor = outcome === 'stop' || outcome === 'stop_hit' ? '#f44336'
              : outcome === 'target_3' ? '#4caf50'
              : outcome === 'expired' ? '#9e9e9e'
              : '#ff9800';
            return (
              <Chip key={outcome} label={`${outcome.replace(/_/g, ' ')} (${count})`} size="small"
                sx={{ fontSize: '0.6rem', height: 20, fontWeight: 600, bgcolor: alpha(oColor, 0.1), color: oColor, textTransform: 'capitalize' }}
              />
            );
          })}
        </Box>
      )}

      {/* Table */}
      <Box sx={{ px: 2.5, pb: 2.5 }}>
        {loading && displayPositions.length === 0 ? (
          <Box>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rectangular" height={32} sx={{ mb: 0.5, borderRadius: 1 }} />
            ))}
          </Box>
        ) : (
          <PositionsTable
            positions={displayPositions}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
        )}
      </Box>

      {/* Batch close confirmation dialog */}
      <Dialog open={batchCloseOpen} onClose={() => setBatchCloseOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Close {selectedIds.size} Position{selectedIds.size !== 1 ? 's' : ''}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will close {selectedIds.size} selected position{selectedIds.size !== 1 ? 's' : ''} at live prices.
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBatchCloseOpen(false)} disabled={batchLoading}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBatchClose}
            disabled={batchLoading}
            startIcon={batchLoading ? <CircularProgress size={14} /> : undefined}
          >
            {batchLoading ? 'Closing…' : 'Close Positions'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Toast notification */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} variant="filled" sx={{ fontWeight: 600 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default PositionsTab;
