/**
 * Legacy external query registry (non-Seed QUERY_API_BASE_URL).
 * Kept for stores that still use CandidateQueryRegistryService.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  LinearProgress,
} from '@mui/material';
import { Add, Refresh, Save, Search } from '@mui/icons-material';
import { API_CONFIG } from '../../config/api';
import { CandidateQueryRegistryService, QueryListResponse, QuerySearchResponse } from '../../services/CandidateQueryRegistryService';

const service = new CandidateQueryRegistryService(API_CONFIG.QUERY_API_BASE_URL);

/** Valid JSON text for optional registry fields (API expects string body fields). */
function optionalJsonStringField(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    JSON.parse(t) as unknown;
    return t;
  } catch {
    return undefined;
  }
}

const QueryManagerLegacyPanel: React.FC = () => {
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
    tags: '[]',
    parameters: '{}',
    version: '1.0',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const loadList = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await service.getQueries({ limit, offset });
      setList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load queries');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  const doSearch = async (): Promise<void> => {
    try {
      if (!searchTerm.trim()) {
        setSearchResults(null);
        return;
      }
      setLoading(true);
      setError(null);
      const data = await service.searchQueries(searchTerm, 10);
      setSearchResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const saveQuery = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        query_name: form.query_name,
        query_string: form.query_string,
        query_type: form.query_type,
        description: form.description || undefined,
        tags: optionalJsonStringField(form.tags),
        parameters: optionalJsonStringField(form.parameters),
        version: form.version || undefined,
      };
      await service.storeQuery(payload);
      await loadList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const saveBatch = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const tagsRaw = optionalJsonStringField(form.tags);
      const paramsRaw = optionalJsonStringField(form.parameters);
      const q = {
        query_name: form.query_name || 'Untitled',
        query_string: form.query_string,
        query_type: form.query_type,
        description: form.description || undefined,
        ...(tagsRaw !== undefined
          ? { tags: JSON.parse(tagsRaw) as string[] | string }
          : {}),
        ...(paramsRaw !== undefined
          ? { parameters: JSON.parse(paramsRaw) as Record<string, unknown> }
          : {}),
        version: form.version || undefined,
        is_active: true,
      };
      await service.storeBatch({ queries: [q] });
      await loadList();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Batch store failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadList();
  }, [loadList]);

  return (
    <Box sx={{ py: 1 }}>
      <Alert severity="info" sx={{ mb: 2 }}>
        This registry uses <code>QUERY_API_BASE_URL</code> (separate from Seed). Seed ARMs live in the other tabs.
      </Alert>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Chip label={`Base: ${API_CONFIG.QUERY_API_BASE_URL}`} variant="outlined" size="small" />
        <Button startIcon={<Refresh />} onClick={() => void loadList()} disabled={loading} size="small">
          Refresh
        </Button>
      </Stack>
      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Register / update" />
        <Tab label="Search" />
        <Tab label="Browse" />
      </Tabs>
      {tab === 0 && (
        <Card variant="outlined">
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <TextField fullWidth label="Query name" name="query_name" value={form.query_name} onChange={handleChange} />
              </Grid>
              <Grid item xs={12} md={4}>
                <Select
                  fullWidth
                  name="query_type"
                  value={form.query_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, query_type: e.target.value as string }))}
                >
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
                <TextField fullWidth multiline minRows={6} label="Query string" name="query_string" value={form.query_string} onChange={handleChange} />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                  <Button startIcon={<Save />} variant="contained" onClick={() => void saveQuery()} disabled={loading}>
                    Save
                  </Button>
                  <Button startIcon={<Add />} variant="outlined" onClick={() => void saveBatch()} disabled={loading}>
                    Save batch (1)
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
      {tab === 1 && (
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <TextField
                fullWidth
                placeholder="Search query name, description, or tags"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              />
              <Button variant="contained" onClick={() => void doSearch()} startIcon={<Search />}>
                Search
              </Button>
            </Stack>
            {searchResults && (
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Found {searchResults.total_results} result(s)
                </Typography>
                <Grid container spacing={2}>
                  {searchResults.queries.map((q) => (
                    <Grid key={q.metadata.query_id} item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6">
                            {q.metadata.query_name}{' '}
                            <Chip size="small" label={q.metadata.query_type} sx={{ ml: 1 }} />
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            {q.metadata.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {q.metadata.query_id}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                            {q.query_string}
                          </Typography>
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
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField label="Limit" type="number" value={limit} onChange={(e) => setLimit(parseInt(e.target.value || '0', 10))} />
              <TextField label="Offset" type="number" value={offset} onChange={(e) => setOffset(parseInt(e.target.value || '0', 10))} />
              <Button startIcon={<Refresh />} onClick={() => void loadList()}>
                Reload
              </Button>
            </Stack>
            {list && (
              <Grid container spacing={2}>
                {list.queries.map((q) => (
                  <Grid key={q.query_id} item xs={12} md={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6">
                          {q.query_name} <Chip size="small" label={q.query_type} sx={{ ml: 1 }} />
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {q.description}
                        </Typography>
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

export default QueryManagerLegacyPanel;
