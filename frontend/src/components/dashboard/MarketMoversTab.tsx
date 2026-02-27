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
  TableHead,
  TableRow,
  Paper,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Box,
} from '@mui/material';
import { TrendingUp, TrendingDown, SwapVert } from '@mui/icons-material';
import type { TopMoverItem } from '../../types/apiModels';
import { returnColor } from './types';

interface MarketMoversTabProps {
  topGainers: TopMoverItem[];
  topLosers: TopMoverItem[];
  topTraded: TopMoverItem[];
}

const StockTable: React.FC<{ items: TopMoverItem[]; showVolume?: boolean }> = ({ items, showVolume }) => (
  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
    <Table size="small" stickyHeader>
      <TableHead>
        <TableRow>
          <TableCell>#</TableCell>
          <TableCell>Symbol</TableCell>
          <TableCell>Type</TableCell>
          <TableCell align="right">Price</TableCell>
          <TableCell align="right">Change %</TableCell>
          <TableCell align="right">Score</TableCell>
          {showVolume && <TableCell align="right">Rel. Volume</TableCell>}
          <TableCell>Sector</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {items.map((s, idx) => (
          <TableRow key={`${s.symbol}-${s.trade_type}-${idx}`} hover>
            <TableCell>{idx + 1}</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>{s.symbol}</TableCell>
            <TableCell>
              <Chip label={s.trade_type.replace(/_/g, ' ')} size="small" variant="outlined" />
            </TableCell>
            <TableCell align="right">
              {s.last_price > 0 ? `₹${s.last_price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—'}
            </TableCell>
            <TableCell align="right">
              <Typography variant="body2" color={returnColor(s.change_pct)} fontWeight="bold">
                {s.change_pct > 0 ? '+' : ''}{s.change_pct?.toFixed(2) ?? '—'}%
              </Typography>
            </TableCell>
            <TableCell align="right">
              <Chip label={s.score?.toFixed(0)} size="small" color="primary" variant="outlined" />
            </TableCell>
            {showVolume && (
              <TableCell align="right">
                {s.relative_volume ? `${s.relative_volume.toFixed(1)}x` : '—'}
              </TableCell>
            )}
            <TableCell>
              <Typography variant="caption" color="text.secondary">{s.sector ?? '—'}</Typography>
            </TableCell>
          </TableRow>
        ))}
        {items.length === 0 && (
          <TableRow>
            <TableCell colSpan={showVolume ? 8 : 7} align="center">
              No data available yet.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </TableContainer>
);

const MarketMoversTab: React.FC<MarketMoversTabProps> = ({ topGainers, topLosers, topTraded }) => {
  const [section, setSection] = useState<'gainers' | 'losers' | 'traded'>('gainers');

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={4}>
          <Card
            variant="outlined"
            sx={{ cursor: 'pointer', borderColor: section === 'gainers' ? 'success.main' : undefined, borderWidth: section === 'gainers' ? 2 : 1 }}
            onClick={() => setSection('gainers')}
          >
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <TrendingUp color="success" fontSize="small" />
              <Typography variant="h5" color="success.main" fontWeight="bold">{topGainers.length}</Typography>
              <Typography variant="caption">Top Gainers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card
            variant="outlined"
            sx={{ cursor: 'pointer', borderColor: section === 'losers' ? 'error.main' : undefined, borderWidth: section === 'losers' ? 2 : 1 }}
            onClick={() => setSection('losers')}
          >
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <TrendingDown color="error" fontSize="small" />
              <Typography variant="h5" color="error.main" fontWeight="bold">{topLosers.length}</Typography>
              <Typography variant="caption">Top Losers</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card
            variant="outlined"
            sx={{ cursor: 'pointer', borderColor: section === 'traded' ? 'info.main' : undefined, borderWidth: section === 'traded' ? 2 : 1 }}
            onClick={() => setSection('traded')}
          >
            <CardContent sx={{ textAlign: 'center', py: 1.5 }}>
              <SwapVert color="info" fontSize="small" />
              <Typography variant="h5" color="info.main" fontWeight="bold">{topTraded.length}</Typography>
              <Typography variant="caption">Most Traded</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="center" mb={2}>
        <ToggleButtonGroup value={section} exclusive onChange={(_, v) => v && setSection(v)} size="small">
          <ToggleButton value="gainers" color="success">Gainers</ToggleButton>
          <ToggleButton value="losers" color="error">Losers</ToggleButton>
          <ToggleButton value="traded" color="info">Most Traded</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {section === 'gainers' ? 'Top Gainers' : section === 'losers' ? 'Top Losers' : 'Most Traded'} (Last 24h)
          </Typography>
          <StockTable
            items={section === 'gainers' ? topGainers : section === 'losers' ? topLosers : topTraded}
            showVolume={section === 'traded'}
          />
        </CardContent>
      </Card>
    </>
  );
};

export default MarketMoversTab;
