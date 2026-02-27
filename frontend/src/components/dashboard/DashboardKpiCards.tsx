import React from 'react';
import { Grid, Card, CardContent, Typography, Chip } from '@mui/material';
import type { DashboardDailySummary } from '../../types/apiModels';
import { returnColor } from './types';

interface DashboardKpiCardsProps {
  summary: DashboardDailySummary;
}

const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({ summary }) => {
  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={6} sm={3}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Open Positions</Typography>
            <Typography variant="h4">{summary.positions.open}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Win Rate</Typography>
            <Typography variant="h4" color={summary.positions.win_rate >= 50 ? 'success.main' : 'error.main'}>
              {summary.positions.win_rate}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Avg Return</Typography>
            <Typography variant="h4" color={returnColor(summary.positions.avg_return_pct)}>
              {summary.positions.avg_return_pct > 0 ? '+' : ''}{summary.positions.avg_return_pct}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Card>
          <CardContent>
            <Typography variant="caption" color="text.secondary">Market Regime</Typography>
            <Chip
              label={summary.market_context?.market_regime?.toUpperCase() || 'N/A'}
              color={
                summary.market_context?.market_regime === 'bullish' ? 'success' :
                summary.market_context?.market_regime === 'bearish' ? 'error' : 'warning'
              }
              size="small"
              sx={{ mt: 0.5 }}
            />
            {summary.market_context?.vix_india != null && (
              <Typography variant="caption" display="block" mt={0.5}>
                VIX: {summary.market_context.vix_india?.toFixed(1)}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default DashboardKpiCards;
