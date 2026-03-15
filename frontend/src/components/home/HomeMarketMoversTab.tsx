import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
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
  CircularProgress,
  Tooltip,
  IconButton,
  Skeleton,
  alpha,
} from '@mui/material';
import { TrendingUp, TrendingDown, SwapVert, Refresh } from '@mui/icons-material';
import type { TopMoverItem } from '../../types/apiModels';
import { seedDashboardService } from '../../services/SeedDashboardService';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';
import SymbolLink from '../ui/SymbolLink';

type MoverKey = 'symbol' | 'last_price' | 'period_return_pct' | 'change_pct_1h' | 'change_pct_5min' | 'volume' | 'value_traded_cr' | 'sector' | 'market_cap_category';

const COLUMNS: ColumnDef<MoverKey>[] = [
  { key: 'symbol', label: 'Symbol', sortable: true, minWidth: 120 },
  { key: 'last_price', label: 'Price (₹)', align: 'right', sortable: true },
  { key: 'period_return_pct', label: 'Return %', align: 'right', sortable: true },
  { key: 'change_pct_1h', label: '1h %', align: 'right', sortable: true },
  { key: 'change_pct_5min', label: '5m %', align: 'right', sortable: true },
  { key: 'volume', label: 'Volume', align: 'right', sortable: true },
  { key: 'value_traded_cr', label: 'Val (Cr)', align: 'right', sortable: true },
  { key: 'sector', label: 'Sector', sortable: true },
  { key: 'market_cap_category', label: 'Cap', sortable: true },
];

const DAY_OPTIONS = [
  { value: 1, label: '1D' },
  { value: 3, label: '3D' },
  { value: 5, label: '5D' },
  { value: 7, label: '7D' },
  { value: 14, label: '14D' },
  { value: 30, label: '30D' },
];

interface CachedMovers {
  gainers: TopMoverItem[];
  losers: TopMoverItem[];
  traded: TopMoverItem[];
  fetchedAt: number;
}

const CACHE_TTL_MS = 120_000; // 2 minutes

const formatVolume = (v: number | null): string => {
  if (v == null) return '—';
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString('en-IN');
};

const pctCell = (val: number | null | undefined) => {
  if (val == null) return <Typography variant="body2" color="text.disabled" fontSize="0.78rem">—</Typography>;
  const color = val > 0 ? 'success.main' : val < 0 ? 'error.main' : 'text.secondary';
  return (
    <Typography variant="body2" fontWeight={600} fontSize="0.78rem" color={color}>
      {val > 0 ? '+' : ''}{val.toFixed(2)}%
    </Typography>
  );
};

const capColor = (cap?: string | null) => {
  if (cap === 'large') return 'primary';
  if (cap === 'mid') return 'warning';
  return 'default';
};

const SortableMoverTable: React.FC<{ items: TopMoverItem[] }> = ({ items }) => {
  const { sortedData, requestSort, getSortDirection } = useSortableData<TopMoverItem, MoverKey>(
    items,
    { key: 'period_return_pct', direction: 'desc' },
  );

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ maxHeight: 480, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
    >
      <Table size="small" stickyHeader>
        <SortableTableHead columns={COLUMNS} onSort={requestSort} getSortDirection={getSortDirection} />
        <TableBody>
          {sortedData.map((s, idx) => (
            <TableRow key={`${s.symbol}-${idx}`} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
              <TableCell sx={{ py: 0.75 }}>
                <SymbolLink symbol={s.symbol} chartUrl={s.chart_url} exchange={s.exchange} />
              </TableCell>
              <TableCell align="right" sx={{ py: 0.75 }}>
                <Typography variant="body2" fontWeight={500} fontSize="0.8rem">
                  ₹{s.last_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </Typography>
              </TableCell>
              <TableCell align="right" sx={{ py: 0.75 }}>
                {pctCell(s.period_return_pct ?? s.change_pct)}
              </TableCell>
              <TableCell align="right" sx={{ py: 0.75 }}>{pctCell(s.change_pct_1h)}</TableCell>
              <TableCell align="right" sx={{ py: 0.75 }}>{pctCell(s.change_pct_5min)}</TableCell>
              <TableCell align="right" sx={{ py: 0.75 }}>
                <Typography variant="body2" color="text.secondary" fontSize="0.78rem">{formatVolume(s.volume)}</Typography>
              </TableCell>
              <TableCell align="right" sx={{ py: 0.75 }}>
                <Typography variant="body2" color="text.secondary" fontSize="0.78rem">
                  {s.value_traded_cr != null ? `₹${s.value_traded_cr.toFixed(1)}` : '—'}
                </Typography>
              </TableCell>
              <TableCell sx={{ py: 0.75 }}>
                {s.sector ? (
                  <Chip label={s.sector} size="small" variant="outlined" sx={{ fontSize: '0.62rem', textTransform: 'capitalize', height: 20 }} />
                ) : '—'}
              </TableCell>
              <TableCell sx={{ py: 0.75 }}>
                {s.market_cap_category ? (
                  <Chip
                    label={s.market_cap_category}
                    size="small"
                    color={capColor(s.market_cap_category)}
                    variant="outlined"
                    sx={{ fontSize: '0.62rem', textTransform: 'capitalize', height: 20 }}
                  />
                ) : '—'}
              </TableCell>
            </TableRow>
          ))}
          {sortedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No data available for this period</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const SkeletonTable: React.FC = () => (
  <Box>
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={i} variant="rectangular" height={32} sx={{ mb: 0.5, borderRadius: 1 }} />
    ))}
  </Box>
);

