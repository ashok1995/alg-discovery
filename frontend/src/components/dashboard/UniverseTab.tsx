import React from 'react';
import { Grid, Card, CardContent, Typography, Alert } from '@mui/material';
import type { UniverseHealthResponse } from '../../types/apiModels';
import { TRADE_TYPE_LABELS } from './types';

interface UniverseTabProps {
  universeHealth: UniverseHealthResponse | null;
}

const UniverseTab: React.FC<UniverseTabProps> = ({ universeHealth }) => {
  if (!universeHealth) {
    return <Typography color="text.secondary">Loading universe data...</Typography>;
  }

  const scenarios = Object.entries(universeHealth.scenarios);
  if (scenarios.length === 0) {
    return (
      <Alert severity="info">No active universe data.</Alert>
    );
  }

  return (
    <Grid container spacing={2}>
      {scenarios.map(([scenario, data]) => (
        <Grid item xs={12} sm={6} md={4} key={scenario}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold">
                {TRADE_TYPE_LABELS[scenario] || scenario}
              </Typography>
              <Typography variant="h3" color="primary">{data.active}</Typography>
              <Typography variant="caption" display="block">stocks active</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Score: {data.min_score} - {data.max_score} (avg {data.avg_score})
              </Typography>
              {data.stalest_hours !== null && (
                <Typography
                  variant="body2"
                  color={data.stalest_hours > 12 ? 'error.main' : 'text.secondary'}
                >
                  Stalest entry: {data.stalest_hours}h ago
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default UniverseTab;
