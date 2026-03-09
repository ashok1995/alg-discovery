import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Alert,
  alpha,
  Chip,
} from '@mui/material';
import type { UniverseHealthResponse } from '../../types/apiModels';
import { TRADE_TYPE_LABELS } from './types';

interface UniverseTabProps {
  universeHealth: UniverseHealthResponse | null;
}

const scoreColor = (score: number): string => {
  if (score >= 55) return '#4caf50';
  if (score >= 45) return '#ff9800';
  return '#f44336';
};

const UniverseTab: React.FC<UniverseTabProps> = ({ universeHealth }) => {
  if (!universeHealth) {
    return <Typography color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Loading universe data...</Typography>;
  }

  const scenarios = Object.entries(universeHealth.scenarios);
  if (scenarios.length === 0) {
    return <Alert severity="info">No active universe data.</Alert>;
  }

  const totalStocks = scenarios.reduce((s, [, d]) => s + d.active, 0);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" fontWeight={600}>Stock Universe Health</Typography>
        <Chip label={`${totalStocks} total stocks`} color="primary" size="small" />
      </Box>
      <Grid container spacing={2}>
        {scenarios.map(([scenario, data]) => {
          const avgColor = scoreColor(data.avg_score);
          const staleWarning = data.stalest_hours != null && data.stalest_hours > 12;
          return (
            <Grid item xs={12} sm={6} md={4} key={scenario}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: staleWarning ? 'warning.main' : 'divider',
                  borderRadius: 2,
                  transition: 'all 0.2s',
                  '&:hover': { boxShadow: 3 },
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {TRADE_TYPE_LABELS[scenario] || scenario.replace(/_/g, ' ')}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="primary.main">
                      {data.active}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary" gutterBottom display="block">Score Range</Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="body2" fontWeight={500}>{data.min_score}</Typography>
                    <Box flexGrow={1}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(((data.avg_score - data.min_score) / Math.max(data.max_score - data.min_score, 1)) * 100, 100)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: alpha(avgColor, 0.12),
                          '& .MuiLinearProgress-bar': { bgcolor: avgColor, borderRadius: 4 },
                        }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight={500}>{data.max_score}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg: <b style={{ color: avgColor }}>{data.avg_score.toFixed(1)}</b>
                  </Typography>

                  {data.stalest_hours !== null && (
                    <Box mt={1}>
                      <Chip
                        label={`Stalest: ${data.stalest_hours.toFixed(1)}h ago`}
                        size="small"
                        color={staleWarning ? 'warning' : 'default'}
                        variant="outlined"
                        sx={{ fontSize: '0.7rem' }}
                      />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
};

export default UniverseTab;
