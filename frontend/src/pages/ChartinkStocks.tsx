import React, { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  Search,
  OpenInNew,
  CheckCircle,
  Error as ErrorIcon,
  Settings,
} from '@mui/icons-material';
import { useChartinkAuth } from '../hooks/useChartinkAuth';

interface StockRecord {
  symbol: string;
  [key: string]: any; // For dynamic columns like dailyclose, dailyvolume, etc.
}

interface QueryResult {
  success: boolean;
  result?: {
    dataframe: {
      columns: string[];
      records: StockRecord[];
      row_count: number;
    };
  };
  error?: string;
}

// Use proxy path for CORS compatibility
// Proxy rewrites /api/chartink-query to /api/v1, so we just need /execute
const CHARTINK_SERVICE_URL = '/api/chartink-query';

// Predefined query templates
const QUERY_TEMPLATES = {
  'price_above_100': {
    name: 'Stocks Above ₹100',
    query: 'select symbol, Daily Close WHERE({cash} Daily Close > 100)',
    description: 'Get stocks with price above ₹100'
  },
  'price_above_500': {
    name: 'Stocks Above ₹500',
    query: 'select symbol, Daily Close WHERE({cash} Daily Close > 500)',
    description: 'Get stocks with price above ₹500'
  },
  'price_above_1000': {
    name: 'Stocks Above ₹1000',
    query: 'select symbol, Daily Close WHERE({cash} Daily Close > 1000)',
    description: 'Get stocks with price above ₹1000'
  },
  'high_volume': {
    name: 'High Volume Stocks',
    query: 'select symbol, Daily Close, Daily Volume WHERE({cash} close > 100 and volume > 200000)',
    description: 'Get stocks with high trading volume'
  },
  'custom': {
    name: 'Custom Query',
    query: '',
    description: 'Enter your own Chartink query'
  }
};

