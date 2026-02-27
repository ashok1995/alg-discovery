import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Chip } from '@mui/material';
import type { DynamicRecommendationItem } from '../../types/apiModels';
import type { RecommendationMetricsData } from '../../utils/recommendationUtils';
import type { StrategyConfigItem } from '../../config/recommendationsConfig';

export interface RecommendationMetricsProps {
  metrics: RecommendationMetricsData;
  recommendations: DynamicRecommendationItem[];
  strategyConfig: Record<string, StrategyConfigItem>;
  selectedStrategy: string;
  lastRefreshTime: Date | null;
}

const riskColorMap: Record<string, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336'
};

const RecommendationMetrics: React.FC<RecommendationMetricsProps> = ({
  metrics,
  recommendations,
  strategyConfig,
  selectedStrategy,
  lastRefreshTime
}) => {
  const config = strategyConfig[selectedStrategy];
  const avgPrice =
    recommendations.length > 0
      ? recommendations.reduce((s, r) => s + (r.current_price ?? r.last_price ?? 0), 0) /
        recommendations.length
      : 0;

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid item xs={6} sm={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Total Count
            </Typography>
            <Typography variant="h5" fontWeight="bold" sx={{ color: config?.color }}>
              {metrics.totalCount}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Avg Score
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {metrics.avgScore.toFixed(1)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Avg Price
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              ₹{avgPrice.toFixed(0)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={6} sm={3}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="caption" color="text.secondary">
              Risk Breakdown
            </Typography>
            <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
              {Object.entries(metrics.riskBreakdown).map(([risk, count]) => (
                <Chip
                  key={risk}
                  label={`${risk}: ${count}`}
                  size="small"
                  sx={{
                    backgroundColor: riskColorMap[risk] || '#9e9e9e',
                    color: 'white',
                    fontSize: '0.7rem'
                  }}
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      {lastRefreshTime && (
        <Grid item xs={12}>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastRefreshTime.toLocaleTimeString()}
          </Typography>
        </Grid>
      )}
    </Grid>
  );
};

export default RecommendationMetrics;
