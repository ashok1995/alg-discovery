/**
 * ARM Manager — all Seed /api/v2/arms* endpoints + dashboard arm performance.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Hub,
  Refresh,
  PlayArrow,
  Save,
  Timeline,
  Assessment,
  Storage,
  Science,
  ExpandMore,
} from '@mui/icons-material';
import PageHero from '../components/layout/PageHero';
import TabPanel from '../components/ui/TabPanel';
import StructuredDataView from '../components/ui/StructuredDataView';
import { API_CONFIG } from '../config/api';
import { seedArmService } from '../services/SeedArmService';
import { seedDashboardService } from '../services/SeedDashboardService';
import type { ArmPerformanceItem } from '../types/apiModels';
import type { CreateArmRequest, UpdateArmRequest } from '../types/seedArms';
import { useSortableData } from '../hooks/useSortableData';
import SortableTableHead, { type ColumnDef } from '../components/ui/SortableTableHead';
import { extractArmsRows, armCell } from '../components/arm-manager/armListUtils';

type ArmSortKey = 'arm' | 'total' | 'wins' | 'win_rate' | 'avg_return_pct';
const ARM_COLUMNS: ColumnDef<ArmSortKey>[] = [
  { key: 'arm', label: 'ARM', sortable: true, minWidth: 180 },
  { key: 'total', label: 'Trades', align: 'right', sortable: true },
  { key: 'wins', label: 'Wins', align: 'right', sortable: true },
  { key: 'win_rate', label: 'Win %', align: 'right', sortable: true },
  { key: 'avg_return_pct', label: 'Avg return %', align: 'right', sortable: true },
];

const SCENARIOS = ['intraday_buy', 'intraday_sell', 'swing_buy', 'short_buy', 'long_term', 'global'] as const;
const STATUS_OPTIONS = ['active', 'probation', 'disabled'] as const;

function extractScenarioOptions(raw: Record<string, unknown> | null): string[] {
  if (!raw) return [...SCENARIOS];
  const candidates = [
    raw.scenarios,
    raw.items,
    raw.data,
    raw.results,
  ];
  for (const c of candidates) {
    if (Array.isArray(c)) {
      const vals = c
        .map((x) => (typeof x === 'string' ? x : typeof (x as Record<string, unknown>)?.scenario === 'string' ? String((x as Record<string, unknown>).scenario) : null))
        .filter((x): x is string => Boolean(x));
      if (vals.length > 0) return Array.from(new Set(vals));
    }
  }
  return [...SCENARIOS];
}

const ArmManagerPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listRaw, setListRaw] = useState<Record<string, unknown> | null>(null);
  const [scenarioFilter, setScenarioFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [scenariosRaw, setScenariosRaw] = useState<Record<string, unknown> | null>(null);
  const [scenarioOptions, setScenarioOptions] = useState<string[]>([...SCENARIOS]);

  const [perfDays, setPerfDays] = useState(7);
  const [armPerf, setArmPerf] = useState<ArmPerformanceItem[]>([]);

  const [timelineDays, setTimelineDays] = useState(7);
  const [timelineArm, setTimelineArm] = useState('');
  const [timelineScenario, setTimelineScenario] = useState('');
  const [timelineLimit, setTimelineLimit] = useState(200);
  const [timelineRaw, setTimelineRaw] = useState<Record<string, unknown> | null>(null);
  const [learnRaw, setLearnRaw] = useState<Record<string, unknown> | null>(null);
  const [utilRaw, setUtilRaw] = useState<Record<string, unknown> | null>(null);
  const [runId, setRunId] = useState('');
  const [runRaw, setRunRaw] = useState<Record<string, unknown> | null>(null);

  const [verifyQuery, setVerifyQuery] = useState('');
  const [verifyWidget, setVerifyWidget] = useState('3811225');
  const [verifyResult, setVerifyResult] = useState<Record<string, unknown> | null>(null);

  const [createForm, setCreateForm] = useState<CreateArmRequest>({
    arm_name: '',
    query_string: '',
    scenario: 'swing_buy',
    parent_arm: null,
    description: null,
    status: 'active',
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedName, setSelectedName] = useState('');
  const [detailRaw, setDetailRaw] = useState<Record<string, unknown> | null>(null);
  const [patchForm, setPatchForm] = useState<UpdateArmRequest>({});

  const loadArms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await seedArmService.listArms({
        scenario: scenarioFilter || null,
        status: statusFilter || null,
        include_inactive: includeInactive,
      });
      setListRaw(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to list ARMs');
      setListRaw(null);
    } finally {
      setLoading(false);
    }
  }, [scenarioFilter, statusFilter, includeInactive]);

  const loadScenarios = useCallback(async () => {
    try {
      const s = await seedArmService.listScenarios();
      setScenariosRaw(s);
      const opts = extractScenarioOptions(s);
      setScenarioOptions(opts);
      setCreateForm((prev) => ({ ...prev, scenario: opts.includes(prev.scenario) ? prev.scenario : (opts[0] ?? 'swing_buy') }));
    } catch {
      setScenariosRaw(null);
      setScenarioOptions([...SCENARIOS]);
    }
  }, []);

  const loadPerformance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await seedDashboardService.getArmPerformance(perfDays);
      setArmPerf(res.arms ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load arm performance');
      setArmPerf([]);
    } finally {
      setLoading(false);
    }
  }, [perfDays]);

  const loadObservability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, l, u] = await Promise.all([
        seedArmService.getExecutionTimeline({
          days: timelineDays,
          arm_name: timelineArm || null,
          scenario: timelineScenario || null,
          limit: timelineLimit,
        }),
        seedArmService.getObservabilityLearning(),
        seedArmService.getObservabilityUtilization(),
      ]);
      setTimelineRaw(t);
      setLearnRaw(l);
      setUtilRaw(u);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load ARM observability');
    } finally {
      setLoading(false);
    }
  }, [timelineDays, timelineArm, timelineScenario, timelineLimit]);

  const runVerify = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    setVerifyResult(null);
    try {
      const r = await seedArmService.verifyQuery({
        query_string: verifyQuery,
        widget_id: verifyWidget || undefined,
      });
      setVerifyResult(r as unknown as Record<string, unknown>);
      setCreateForm((prev) => ({ ...prev, query_string: verifyQuery }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'verify-query failed');
    } finally {
      setLoading(false);
    }
  };

  const createArm = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await seedArmService.createArm(createForm);
      await loadArms();
      setTab(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Create ARM failed');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (name: string): Promise<void> => {
    setSelectedName(name);
    setDetailOpen(true);
    setPatchForm({});
    try {
      const d = await seedArmService.getArm(name);
      setDetailRaw(d);
      const qs = (d.query_string as string) ?? '';
      setPatchForm({
        query_string: qs,
        status: (d.status as string) ?? undefined,
        description: (d.description as string) ?? null,
        parent_arm: (d.parent_arm as string) ?? null,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load ARM');
      setDetailRaw(null);
    }
  };

  const savePatch = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await seedArmService.updateArm(selectedName, patchForm);
      setDetailOpen(false);
      await loadArms();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const loadRunSummary = async (): Promise<void> => {
    if (!runId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const r = await seedArmService.getRunSummary(runId.trim());
      setRunRaw(r);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Run summary failed');
      setRunRaw(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadScenarios();
  }, [loadScenarios]);

  useEffect(() => {
    if (tab === 0) void loadArms();
  }, [tab, loadArms]);

  useEffect(() => {
    if (tab === 2) void loadScenarios();
  }, [tab, loadScenarios]);

  useEffect(() => {
    if (tab === 3) void loadPerformance();
  }, [tab, loadPerformance]);

  useEffect(() => {
    if (tab === 4) void loadObservability();
  }, [tab, loadObservability]);

  const rows = extractArmsRows(listRaw);
  const { sortedData, requestSort, getSortDirection } = useSortableData<ArmPerformanceItem, ArmSortKey>(armPerf, {
    key: 'avg_return_pct',
    direction: 'desc',
  });

  return (
    <Box
      sx={{
        p: 3,
        minHeight: '100%',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      }}
    >
      <PageHero
        title="ARM manager"
        subtitle="Seed /api/v2/arms — list, create, update, verify-query, scenarios, observability, and arm-level performance."
        variant="teal"
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Seed base: <code>{API_CONFIG.SEED_API_BASE_URL}</code> — uses every <code>/api/v2/arms</code> path from OpenAPI (Registry — ARMs + Observability).
        </Typography>
      </Alert>

      {loading && (
        <Box sx={{ mb: 1 }}>
          <LinearProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v: number) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<Hub />} iconPosition="start" label="ARM catalog" />
          <Tab icon={<Science />} iconPosition="start" label="Verify &amp; create" />
          <Tab icon={<Storage />} iconPosition="start" label="Scenarios" />
          <Tab icon={<Assessment />} iconPosition="start" label="Performance" />
          <Tab icon={<Timeline />} iconPosition="start" label="Observability" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" flexWrap="wrap" gap={2} alignItems="center" sx={{ mb: 2 }}>
              <Select
                size="small"
                value={scenarioFilter}
                displayEmpty
                onChange={(e) => setScenarioFilter(String(e.target.value))}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">All scenarios</MenuItem>
                {scenarioOptions.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
              <Select
                size="small"
                value={statusFilter}
                displayEmpty
                onChange={(e) => setStatusFilter(String(e.target.value))}
                sx={{ minWidth: 160 }}
              >
                <MenuItem value="">All status</MenuItem>
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
              <FormControlLabel
                control={<Switch checked={includeInactive} onChange={(_, c) => setIncludeInactive(c)} />}
                label="Include inactive"
              />
              <Button startIcon={<Refresh />} variant="outlined" onClick={() => void loadArms()} disabled={loading}>
                Reload
              </Button>
            </Stack>
            {listRaw && Object.keys(listRaw).length > 0 && (
              <Accordion defaultExpanded={false} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">Raw list response (debug)</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <StructuredDataView data={listRaw} dense />
                </AccordionDetails>
              </Accordion>
            )}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableBody>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell sx={{ fontWeight: 700 }}>ARM name</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Scenario</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
                  </TableRow>
                  {rows.map((row, idx) => {
                    const name = armCell(row, 'arm_name', 'name', 'arm');
                    const canOpen = name && name !== '—';
                    return (
                      <TableRow key={`${name}-${idx}`} hover>
                        <TableCell>{name}</TableCell>
                        <TableCell>{armCell(row, 'scenario')}</TableCell>
                        <TableCell>
                          <Chip size="small" label={armCell(row, 'status')} variant="outlined" />
                        </TableCell>
                        <TableCell>
                          <Button size="small" disabled={!canOpen} onClick={() => canOpen && void openDetail(name)}>
                            View / edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            {rows.length === 0 && !loading && (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                No rows parsed — check raw payload above or API response shape.
              </Typography>
            )}
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
              POST /api/v2/arms/verify-query
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="Query execution string"
                  value={verifyQuery}
                  onChange={(e) => setVerifyQuery(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Widget ID"
                  value={verifyWidget}
                  onChange={(e) => setVerifyWidget(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <Button startIcon={<PlayArrow />} variant="contained" onClick={() => void runVerify()} disabled={loading || !verifyQuery.trim()}>
                  Run verify
                </Button>
              </Grid>
            </Grid>
            {verifyResult && <StructuredDataView data={verifyResult} title="Verify response" />}

            <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ mt: 3 }}>
              POST /api/v2/arms (after verify succeeds)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  required
                  label="arm_name"
                  value={createForm.arm_name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, arm_name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <Select
                  fullWidth
                  value={createForm.scenario}
                  onChange={(e) => setCreateForm((p) => ({ ...p, scenario: e.target.value }))}
                >
                  {scenarioOptions.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  label="query_string"
                  value={createForm.query_string}
                  onChange={(e) => setCreateForm((p) => ({ ...p, query_string: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="parent_arm (optional)"
                  value={createForm.parent_arm ?? ''}
                  onChange={(e) => setCreateForm((p) => ({ ...p, parent_arm: e.target.value || null }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="description"
                  value={createForm.description ?? ''}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value || null }))}
                />
              </Grid>
              <Grid item xs={12}>
                <Button startIcon={<Save />} variant="contained" color="secondary" onClick={() => void createArm()} disabled={loading}>
                  Create ARM
                </Button>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Box sx={{ p: 2 }}>
            <Button sx={{ mb: 2 }} startIcon={<Refresh />} onClick={() => void loadScenarios()}>
              Reload GET /api/v2/arms/scenarios
            </Button>
            {scenariosRaw && <StructuredDataView data={scenariosRaw} />}
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <TextField
                type="number"
                size="small"
                label="Days"
                value={perfDays}
                onChange={(e) => setPerfDays(Math.max(1, parseInt(e.target.value, 10) || 7))}
                sx={{ width: 100 }}
              />
              <Button startIcon={<Refresh />} variant="outlined" onClick={() => void loadPerformance()}>
                Reload GET /api/v2/dashboard/arm-performance
              </Button>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Arm-level trade stats (dashboard, not registry).
            </Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
              <Table size="small" stickyHeader>
                <SortableTableHead columns={ARM_COLUMNS} onSort={requestSort} getSortDirection={getSortDirection} />
                <TableBody>
                  {sortedData.map((row) => (
                    <TableRow key={row.arm} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{row.arm}</TableCell>
                      <TableCell align="right">{row.total}</TableCell>
                      <TableCell align="right">{row.wins}</TableCell>
                      <TableCell align="right">{row.win_rate.toFixed(1)}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          color: row.avg_return_pct >= 0 ? 'success.main' : 'error.main',
                          fontWeight: 600,
                        }}
                      >
                        {row.avg_return_pct >= 0 ? '+' : ''}
                        {row.avg_return_pct.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </TabPanel>

        <TabPanel value={tab} index={4}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Execution timeline — GET /api/v2/arms/observability/execution-timeline
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mb: 2 }}>
              <TextField size="small" type="number" label="Days" value={timelineDays} onChange={(e) => setTimelineDays(parseInt(e.target.value, 10) || 7)} />
              <TextField size="small" label="arm_name" value={timelineArm} onChange={(e) => setTimelineArm(e.target.value)} />
              <Select
                size="small"
                value={timelineScenario}
                displayEmpty
                onChange={(e) => setTimelineScenario(String(e.target.value))}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="">All scenarios</MenuItem>
                {scenarioOptions.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
              <TextField size="small" type="number" label="limit" value={timelineLimit} onChange={(e) => setTimelineLimit(parseInt(e.target.value, 10) || 200)} />
              <Button startIcon={<Refresh />} onClick={() => void loadObservability()}>
                Reload timeline + learning + utilization
              </Button>
            </Stack>
            {timelineRaw && <StructuredDataView data={timelineRaw} title="Execution timeline" />}
            {learnRaw && <StructuredDataView data={learnRaw} title="Observability learning" />}
            {utilRaw && <StructuredDataView data={utilRaw} title="Observability utilization" />}

            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
              Run summary — GET /api/v2/arms/observability/run/{'{pipeline_run_id}'}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <TextField size="small" fullWidth label="pipeline_run_id" value={runId} onChange={(e) => setRunId(e.target.value)} />
              <Button variant="outlined" onClick={() => void loadRunSummary()}>
                Load run
              </Button>
            </Stack>
            {runRaw && <StructuredDataView data={runRaw} title="Run summary" />}
          </Box>
        </TabPanel>

      </Box>

      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>ARM: {selectedName}</DialogTitle>
        <DialogContent>
          {detailRaw && (
            <Box sx={{ mb: 2 }}>
              <StructuredDataView data={detailRaw} title="GET response" />
            </Box>
          )}
          <Typography variant="subtitle2" gutterBottom>
            PUT /api/v2/arms/{'{arm_name}'} — partial update
          </Typography>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="query_string"
              value={patchForm.query_string ?? ''}
              onChange={(e) => setPatchForm((p) => ({ ...p, query_string: e.target.value }))}
            />
            <TextField
              label="status"
              value={patchForm.status ?? ''}
              onChange={(e) => setPatchForm((p) => ({ ...p, status: e.target.value || undefined }))}
            />
            <TextField
              label="description"
              value={patchForm.description ?? ''}
              onChange={(e) => setPatchForm((p) => ({ ...p, description: e.target.value || null }))}
            />
            <TextField
              label="parent_arm"
              value={patchForm.parent_arm ?? ''}
              onChange={(e) => setPatchForm((p) => ({ ...p, parent_arm: e.target.value || null }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => void savePatch()} disabled={loading}>
            Save changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ArmManagerPage;
