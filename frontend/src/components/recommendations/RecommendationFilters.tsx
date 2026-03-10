import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormControlLabel,
  Switch,
  Collapse
} from '@mui/material';
import { ExpandMore, ExpandLess, Refresh } from '@mui/icons-material';
import type { StrategyConfigItem } from '../../config/recommendationsConfig';
import type { StrategyType } from '../../types/apiModels';

export interface RecommendationFiltersProps {
  strategyConfig: Record<string, StrategyConfigItem>;
  selectedStrategy: StrategyType;
  selectedRisk: 'low' | 'medium' | 'high';
  expandedFilters: boolean;
  minScore: number;
  maxResults: number;
  sortBy: 'score' | 'price' | 'volume' | 'change';
  sortDirection: 'asc' | 'desc';
  autoRefresh: boolean;
  loading: boolean;
  onStrategyChange: (strategy: StrategyType) => void;
  onRiskChange: (risk: 'low' | 'medium' | 'high') => void;
  onExpandedFiltersChange: () => void;
  onMinScoreChange: (v: number) => void;
  onMaxResultsChange: (v: number) => void;
  onSortByChange: (v: 'score' | 'price' | 'volume' | 'change') => void;
  onSortDirectionChange: (v: 'asc' | 'desc') => void;
  onAutoRefreshToggle: () => void;
  onRefresh: () => void;
}

const riskColorMap: Record<string, string> = {
  low: '#4caf50',
  medium: '#ff9800',
  high: '#f44336'
};

const RecommendationFilters: React.FC<RecommendationFiltersProps> = ({
  strategyConfig,
  selectedStrategy,
  selectedRisk,
  expandedFilters,
  minScore,
  maxResults,
  sortBy,
  sortDirection,
  autoRefresh,
  loading,
  onStrategyChange,
  onRiskChange,
  onExpandedFiltersChange,
  onMinScoreChange,
  onMaxResultsChange,
  onSortByChange,
  onSortDirectionChange,
  onAutoRefreshToggle,
  onRefresh
}) => {
  const strategies = Object.entries(strategyConfig);

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Strategy:
        </Typography>
        {strategies.map(([key, config]) => (
          <Chip
            key={key}
            label={config.label}
            onClick={() => onStrategyChange(key as StrategyType)}
            sx={{
              backgroundColor: selectedStrategy === key ? config.color : 'transparent',
              color: selectedStrategy === key ? 'white' : 'text.primary',
              borderColor: config.color
            }}
            variant={selectedStrategy === key ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mb={2}>
        <Typography variant="subtitle1" fontWeight="bold">
          Risk:
        </Typography>
        {(['low', 'medium', 'high'] as const).map((r) => (
          <Chip
            key={r}
            label={r.toUpperCase()}
            onClick={() => onRiskChange(r)}
            sx={{
              backgroundColor: selectedRisk === r ? riskColorMap[r] : 'transparent',
              color: selectedRisk === r ? 'white' : riskColorMap[r],
              borderColor: riskColorMap[r]
            }}
            variant={selectedRisk === r ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2}>
        <FormControlLabel
          control={<Switch checked={autoRefresh} onChange={onAutoRefreshToggle} />}
          label="Auto refresh"
        />
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={onRefresh}
          disabled={loading}
          size="small"
        >
          Refresh
        </Button>
        <Button
          size="small"
          endIcon={expandedFilters ? <ExpandLess /> : <ExpandMore />}
          onClick={onExpandedFiltersChange}
        >
          {expandedFilters ? 'Less' : 'More'} filters
        </Button>
      </Box>

      <Collapse in={expandedFilters}>
        <Box display="flex" flexWrap="wrap" gap={3} mt={2} pt={2} borderTop={1} borderColor="divider">
          <Box sx={{ minWidth: 180 }}>
            <Typography gutterBottom>Min Score: {minScore}</Typography>
            <Slider
              value={minScore}
              onChange={(_, v) => onMinScoreChange(v as number)}
              min={50}
              max={95}
              step={5}
              valueLabelDisplay="auto"
            />
          </Box>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Max Results</InputLabel>
            <Select
              value={maxResults}
              label="Max Results"
              onChange={(e) => onMaxResultsChange(Number(e.target.value))}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={20}>20</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Sort By</InputLabel>
            <Select value={sortBy} label="Sort By" onChange={(e) => onSortByChange(e.target.value as typeof sortBy)}>
              <MenuItem value="score">Score</MenuItem>
              <MenuItem value="price">Price</MenuItem>
              <MenuItem value="volume">Volume</MenuItem>
              <MenuItem value="change">Change %</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Order</InputLabel>
            <Select
              value={sortDirection}
              label="Order"
              onChange={(e) => onSortDirectionChange(e.target.value as 'asc' | 'desc')}
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default RecommendationFilters;
