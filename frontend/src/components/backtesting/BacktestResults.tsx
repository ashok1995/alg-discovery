import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import { Refresh, ExpandMore } from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getStatusColor } from '../../utils/statusHelpers';
import type { BacktestResult } from './types';

interface BacktestResultsProps {
  results: BacktestResult[];
  onRefresh: () => void;
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR'
  }).format(amount);
};

const BacktestResults: React.FC<BacktestResultsProps> = ({ results, onRefresh }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Backtest Results</Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={onRefresh}>
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
                          <Typography variant="h6">{result.total_trades}</Typography>
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
                            color={
                              result.total_pnl > 0 ? 'success.main' : 'error.main'
                            }
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
                            <TableCell>
                              {new Date(trade.entry_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {new Date(trade.exit_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>₹{trade.entry_price}</TableCell>
                            <TableCell>₹{trade.exit_price}</TableCell>
                            <TableCell>{trade.quantity}</TableCell>
                            <TableCell>
                              <Typography
                                color={
                                  trade.pnl > 0 ? 'success.main' : 'error.main'
                                }
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
              <Alert severity="error">Backtest failed to complete</Alert>
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
);

export default BacktestResults;
