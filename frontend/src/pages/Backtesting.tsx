import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Alert } from '@mui/material';
import BacktestForm from '../components/backtesting/BacktestForm';
import BacktestResults from '../components/backtesting/BacktestResults';
import type { BacktestConfig, BacktestResult } from '../components/backtesting/types';

const Backtesting: React.FC = () => {
  const [config, setConfig] = useState<BacktestConfig>({
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    initial_capital: 100000,
    risk_per_trade: 2,
    strategy_type: 'breakout',
    symbols: ['RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK'],
    atr_multiplier_sl: 1.5,
    atr_multiplier_tp: 3.0,
    max_positions: 5,
    include_slippage: true,
    include_commission: true
  });

  const [results, setResults] = useState<BacktestResult[]>([]);
  const [currentBacktest, setCurrentBacktest] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBacktestResults = async () => {
    try {
      const response = await fetch('/api/backtesting/results');
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError('Failed to fetch backtest results');
    }
  };

  const startBacktest = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/backtesting/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (response.ok) {
        const result = await response.json();
        setCurrentBacktest(result.id);
        fetchBacktestResults();
      } else {
        setError('Failed to start backtest');
      }
    } catch (err) {
      setError('Failed to start backtest');
    } finally {
      setLoading(false);
    }
  };

  const stopBacktest = async () => {
    if (!currentBacktest) return;
    try {
      await fetch(`/api/backtesting/stop/${currentBacktest}`, { method: 'POST' });
      setCurrentBacktest(null);
      fetchBacktestResults();
    } catch (err) {
      setError('Failed to stop backtest');
    }
  };

  useEffect(() => {
    fetchBacktestResults();
    const interval = setInterval(fetchBacktestResults, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConfigChange = (field: keyof BacktestConfig, value: unknown) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Backtesting</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <BacktestForm
            config={config}
            onConfigChange={handleConfigChange}
            loading={loading}
            currentBacktest={currentBacktest}
            onStart={startBacktest}
            onStop={stopBacktest}
          />
        </Grid>
        <Grid item xs={12} md={8}>
          <BacktestResults results={results} onRefresh={fetchBacktestResults} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Backtesting;
