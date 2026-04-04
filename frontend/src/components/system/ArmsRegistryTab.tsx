import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  Add,
  ExpandMore,
  Refresh,
  Search,
  Verified,
  ContentCopy,
} from '@mui/icons-material';
import { seedArmsService } from '../../services/SeedArmsService';
import type {
  ArmExecutionItem,
  ArmExecutionTimelineResponse,
  ArmLearningObservabilityResponse,
  ArmLearningObsItem,
  ArmScenariosResponse,
  CreateArmRequest,
  SeedArmDetail,
  SeedArmSummary,
  UpdateArmRequest,
  VerifyQueryResponse,
} from '../../types/apiModels';
import { useSortableData } from '../../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';

type ArmKey = 'arm_name' | 'scenario' | 'family' | 'status' | 'regime_alignment' | 'is_active' | 'created_by';

const ARM_COLUMNS: ColumnDef<ArmKey>[] = [
  { key: 'arm_name', label: 'ARM', sortable: true, minWidth: 200 },
  { key: 'scenario', label: 'Scenario', sortable: true },
  { key: 'family', label: 'Family', sortable: true },
  { key: 'status', label: 'Status', sortable: true },
  { key: 'regime_alignment', label: 'Regime', sortable: true },
  { key: 'is_active', label: 'Active', sortable: true },
  { key: 'created_by', label: 'Created by', sortable: true },
];

const statusChip = (status: string | null | undefined) => {
  const s = (status ?? 'unknown').toLowerCase();
  const color =
    s === 'active' ? '#4caf50' : s === 'probation' ? '#ff9800' : s === 'disabled' ? '#9e9e9e' : '#607d8b';
  return (
    <Chip
      label={(status ?? 'unknown').replace(/_/g, ' ')}
      size="small"
      sx={{
        fontSize: '0.62rem',
        fontWeight: 700,
        height: 18,
        bgcolor: alpha(color, 0.12),
        color,
        textTransform: 'capitalize',
      }}
    />
  );
};

const scenarioChip = (scenario: string) => (
  <Chip
    label={scenario.replace(/_/g, ' ')}
    size="small"
    variant="outlined"
    sx={{ fontSize: '0.62rem', height: 18, fontWeight: 600, textTransform: 'capitalize' }}
  />
);

