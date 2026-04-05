import React, { useCallback, useState } from 'react';
import { Box, Typography, Grid, Alert } from '@mui/material';
import BacktestForm from '../components/backtesting/BacktestForm';
import BacktestResults from '../components/backtesting/BacktestResults';
import type { BacktestConfig, BacktestRunEntry } from '../components/backtesting/types';
import seedBacktestingService from '../services/SeedBacktestingService';

function newEntry(title: string, data: unknown): BacktestRunEntry {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return { id, title, createdAt: new Date().toISOString(), data };
}

const defaultConfig: BacktestConfig = {
  start_date: '2024-01-01',
  end_date: '2024-12-31',
  initial_capital: 1_000_000,
  mode: 'realistic',
  max_positions: 20,
  trade_types: 'intraday_buy,swing_buy',
  min_score: 60,
  slippage_bps: 10,
  enable_costs: true,
  enable_regime_filters: true,
  quick_days: 30,
  quick_trade_type: 'intraday_buy',
  quick_min_score: 60,
  compare_days: 90,
  compare_trade_types: 'intraday_buy,swing_buy',
  compare_score_thresholds: '60,70,80',
};

const Backtesting: React.FC = () => {
  const [config, setConfig] = useState<BacktestConfig>(defaultConfig);
  const [results, setResults] = useState<BacktestRunEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pushResult = useCallback((title: string, data: unknown) => {
    setResults((prev) => [newEntry(title, data), ...prev]);
  }, []);

  const runFull = async () => {
    setLoading(true);
    setError(null);
    try {
      const tradeTypes = config.trade_types
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const data = await seedBacktestingService.runBacktest({
        start_date: config.start_date,
        end_date: config.end_date,
        initial_capital: config.initial_capital,
        mode: config.mode,
        max_positions: config.max_positions,
        trade_types: tradeTypes.length ? tradeTypes : ['intraday_buy', 'swing_buy'],
        min_score: config.min_score,
        slippage_bps: config.slippage_bps,
        enable_costs: config.enable_costs,
        enable_regime_filters: config.enable_regime_filters,
      });
      pushResult('POST /api/v2/backtesting/run', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Full backtest failed');
    } finally {
      setLoading(false);
    }
  };

  const runQuick = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await seedBacktestingService.quickBacktest(config.quick_days, {
        trade_type: config.quick_trade_type,
        min_score: config.quick_min_score,
      });
      pushResult(`GET /api/v2/backtesting/quick/${config.quick_days}`, data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Quick backtest failed');
    } finally {
      setLoading(false);
    }
  };

  const runCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await seedBacktestingService.compareStrategies({
        days: config.compare_days,
        trade_types: config.compare_trade_types,
        score_thresholds: config.compare_score_thresholds,
      });
      pushResult('GET /api/v2/backtesting/compare-strategies', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compare strategies failed');
    } finally {
      setLoading(false);
    }
  };

  const handleConfigChange = (field: keyof BacktestConfig, value: unknown) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Backtesting
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <BacktestForm
            config={config}
            onConfigChange={handleConfigChange}
            loading={loading}
            onRunFull={runFull}
            onQuick={runQuick}
            onCompare={runCompare}
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <BacktestResults results={results} onRefresh={() => setResults([])} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Backtesting;
