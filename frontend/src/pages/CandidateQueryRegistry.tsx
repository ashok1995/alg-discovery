import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Code as CodeIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  Storage as StorageIcon,
  Dataset as DatabaseIcon,
} from '@mui/icons-material';
import { candidateQueryRegistryService, type QueryListItem, type QueryDetail, type QueryStatsResponse, type QueryIdsResponse } from '../services/CandidateQueryRegistryService';

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
      id={`candidate-query-tabpanel-${index}`}
      aria-labelledby={`candidate-query-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const CandidateQueryRegistry: React.FC = () => {
  // ==================== STATE ====================
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data state
  const [queries, setQueries] = useState<QueryListItem[]>([]);
  const [queryIds, setQueryIds] = useState<QueryIdsResponse | null>(null);
  const [stats, setStats] = useState<QueryStatsResponse | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<QueryDetail | null>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalResults, setTotalResults] = useState(0);

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Dialog state
  const [openQueryDialog, setOpenQueryDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [editingQuery, setEditingQuery] = useState<QueryDetail | null>(null);

  // Form state
  const [queryForm, setQueryForm] = useState<{
    query_name: string;
    query_string: string;
    query_type: string;
    description: string;
    tags: string;
    parameters: string;
    version: string;
  }>({
    query_name: '',
    query_string: '',
    query_type: 'custom',
    description: '',
    tags: '[]',
    parameters: '{}',
    version: 'v1.0',
  });

  // ==================== EFFECTS ====================

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 0) {
      loadQueries();
    } else if (activeTab === 1) {
      loadStats();
    } else if (activeTab === 2) {
      loadQueryIds();
    }
  }, [activeTab, page, rowsPerPage]);

  // ==================== DATA LOADING ====================

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadQueries(),
        loadStats(),
        loadQueryIds(),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadQueries = async () => {
    try {
      console.log('Loading queries...');
      const result = await candidateQueryRegistryService.getQueries({
        limit: rowsPerPage,
        offset: page * rowsPerPage,
      });
      console.log('Queries loaded:', result);
      setQueries(result.queries);
      setTotalResults(result.total_results);
    } catch (err) {
      console.error('Failed to load queries:', err);
      setError(err instanceof Error ? err.message : 'Failed to load queries');
    }
  };

  const loadStats = async () => {
    try {
      console.log('Loading stats...');
      const statsData = await candidateQueryRegistryService.getQueryStats();
      console.log('Stats loaded:', statsData);
      setStats(statsData);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    }
  };

  const loadQueryIds = async () => {
    try {
      const queryIdsData = await candidateQueryRegistryService.getQueryIds();
      setQueryIds(queryIdsData);
    } catch (err) {
      console.error('Failed to load query IDs:', err);
    }
  };

  // ==================== HANDLERS ====================

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await loadQueries();
      return;
    }

    setLoading(true);
    try {
      const result = await candidateQueryRegistryService.searchQueries(searchTerm, 10);
      setQueries(result.queries.map(q => q.metadata));
      setTotalResults(result.total_results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuery = async (queryId: string) => {
    try {
      const queryDetail = await candidateQueryRegistryService.getQuery(queryId);
      setSelectedQuery(queryDetail);
      setOpenViewDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load query details');
    }
  };

  const handleQuerySubmit = async () => {
    if (!queryForm.query_name || !queryForm.query_string) {
      setError('Query name and query string are required');
      return;
    }

    setLoading(true);
    try {
      if (editingQuery) {
        await candidateQueryRegistryService.updateQuery(editingQuery.query_id, queryForm);
        setSuccess('Query updated successfully');
      } else {
        await candidateQueryRegistryService.storeQuery(queryForm);
        setSuccess('Query stored successfully');
      }
      setOpenQueryDialog(false);
      setEditingQuery(null);
      resetQueryForm();
      await loadQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save query');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    if (!window.confirm('Are you sure you want to delete this query?')) return;

    setLoading(true);
    try {
      await candidateQueryRegistryService.deleteQuery(queryId);
      setSuccess('Query deleted successfully');
      await loadQueries();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete query');
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuery = async (queryId: string) => {
    try {
      const queryDetail = await candidateQueryRegistryService.getQuery(queryId);
      setEditingQuery(queryDetail);
      setQueryForm({
        query_name: queryDetail.metadata.query_name,
        query_string: queryDetail.query_string,
        query_type: queryDetail.metadata.query_type,
        description: queryDetail.metadata.description,
        tags: queryDetail.metadata.tags,
        parameters: queryDetail.metadata.parameters,
        version: queryDetail.metadata.version,
      });
      setOpenQueryDialog(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load query for editing');
    }
  };

  const resetQueryForm = () => {
    setQueryForm({
      query_name: '',
      query_string: '',
      query_type: 'custom',
      description: '',
      tags: '[]',
      parameters: '{}',
      version: 'v1.0',
    });
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ==================== RENDER HELPERS ====================

  const renderQueryTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Query Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Version</TableCell>
            <TableCell>Usage Count</TableCell>
            <TableCell>Last Used</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {queries.map((query) => (
            <TableRow key={query.query_id}>
              <TableCell>
                <Typography variant="subtitle2" fontWeight="bold">
                  {query.query_name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {query.description}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip label={query.query_type} size="small" color="primary" />
              </TableCell>
              <TableCell>{query.version}</TableCell>
              <TableCell>{query.usage_count}</TableCell>
              <TableCell>
                {query.last_used ? new Date(query.last_used).toLocaleDateString() : 'Never'}
              </TableCell>
              <TableCell>
                <Chip
                  label={query.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  color={query.is_active ? 'success' : 'default'}
                />
              </TableCell>
              <TableCell>
                <Box display="flex" gap={1}>
                  <Tooltip title="View Details">
                    <IconButton
                      size="small"
                      onClick={() => handleViewQuery(query.query_id)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Query">
                    <IconButton
                      size="small"
                      onClick={() => handleEditQuery(query.query_id)}
                    >
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Query">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteQuery(query.query_id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={totalResults}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );

  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Queries
              </Typography>
              <Typography variant="h4">
                {stats.total_queries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Queries
              </Typography>
              <Typography variant="h4">
                {stats.active_queries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Custom Queries
              </Typography>
              <Typography variant="h4">
                {stats.type_distribution.custom}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                SQL Queries
              </Typography>
              <Typography variant="h4">
                {stats.type_distribution.sql}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderStorageStatus = () => {
    if (!stats) return null;

    return (
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Storage Status
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <DatabaseIcon color={stats.storage_status.database_connected ? 'success' : 'error'} />
                  <Typography>
                    Database: {stats.storage_status.database_connected ? 'Connected' : 'Disconnected'}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <StorageIcon color={stats.storage_status.redis_connected ? 'success' : 'error'} />
                  <Typography>
                    Redis: {stats.storage_status.redis_connected ? 'Connected' : 'Disconnected'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Redis Statistics
              </Typography>
              <Box display="flex" flexDirection="column" gap={1}>
                <Typography>
                  Total Queries in Redis: {stats.redis_stats.total_queries}
                </Typography>
                <Typography>
                  Total Usage Count: {stats.redis_stats.total_usage_count}
                </Typography>
                <Typography>
                  Average Usage: {stats.redis_stats.average_usage.toFixed(2)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  const renderQueryIdsList = () => {
    if (!queryIds) return null;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Query IDs Overview
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Queries
                </Typography>
                <Typography variant="h4">
                  {queryIds.total_queries}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Active Queries
                </Typography>
                <Typography variant="h4">
                  {queryIds.active_queries}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Inactive Queries
                </Typography>
                <Typography variant="h4">
                  {queryIds.inactive_queries}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        <Typography variant="h6" sx={{ mt: 3, mb: 2 }}>
          All Query IDs ({queryIds.query_ids.length})
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Query ID</TableCell>
                <TableCell>Query Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queryIds.query_ids.map((query) => (
                <TableRow key={query.query_id}>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {query.query_id}
                    </Typography>
                  </TableCell>
                  <TableCell>{query.query_name}</TableCell>
                  <TableCell>
                    <Chip label={query.query_type} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={query.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={query.is_active ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(query.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    );
  };

  // ==================== RENDER ====================

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Candidate Query Registry
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditingQuery(null);
              resetQueryForm();
              setOpenQueryDialog(true);
            }}
          >
            Add Query
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadInitialData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="candidate query tabs">
          <Tab label="Queries" icon={<CodeIcon />} />
          <Tab label="Statistics" icon={<AssessmentIcon />} />
          <Tab label="Query IDs" icon={<DatabaseIcon />} />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* Search and Filters */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <TextField
            label="Search queries"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            sx={{ minWidth: 300 }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              label="Type"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
              <MenuItem value="sql">SQL</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            disabled={loading}
          >
            Search
          </Button>
        </Box>

        {/* Queries Table */}
        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : queries.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No queries found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {searchTerm ? 'Try adjusting your search criteria' : 'Start by adding your first query'}
            </Typography>
          </Paper>
        ) : (
          renderQueryTable()
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderStatsCards()}
        {renderStorageStatus()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderQueryIdsList()}
      </TabPanel>

      {/* Query Dialog */}
      <Dialog
        open={openQueryDialog}
        onClose={() => setOpenQueryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingQuery ? 'Edit Query' : 'Add New Query'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Query Name"
                value={queryForm.query_name}
                onChange={(e) => setQueryForm({ ...queryForm, query_name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Query Type</InputLabel>
                <Select
                  value={queryForm.query_type}
                  onChange={(e) => setQueryForm({ ...queryForm, query_type: e.target.value })}
                  label="Query Type"
                >
                  <MenuItem value="custom">Custom</MenuItem>
                  <MenuItem value="sql">SQL</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={queryForm.description}
                onChange={(e) => setQueryForm({ ...queryForm, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Query String"
                value={queryForm.query_string}
                onChange={(e) => setQueryForm({ ...queryForm, query_string: e.target.value })}
                multiline
                rows={6}
                required
                helperText="Enter the Chartink query string or SQL query"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tags (JSON array)"
                value={queryForm.tags}
                onChange={(e) => setQueryForm({ ...queryForm, tags: e.target.value })}
                helperText='e.g., ["swing", "momentum"]'
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Parameters (JSON object)"
                value={queryForm.parameters}
                onChange={(e) => setQueryForm({ ...queryForm, parameters: e.target.value })}
                helperText='e.g., {"strategy_type": "swing"}'
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Version"
                value={queryForm.version}
                onChange={(e) => setQueryForm({ ...queryForm, version: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQueryDialog(false)}>Cancel</Button>
          <Button
            onClick={handleQuerySubmit}
            variant="contained"
            disabled={loading}
          >
            {editingQuery ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Query Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Query Details: {selectedQuery?.metadata.query_name}
        </DialogTitle>
        <DialogContent>
          {selectedQuery && (
            <Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Basic Information
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Typography><strong>Query ID:</strong> {selectedQuery.query_id}</Typography>
                    <Typography><strong>Type:</strong> {selectedQuery.metadata.query_type}</Typography>
                    <Typography><strong>Version:</strong> {selectedQuery.metadata.version}</Typography>
                    <Typography><strong>Description:</strong> {selectedQuery.metadata.description}</Typography>
                    <Typography><strong>Created:</strong> {new Date(selectedQuery.metadata.created_at).toLocaleString()}</Typography>
                    <Typography><strong>Updated:</strong> {new Date(selectedQuery.metadata.updated_at).toLocaleString()}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Statistics
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    <Typography><strong>Usage Count:</strong> {selectedQuery.stats.usage_count}</Typography>
                    <Typography><strong>Last Used:</strong> {selectedQuery.stats.last_used ? new Date(selectedQuery.stats.last_used).toLocaleString() : 'Never'}</Typography>
                    <Typography><strong>Created:</strong> {new Date(selectedQuery.stats.created_at).toLocaleString()}</Typography>
                  </Box>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" gutterBottom>
                Query String
              </Typography>
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="body2" fontFamily="monospace" sx={{ whiteSpace: 'pre-wrap' }}>
                  {candidateQueryRegistryService.formatQueryString(selectedQuery.query_string)}
                </Typography>
              </Paper>
              
              <Divider sx={{ my: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Tags
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {candidateQueryRegistryService.parseTags(selectedQuery.metadata.tags).map((tag, index) => (
                      <Chip key={index} label={tag} size="small" />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Parameters
                  </Typography>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" fontFamily="monospace">
                      {JSON.stringify(candidateQueryRegistryService.parseParameters(selectedQuery.metadata.parameters), null, 2)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Deprecated in favor of unified QueryManager
export { default } from './QueryManager';