const ChartinkStocks: React.FC = () => {
  const { sessionStatus, loading: statusLoading, refreshStatus, isAuthenticated } = useChartinkAuth(2 * 60 * 1000);
  const [loading, setLoading] = useState(false);
  const [stocks, setStocks] = useState<StockRecord[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('price_above_100');
  const [customQuery, setCustomQuery] = useState(QUERY_TEMPLATES['price_above_100'].query);
  const [maxResults, setMaxResults] = useState(20);
  const [currentQuery, setCurrentQuery] = useState('');

  // Execute query
  const executeQuery = async (query: string) => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setLoading(true);
    setError(null);
    setStocks([]);
    setColumns([]);
    setCurrentQuery(query);

    try {
      // Proxy rewrites /api/chartink-query to /api/v1, so we use /execute directly
      const response = await fetch(`${CHARTINK_SERVICE_URL}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
          max_results: maxResults
        }),
      });

      const data: QueryResult = await response.json();

      console.log('📦 Response data:', data);
      console.log('📦 Success:', data.success);
      console.log('📦 Dataframe exists:', !!data.result?.dataframe);
      
      if (data.success && data.result?.dataframe) {
        const df = data.result.dataframe;
        const records = df.records || [];
        const cols = df.columns || [];
        
        console.log('📊 Stocks found:', records.length);
        console.log('📊 Columns:', cols);
        console.log('📊 First record:', records[0]);
        
        setStocks(records);
        setColumns(cols);
        if (records.length === 0) {
          setError('Query executed successfully but returned no stocks');
        }
      } else {
        console.error('❌ Unexpected response:', data);
        setError(data.error || 'Failed to execute query');
      }
    } catch (err: any) {
      console.error('❌ Query execution error:', err);
      setError(`Network error: ${err.message}. Check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  // Handle template selection
  const handleTemplateChange = (template: string) => {
    setSelectedTemplate(template);
    if (template !== 'custom') {
      const templateQuery = QUERY_TEMPLATES[template as keyof typeof QUERY_TEMPLATES];
      setCustomQuery(templateQuery.query);
    } else {
      setCustomQuery('');
    }
  };

  // Execute selected template or custom query
  const handleExecute = () => {
    const query = selectedTemplate === 'custom' ? customQuery : QUERY_TEMPLATES[selectedTemplate as keyof typeof QUERY_TEMPLATES].query;
    executeQuery(query);
  };

  // Format column name for display
  const formatColumnName = (col: string): string => {
    return col
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  // Format value for display
  const formatValue = (value: any, column: string): string => {
    if (value === null || value === undefined) return '-';
    
    // Format numbers
    if (typeof value === 'number') {
      if (column.toLowerCase().includes('volume')) {
        return value.toLocaleString('en-IN');
      }
      if (column.toLowerCase().includes('close') || column.toLowerCase().includes('price')) {
        return `₹${value.toFixed(2)}`;
      }
      return value.toFixed(2);
    }
    
    return String(value);
  };

  // Get Chartink chart URL
  const getChartUrl = (symbol: string): string => {
    return `https://chartink.com/stocks-new?symbol=${symbol.toUpperCase()}`;
  };

  // Auto-execute query on component mount
  useEffect(() => {
    const initialQuery = QUERY_TEMPLATES['price_above_100'].query;
    // Only execute if we don't have stocks already (prevents re-execution on re-render)
    if (stocks.length === 0 && !loading) {
      executeQuery(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array means this runs once on mount

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            📊 Chartink Stock Query
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Query Chartink and display stocks in real-time
          </Typography>
        </Box>

        {/* Chartink Query Status (session-status) */}
        <Alert
          severity={isAuthenticated ? 'success' : 'warning'}
          sx={{ mb: 3 }}
          action={
            <Stack direction="row" spacing={1} alignItems="center">
              <IconButton size="small" onClick={refreshStatus} disabled={statusLoading} title="Refresh status">
                <Refresh fontSize="small" />
              </IconButton>
              {!isAuthenticated && (
                <Button size="small" color="inherit" component={RouterLink} to="/settings" startIcon={<Settings />}>
                  Configure Auth
                </Button>
              )}
            </Stack>
          }
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {statusLoading ? (
              <CircularProgress size={16} />
            ) : isAuthenticated ? (
              <Chip icon={<CheckCircle />} label="Ready" color="success" size="small" />
            ) : (
              <Chip icon={<ErrorIcon />} label="Not authenticated" color="warning" size="small" />
            )}
            {sessionStatus?.query_verified !== undefined && (
              <Chip label={`Query verified: ${sessionStatus.query_row_count ?? 0} rows`} size="small" variant="outlined" />
            )}
            {sessionStatus?.last_authenticated_at && (
              <Typography variant="caption" color="text.secondary">
                Last auth: {new Date(sessionStatus.last_authenticated_at).toLocaleString()}
              </Typography>
            )}
          </Stack>
        </Alert>

        {/* Query Builder */}
        <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
          <Stack spacing={3}>
            <FormControl fullWidth>
              <InputLabel>Query Template</InputLabel>
              <Select
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                label="Query Template"
              >
                {Object.entries(QUERY_TEMPLATES).map(([key, template]) => (
                  <MenuItem key={key} value={key}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Chartink Query"
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              placeholder="select symbol, Daily Close WHERE({cash} Daily Close > 100)"
              disabled={selectedTemplate !== 'custom'}
              helperText={selectedTemplate !== 'custom' ? QUERY_TEMPLATES[selectedTemplate as keyof typeof QUERY_TEMPLATES].description : 'Enter your Chartink query'}
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                type="number"
                label="Max Results"
                value={maxResults}
                onChange={(e) => setMaxResults(parseInt(e.target.value) || 20)}
                sx={{ width: 150 }}
                inputProps={{ min: 1, max: 100 }}
              />
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <Search />}
                onClick={handleExecute}
                disabled={loading}
                sx={{ flexGrow: 1 }}
              >
                {loading ? 'Executing...' : 'Execute Query'}
              </Button>
              {stocks.length > 0 && (
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => executeQuery(currentQuery)}
                  disabled={loading}
                >
                  Refresh
                </Button>
              )}
            </Box>
          </Stack>
        </Paper>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Results Display */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && stocks.length > 0 && (
          <Paper variant="outlined">
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6">
                Results: {stocks.length} stocks found
              </Typography>
              {currentQuery && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Query: {currentQuery}
                </Typography>
              )}
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {columns.map((col) => (
                      <TableCell key={col} sx={{ fontWeight: 'bold' }}>
                        {formatColumnName(col)}
                      </TableCell>
                    ))}
                    <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stocks.map((stock, index) => (
                    <TableRow key={`${stock.symbol}-${index}`} hover>
                      {columns.map((col) => (
                        <TableCell key={col}>
                          {formatValue(stock[col], col)}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Tooltip title="View on Chartink">
                          <IconButton
                            size="small"
                            href={getChartUrl(stock.symbol)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <OpenInNew fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {!loading && stocks.length === 0 && !error && (
          <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" color="text.secondary">
              No stocks to display. Execute a query to see results.
            </Typography>
          </Paper>
        )}
      </Paper>
    </Container>
  );
};

export default ChartinkStocks;
