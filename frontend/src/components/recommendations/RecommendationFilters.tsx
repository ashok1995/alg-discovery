import React from 'react';
import { Box, Paper, Typography, Chip, Button } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import type { StrategyConfigItem } from '../../config/recommendationsConfig';
import type { StrategyType } from '../../types/apiModels';

export interface RecommendationFiltersProps {
  strategyConfig: Record<string, StrategyConfigItem>;
  selectedStrategy: StrategyType;
  loading: boolean;
  /** From workspace preferences */
  autoRefreshEnabled: boolean;
  refreshIntervalSec: number;
  onStrategyChange: (strategy: StrategyType) => void;
  onRefresh: () => void;
}

const RecommendationFilters: React.FC<RecommendationFiltersProps> = ({
  strategyConfig,
  selectedStrategy,
  loading,
  autoRefreshEnabled,
  refreshIntervalSec,
  onStrategyChange,
  onRefresh,
}) => {
  const strategies = Object.entries(strategyConfig);

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Strategy:
        </Typography>
        {strategies.map(([key, cfg]) => (
          <Chip
            key={key}
            label={cfg.label}
            onClick={() => onStrategyChange(key as StrategyType)}
            sx={{
              backgroundColor: selectedStrategy === key ? cfg.color : 'transparent',
              color: selectedStrategy === key ? 'white' : 'text.primary',
              borderColor: cfg.color,
            }}
            variant={selectedStrategy === key ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2}>
        <Typography variant="body2" color="text.secondary">
          Auto refresh:{' '}
          <strong>{autoRefreshEnabled ? `On (${refreshIntervalSec}s, this page + visible tab)` : 'Off'}</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Sort columns using table headers.
        </Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={onRefresh} disabled={loading} size="small">
          Refresh
        </Button>
      </Box>
    </Paper>
  );
};

export default RecommendationFilters;
