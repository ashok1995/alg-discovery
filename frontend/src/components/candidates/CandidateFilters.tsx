import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Grid,
  Switch,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import type { PopulationConfig } from '../../services/stockCandidatePopulatorService';

interface CandidateFiltersProps {
  strategyName: string;
  config: PopulationConfig;
  showAdvancedConfig: boolean;
  isLoading: boolean;
  onStrategyNameChange: (value: string) => void;
  onConfigChange: (config: PopulationConfig) => void;
  onToggleAdvanced: () => void;
  onPopulate: () => void;
}

const CandidateFilters: React.FC<CandidateFiltersProps> = ({
  strategyName,
  config,
  showAdvancedConfig,
  isLoading,
  onStrategyNameChange,
  onConfigChange,
  onToggleAdvanced,
  onPopulate,
}) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">
          <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Configuration
        </Typography>
        <Button
          variant="text"
          onClick={onToggleAdvanced}
          endIcon={<ExpandMoreIcon />}
        >
          {showAdvancedConfig ? 'Hide' : 'Show'} Advanced
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Strategy Name"
            value={strategyName}
            onChange={(e) => onStrategyNameChange(e.target.value)}
            margin="normal"
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Max Candidates"
            type="number"
            value={config.max_candidates}
            onChange={(e) =>
              onConfigChange({ ...config, max_candidates: Number(e.target.value) })
            }
            margin="normal"
          />
        </Grid>

        {showAdvancedConfig && (
          <>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Min Market Cap (crores)"
                type="number"
                value={config.min_market_cap}
                onChange={(e) =>
                  onConfigChange({ ...config, min_market_cap: Number(e.target.value) })
                }
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Market Cap (crores)"
                type="number"
                value={config.max_market_cap}
                onChange={(e) =>
                  onConfigChange({ ...config, max_market_cap: Number(e.target.value) })
                }
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Min Price"
                type="number"
                value={config.min_price}
                onChange={(e) =>
                  onConfigChange({ ...config, min_price: Number(e.target.value) })
                }
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Max Price"
                type="number"
                value={config.max_price}
                onChange={(e) =>
                  onConfigChange({ ...config, max_price: Number(e.target.value) })
                }
                margin="normal"
              />
            </Grid>
          </>
        )}

        <Grid item xs={12}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.include_nse_only}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      include_nse_only: e.target.checked,
                    })
                  }
                />
              }
              label="NSE Only"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.exclude_etfs}
                  onChange={(e) =>
                    onConfigChange({ ...config, exclude_etfs: e.target.checked })
                  }
                />
              }
              label="Exclude ETFs"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.exclude_penny_stocks}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      exclude_penny_stocks: e.target.checked,
                    })
                  }
                />
              }
              label="Exclude Penny Stocks"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config.enable_real_time_pricing}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      enable_real_time_pricing: e.target.checked,
                    })
                  }
                />
              }
              label="Real-time Pricing"
            />
          </Box>
        </Grid>
      </Grid>

      <Box mt={2}>
        <Button
          variant="contained"
          onClick={onPopulate}
          disabled={isLoading}
          startIcon={
            isLoading ? <CircularProgress size={20} /> : <TrendingUpIcon />
          }
          size="large"
        >
          {isLoading ? 'Populating...' : 'Populate Candidates'}
        </Button>
      </Box>
    </CardContent>
  </Card>
);

export default CandidateFilters;
