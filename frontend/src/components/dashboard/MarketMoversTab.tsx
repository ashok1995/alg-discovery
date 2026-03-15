import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Grid,
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
  Box,
  alpha,
} from '@mui/material';
import { TrendingUp, TrendingDown, SwapVert } from '@mui/icons-material';
import type { TopMoverItem } from '../../types/apiModels';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';
import SymbolLink from '../ui/SymbolLink';

interface MarketMoversTabProps {
  topGainers: TopMoverItem[];
  topLosers: TopMoverItem[];
  topTraded: TopMoverItem[];
}

type MoverKey = 'symbol' | 'last_price' | 'change_pct' | 'volume' | 'value_traded_cr' | 'sector';

const COLUMNS: ColumnDef<MoverKey>[] = [
  { key: 'symbol', label: 'Symbol', sortable: true, minWidth: 120 },
  { key: 'last_price', label: 'Price (₹)', align: 'right', sortable: true },
  { key: 'change_pct', label: 'Change %', align: 'right', sortable: true },
  { key: 'volume', label: 'Volume', align: 'right', sortable: true },
  { key: 'value_traded_cr', label: 'Value (Cr)', align: 'right', sortable: true },
  { key: 'sector', label: 'Sector', sortable: true },
];

const formatVolume = (v: number | null): string => {
  if (v == null) return '—';
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString('en-IN');
};

const pct = (s: TopMoverItem) => s.period_return_pct ?? s.change_pct ?? 0;

const SortableMoverTable: React.FC<{ items: TopMoverItem[] }> = ({ items }) => {
  const { sortedData, requestSort, getSortDirection } = useSortableData<TopMoverItem, MoverKey>(
    items,
    { key: 'change_pct', direction: 'desc' },
  );

  return (
    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 520, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Table size="small" stickyHeader>
        <SortableTableHead columns={COLUMNS} onSort={requestSort} getSortDirection={getSortDirection} />
        <TableBody>
          {sortedData.map((s, idx) => {
            const changePct = pct(s);
            return (
              <TableRow
                key={`${s.symbol}-${idx}`}
                hover
                sx={{ '&:last-child td': { borderBottom: 0 } }}
              >
                <TableCell>
                  <SymbolLink symbol={s.symbol} chartUrl={s.chart_url} exchange={s.exchange} />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={500}>
                    ₹{s.last_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Chip
                    label={`${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      bgcolor: changePct > 0 ? alpha('#4caf50', 0.12) : changePct < 0 ? alpha('#f44336', 0.12) : 'grey.100',
                      color: changePct > 0 ? 'success.dark' : changePct < 0 ? 'error.dark' : 'text.secondary',
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">{formatVolume(s.volume)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="text.secondary">
                    {s.value_traded_cr != null ? `₹${s.value_traded_cr.toFixed(1)}` : '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {s.sector ? (
                    <Chip label={s.sector} size="small" variant="outlined" sx={{ fontSize: '0.68rem', textTransform: 'capitalize' }} />
                  ) : (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {sortedData.length === 0 && (
            <TableRow>
              <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">No data available</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

interface SummaryCardProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  count: number;
  label: string;
  color: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ active, onClick, icon, count, label, color }) => (
  <Card
    onClick={onClick}
    sx={{
      cursor: 'pointer',
      border: 2,
      borderColor: active ? `${color}.main` : 'transparent',
      bgcolor: active ? alpha(color === 'success' ? '#4caf50' : color === 'error' ? '#f44336' : '#2196f3', 0.04) : 'background.paper',
      transition: 'all 0.2s ease',
      '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
    }}
  >
    <CardContent sx={{ textAlign: 'center', py: 2.5, '&:last-child': { pb: 2.5 } }}>
      {icon}
      <Typography variant="h4" fontWeight={700} color={`${color}.main`} sx={{ mt: 0.5 }}>
        {count}
      </Typography>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
    </CardContent>
  </Card>
);

const MarketMoversTab: React.FC<MarketMoversTabProps> = ({ topGainers, topLosers, topTraded }) => {
  const [section, setSection] = useState<'gainers' | 'losers' | 'traded'>('gainers');

  const items = section === 'gainers' ? topGainers : section === 'losers' ? topLosers : topTraded;
  const title = section === 'gainers' ? 'Top Gainers' : section === 'losers' ? 'Top Losers' : 'Most Traded';

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <SummaryCard active={section === 'gainers'} onClick={() => setSection('gainers')} icon={<TrendingUp sx={{ fontSize: 28, color: 'success.main' }} />} count={topGainers.length} label="Top Gainers" color="success" />
        </Grid>
        <Grid item xs={4}>
          <SummaryCard active={section === 'losers'} onClick={() => setSection('losers')} icon={<TrendingDown sx={{ fontSize: 28, color: 'error.main' }} />} count={topLosers.length} label="Top Losers" color="error" />
        </Grid>
        <Grid item xs={4}>
          <SummaryCard active={section === 'traded'} onClick={() => setSection('traded')} icon={<SwapVert sx={{ fontSize: 28, color: 'info.main' }} />} count={topTraded.length} label="Most Traded" color="info" />
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="center" mb={2}>
        <ToggleButtonGroup value={section} exclusive onChange={(_, v) => v && setSection(v)} size="small">
          <ToggleButton value="gainers" color="success">Gainers</ToggleButton>
          <ToggleButton value="losers" color="error">Losers</ToggleButton>
          <ToggleButton value="traded" color="info">Most Traded</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>{title} (Last 24h)</Typography>
          <SortableMoverTable items={items} />
        </CardContent>
      </Card>
    </>
  );
};

export default MarketMoversTab;
