import React from 'react';
import { Card, CardContent, Typography, Box, Grid, Chip } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';
import type { MarketTrendPoint } from '../../types/apiModels';

interface MarketTrendsTabProps {
  marketTimeline: MarketTrendPoint[];
}

const MarketTrendsTab: React.FC<MarketTrendsTabProps> = ({ marketTimeline }) => {
  const tickFormatter = (v: string) =>
    new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const labelFormatter = (v: string) => new Date(v).toLocaleString('en-IN');

  const latestPoint = marketTimeline.length > 0 ? marketTimeline[marketTimeline.length - 1] : null;

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {latestPoint && (
        <Box display="flex" gap={1.5} flexWrap="wrap">
          {latestPoint.regime && (
            <Chip
              label={`Regime: ${latestPoint.regime}`}
              color={latestPoint.regime === 'bullish' ? 'success' : latestPoint.regime === 'bearish' ? 'error' : 'warning'}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          )}
          {latestPoint.sentiment && (
            <Chip label={`Sentiment: ${latestPoint.sentiment}`} size="small" variant="outlined" />
          )}
          {latestPoint.vix_level && (
            <Chip label={`VIX Level: ${latestPoint.vix_level}`} size="small" variant="outlined" />
          )}
        </Box>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} lg={7}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>Nifty 50 Timeline</Typography>
              {marketTimeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={marketTimeline}>
                    <defs>
                      <linearGradient id="niftyGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1976d2" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={tickFormatter} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                    <RTooltip
                      labelFormatter={labelFormatter}
                      formatter={(v: number) => v.toLocaleString('en-IN')}
                      contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                    />
                    <Area type="monotone" dataKey="nifty50_price" name="Nifty 50" stroke="#1976d2" fill="url(#niftyGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No market data available</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>VIX (Volatility Index)</Typography>
              {marketTimeline.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={marketTimeline}>
                    <defs>
                      <linearGradient id="vixGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f44336" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#f44336" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={tickFormatter} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} />
                    <RTooltip
                      labelFormatter={labelFormatter}
                      contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                    />
                    <Area type="monotone" dataKey="vix" name="VIX" stroke="#f44336" fill="url(#vixGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No VIX data</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="h6" fontWeight={600} gutterBottom>Market Breadth (A/D Ratio)</Typography>
          {marketTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={marketTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={tickFormatter} />
                <YAxis domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                <RTooltip contentStyle={{ borderRadius: 8, border: '1px solid #eee' }} />
                <Legend />
                <Line type="monotone" dataKey="advance_decline_ratio" name="A/D Ratio" stroke="#4caf50" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No breadth data</Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MarketTrendsTab;
