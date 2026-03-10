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
  Slider,
  FormControlLabel,
  Switch,
  CircularProgress
} from '@mui/material';
import { PlayArrow, Stop } from '@mui/icons-material';
import type { BacktestConfig } from './types';

interface BacktestFormProps {
  config: BacktestConfig;
  onConfigChange: (field: keyof BacktestConfig, value: unknown) => void;
  loading: boolean;
  currentBacktest: string | null;
  onStart: () => void;
  onStop: () => void;
}

const BacktestForm: React.FC<BacktestFormProps> = ({
  config,
  onConfigChange,
  loading,
  currentBacktest,
  onStart,
  onStop
}) => (
  <Card>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        Backtest Configuration
      </Typography>

      <TextField
        fullWidth
        label="Start Date"
        type="date"
        value={config.start_date}
        onChange={(e) => onConfigChange('start_date', e.target.value)}
        margin="normal"
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        fullWidth
        label="End Date"
        type="date"
        value={config.end_date}
        onChange={(e) => onConfigChange('end_date', e.target.value)}
        margin="normal"
        InputLabelProps={{ shrink: true }}
      />

      <TextField
        fullWidth
        label="Initial Capital"
        type="number"
        value={config.initial_capital}
        onChange={(e) => onConfigChange('initial_capital', Number(e.target.value))}
        margin="normal"
      />

      <TextField
        fullWidth
        label="Risk Per Trade (%)"
        type="number"
        value={config.risk_per_trade}
        onChange={(e) => onConfigChange('risk_per_trade', Number(e.target.value))}
        margin="normal"
      />

      <FormControl fullWidth margin="normal">
        <InputLabel>Strategy Type</InputLabel>
        <Select
          value={config.strategy_type}
          onChange={(e) => onConfigChange('strategy_type', e.target.value)}
        >
          <MenuItem value="breakout">Breakout</MenuItem>
          <MenuItem value="pullback">Pullback</MenuItem>
          <MenuItem value="range_shift">Range Shift</MenuItem>
          <MenuItem value="momentum">Momentum</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label="Symbols (comma-separated)"
        value={config.symbols.join(', ')}
        onChange={(e) =>
          onConfigChange(
            'symbols',
            e.target.value.split(',').map((s) => s.trim())
          )
        }
        margin="normal"
        helperText="Enter stock symbols separated by commas"
      />

      <Typography gutterBottom>
        ATR Multiplier (Stop Loss): {config.atr_multiplier_sl}
      </Typography>
      <Slider
        value={config.atr_multiplier_sl}
        onChange={(_, value) => onConfigChange('atr_multiplier_sl', value)}
        min={0.5}
        max={3}
        step={0.1}
        marks
        valueLabelDisplay="auto"
      />

      <Typography gutterBottom>
        ATR Multiplier (Target): {config.atr_multiplier_tp}
      </Typography>
      <Slider
        value={config.atr_multiplier_tp}
        onChange={(_, value) => onConfigChange('atr_multiplier_tp', value)}
        min={1}
        max={5}
        step={0.1}
        marks
        valueLabelDisplay="auto"
      />

      <TextField
        fullWidth
        label="Max Positions"
        type="number"
        value={config.max_positions}
        onChange={(e) => onConfigChange('max_positions', Number(e.target.value))}
        margin="normal"
      />

      <FormControlLabel
        control={
          <Switch
            checked={config.include_slippage}
            onChange={(e) => onConfigChange('include_slippage', e.target.checked)}
          />
        }
        label="Include Slippage"
      />

      <FormControlLabel
        control={
          <Switch
            checked={config.include_commission}
            onChange={(e) =>
              onConfigChange('include_commission', e.target.checked)
            }
          />
        }
        label="Include Commission"
      />

      <Box mt={2}>
        <Button
          fullWidth
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
          onClick={onStart}
          disabled={loading || !!currentBacktest}
        >
          {loading ? 'Starting...' : 'Start Backtest'}
        </Button>
      </Box>

      {currentBacktest && (
        <Box mt={1}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<Stop />}
            onClick={onStop}
          >
            Stop Backtest
          </Button>
        </Box>
      )}
    </CardContent>
  </Card>
);

export default BacktestForm;
