import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Visibility,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import MarketDataDisplay from '../components/MarketDataDisplay';

interface SystemStatus {
  entry_engine: boolean;
  exit_monitor: boolean;
  market_data_collector: boolean;
  ltr_training: boolean;
  chartink_filter: boolean;
}

interface DashboardMetrics {
  active_positions: number;
  total_pnl: number;
  win_rate: number;
  total_trades: number;
  recent_signals: number;
  market_sentiment: string;
}

interface Position {
  symbol: string;
  entry_price: number;
  quantity: number;
  stop_loss: number;
  target_price: number;
  current_pnl: number;
  signal_type: string;
  entry_time: string;
}

interface EntrySignal {
  symbol: string;
  entry_price: number;
  signal_type: string;
  atr: number;
  timestamp: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [signals, setSignals] = useState<EntrySignal[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch system status
      const statusResponse = await fetch('/api/system/status');
      const statusData = await statusResponse.json();
      setSystemStatus(statusData);

      // Fetch trading metrics
      const metricsResponse = await fetch('/api/trading/performance');
      const metricsData = await metricsResponse.json();
      setMetrics({
        active_positions: metricsData.active_positions || 0,
        total_pnl: metricsData.total_pnl || 0,
        win_rate: metricsData.win_rate || 0,
        total_trades: metricsData.total_trades || 0,
        recent_signals: metricsData.recent_signals || 0,
        market_sentiment: metricsData.market_sentiment || 'neutral'
      });

      // Fetch active positions
      const positionsResponse = await fetch('/api/trading/positions');
      const positionsData = await positionsResponse.json();
      setPositions(positionsData);

      // Fetch recent entry signals
      const signalsResponse = await fetch('/api/trading/entries?limit=5');
      const signalsData = await signalsResponse.json();
      setSignals(signalsData);

    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSystemComponent = async (component: string, action: 'start' | 'stop') => {
    try {
      const response = await fetch(`/api/system/${component}/${action}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchDashboardData(); // Refresh data
      } else {
        setError(`Failed to ${action} ${component}`);
      }
    } catch (err) {
      setError(`Failed to ${action} ${component}`);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: boolean) => {
    return status ? <CheckCircle color="success" /> : <Error color="error" />;
  };

  const getStatusColor = (status: boolean) => {
    return status ? 'success' : 'error';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment.toLowerCase()) {
      case 'bullish': return 'success';
      case 'bearish': return 'error';
      case 'neutral': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Trading System Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* System Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Status
          </Typography>
          <Grid container spacing={2}>
            {systemStatus && Object.entries(systemStatus).map(([component, status]) => (
              <Grid item xs={12} sm={6} md={4} key={component}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center">
                    {getStatusIcon(status)}
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      {component.replace(/_/g, ' ').toUpperCase()}
                    </Typography>
                  </Box>
                  <Box>
                    <Tooltip title={`${status ? 'Stop' : 'Start'} ${component}`}>
                      <IconButton
                        size="small"
                        onClick={() => toggleSystemComponent(component, status ? 'stop' : 'start')}
                        color={getStatusColor(status)}
                      >
                        {status ? <Stop /> : <PlayArrow />}
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Positions
              </Typography>
              <Typography variant="h4">
                {metrics?.active_positions || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total P&L
              </Typography>
              <Typography variant="h4" color={metrics?.total_pnl && metrics.total_pnl > 0 ? 'success.main' : 'error.main'}>
                ₹{metrics?.total_pnl?.toFixed(2) || '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Win Rate
              </Typography>
              <Typography variant="h4">
                {metrics?.win_rate?.toFixed(1) || '0.0'}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Market Sentiment
              </Typography>
              <Chip
                label={metrics?.market_sentiment?.toUpperCase() || 'NEUTRAL'}
                color={getSentimentColor(metrics?.market_sentiment || 'neutral')}
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Positions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Active Positions
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/positions')}
              startIcon={<Visibility />}
            >
              View All
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Entry Price</TableCell>
                  <TableCell>Quantity</TableCell>
                  <TableCell>Stop Loss</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>P&L</TableCell>
                  <TableCell>Signal Type</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {positions.slice(0, 5).map((position) => (
                  <TableRow key={position.symbol}>
                    <TableCell>{position.symbol}</TableCell>
                    <TableCell>₹{position.entry_price}</TableCell>
                    <TableCell>{position.quantity}</TableCell>
                    <TableCell>₹{position.stop_loss}</TableCell>
                    <TableCell>₹{position.target_price}</TableCell>
                    <TableCell>
                      <Typography
                        color={position.current_pnl > 0 ? 'success.main' : 'error.main'}
                        variant="body2"
                      >
                        ₹{position.current_pnl.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={position.signal_type} size="small" />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/positions/${position.symbol}`)}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {positions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No active positions
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Recent Entry Signals */}
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">
              Recent Entry Signals
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => navigate('/signals')}
              startIcon={<Visibility />}
            >
              View All
            </Button>
          </Box>
          
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Entry Price</TableCell>
                  <TableCell>ATR</TableCell>
                  <TableCell>Signal Type</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {signals.map((signal) => (
                  <TableRow key={`${signal.symbol}-${signal.timestamp}`}>
                    <TableCell>{signal.symbol}</TableCell>
                    <TableCell>₹{signal.entry_price}</TableCell>
                    <TableCell>{signal.atr.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip label={signal.signal_type} size="small" />
                    </TableCell>
                    <TableCell>
                      {new Date(signal.timestamp).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                {signals.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No recent signals
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Market Data Display */}
      <Box sx={{ mt: 3 }}>
        <MarketDataDisplay
          symbols={['RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK']}
          showTopGainersLosers={true}
          showMarketBreadth={true}
          autoRefresh={true}
          refreshInterval={60000}
        />
      </Box>
    </Box>
  );
};

export default Dashboard; 