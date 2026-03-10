import React, { useState } from 'react';
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
  alpha,
} from '@mui/material';
import { TrendingUp, TrendingDown, SwapVert } from '@mui/icons-material';
import type { TopMoverItem } from '../../types/apiModels';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';

interface HomeMarketMoversTabProps {
  topGainers: TopMoverItem[];
  topLosers: TopMoverItem[];
  topTraded: TopMoverItem[];
  loading: boolean;
}

type MoverKey = 'symbol' | 'last_price' | 'change_pct' | 'volume' | 'value_traded_cr';

const COLUMNS: ColumnDef<MoverKey>[] = [
  { key: 'symbol', label: 'Symbol', sortable: true, minWidth: 90 },
  { key: 'last_price', label: 'Price (₹)', align: 'right', sortable: true },
  { key: 'change_pct', label: 'Change %', align: 'right', sortable: true },
  { key: 'volume', label: 'Volume', align: 'right', sortable: true },
  { key: 'value_traded_cr', label: 'Value (Cr)', align: 'right', sortable: true },
];

const formatVolume = (v: number | null): string => {
  if (v == null) return '—';
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString('en-IN');
};

const SortableMoverTable: React.FC<{ items: TopMoverItem[] }> = ({ items }) => {
  const { sortedData, requestSort, getSortDirection } = useSortableData<TopMoverItem, MoverKey>(
    items,
    { key: 'change_pct', direction: 'desc' },
  );

  return (
    <TableContainer component={Paper} elevation={0} sx={{ maxHeight: 400, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <Table size="small" stickyHeader>
        <SortableTableHead columns={COLUMNS} onSort={requestSort} getSortDirection={getSortDirection} />
        <TableBody>
          {sortedData.map((item, idx) => (
            <TableRow key={`${item.symbol}-${idx}`} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={600}>{item.symbol}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={500}>
                  ₹{item.last_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Chip
                  label={`${item.change_pct > 0 ? '+' : ''}${item.change_pct?.toFixed(2) ?? '0'}%`}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    bgcolor: item.change_pct > 0 ? alpha('#4caf50', 0.12) : item.change_pct < 0 ? alpha('#f44336', 0.12) : 'grey.100',
                    color: item.change_pct > 0 ? 'success.dark' : item.change_pct < 0 ? 'error.dark' : 'text.secondary',
                  }}
                />
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">{formatVolume(item.volume)}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" color="text.secondary">
                  {item.value_traded_cr != null ? `₹${item.value_traded_cr.toFixed(1)}` : '—'}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
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

const HomeMarketMoversTab: React.FC<HomeMarketMoversTabProps> = ({ topGainers, topLosers, topTraded, loading }) => {
  const [view, setView] = useState<'gainers' | 'losers' | 'traded'>('gainers');

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  const items = view === 'gainers' ? topGainers : view === 'losers' ? topLosers : topTraded;

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {([
          { key: 'gainers' as const, icon: <TrendingUp sx={{ fontSize: 28, color: 'success.main' }} />, list: topGainers, label: 'Top Gainers', color: 'success' },
          { key: 'losers' as const, icon: <TrendingDown sx={{ fontSize: 28, color: 'error.main' }} />, list: topLosers, label: 'Top Losers', color: 'error' },
          { key: 'traded' as const, icon: <SwapVert sx={{ fontSize: 28, color: 'info.main' }} />, list: topTraded, label: 'Most Traded', color: 'info' },
        ]).map(({ key, icon, list, label, color }) => (
          <Grid item xs={4} key={key}>
            <Card
              onClick={() => setView(key)}
              sx={{
                cursor: 'pointer',
                border: 2,
                borderColor: view === key ? `${color}.main` : 'transparent',
                bgcolor: view === key ? alpha(color === 'success' ? '#4caf50' : color === 'error' ? '#f44336' : '#2196f3', 0.04) : 'background.paper',
                transition: 'all 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
              }}
            >
              <CardContent sx={{ textAlign: 'center', py: 2, '&:last-child': { pb: 2 } }}>
                {icon}
                <Typography variant="h4" fontWeight={700} color={`${color}.main`} sx={{ mt: 0.5 }}>{list.length}</Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box display="flex" justifyContent="center" mb={2}>
        <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
          <ToggleButton value="gainers" color="success">Gainers</ToggleButton>
          <ToggleButton value="losers" color="error">Losers</ToggleButton>
          <ToggleButton value="traded" color="info">Most Traded</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <SortableMoverTable items={items} />
    </Box>
  );
};

export default HomeMarketMoversTab;
