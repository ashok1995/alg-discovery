import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { MarketTrendPoint } from '../../types/apiModels';

interface MarketTrendsTabProps {
  marketTimeline: MarketTrendPoint[];
}

const MarketTrendsTab: React.FC<MarketTrendsTabProps> = ({ marketTimeline }) => {
  const tickFormatter = (v: string) =>
    new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const labelFormatter = (v: string) => new Date(v).toLocaleString('en-IN');

  return (
    <>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>Nifty 50 & VIX Timeline</Typography>
          {marketTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={marketTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={tickFormatter} />
                <YAxis yAxisId="left" domain={['auto', 'auto']} />
                <YAxis yAxisId="right" orientation="right" domain={['auto', 'auto']} />
                <RTooltip labelFormatter={labelFormatter} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="nifty50_price" name="Nifty 50" stroke="#1976d2" dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="vix" name="VIX" stroke="#f44336" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary">No market data available.</Typography>
          )}
        </CardContent>
      </Card>
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Market Breadth (A/D Ratio)</Typography>
          {marketTimeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={marketTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} tickFormatter={tickFormatter} />
                <YAxis domain={[0, 'auto']} />
                <RTooltip />
                <Line type="monotone" dataKey="advance_decline_ratio" name="A/D Ratio" stroke="#4caf50" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Typography color="text.secondary">No breadth data.</Typography>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default MarketTrendsTab;