const ArmsRegistryTab: React.FC = () => {
  const [scenarios, setScenarios] = useState<ArmScenariosResponse | null>(null);
  const [scenario, setScenario] = useState('');
  const [status, setStatus] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [query, setQuery] = useState('');

  const [arms, setArms] = useState<SeedArmSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedArm, setSelectedArm] = useState<SeedArmDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyQueryResponse | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<UpdateArmRequest>({});
  const [editSaving, setEditSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateArmRequest>({
    arm_name: '',
    query_string: '',
    scenario: 'intraday_buy',
    parent_arm: null,
    regime_alignment: 'neutral',
    description: null,
    status: 'active',
  });
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Observability
  const [learningObs, setLearningObs] = useState<ArmLearningObservabilityResponse | null>(null);
  const [learningLoading, setLearningLoading] = useState(false);
  const [timeline, setTimeline] = useState<ArmExecutionTimelineResponse | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [obsError, setObsError] = useState<string | null>(null);
  const [runSummaryOpen, setRunSummaryOpen] = useState(false);
  const [runSummary, setRunSummary] = useState<Record<string, unknown> | null>(null);
  const [runSummaryLoading, setRunSummaryLoading] = useState(false);
  const [recentRuns, setRecentRuns] = useState<Record<string, unknown> | null>(null);
  const [utilization, setUtilization] = useState<Record<string, unknown> | null>(null);
  const [extraObsLoading, setExtraObsLoading] = useState(false);

  const loadScenarios = useCallback(async () => {
    try {
      const res = await seedArmsService.listScenarios();
      setScenarios(res);
    } catch {
      // keep silent; scenarios are optional UX sugar
    }
  }, []);

  const loadArms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await seedArmsService.listArms({
        scenario: scenario || undefined,
        status: status || undefined,
        include_inactive: includeInactive,
      });
      setArms(res.arms ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load ARMs');
    } finally {
      setLoading(false);
    }
  }, [includeInactive, scenario, status]);

  useEffect(() => {
    loadScenarios();
  }, [loadScenarios]);

  useEffect(() => {
    loadArms();
  }, [loadArms]);

  const filteredArms = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return arms;
    return arms.filter((a) => a.arm_name.toLowerCase().includes(q));
  }, [arms, query]);

  const { sortedData, requestSort, getSortDirection } = useSortableData<SeedArmSummary, ArmKey>(
    filteredArms,
    { key: 'arm_name', direction: 'asc' },
  );

  const openArm = async (armName: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setVerifyResult(null);
    setEditMode(false);
    try {
      const res = await seedArmsService.getArm(armName);
      setSelectedArm(res);
      setEditDraft({
        query_string: res.query_string,
        parent_arm: res.parent_arm,
        regime_alignment: res.regime_alignment,
        description: res.description,
        status: res.status,
      });
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load ARM');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedArm(null);
    setVerifyResult(null);
    setEditMode(false);
    setDetailError(null);
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  const verifyQuery = async () => {
    if (!selectedArm?.query_string) return;
    setVerifyLoading(true);
    setVerifyResult(null);
    try {
      const res = await seedArmsService.verifyQuery({
        query_string: selectedArm.query_string,
        scenario: selectedArm.scenario ?? 'intraday_buy',
      });
      setVerifyResult(res);
    } catch (err: unknown) {
      setVerifyResult({
        success: false,
        record_count: 0,
        sample_symbols: [],
        duration_ms: 0,
        message: err instanceof Error ? err.message : 'Verify query failed',
        resolved_service_host: null,
        diagnostics: null,
      });
    } finally {
      setVerifyLoading(false);
    }
  };

  const saveEdits = async () => {
    if (!selectedArm) return;
    setEditSaving(true);
    try {
      const updated = await seedArmsService.updateArm(selectedArm.arm_name, editDraft);
      setSelectedArm(updated);
      setEditMode(false);
      await loadArms();
    } catch (err: unknown) {
      setDetailError(err instanceof Error ? err.message : 'Failed to update ARM');
    } finally {
      setEditSaving(false);
    }
  };

  const createArm = async () => {
    setCreateSaving(true);
    setCreateError(null);
    try {
      await seedArmsService.createArm(createDraft);
      setCreateOpen(false);
      setCreateDraft({
        arm_name: '',
        query_string: '',
        scenario: 'intraday_buy',
        parent_arm: null,
        regime_alignment: 'neutral',
        description: null,
        status: 'active',
      });
      await loadArms();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create ARM');
    } finally {
      setCreateSaving(false);
    }
  };

  const loadObservability = useCallback(async () => {
    setObsError(null);
    setLearningLoading(true);
    setTimelineLoading(true);
    try {
      const [learn, tl] = await Promise.all([
        seedArmsService.getLearningObservability(30),
        seedArmsService.getExecutionTimeline({ days: 7, limit: 100 }),
      ]);
      setLearningObs(learn);
      setTimeline(tl);
    } catch (err: unknown) {
      setObsError(err instanceof Error ? err.message : 'Failed to load observability');
    } finally {
      setLearningLoading(false);
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    loadObservability();
  }, [loadObservability]);

  const openRunSummary = async (pipelineRunId: string) => {
    setRunSummaryOpen(true);
    setRunSummary(null);
    setRunSummaryLoading(true);
    try {
      const res = await seedArmsService.getRunSummary(pipelineRunId);
      setRunSummary(res);
    } catch (err: unknown) {
      setRunSummary({ error: err instanceof Error ? err.message : 'Failed to load run summary' });
    } finally {
      setRunSummaryLoading(false);
    }
  };

  const loadRecentRuns = async () => {
    setExtraObsLoading(true);
    try {
      const res = await seedArmsService.getRecentRuns({ days: 7, limit: 50 });
      setRecentRuns(res);
    } catch (err: unknown) {
      setRecentRuns({ error: err instanceof Error ? err.message : 'Failed to load recent runs' });
    } finally {
      setExtraObsLoading(false);
    }
  };

  const loadUtilization = async () => {
    setExtraObsLoading(true);
    try {
      const res = await seedArmsService.getUtilization({ days: 7 });
      setUtilization(res);
    } catch (err: unknown) {
      setUtilization({ error: err instanceof Error ? err.message : 'Failed to load utilization' });
    } finally {
      setExtraObsLoading(false);
    }
  };

  const LearningTable: React.FC<{ items: ArmLearningObsItem[] }> = ({ items }) => (
    <TableContainer sx={{ maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>ARM</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Scenario</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>TS Weight</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Obs</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Win %</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Avg %</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((a) => (
            <TableRow key={a.arm_name} hover>
              <TableCell sx={{ py: 0.5 }}>
                <Button
                  variant="text"
                  size="small"
                  sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.78rem' }}
                  onClick={() => openArm(a.arm_name)}
                >
                  {a.arm_name.replace(/_/g, ' ')}
                </Button>
              </TableCell>
              <TableCell sx={{ py: 0.5 }}>{scenarioChip(a.scenario)}</TableCell>
              <TableCell align="right" sx={{ py: 0.5 }}>{a.thompson_weight != null ? a.thompson_weight.toFixed(4) : '—'}</TableCell>
              <TableCell align="right" sx={{ py: 0.5 }}>{a.observations != null ? a.observations.toFixed(1) : '—'}</TableCell>
              <TableCell align="right" sx={{ py: 0.5 }}>
                {a.win_rate_pct != null ? `${a.win_rate_pct.toFixed(0)}%` : '—'}
              </TableCell>
              <TableCell align="right" sx={{ py: 0.5 }}>
                {a.avg_return_pct != null ? (
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    fontSize="0.74rem"
                    color={a.avg_return_pct >= 0 ? 'success.main' : 'error.main'}
                  >
                    {a.avg_return_pct >= 0 ? '+' : ''}
                    {a.avg_return_pct.toFixed(2)}%
                  </Typography>
                ) : '—'}
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <Typography color="text.secondary">No learning observability data</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const TimelineTable: React.FC<{ items: ArmExecutionItem[] }> = ({ items }) => (
    <TableContainer sx={{ maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>ARM</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Scenario</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>ms</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Records</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700, fontSize: '0.72rem' }}>Run</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((e, idx) => (
            <TableRow key={`${e.arm_name}-${idx}`} hover>
              <TableCell sx={{ py: 0.5 }}>
                <Button
                  variant="text"
                  size="small"
                  sx={{ fontWeight: 700, textTransform: 'none', fontSize: '0.78rem' }}
                  onClick={() => openArm(e.arm_name)}
                >
                  {e.arm_name.replace(/_/g, ' ')}
                </Button>
              </TableCell>
              <TableCell sx={{ py: 0.5 }}>{scenarioChip(e.scenario)}</TableCell>
              <TableCell align="right" sx={{ py: 0.5 }}>{e.duration_ms.toFixed(0)}</TableCell>
              <TableCell align="right" sx={{ py: 0.5 }}>{e.records_returned}</TableCell>
              <TableCell sx={{ py: 0.5 }}>
                <Chip
                  label={e.status}
                  size="small"
                  sx={{
                    fontSize: '0.62rem',
                    height: 18,
                    fontWeight: 700,
                    bgcolor: alpha(e.status === 'success' ? '#4caf50' : e.status === 'empty' ? '#ff9800' : '#f44336', 0.12),
                    color: e.status === 'success' ? 'success.dark' : e.status === 'empty' ? 'warning.dark' : 'error.dark',
                  }}
                />
              </TableCell>
              <TableCell sx={{ py: 0.5 }}>
                {e.pipeline_run_id ? (
                  <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: '0.7rem' }} onClick={() => openRunSummary(e.pipeline_run_id!)}>
                    {e.pipeline_run_id}
                  </Button>
                ) : '—'}
              </TableCell>
            </TableRow>
          ))}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                <Typography color="text.secondary">No executions found</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={800}>ARM Registry</Typography>
          <Typography variant="caption" color="text.secondary">Browse and manage strategy ARMs (Seed service)</Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Search ARM…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{ startAdornment: <Search fontSize="small" style={{ marginRight: 6 }} /> }}
            sx={{ width: 260 }}
          />
          <Tooltip title="Create ARM">
            <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Create
            </Button>
          </Tooltip>
          <Tooltip title="Refresh list">
            <IconButton size="small" onClick={loadArms}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, mb: 2 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={1.5} alignItems="center">
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Scenario</InputLabel>
                <Select value={scenario} label="Scenario" onChange={(e) => setScenario(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  {scenarios?.scenarios?.map((s) => (
                    <MenuItem key={s.scenario} value={s.scenario}>
                      {s.scenario.replace(/_/g, ' ')} ({s.arm_count})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">active</MenuItem>
                  <MenuItem value="probation">probation</MenuItem>
                  <MenuItem value="disabled">disabled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControlLabel
                control={<Switch checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />}
                label="Include inactive"
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Chip label={`${sortedData.length} arms`} size="small" variant="outlined" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, maxHeight: 520 }}>
        <Table size="small" stickyHeader>
          <SortableTableHead columns={ARM_COLUMNS} onSort={requestSort} getSortDirection={getSortDirection} />
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={ARM_COLUMNS.length}>
                    <Skeleton variant="rectangular" height={24} sx={{ borderRadius: 1 }} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              sortedData.map((a) => (
                <TableRow key={a.arm_name} hover sx={{ cursor: 'pointer' }} onClick={() => openArm(a.arm_name)}>
                  <TableCell sx={{ py: 0.6 }}>
                    <Typography variant="body2" fontWeight={700} fontSize="0.8rem">
                      {a.arm_name.replace(/_/g, ' ')}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 0.6 }}>{scenarioChip(a.scenario)}</TableCell>
                  <TableCell sx={{ py: 0.6 }}>{a.family ?? '—'}</TableCell>
                  <TableCell sx={{ py: 0.6 }}>{statusChip(a.status)}</TableCell>
                  <TableCell sx={{ py: 0.6 }}>{a.regime_alignment ?? '—'}</TableCell>
                  <TableCell sx={{ py: 0.6 }}>
                    <Chip
                      label={a.is_active ? 'Yes' : 'No'}
                      size="small"
                      sx={{
                        fontSize: '0.62rem',
                        height: 18,
                        fontWeight: 700,
                        bgcolor: alpha(a.is_active ? '#4caf50' : '#9e9e9e', 0.12),
                        color: a.is_active ? 'success.dark' : 'text.secondary',
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 0.6 }}>{a.created_by ?? '—'}</TableCell>
                </TableRow>
              ))
            )}
            {!loading && sortedData.length === 0 && (
              <TableRow>
                <TableCell colSpan={ARM_COLUMNS.length} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No ARMs match the selected filters</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Accordion sx={{ mt: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }} elevation={0}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography fontWeight={800}>ARM Observability</Typography>
          <Box ml={1}>
            <Chip size="small" variant="outlined" label="learning + execution timeline" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {obsError && <Alert severity="warning" sx={{ mb: 2 }}>{obsError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight={800}>Learning observability</Typography>
                    {learningLoading ? <CircularProgress size={16} /> : <Chip size="small" label={`${learningObs?.arm_count ?? 0} arms`} />}
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />
                  {learningLoading && !learningObs ? (
                    <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
                  ) : (
                    <LearningTable items={(learningObs?.arms ?? []).slice(0, 50)} />
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight={800}>Execution timeline</Typography>
                    {timelineLoading ? <CircularProgress size={16} /> : <Chip size="small" label={`${timeline?.count ?? 0} rows`} />}
                  </Box>
                  <Divider sx={{ mb: 1.5 }} />
                  {timelineLoading && !timeline ? (
                    <Skeleton variant="rectangular" height={240} sx={{ borderRadius: 2 }} />
                  ) : (
                    <TimelineTable items={(timeline?.executions ?? []).slice(0, 100)} />
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
            <Typography variant="subtitle2" fontWeight={800}>Extra observability</Typography>
            <Box display="flex" gap={1} alignItems="center">
              {extraObsLoading && <CircularProgress size={14} />}
              <Button size="small" variant="outlined" onClick={loadRecentRuns} sx={{ textTransform: 'none' }}>
                Recent runs
              </Button>
              <Button size="small" variant="outlined" onClick={loadUtilization} sx={{ textTransform: 'none' }}>
                Utilization
              </Button>
            </Box>
          </Box>

          {(recentRuns || utilization) && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">
                  Recent runs
                </Typography>
                <Box component="pre" sx={{ fontSize: 12, overflow: 'auto', maxHeight: 260, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                  {JSON.stringify(recentRuns, null, 2)}
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="caption" color="text.secondary" fontWeight={800} textTransform="uppercase">
                  Utilization
                </Typography>
                <Box component="pre" sx={{ fontSize: 12, overflow: 'auto', maxHeight: 260, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                  {JSON.stringify(utilization, null, 2)}
                </Box>
              </Grid>
            </Grid>
          )}
        </AccordionDetails>
      </Accordion>

      {/* ARM detail dialog */}
      <Dialog open={Boolean(selectedArm) || detailLoading} onClose={closeDetail} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {selectedArm ? selectedArm.arm_name.replace(/_/g, ' ') : 'Loading ARM…'}
        </DialogTitle>
        <DialogContent dividers>
          {detailLoading && <Box display="flex" justifyContent="center" py={2}><CircularProgress /></Box>}
          {detailError && <Alert severity="error" sx={{ mb: 2 }}>{detailError}</Alert>}
          {selectedArm && (
            <>
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                {scenarioChip(selectedArm.scenario)}
                {statusChip(selectedArm.status)}
                {selectedArm.regime_alignment && <Chip size="small" variant="outlined" label={`regime: ${selectedArm.regime_alignment}`} />}
                {selectedArm.parent_arm && <Chip size="small" variant="outlined" label={`parent: ${selectedArm.parent_arm}`} />}
              </Box>

              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="subtitle2" fontWeight={800}>Query string</Typography>
                <Box display="flex" gap={1} alignItems="center">
                  <Tooltip title="Copy query">
                    <IconButton size="small" onClick={() => copy(selectedArm.query_string ?? '')}>
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={verifyLoading ? <CircularProgress size={14} /> : <Verified fontSize="small" />}
                    onClick={verifyQuery}
                    disabled={verifyLoading || !selectedArm.query_string}
                    sx={{ textTransform: 'none' }}
                  >
                    Verify
                  </Button>
                  <Button
                    size="small"
                    variant={editMode ? 'contained' : 'text'}
                    onClick={() => setEditMode((v) => !v)}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    {editMode ? 'Editing' : 'Edit'}
                  </Button>
                </Box>
              </Box>

              {editMode ? (
                <>
                  <TextField
                    fullWidth
                    multiline
                    minRows={6}
                    label="query_string"
                    value={editDraft.query_string ?? ''}
                    onChange={(e) => setEditDraft((p) => ({ ...p, query_string: e.target.value }))}
                    sx={{ mb: 2 }}
                  />
                  <Grid container spacing={2} sx={{ mb: 1 }}>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="parent_arm"
                        value={editDraft.parent_arm ?? ''}
                        onChange={(e) => setEditDraft((p) => ({ ...p, parent_arm: e.target.value || null }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="regime_alignment"
                        value={editDraft.regime_alignment ?? ''}
                        onChange={(e) => setEditDraft((p) => ({ ...p, regime_alignment: e.target.value || null }))}
                      />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="status"
                        value={editDraft.status ?? ''}
                        onChange={(e) => setEditDraft((p) => ({ ...p, status: e.target.value || null }))}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        size="small"
                        label="description"
                        value={editDraft.description ?? ''}
                        onChange={(e) => setEditDraft((p) => ({ ...p, description: e.target.value || null }))}
                      />
                    </Grid>
                  </Grid>
                </>
              ) : (
                <Box
                  component="pre"
                  sx={{
                    fontSize: 12,
                    overflow: 'auto',
                    maxHeight: 320,
                    p: 1.5,
                    bgcolor: 'grey.50',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    mb: 2,
                  }}
                >
                  {selectedArm.query_string ?? '—'}
                </Box>
              )}

              {verifyResult && (
                <Alert severity={verifyResult.success ? 'success' : 'warning'} sx={{ mb: 1 }}>
                  <strong>{verifyResult.success ? 'Verified' : 'Not verified'}</strong> — {verifyResult.message} (records: {verifyResult.record_count}, {verifyResult.duration_ms.toFixed(0)}ms)
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDetail}>Close</Button>
          {editMode && selectedArm && (
            <Button
              variant="contained"
              color="warning"
              startIcon={editSaving ? <CircularProgress size={14} color="inherit" /> : undefined}
              onClick={saveEdits}
              disabled={editSaving}
              sx={{ textTransform: 'none', fontWeight: 800 }}
            >
              Save changes
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Create ARM</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Creating an ARM affects the live strategy registry. Use only when you know what you’re doing.
          </Alert>
          {createError && <Alert severity="error" sx={{ mb: 2 }}>{createError}</Alert>}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="arm_name"
                value={createDraft.arm_name}
                onChange={(e) => setCreateDraft((p) => ({ ...p, arm_name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>scenario</InputLabel>
                <Select
                  value={createDraft.scenario}
                  label="scenario"
                  onChange={(e) => setCreateDraft((p) => ({ ...p, scenario: String(e.target.value) }))}
                >
                  {(scenarios?.scenarios ?? []).map((s) => (
                    <MenuItem key={s.scenario} value={s.scenario}>{s.scenario}</MenuItem>
                  ))}
                  {(!scenarios || scenarios.scenarios.length === 0) && (
                    ['intraday_buy', 'intraday_sell', 'swing_buy', 'short_buy', 'long_term', 'global'].map((s) => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={7}
                label="query_string"
                value={createDraft.query_string}
                onChange={(e) => setCreateDraft((p) => ({ ...p, query_string: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="parent_arm"
                value={createDraft.parent_arm ?? ''}
                onChange={(e) => setCreateDraft((p) => ({ ...p, parent_arm: e.target.value || null }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="regime_alignment"
                value={createDraft.regime_alignment ?? 'neutral'}
                onChange={(e) => setCreateDraft((p) => ({ ...p, regime_alignment: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="description"
                value={createDraft.description ?? ''}
                onChange={(e) => setCreateDraft((p) => ({ ...p, description: e.target.value || null }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="status"
                value={createDraft.status ?? 'active'}
                onChange={(e) => setCreateDraft((p) => ({ ...p, status: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={createSaving}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={createArm}
            disabled={createSaving || !createDraft.arm_name.trim() || !createDraft.query_string.trim()}
            startIcon={createSaving ? <CircularProgress size={14} color="inherit" /> : <Add fontSize="small" />}
            sx={{ textTransform: 'none', fontWeight: 900 }}
          >
            {createSaving ? 'Creating…' : 'Create ARM'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Pipeline run summary dialog */}
      <Dialog open={runSummaryOpen} onClose={() => setRunSummaryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>Pipeline run summary</DialogTitle>
        <DialogContent dividers>
          {runSummaryLoading ? (
            <Box display="flex" justifyContent="center" py={2}><CircularProgress /></Box>
          ) : (
            <Box component="pre" sx={{ fontSize: 12, overflow: 'auto', maxHeight: 440, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
              {JSON.stringify(runSummary, null, 2)}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRunSummaryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ArmsRegistryTab;

