import React from 'react';
import { Card, CardContent, Typography, Box, Grid, Chip, alpha } from '@mui/material';
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
import type { MarketTrendPoint, TrendsSummary, GlobalContext } from '../../types/apiModels';

interface MarketTrendsTabProps {
  marketTimeline: MarketTrendPoint[];
  trendsSummary?: TrendsSummary | null;
  globalContext?: GlobalContext | null;
}

const regimeColor = (r?: string) =>
  r?.includes('bullish') ? '#4caf50' : r?.includes('bearish') ? '#f44336' : '#ff9800';

const MarketTrendsTab: React.FC<MarketTrendsTabProps> = ({ marketTimeline, trendsSummary, globalContext }) => {
  const tickFormatter = (v: string) =>
    new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const labelFormatter = (v: string) => new Date(v).toLocaleString('en-IN');

  const latestPoint = marketTimeline.length > 0 ? marketTimeline[marketTimeline.length - 1] : null;

  return (
    <Box display="flex" flexDirection="column" gap={2}>
      {/* Global Context Cards */}
      {globalContext && (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 1 }}>
          <CardContent sx={{ py: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1.5}>Global Markets</Typography>
            <Grid container spacing={2}>
              {[
                { label: 'S&P 500', value: globalContext.sp500?.toLocaleString('en-US'), change: globalContext.sp500_change_pct, regime: globalContext.sp500_regime_short },
                { label: 'NASDAQ', value: globalContext.nasdaq?.toLocaleString('en-US'), change: globalContext.nasdaq_change_pct },
                { label: 'VIX (US)', value: globalContext.vix_us?.toFixed(2), change: undefined, regime: globalContext.vix_regime_short },
                { label: 'Gold', value: `$${globalContext.gold?.toLocaleString('en-US')}`, change: undefined },
                { label: 'USD/INR', value: globalContext.usd_inr?.toFixed(2), change: undefined },
                { label: 'Crude Oil', value: `$${globalContext.crude_oil?.toFixed(2)}`, change: undefined },
              ].map(({ label, value, change, regime }) => (
                <Grid item xs={6} sm={4} md={2} key={label}>
                  <Box sx={{ textAlign: 'center', py: 1 }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
                    <Typography variant="h6" fontWeight={700} sx={{ lineHeight: 1.2, mt: 0.3 }}>{value ?? '—'}</Typography>
                    <Box display="flex" justifyContent="center" gap={0.5} mt={0.5}>
                      {change != null && (
                        <Chip
                          label={`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}
                          size="small"
                          sx={{
                            fontWeight: 700, fontSize: '0.65rem', height: 20,
                            bgcolor: alpha(change >= 0 ? '#4caf50' : '#f44336', 0.12),
                            color: change >= 0 ? 'success.dark' : 'error.dark',
                          }}
                        />
                      )}
                      {regime && (
                        <Chip
                          label={regime}
                          size="small"
                          sx={{ fontSize: '0.6rem', height: 18, bgcolor: alpha(regimeColor(regime), 0.12), color: regimeColor(regime), textTransform: 'capitalize' }}
                        />
                      )}
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
            {globalContext.global_equity_stance && (
              <Box mt={1.5} display="flex" justifyContent="center">
                <Chip
                  label={`Global Equity Stance: ${globalContext.global_equity_stance.replace(/_/g, ' ')}`}
                  sx={{
                    fontWeight: 700, textTransform: 'capitalize',
                    bgcolor: alpha(regimeColor(globalContext.global_equity_stance), 0.12),
                    color: regimeColor(globalContext.global_equity_stance),
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trends Summary + Regime Chips */}
      <Box display="flex" gap={1.5} flexWrap="wrap" alignItems="center">
        {trendsSummary?.dominant_regime && (
          <Chip
            label={`Dominant: ${trendsSummary.dominant_regime}`}
            color={trendsSummary.dominant_regime === 'bullish' ? 'success' : trendsSummary.dominant_regime === 'bearish' ? 'error' : 'warning'}
            size="small" sx={{ fontWeight: 600 }}
          />
        )}
        {trendsSummary?.vix_current != null && (
          <Chip label={`VIX: ${trendsSummary.vix_current.toFixed(1)} (${trendsSummary.vix_direction})`} size="small" variant="outlined" />
        )}
        {trendsSummary?.ad_ratio_avg != null && (
          <Chip label={`Avg A/D: ${trendsSummary.ad_ratio_avg.toFixed(2)}`} size="small" variant="outlined" />
        )}
        {latestPoint?.market_sentiment && (
          <Chip label={`Sentiment: ${latestPoint.market_sentiment}`} size="small" variant="outlined" />
        )}
      </Box>

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
                    <Area type="monotone" dataKey="vix_india" name="VIX India" stroke="#f44336" fill="url(#vixGrad)" strokeWidth={2} dot={false} />
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
