import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  Snackbar
} from '@mui/material';
import {
  Search,
  Refresh,
  Sync,
  Edit,
  Add,
  TrendingUp,
  ShowChart,
  Assessment,
  Storage,
  CheckCircle,
  Dashboard,
  TableChart,
  Settings
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import stockMappingService, { 
  StockMapping, 
  SearchRequest,
  SyncResponse 
} from '../services/stockMappingService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`stock-mapping-tabpanel-${index}`}
      aria-labelledby={`stock-mapping-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const StockMappingManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    sector: '',
    marketCap: '',
    instrumentType: '',
    exchange: '',
    isActive: 'all',
    isIndex: 'all',
    isPopular: 'all'
  });
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<StockMapping | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const queryClient = useQueryClient();

  // Queries
  const {
    data: statistics,
    isLoading: statsLoading,
    error: statsError
  } = useQuery('stockMappingStats', stockMappingService.getStatistics, {
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000 // Consider data stale after 10 seconds
  });

  const {
    data: stockMappings = [],
    isLoading: mappingsLoading,
    error: mappingsError
  } = useQuery(
    ['stockMappings', searchQuery, filters],
    async () => {
      if (searchQuery.trim()) {
        const request: SearchRequest = {
          query: searchQuery,
          limit: 100,
          include_indexes: true
        };
        return await stockMappingService.searchStockMappings(request);
      } else {
        // Get popular stocks as default
        return await stockMappingService.getPopularStocks(100);
      }
    },
    {
      enabled: !!searchQuery.trim() || tabValue === 1, // Only fetch when there's a search query or on mappings tab
      refetchInterval: 60000, // Refetch every minute
      staleTime: 30000 // Consider data stale after 30 seconds
    }
  );

  // Mutations
  const syncMutation = useMutation(stockMappingService.syncWithZerodhaFiles, {
    onSuccess: (data: SyncResponse) => {
      setSnackbar({
        open: true,
        message: data.message || 'Sync completed successfully',
        severity: 'success'
      });
      queryClient.invalidateQueries('stockMappingStats');
      queryClient.invalidateQueries('stockMappings');
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Sync failed';
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  });

  const handleSync = async () => {
    syncMutation.mutate();
    setSyncDialogOpen(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const filteredMappings = stockMappings.filter(mapping => {
    const matchesSector = !filters.sector || mapping.sector === filters.sector;
    const matchesMarketCap = !filters.marketCap || mapping.market_cap_category === filters.marketCap;
    const matchesInstrumentType = !filters.instrumentType || mapping.instrument_type === filters.instrumentType;
    const matchesExchange = !filters.exchange || mapping.exchange === filters.exchange;
    const matchesActive = filters.isActive === 'all' || 
                         (filters.isActive === 'active' && mapping.is_active) ||
                         (filters.isActive === 'inactive' && !mapping.is_active);
    const matchesIndex = filters.isIndex === 'all' ||
                        (filters.isIndex === 'index' && mapping.is_index) ||
                        (filters.isIndex === 'stock' && !mapping.is_index);
    const matchesPopular = filters.isPopular === 'all' ||
                          (filters.isPopular === 'popular' && mapping.is_popular) ||
                          (filters.isPopular === 'not_popular' && !mapping.is_popular);

    return matchesSector && matchesMarketCap && matchesInstrumentType && 
           matchesExchange && matchesActive && matchesIndex && matchesPopular;
  });

  const getStatusColor = (isActive: boolean) => isActive ? 'success' : 'error';
  const getMarketCapColor = (category?: string) => {
    switch (category) {
      case 'large_cap': return 'success';
      case 'mid_cap': return 'warning';
      case 'small_cap': return 'info';
      case 'micro_cap': return 'default';
      default: return 'default';
    }
  };

  const getInstrumentTypeColor = (type: string) => {
    switch (type) {
      case 'EQ': return 'primary';
      case 'IND': return 'secondary';
      case 'FUT': return 'warning';
      case 'OPT': return 'error';
      case 'ETF': return 'info';
      default: return 'default';
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <div style={{ padding: '24px' }}>
      <>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Storage />
            Stock Mapping Manager
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<Sync />}
              onClick={() => setSyncDialogOpen(true)}
              disabled={syncMutation.isLoading}
            >
              Sync Data
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setEditDialogOpen(true)}
            >
              Add Mapping
            </Button>
          </Box>
        </Box>

        {/* Error Alerts */}
        {statsError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load statistics: {statsError instanceof Error ? statsError.message : 'Unknown error'}
          </Alert>
        )}

        {mappingsError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load mappings: {mappingsError instanceof Error ? mappingsError.message : 'Unknown error'}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Total Mappings
                    </Typography>
                    <Typography variant="h4">
                      {statsLoading ? <CircularProgress size={24} /> : statistics?.total_mappings || 0}
                    </Typography>
                  </Box>
                  <Storage color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Active Mappings
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {statsLoading ? <CircularProgress size={24} /> : statistics?.active_mappings || 0}
                    </Typography>
                  </Box>
                  <CheckCircle color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Indexes
                    </Typography>
                    <Typography variant="h4" color="secondary.main">
                      {statsLoading ? <CircularProgress size={24} /> : statistics?.indexes_count || 0}
                    </Typography>
                  </Box>
                  <ShowChart color="secondary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="textSecondary" gutterBottom>
                      Popular Stocks
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {statsLoading ? <CircularProgress size={24} /> : statistics?.popular_stocks_count || 0}
                    </Typography>
                  </Box>
                  <TrendingUp color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Main Content Tabs */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="stock mapping tabs">
              <Tab label="Overview" icon={<Dashboard />} iconPosition="start" />
              <Tab label="Mappings" icon={<TableChart />} iconPosition="start" />
              <Tab label="Statistics" icon={<Assessment />} iconPosition="start" />
              <Tab label="Settings" icon={<Settings />} iconPosition="start" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            {/* Overview Tab */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Instrument Type Distribution
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {statistics?.instrument_type_distribution && 
                        Object.entries(statistics.instrument_type_distribution).map(([type, count]) => (
                          <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography>{type}</Typography>
                            <Chip 
                              label={count} 
                              color={getInstrumentTypeColor(type) as any}
                              size="small"
                            />
                          </Box>
                        ))
                      }
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Sector Distribution
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {statistics?.sector_distribution && 
                        Object.entries(statistics.sector_distribution).slice(0, 5).map(([sector, count]) => (
                          <Box key={sector} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography sx={{ textTransform: 'capitalize' }}>{sector.replace('_', ' ')}</Typography>
                            <Chip label={count} size="small" />
                          </Box>
                        ))
                      }
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Recent Activity
                    </Typography>
                    <Typography color="textSecondary">
                      Last sync: {statistics?.last_updated ? new Date(statistics.last_updated).toLocaleString() : 'Never'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            {/* Mappings Tab */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    placeholder="Search symbols or company names..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={8}>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Sector</InputLabel>
                      <Select
                        value={filters.sector}
                        onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
                        label="Sector"
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="banking">Banking</MenuItem>
                        <MenuItem value="it">IT</MenuItem>
                        <MenuItem value="oil_gas">Oil & Gas</MenuItem>
                        <MenuItem value="pharma">Pharma</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Market Cap</InputLabel>
                      <Select
                        value={filters.marketCap}
                        onChange={(e) => setFilters({ ...filters, marketCap: e.target.value })}
                        label="Market Cap"
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="large_cap">Large Cap</MenuItem>
                        <MenuItem value="mid_cap">Mid Cap</MenuItem>
                        <MenuItem value="small_cap">Small Cap</MenuItem>
                      </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Type</InputLabel>
                      <Select
                        value={filters.instrumentType}
                        onChange={(e) => setFilters({ ...filters, instrumentType: e.target.value })}
                        label="Type"
                      >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="EQ">Equity</MenuItem>
                        <MenuItem value="IND">Index</MenuItem>
                        <MenuItem value="FUT">Future</MenuItem>
                        <MenuItem value="OPT">Option</MenuItem>
                      </Select>
                    </FormControl>
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={() => setFilters({
                        sector: '',
                        marketCap: '',
                        instrumentType: '',
                        exchange: '',
                        isActive: 'all',
                        isIndex: 'all',
                        isPopular: 'all'
                      })}
                    >
                      Clear
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Company Name</TableCell>
                    <TableCell>Kite Token</TableCell>
                    <TableCell>Exchange</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Sector</TableCell>
                    <TableCell>Market Cap</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mappingsLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : filteredMappings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No mappings found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMappings.map((mapping) => (
                      <TableRow key={mapping.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {mapping.symbol}
                            </Typography>
                            {mapping.is_popular && (
                              <Chip label="Popular" size="small" color="warning" />
                            )}
                            {mapping.is_index && (
                              <Chip label="Index" size="small" color="secondary" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{mapping.company_name}</TableCell>
                        <TableCell>{mapping.kite_token}</TableCell>
                        <TableCell>{mapping.exchange}</TableCell>
                        <TableCell>
                          <Chip 
                            label={mapping.instrument_type} 
                            size="small" 
                            color={getInstrumentTypeColor(mapping.instrument_type) as any}
                          />
                        </TableCell>
                        <TableCell>
                          {mapping.sector && (
                            <Chip 
                              label={mapping.sector.replace('_', ' ')} 
                              size="small" 
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {mapping.market_cap_category && (
                            <Chip 
                              label={mapping.market_cap_category.replace('_', ' ')} 
                              size="small" 
                              color={getMarketCapColor(mapping.market_cap_category) as any}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={mapping.is_active ? 'Active' : 'Inactive'} 
                            size="small" 
                            color={getStatusColor(mapping.is_active)}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Edit">
                              <IconButton size="small" onClick={() => {
                                setSelectedMapping(mapping);
                                setEditDialogOpen(true);
                              }}>
                                <Edit />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            {/* Statistics Tab */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Market Cap Distribution
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      {statistics?.market_cap_distribution && 
                        Object.entries(statistics.market_cap_distribution).map(([category, count]) => (
                          <Box key={category} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography sx={{ textTransform: 'capitalize' }}>
                              {category.replace('_', ' ')}
                            </Typography>
                            <Chip 
                              label={count} 
                              color={getMarketCapColor(category) as any}
                              size="small"
                            />
                          </Box>
                        ))
                      }
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      System Health
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Database Connection" 
                          secondary="Connected and healthy"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Cache Status" 
                          secondary="Redis cache operational"
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color="success" />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Sync Status" 
                          secondary="Last sync: 2 hours ago"
                        />
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            {/* Settings Tab */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Sync Configuration
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Auto-sync with Zerodha files"
                      />
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Background sync enabled"
                      />
                      <FormControlLabel
                        control={<Switch />}
                        label="Audit trail enabled"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Cache Configuration
                    </Typography>
                    <Box sx={{ mt: 2 }}>
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="In-memory cache enabled"
                      />
                      <FormControlLabel
                        control={<Switch defaultChecked />}
                        label="Redis cache enabled"
                      />
                      <FormControlLabel
                        control={<Switch />}
                        label="Persistent cache"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </Card>

        {/* Sync Dialog */}
        <Dialog open={syncDialogOpen} onClose={() => setSyncDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Sync with Zerodha Files</DialogTitle>
          <DialogContent>
            <Typography>
              This will synchronize the database with the latest Zerodha instrument files. 
              This process may take a few minutes.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSyncDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSync} 
              variant="contained" 
              disabled={syncMutation.isLoading}
              startIcon={syncMutation.isLoading ? <CircularProgress size={20} /> : <Sync />}
            >
              {syncMutation.isLoading ? 'Syncing...' : 'Start Sync'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Edit/Add Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            {selectedMapping ? 'Edit Stock Mapping' : 'Add New Stock Mapping'}
          </DialogTitle>
          <DialogContent>
            <Typography color="textSecondary">
              {selectedMapping ? 'Edit the stock mapping details below.' : 'Add a new stock mapping to the system.'}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button variant="contained">
              {selectedMapping ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    </div>
  );
};

export default StockMappingManager; 