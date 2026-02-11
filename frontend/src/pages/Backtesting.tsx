import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  FormControlLabel,
  Switch
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  ExpandMore
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BacktestConfig {
  start_date: string;
  end_date: string;
  initial_capital: number;
  risk_per_trade: number;
  strategy_type: string;
  symbols: string[];
  atr_multiplier_sl: number;
  atr_multiplier_tp: number;
  max_positions: number;
  include_slippage: boolean;
  include_commission: boolean;
}

interface BacktestResult {
  id: string;
  status: 'running' | 'completed' | 'failed';
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_pnl: number;
  max_drawdown: number;
  sharpe_ratio: number;
  profit_factor: number;
  avg_trade_duration: number;
  equity_curve: Array<{date: string, equity: number}>;
  trades: Array<{
    symbol: string;
    entry_date: string;
    exit_date: string;
    entry_price: number;
    exit_price: number;
    quantity: number;
    pnl: number;
    pnl_pct: number;
    signal_type: string;
    exit_reason: string;
  }>;
}

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
        headers: {
          'Content-Type': 'application/json'
        },
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
      await fetch(`/api/backtesting/stop/${currentBacktest}`, {
        method: 'POST'
      });
      setCurrentBacktest(null);
      fetchBacktestResults();
    } catch (err) {
      setError('Failed to stop backtest');
    }
  };

  useEffect(() => {
    fetchBacktestResults();
    const interval = setInterval(fetchBacktestResults, 5000); // Poll for updates
    return () => clearInterval(interval);
  }, []);

  const handleConfigChange = (field: keyof BacktestConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'warning';
      case 'completed': return 'success';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Backtesting
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Configuration Panel */}
        <Grid item xs={12} md={4}>
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
                onChange={(e) => handleConfigChange('start_date', e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="End Date"
                type="date"
                value={config.end_date}
                onChange={(e) => handleConfigChange('end_date', e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                label="Initial Capital"
                type="number"
                value={config.initial_capital}
                onChange={(e) => handleConfigChange('initial_capital', Number(e.target.value))}
                margin="normal"
              />

              <TextField
                fullWidth
                label="Risk Per Trade (%)"
                type="number"
                value={config.risk_per_trade}
                onChange={(e) => handleConfigChange('risk_per_trade', Number(e.target.value))}
                margin="normal"
              />

              <FormControl fullWidth margin="normal">
                <InputLabel>Strategy Type</InputLabel>
                <Select
                  value={config.strategy_type}
                  onChange={(e) => handleConfigChange('strategy_type', e.target.value)}
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
                onChange={(e) => handleConfigChange('symbols', e.target.value.split(',').map(s => s.trim()))}
                margin="normal"
                helperText="Enter stock symbols separated by commas"
              />

              <Typography gutterBottom>
                ATR Multiplier (Stop Loss): {config.atr_multiplier_sl}
              </Typography>
              <Slider
                value={config.atr_multiplier_sl}
                onChange={(_, value) => handleConfigChange('atr_multiplier_sl', value)}
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
                onChange={(_, value) => handleConfigChange('atr_multiplier_tp', value)}
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
                onChange={(e) => handleConfigChange('max_positions', Number(e.target.value))}
                margin="normal"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={config.include_slippage}
                    onChange={(e) => handleConfigChange('include_slippage', e.target.checked)}
                  />
                }
                label="Include Slippage"
              />

              <FormControlLabel
                control={
                  <Switch
                    checked={config.include_commission}
                    onChange={(e) => handleConfigChange('include_commission', e.target.checked)}
                  />
                }
                label="Include Commission"
              />

              <Box mt={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <PlayArrow />}
                  onClick={startBacktest}
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
                    onClick={stopBacktest}
                  >
                    Stop Backtest
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Results Panel */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Backtest Results
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchBacktestResults}
                >
                  Refresh
                </Button>
              </Box>

              {results.map((result) => (
                <Accordion key={result.id} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <Typography variant="subtitle1">
                        Backtest {result.id} - {new Date(result.id).toLocaleDateString()}
                      </Typography>
                      <Chip
                        label={result.status.toUpperCase()}
                        color={getStatusColor(result.status)}
                        size="small"
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {result.status === 'completed' && (
                      <Grid container spacing={2}>
                        {/* Performance Metrics */}
                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom>
                            Performance Metrics
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6} sm={3}>
                              <Card variant="outlined">
                                <CardContent>
                                  <Typography color="textSecondary" variant="body2">
                                    Total Trades
                                  </Typography>
                                  <Typography variant="h6">
                                    {result.total_trades}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Card variant="outlined">
                                <CardContent>
                                  <Typography color="textSecondary" variant="body2">
                                    Win Rate
                                  </Typography>
                                  <Typography variant="h6">
                                    {result.win_rate.toFixed(1)}%
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Card variant="outlined">
                                <CardContent>
                                  <Typography color="textSecondary" variant="body2">
                                    Total P&L
                                  </Typography>
                                  <Typography 
                                    variant="h6"
                                    color={result.total_pnl > 0 ? 'success.main' : 'error.main'}
                                  >
                                    {formatCurrency(result.total_pnl)}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                            <Grid item xs={6} sm={3}>
                              <Card variant="outlined">
                                <CardContent>
                                  <Typography color="textSecondary" variant="body2">
                                    Sharpe Ratio
                                  </Typography>
                                  <Typography variant="h6">
                                    {result.sharpe_ratio.toFixed(2)}
                                  </Typography>
                                </CardContent>
                              </Card>
                            </Grid>
                          </Grid>
                        </Grid>

                        {/* Equity Curve Chart */}
                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom>
                            Equity Curve
                          </Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={result.equity_curve}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="equity" 
                                stroke="#8884d8" 
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </Grid>

                        {/* Trade Details */}
                        <Grid item xs={12}>
                          <Typography variant="h6" gutterBottom>
                            Trade Details
                          </Typography>
                          <TableContainer component={Paper}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Symbol</TableCell>
                                  <TableCell>Entry Date</TableCell>
                                  <TableCell>Exit Date</TableCell>
                                  <TableCell>Entry Price</TableCell>
                                  <TableCell>Exit Price</TableCell>
                                  <TableCell>Quantity</TableCell>
                                  <TableCell>P&L</TableCell>
                                  <TableCell>Signal Type</TableCell>
                                  <TableCell>Exit Reason</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {result.trades.map((trade, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{trade.symbol}</TableCell>
                                    <TableCell>{new Date(trade.entry_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{new Date(trade.exit_date).toLocaleDateString()}</TableCell>
                                    <TableCell>₹{trade.entry_price}</TableCell>
                                    <TableCell>₹{trade.exit_price}</TableCell>
                                    <TableCell>{trade.quantity}</TableCell>
                                    <TableCell>
                                      <Typography
                                        color={trade.pnl > 0 ? 'success.main' : 'error.main'}
                                        variant="body2"
                                      >
                                        {formatCurrency(trade.pnl)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell>
                                      <Chip label={trade.signal_type} size="small" />
                                    </TableCell>
                                    <TableCell>{trade.exit_reason}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Grid>
                      </Grid>
                    )}

                    {result.status === 'running' && (
                      <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                      </Box>
                    )}

                    {result.status === 'failed' && (
                      <Alert severity="error">
                        Backtest failed to complete
                      </Alert>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}

              {results.length === 0 && (
                <Box textAlign="center" p={3}>
                  <Typography color="textSecondary">
                    No backtest results available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Backtesting; 