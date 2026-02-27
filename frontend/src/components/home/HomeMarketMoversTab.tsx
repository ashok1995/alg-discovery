import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  CircularProgress,
} from '@mui/material';
import { TrendingUp, TrendingDown, SwapVert } from '@mui/icons-material';
import type { TopMoverItem } from '../../types/apiModels';

interface HomeMarketMoversTabProps {
  topGainers: TopMoverItem[];
  topLosers: TopMoverItem[];
  topTraded: TopMoverItem[];
  loading: boolean;
}

const MoverTable: React.FC<{ items: TopMoverItem[]; type: 'gainers' | 'losers' | 'traded' }> = ({ items, type }) => {
  if (items.length === 0) {
    return (
      <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        No data available yet.
      </Typography>
    );
  }

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Symbol</TableCell>
            <TableCell align="right">Price</TableCell>
            <TableCell align="right">Change %</TableCell>
            <TableCell align="right">Score</TableCell>
            {type === 'traded' && <TableCell align="right">Rel. Vol</TableCell>}
            <TableCell>Sector</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, idx) => (
            <TableRow key={`${item.symbol}-${idx}`} hover>
              <TableCell>{idx + 1}</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>{item.symbol}</TableCell>
              <TableCell align="right">
                {item.last_price > 0 ? `₹${item.last_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
              </TableCell>
              <TableCell align="right">
                <Typography
                  variant="body2"
                  color={item.change_pct > 0 ? 'success.main' : item.change_pct < 0 ? 'error.main' : 'text.secondary'}
                  fontWeight="bold"
                >
                  {item.change_pct > 0 ? '+' : ''}{item.change_pct?.toFixed(2) ?? '—'}%
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Chip label={item.score?.toFixed(0)} size="small" color="primary" variant="outlined" />
              </TableCell>
              {type === 'traded' && (
                <TableCell align="right">
                  {item.relative_volume ? `${item.relative_volume.toFixed(1)}x` : '—'}
                </TableCell>
              )}
              <TableCell>
                <Typography variant="caption" color="text.secondary">{item.sector ?? '—'}</Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const HomeMarketMoversTab: React.FC<HomeMarketMoversTabProps> = ({
  topGainers,
  topLosers,
  topTraded,
  loading,
}) => {
  const [view, setView] = useState<'gainers' | 'losers' | 'traded'>('gainers');

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card
            sx={{ cursor: 'pointer', border: view === 'gainers' ? 2 : 0, borderColor: 'success.main' }}
            onClick={() => setView('gainers')}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <TrendingUp color="success" />
              <Typography variant="h5" color="success.main" fontWeight="bold">{topGainers.length}</Typography>
              <Typography variant="caption" color="text.secondary">Top Gainers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card
            sx={{ cursor: 'pointer', border: view === 'losers' ? 2 : 0, borderColor: 'error.main' }}
            onClick={() => setView('losers')}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <TrendingDown color="error" />
              <Typography variant="h5" color="error.main" fontWeight="bold">{topLosers.length}</Typography>
              <Typography variant="caption" color="text.secondary">Top Losers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card
            sx={{ cursor: 'pointer', border: view === 'traded' ? 2 : 0, borderColor: 'info.main' }}
            onClick={() => setView('traded')}
          >
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <SwapVert color="info" />
              <Typography variant="h5" color="info.main" fontWeight="bold">{topTraded.length}</Typography>
              <Typography variant="caption" color="text.secondary">Most Traded</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
          <ToggleButton value="gainers" color="success">Gainers</ToggleButton>
          <ToggleButton value="losers" color="error">Losers</ToggleButton>
          <ToggleButton value="traded" color="info">Most Traded</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {view === 'gainers' && <MoverTable items={topGainers} type="gainers" />}
      {view === 'losers' && <MoverTable items={topLosers} type="losers" />}
      {view === 'traded' && <MoverTable items={topTraded} type="traded" />}
    </Box>
  );
};

export default HomeMarketMoversTab;
