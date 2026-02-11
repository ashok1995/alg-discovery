import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Divider, Grid, IconButton, InputAdornment, MenuItem, Select, Stack, Tab, Tabs, TextField, Tooltip, Typography, Alert, LinearProgress } from '@mui/material';
import { Add, Delete, Edit, Refresh, Save, Search } from '@mui/icons-material';
import { API_CONFIG } from '../config/api';
import { CandidateQueryRegistryService, QueryDetail, QueryIdsResponse, QueryListResponse, QuerySearchResponse } from '../services/CandidateQueryRegistryService';

const service = new CandidateQueryRegistryService(API_CONFIG.QUERY_API_BASE_URL);

const QueryManager: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<QuerySearchResponse | null>(null);

  const [list, setList] = useState<QueryListResponse | null>(null);
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  const [form, setForm] = useState({
    query_name: '',
    query_string: '',
    query_type: 'chartink',
    description: '',
    tags: '[]', // JSON array
    parameters: '{}', // JSON object
    version: '1.0',
  });

  const handleTab = (_: any, v: number) => setTab(v);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const loadList = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.getQueries({ limit, offset });
      setList(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load queries');
    } finally {
      setLoading(false);
    }
  };

  const doSearch = async () => {
    try {
      if (!searchTerm.trim()) { setSearchResults(null); return; }
      setLoading(true);
      setError(null);
      const data = await service.searchQueries(searchTerm, 10);
      setSearchResults(data);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const saveQuery = async () => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        query_name: form.query_name,
        query_string: form.query_string,
        query_type: form.query_type,
        description: form.description || undefined,
        tags: (() => { try { return JSON.parse(form.tags); } catch { return undefined; } })(),
        parameters: (() => { try { return JSON.parse(form.parameters); } catch { return undefined; } })(),
        version: form.version || undefined,
        is_active: true,
      };
      const res = await service.storeQuery(payload);
      await loadList();
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const saveBatch = async () => {
    try {
      setLoading(true);
      setError(null);
      const q = {
        query_name: form.query_name || 'Untitled',
        query_string: form.query_string,
        query_type: form.query_type,
        description: form.description || undefined,
        tags: (() => { try { return JSON.parse(form.tags); } catch { return undefined; } })(),
        parameters: (() => { try { return JSON.parse(form.parameters); } catch { return undefined; } })(),
        version: form.version || undefined,
        is_active: true,
      };
      await service.storeBatch({ queries: [q] });
      await loadList();
    } catch (err: any) {
      setError(err.message || 'Batch store failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, [limit, offset]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold">Query Manager (v1)</Typography>
        <Stack direction="row" spacing={1}>
          <Chip label={`Base: ${API_CONFIG.QUERY_API_BASE_URL}`} variant="outlined" />
          <Button startIcon={<Refresh />} onClick={loadList} disabled={loading}>Refresh</Button>
        </Stack>
      </Box>

      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      )}

      <Tabs value={tab} onChange={handleTab} sx={{ mb: 2 }}>
        <Tab label="Register / Update" />
        <Tab label="Search / Test" />
        <Tab label="Browse" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Query Name" name="query_name" value={form.query_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <Select fullWidth name="query_type" value={form.query_type} onChange={(e) => setForm(prev => ({ ...prev, query_type: e.target.value as string }))}>
                  <MenuItem value="chartink">Chartink</MenuItem>
                  <MenuItem value="sql">SQL</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Version" name="version" value={form.version} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Description" name="description" value={form.description} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Tags (JSON array)" name="tags" value={form.tags} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Parameters (JSON)" name="parameters" value={form.parameters} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline minRows={6} label="Query String" name="query_string" value={form.query_string} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                  <Button startIcon={<Save />} variant="contained" onClick={saveQuery} disabled={loading}>Save</Button>
                  <Button startIcon={<Add />} variant="outlined" onClick={saveBatch} disabled={loading}>Save Batch (1)</Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Search query name, description, or tags"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{ startAdornment: (<InputAdornment position="start"><Search /></InputAdornment>) }}
              />
              <Button variant="contained" onClick={doSearch} startIcon={<Search />}>Search</Button>
            </Stack>
            {searchResults && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Found {searchResults.total_results} result(s)</Typography>
                <Grid container spacing={2}>
                  {searchResults.queries.map(q => (
                    <Grid key={q.metadata.query_id} item xs={12} md={6}>
                      <Card>
                        <CardContent>
                          <Typography variant="h6">{q.metadata.query_name} <Chip size="small" label={q.metadata.query_type} sx={{ ml: 1 }} /></Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{q.metadata.description}</Typography>
                          <Typography variant="caption" color="text.secondary">ID: {q.metadata.query_id}</Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{q.query_string}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 2 && (
        <Card>
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField label="Limit" type="number" value={limit} onChange={(e) => setLimit(parseInt(e.target.value || '0', 10))} />
              <TextField label="Offset" type="number" value={offset} onChange={(e) => setOffset(parseInt(e.target.value || '0', 10))} />
              <Button startIcon={<Refresh />} onClick={loadList}>Reload</Button>
            </Stack>
            {list && (
              <Grid container spacing={2}>
                {list.queries.map(q => (
                  <Grid key={q.query_id} item xs={12} md={6}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6">{q.query_name} <Chip size="small" label={q.query_type} sx={{ ml: 1 }} /></Typography>
                        <Typography variant="body2" color="text.secondary">{q.description}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                          <Chip size="small" label={`v${q.version}`} />
                          <Chip size="small" label={q.is_active ? 'Active' : 'Inactive'} color={q.is_active ? 'success' : 'default'} />
                          <Chip size="small" label={`Used: ${q.usage_count}`} />
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default QueryManager;


