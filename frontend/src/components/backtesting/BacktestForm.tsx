import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Divider,
  Grid,
} from '@mui/material';
import { PlayArrow, Speed, CompareArrows } from '@mui/icons-material';
import type { BacktestConfig } from './types';

interface BacktestFormProps {
  config: BacktestConfig;
  onConfigChange: (field: keyof BacktestConfig, value: unknown) => void;
  loading: boolean;
  onRunFull: () => void;
  onQuick: () => void;
  onCompare: () => void;
}

const BacktestForm: React.FC<BacktestFormProps> = ({
  config,
  onConfigChange,
  loading,
  onRunFull,
  onQuick,
  onCompare,
}) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Seed backtest (v2)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Uses <code>POST /api/v2/backtesting/run</code>, <code>GET /api/v2/backtesting/quick/&#123;days&#125;</code>, and{' '}
        <code>GET /api/v2/backtesting/compare-strategies</code>.
      </Typography>

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Full run body
      </Typography>
      <TextField
        fullWidth
        label="Start date"
        type="date"
        value={config.start_date}
        onChange={(e) => onConfigChange('start_date', e.target.value)}
        margin="normal"
        size="small"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        fullWidth
        label="End date"
        type="date"
        value={config.end_date}
        onChange={(e) => onConfigChange('end_date', e.target.value)}
        margin="normal"
        size="small"
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        fullWidth
        label="Initial capital (₹)"
        type="number"
        value={config.initial_capital}
        onChange={(e) => onConfigChange('initial_capital', Number(e.target.value))}
        margin="normal"
        size="small"
      />
      <FormControl fullWidth margin="normal" size="small">
        <InputLabel>Mode</InputLabel>
        <Select
          value={config.mode}
          label="Mode"
          onChange={(e) => onConfigChange('mode', e.target.value)}
        >
          <MenuItem value="fast">fast</MenuItem>
          <MenuItem value="realistic">realistic</MenuItem>
          <MenuItem value="walk_forward">walk_forward</MenuItem>
        </Select>
      </FormControl>
      <TextField
        fullWidth
        label="Max positions"
        type="number"
        value={config.max_positions}
        onChange={(e) => onConfigChange('max_positions', Number(e.target.value))}
        margin="normal"
        size="small"
      />
      <TextField
        fullWidth
        label="Trade types (comma-separated)"
        value={config.trade_types}
        onChange={(e) => onConfigChange('trade_types', e.target.value)}
        margin="normal"
        size="small"
        helperText="e.g. intraday_buy,swing_buy"
      />
      <TextField
        fullWidth
        label="Min score"
        type="number"
        value={config.min_score}
        onChange={(e) => onConfigChange('min_score', Number(e.target.value))}
        margin="normal"
        size="small"
      />
      <TextField
        fullWidth
        label="Slippage (basis points)"
        type="number"
        value={config.slippage_bps}
        onChange={(e) => onConfigChange('slippage_bps', Number(e.target.value))}
        margin="normal"
        size="small"
      />
      <FormControlLabel
        control={
          <Switch
            checked={config.enable_costs}
            onChange={(e) => onConfigChange('enable_costs', e.target.checked)}
          />
        }
        label="Enable costs"
      />
      <FormControlLabel
        control={
          <Switch
            checked={config.enable_regime_filters}
            onChange={(e) => onConfigChange('enable_regime_filters', e.target.checked)}
          />
        }
        label="Enable regime filters"
      />

      <Box mt={2}>
        <Button
          fullWidth
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <PlayArrow />}
          onClick={onRunFull}
          disabled={loading}
        >
          {loading ? 'Running…' : 'Run full backtest'}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Quick backtest
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <TextField
            fullWidth
            size="small"
            label="Days"
            type="number"
            value={config.quick_days}
            onChange={(e) => onConfigChange('quick_days', Number(e.target.value))}
          />
        </Grid>
        <Grid item xs={8}>
          <TextField
            fullWidth
            size="small"
            label="Trade type"
            value={config.quick_trade_type}
            onChange={(e) => onConfigChange('quick_trade_type', e.target.value)}
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            size="small"
            label="Min score"
            type="number"
            value={config.quick_min_score}
            onChange={(e) => onConfigChange('quick_min_score', Number(e.target.value))}
          />
        </Grid>
      </Grid>
      <Box mt={1.5}>
        <Button fullWidth variant="outlined" startIcon={<Speed />} onClick={onQuick} disabled={loading}>
          Quick backtest
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Compare strategies
      </Typography>
      <TextField
        fullWidth
        size="small"
        label="Days"
        type="number"
        value={config.compare_days}
        onChange={(e) => onConfigChange('compare_days', Number(e.target.value))}
        margin="normal"
      />
      <TextField
        fullWidth
        size="small"
        label="Trade types (comma-separated)"
        value={config.compare_trade_types}
        onChange={(e) => onConfigChange('compare_trade_types', e.target.value)}
        margin="normal"
      />
      <TextField
        fullWidth
        size="small"
        label="Score thresholds (comma-separated)"
        value={config.compare_score_thresholds}
        onChange={(e) => onConfigChange('compare_score_thresholds', e.target.value)}
        margin="normal"
      />
      <Box mt={1.5}>
        <Button fullWidth variant="outlined" startIcon={<CompareArrows />} onClick={onCompare} disabled={loading}>
          Compare strategies
        </Button>
      </Box>
    </CardContent>
  </Card>
);

export default BacktestForm;