const HomeMarketMoversTab: React.FC = () => {
  const [view, setView] = useState<'gainers' | 'losers' | 'traded'>('gainers');
  const [days, setDays] = useState(1);
  const [topGainers, setTopGainers] = useState<TopMoverItem[]>([]);
  const [topLosers, setTopLosers] = useState<TopMoverItem[]>([]);
  const [topTraded, setTopTraded] = useState<TopMoverItem[]>([]);
  const [loadingG, setLoadingG] = useState(true);
  const [loadingL, setLoadingL] = useState(true);
  const [loadingT, setLoadingT] = useState(true);
  const cacheRef = useRef<Map<number, CachedMovers>>(new Map());

  const fetchMovers = useCallback(async (period: number, force = false) => {
    const cached = cacheRef.current.get(period);
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setTopGainers(cached.gainers);
      setTopLosers(cached.losers);
      setTopTraded(cached.traded);
      setLoadingG(false);
      setLoadingL(false);
      setLoadingT(false);
      return;
    }

    setLoadingG(true);
    setLoadingL(true);
    setLoadingT(true);

    const results: { gainers?: TopMoverItem[]; losers?: TopMoverItem[]; traded?: TopMoverItem[] } = {};

    const promises = [
      seedDashboardService.getTopGainers(20, period).then((r) => {
        results.gainers = r.gainers;
        setTopGainers(r.gainers);
        setLoadingG(false);
      }).catch(() => { results.gainers = []; setLoadingG(false); }),
      seedDashboardService.getTopLosers(20, period).then((r) => {
        results.losers = r.losers;
        setTopLosers(r.losers);
        setLoadingL(false);
      }).catch(() => { results.losers = []; setLoadingL(false); }),
      seedDashboardService.getTopTraded(20, period).then((r) => {
        results.traded = r.top_traded;
        setTopTraded(r.top_traded);
        setLoadingT(false);
      }).catch(() => { results.traded = []; setLoadingT(false); }),
    ];

    await Promise.allSettled(promises);

    cacheRef.current.set(period, {
      gainers: results.gainers ?? [],
      losers: results.losers ?? [],
      traded: results.traded ?? [],
      fetchedAt: Date.now(),
    });
  }, []);

  useEffect(() => {
    fetchMovers(days);
  }, [days, fetchMovers]);

  const items = view === 'gainers' ? topGainers : view === 'losers' ? topLosers : topTraded;
  const title = view === 'gainers' ? 'Top Gainers' : view === 'losers' ? 'Top Losers' : 'Most Traded';
  const activeLoading = view === 'gainers' ? loadingG : view === 'losers' ? loadingL : loadingT;
  const anyLoading = loadingG || loadingL || loadingT;

  const summaryCards = [
    { key: 'gainers' as const, icon: <TrendingUp />, list: topGainers, label: 'Gainers', color: '#4caf50', loading: loadingG },
    { key: 'losers' as const, icon: <TrendingDown />, list: topLosers, label: 'Losers', color: '#f44336', loading: loadingL },
    { key: 'traded' as const, icon: <SwapVert />, list: topTraded, label: 'Most Traded', color: '#2196f3', loading: loadingT },
  ];

  return (
    <Box>
      {/* Controls row */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="subtitle1" fontWeight={700}>Market Movers</Typography>
          <ToggleButtonGroup
            value={days}
            exclusive
            onChange={(_, v) => v && setDays(v)}
            size="small"
            sx={{ '& .MuiToggleButton-root': { px: 1.2, py: 0.3, fontSize: '0.72rem', fontWeight: 600 } }}
          >
            {DAY_OPTIONS.map((o) => (
              <ToggleButton key={o.value} value={o.value}>{o.label}</ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Tooltip title="Refresh (bypass cache)">
          <IconButton size="small" onClick={() => fetchMovers(days, true)} disabled={anyLoading}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Summary cards — double as category selector */}
      <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
        {summaryCards.map(({ key, icon, list, label, color, loading: catLoading }) => {
          const selected = view === key;
          return (
            <Grid item xs={4} key={key}>
              <Card
                onClick={() => setView(key)}
                sx={{
                  cursor: 'pointer',
                  border: 2,
                  borderColor: selected ? color : 'transparent',
                  bgcolor: selected ? alpha(color, 0.06) : 'background.paper',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: alpha(color, 0.5), boxShadow: 2 },
                }}
              >
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Box sx={{ color, display: 'flex' }}>{icon}</Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h5" fontWeight={700} color={color}>
                      {catLoading ? <CircularProgress size={18} sx={{ color }} /> : list.length}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight={500}>
                      {catLoading ? 'Loading...' : label}
                    </Typography>
                  </Box>
                  {!catLoading && list.length > 0 && list[0] && (
                    <Box textAlign="right">
                      <Typography variant="caption" fontWeight={700} fontSize="0.68rem" color={color}>
                        {list[0].symbol}
                      </Typography>
                      <Typography variant="caption" display="block" fontWeight={600} fontSize="0.65rem" color={color}>
                        {(list[0].period_return_pct ?? list[0].change_pct) > 0 ? '+' : ''}
                        {(list[0].period_return_pct ?? list[0].change_pct)?.toFixed(1)}%
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Table area */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          {title} — {days}{days === 1 ? ' Day' : ' Days'} ({activeLoading ? '...' : `${items.length} stocks`})
        </Typography>
        {activeLoading && <CircularProgress size={14} />}
      </Box>

      {activeLoading && items.length === 0 ? (
        <SkeletonTable />
      ) : (
        <SortableMoverTable items={items} />
      )}
    </Box>
  );
};

export default HomeMarketMoversTab;
