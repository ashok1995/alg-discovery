/**
 * Hierarchical learning observability: one hub for learning-insights + related Seed APIs.
 * Parent: section tabs. Children: overview metrics, scorer timing, learner cadence, learned/convergence, ARMs subtree, raw JSON.
 */

import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import TabPanel from '../ui/TabPanel';
import StructuredDataView from '../ui/StructuredDataView';
import LearningInsightsV2Panel from './LearningInsightsV2Panel';
import LearningScorerTimingPanel from './LearningScorerTimingPanel';
import LearningLearnerCadencePanel from './LearningLearnerCadencePanel';
import SortableTableHead, { type ColumnDef } from '../ui/SortableTableHead';
import { useSortableData } from '../../hooks/useSortableData';
import type { ArmLeaderboardResponse, LearningInsightsResponse } from '../../types/dashboard';
import {
  cacheAgeTone,
  formatAbsoluteIso,
  formatRelativeAgo,
  humanizeCacheAgeSeconds,
} from '../../utils/formatObservabilityTime';

const POLL_HINT_SEC = 60;

const toNum = (v: unknown): number | null => (typeof v === 'number' ? v : null);
const toStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);

function healthChipColor(health: string | undefined): 'success' | 'warning' | 'error' | 'default' {
  if (!health) return 'default';
  const s = health.toLowerCase();
  if (s === 'active' || s === 'ok') return 'success';
  if (s === 'inactive') return 'warning';
  if (s === 'error') return 'error';
  return 'default';
}

function pickLearningRunTime(row: Record<string, unknown>): string | null {
  for (const k of ['finished_at', 'started_at', 'timestamp', 'created_at', 'at', 'time']) {
    const v = row[k];
    if (typeof v === 'string') return v;
  }
  return null;
}

function pickLearningRunLabel(row: Record<string, unknown>): string {
  return (
    (typeof row.process === 'string' && row.process) ||
    (typeof row.name === 'string' && row.name) ||
    (typeof row.kind === 'string' && row.kind) ||
    'run'
  );
}

type ArmLbKey = 'arm' | 'positions' | 'win_rate_pct' | 'avg_return_pct' | 'thompson_weight' | 'confidence';
const LB_COLUMNS: ColumnDef<ArmLbKey>[] = [
  { key: 'arm', label: 'ARM', sortable: true, minWidth: 180 },
  { key: 'positions', label: 'Positions', align: 'right', sortable: true },
  { key: 'win_rate_pct', label: 'Win %', align: 'right', sortable: true },
  { key: 'avg_return_pct', label: 'Avg return %', align: 'right', sortable: true },
  { key: 'thompson_weight', label: 'Weight', align: 'right', sortable: true },
  { key: 'confidence', label: 'Confidence', align: 'right', sortable: true },
];

type TopArmKey = 'arm' | 'weight' | 'confidence' | 'observations';
const TOP_ARM_COLUMNS: ColumnDef<TopArmKey>[] = [
  { key: 'arm', label: 'ARM', sortable: true, minWidth: 200 },
  { key: 'weight', label: 'Weight', align: 'right', sortable: true },
  { key: 'confidence', label: 'Confidence', align: 'right', sortable: true },
  { key: 'observations', label: 'Obs', align: 'right', sortable: true },
];

export interface LearningObservabilityHubProps {
  insights: LearningInsightsResponse | null;
  /** Position-tracker :8183 — different schema from monolithic learning-insights. */
  positionTrackerLearningHealth?: Record<string, unknown> | null;
  positionTrackerLearningConvergence?: Record<string, unknown> | null;
  leaderboard: ArmLeaderboardResponse | Record<string, unknown> | null;
  learning: unknown;
  utilization: unknown;
  coverage: unknown;
  /** GET /api/v2/arms/observability/execution-timeline */
  armExecutionTimeline?: unknown;
  /** GET /api/v2/arms/observability/recent-runs */
  armRecentRuns?: unknown;
  loading: boolean;
  onRefresh: () => void;
}

const LearningObservabilityHub: React.FC<LearningObservabilityHubProps> = ({
  insights,
  positionTrackerLearningHealth,
  positionTrackerLearningConvergence,
  leaderboard,
  learning,
  utilization,
  coverage,
  armExecutionTimeline,
  armRecentRuns,
  loading,
  onRefresh,
}) => {
  const [sectionTab, setSectionTab] = useState(0);
  const [armsSubTab, setArmsSubTab] = useState(0);

  const lbRows = Array.isArray((leaderboard as Record<string, unknown> | null)?.leaderboard)
    ? ((leaderboard as Record<string, unknown>).leaderboard as Array<Record<string, unknown>>)
    : [];
  const { sortedData: sortedLbRows, requestSort: sortLb, getSortDirection: lbSortDir } = useSortableData<
    Record<string, unknown>,
    ArmLbKey
  >(lbRows, { key: 'thompson_weight', direction: 'desc' });

  const topArms = insights != null && Array.isArray(insights.top_arms) ? insights.top_arms : [];
  const topArmRows = topArms.map((a) => ({
    arm: a.arm,
    weight: a.weight,
    confidence: a.confidence,
    observations: a.observations,
  }));
  const { sortedData: sortedTopArms, requestSort: sortTop, getSortDirection: topSortDir } = useSortableData<
    (typeof topArmRows)[0],
    TopArmKey
  >(topArmRows, { key: 'weight', direction: 'desc' });

  const learningRuns = insights != null && Array.isArray(insights.learning_runs) ? insights.learning_runs : [];
  const previewRuns = [...learningRuns].slice(-12).reverse();

  const cacheSec = insights?.learned_insights?.cache_age_seconds;
  const cacheTone = cacheAgeTone(cacheSec);

  return (
    <Stack spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Learning &amp; pipeline
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hierarchy: sections below → expand rows / nested tabs. Times show <strong>absolute</strong> + <strong>relative</strong>{' '}
            so you can see when each event ran. Auto-refresh every ~{POLL_HINT_SEC}s while this page is open.
          </Typography>
        </Box>
        <Button size="small" startIcon={<Refresh />} onClick={() => onRefresh()} disabled={loading} variant="outlined">
          Refresh now
        </Button>
      </Box>

      {insights?.error && (
        <Alert severity="error">
          API reported: <code>{insights.error}</code>
        </Alert>
      )}

      <Card variant="outlined" sx={{ borderRadius: 2, bgcolor: 'background.default' }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" gutterBottom display="block">
            Status strip (root payload)
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={4}>
              <Stack spacing={0.5}>
                <Typography variant="caption" color="text.secondary">
                  Learning health
                </Typography>
                <Chip
                  size="small"
                  label={insights?.learning_health ?? '—'}
                  color={healthChipColor(insights?.learning_health)}
                />
              </Stack>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Typography variant="caption" color="text.secondary" display="block">
                Total ARMs
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {String(toNum(insights?.total_arms) ?? 0)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <Typography variant="caption" color="text.secondary" display="block">
                Learning iterations
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {String(toNum(insights?.learning_iterations) ?? '—')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="caption" color="text.secondary" display="block">
                Learned cache age
              </Typography>
              <Typography
                variant="body1"
                fontWeight={700}
                sx={{
                  color:
                    cacheTone === 'success' ? 'success.main' : cacheTone === 'warning' ? 'warning.main' : 'text.primary',
                }}
              >
                {humanizeCacheAgeSeconds(cacheSec)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Payload generated_at
              </Typography>
              <Typography variant="body2" fontFamily="ui-monospace, monospace">
                {formatAbsoluteIso(insights?.generated_at)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatRelativeAgo(insights?.generated_at)}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Learner observability generated_at
              </Typography>
              <Typography variant="body2" fontFamily="ui-monospace, monospace">
                {formatAbsoluteIso(insights?.learner_observability?.generated_at)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatRelativeAgo(insights?.learner_observability?.generated_at)}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={sectionTab}
          onChange={(_, v) => setSectionTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 48 } }}
        >
          <Tab label="Overview" />
          <Tab label="Scorer & weights timing" />
          <Tab label="Learner cadence" />
          <Tab label="Learned & diagnostics" />
          <Tab label="ARMs & related APIs" />
          <Tab label="Full JSON" />
        </Tabs>
      </Box>

      <TabPanel value={sectionTab} index={0}>
        <Stack spacing={2}>
          <Alert severity="info" sx={{ py: 0.5 }}>
            <strong>Split deploy:</strong> Seed <code>:8182</code> (recommendations, arms, candidates,{' '}
            <code>/api/v2/learning/health</code>) vs position-tracker <code>:8183</code> (universal positions, batch, export,{' '}
            <code>/api/v2/monitor/learning-health</code>, <code>learning-convergence</code>). Legacy{' '}
            <code>learning-insights</code> may be absent until re-aggregated. Poll ~{POLL_HINT_SEC}s. See{' '}
            <code>frontend/docs/configuration/SEED_SERVICE_SPLIT_AND_ROUTING.md</code>.
          </Alert>
          <Grid container spacing={1.5}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    Leaderboard (7d) arms
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {String(toNum((leaderboard as Record<string, unknown> | null)?.arms_count) ?? 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    Generated {formatRelativeAgo(toStr((leaderboard as Record<string, unknown> | null)?.generated_at))}
                  </Typography>
                  <Typography variant="caption" fontFamily="ui-monospace, monospace" display="block">
                    {formatAbsoluteIso(toStr((leaderboard as Record<string, unknown> | null)?.generated_at))}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    Recent scorer runs (count)
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {insights != null &&
                    insights.scorer_weights_timing != null &&
                    Array.isArray(insights.scorer_weights_timing.recent_runs)
                      ? insights.scorer_weights_timing.recent_runs.length
                      : 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    Learner processes
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>
                    {insights != null &&
                    insights.learner_observability != null &&
                    Array.isArray(insights.learner_observability.processes)
                      ? insights.learner_observability.processes.length
                      : 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.25 }}>
                  <Typography variant="caption" color="text.secondary">
                    Learning runs history (rows)
                  </Typography>
                  <Typography variant="h6" fontWeight={800}>{learningRuns.length}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {insights?.regime_contexts && insights.regime_contexts.length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
                Regime contexts
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {insights.regime_contexts.map((rc) => (
                  <Chip key={rc} size="small" label={rc} variant="outlined" />
                ))}
              </Stack>
            </Box>
          )}

          <Box>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
              Top ARMs (from learning-insights)
            </Typography>
            {sortedTopArms.length === 0 ? (
              <Alert severity="info">No top_arms in payload (cold start).</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <SortableTableHead columns={TOP_ARM_COLUMNS} onSort={sortTop} getSortDirection={topSortDir} />
                  <TableBody>
                    {sortedTopArms.map((row) => (
                      <TableRow key={row.arm}>
                        <TableCell sx={{ fontWeight: 700 }}>{row.arm}</TableCell>
                        <TableCell align="right">{row.weight.toFixed(4)}</TableCell>
                        <TableCell align="right">{row.confidence.toFixed(4)}</TableCell>
                        <TableCell align="right">{row.observations}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
              Learning runs (recent 12, newest first)
            </Typography>
            {previewRuns.length === 0 ? (
              <Alert severity="info">No learning_runs yet — normal when market is off or service just started.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Label</TableCell>
                      <TableCell>When</TableCell>
                      <TableCell>Relative</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {previewRuns.map((raw, idx) => {
                      const row = raw as Record<string, unknown>;
                      const t = pickLearningRunTime(row);
                      return (
                        <TableRow key={idx}>
                          <TableCell sx={{ fontWeight: 600 }}>{pickLearningRunLabel(row)}</TableCell>
                          <TableCell sx={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem' }}>
                            {formatAbsoluteIso(t)}
                          </TableCell>
                          <TableCell>
                            <Chip size="small" label={formatRelativeAgo(t)} variant="outlined" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>

          {insights?.table_growth && Object.keys(insights.table_growth).length > 0 && (
            <StructuredDataView data={insights.table_growth} title="table_growth" dense maxDepth={4} />
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={sectionTab} index={1}>
        <LearningScorerTimingPanel insights={insights} />
      </TabPanel>

      <TabPanel value={sectionTab} index={2}>
        <LearningLearnerCadencePanel insights={insights} />
      </TabPanel>

      <TabPanel value={sectionTab} index={3}>
        <Stack spacing={2}>
          {positionTrackerLearningHealth != null && Object.keys(positionTrackerLearningHealth).length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
                Position tracker — learning health (<code>GET /api/v2/monitor/learning-health</code>)
              </Typography>
              <StructuredDataView data={positionTrackerLearningHealth} title="learning-health (8183)" dense maxDepth={6} />
            </Box>
          )}
          {positionTrackerLearningConvergence != null && Object.keys(positionTrackerLearningConvergence).length > 0 && (
            <Box>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
                Position tracker — learning convergence (<code>GET /api/v2/monitor/learning-convergence</code>)
              </Typography>
              <StructuredDataView data={positionTrackerLearningConvergence} title="learning-convergence (8183)" dense maxDepth={6} />
            </Box>
          )}
          {insights == null &&
            (positionTrackerLearningHealth == null || Object.keys(positionTrackerLearningHealth).length === 0) &&
            (positionTrackerLearningConvergence == null || Object.keys(positionTrackerLearningConvergence).length === 0) && (
              <Alert severity="warning">
                No <code>learning-insights</code> payload and no position-tracker learning monitors — check{' '}
                <code>SEED_SERVICE_SPLIT_AND_ROUTING.md</code> for which services expose which routes.
              </Alert>
            )}
          {insights != null && (
            <>
              {insights.adaptive_insights != null && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
                    adaptive_insights
                  </Typography>
                  <StructuredDataView data={insights.adaptive_insights} title="adaptive_insights" dense maxDepth={5} />
                </Box>
              )}
              <LearningInsightsV2Panel insights={insights} />
            </>
          )}
        </Stack>
      </TabPanel>

      <TabPanel value={sectionTab} index={4}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            Child level: ARMs observability + candidates coverage. Timestamps are in each payload when Seed provides them.
          </Typography>
          <Button component={RouterLink} to="/arm-manager" size="small" variant="outlined">
            Arm manager
          </Button>
        </Stack>
        <Tabs
          value={armsSubTab}
          onChange={(_, v) => setArmsSubTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ mb: 2, borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
        >
          <Tab label="ARM leaderboard (7d)" />
          <Tab label="ARMs — learning distribution" />
          <Tab label="ARMs — utilization" />
          <Tab label="Candidates — coverage" />
          <Tab label="Execution timeline (7d)" />
          <Tab label="Recent runs (7d)" />
        </Tabs>
        <TabPanel value={armsSubTab} index={0}>
          {lbRows.length > 0 ? (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small" stickyHeader>
                <SortableTableHead columns={LB_COLUMNS} onSort={sortLb} getSortDirection={lbSortDir} />
                <TableBody>
                  {sortedLbRows.map((row, idx) => (
                    <TableRow key={`${toStr(row.arm) ?? 'arm'}-${idx}`}>
                      <TableCell>{toStr(row.arm) ?? '—'}</TableCell>
                      <TableCell align="right">{toNum(row.positions) ?? 0}</TableCell>
                      <TableCell align="right">{(toNum(row.win_rate_pct) ?? 0).toFixed(2)}%</TableCell>
                      <TableCell
                        align="right"
                        sx={{ color: (toNum(row.avg_return_pct) ?? 0) >= 0 ? 'success.main' : 'error.main', fontWeight: 600 }}
                      >
                        {(toNum(row.avg_return_pct) ?? 0).toFixed(2)}%
                      </TableCell>
                      <TableCell align="right">{(toNum(row.thompson_weight) ?? 0).toFixed(3)}</TableCell>
                      <TableCell align="right">{(toNum(row.confidence) ?? 0).toFixed(3)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No leaderboard payload.</Alert>
          )}
        </TabPanel>
        <TabPanel value={armsSubTab} index={1}>
          {learning != null ? (
            <StructuredDataView data={learning} title="/api/v2/arms/observability/learning" dense maxDepth={8} />
          ) : (
            <Alert severity="info">No ARM learning payload.</Alert>
          )}
        </TabPanel>
        <TabPanel value={armsSubTab} index={2}>
          {utilization != null ? (
            <StructuredDataView data={utilization} title="/api/v2/arms/observability/utilization" dense maxDepth={8} />
          ) : (
            <Alert severity="info">No utilization payload.</Alert>
          )}
        </TabPanel>
        <TabPanel value={armsSubTab} index={3}>
          {coverage != null ? (
            <StructuredDataView data={coverage} title="/api/v2/candidates/observability/coverage" dense maxDepth={8} />
          ) : (
            <Alert severity="info">No coverage payload.</Alert>
          )}
        </TabPanel>
        <TabPanel value={armsSubTab} index={4}>
          {armExecutionTimeline != null ? (
            <StructuredDataView
              data={armExecutionTimeline}
              title="/api/v2/arms/observability/execution-timeline"
              dense
              maxDepth={8}
            />
          ) : (
            <Alert severity="info">No execution timeline payload.</Alert>
          )}
        </TabPanel>
        <TabPanel value={armsSubTab} index={5}>
          {armRecentRuns != null ? (
            <StructuredDataView data={armRecentRuns} title="/api/v2/arms/observability/recent-runs" dense maxDepth={8} />
          ) : (
            <Alert severity="info">No recent-runs payload.</Alert>
          )}
        </TabPanel>
      </TabPanel>

      <TabPanel value={sectionTab} index={5}>
        <Stack spacing={2}>
          <Typography variant="caption" color="text.secondary">
            Grandchild: full structured trees for debugging (same data as above).
          </Typography>
          {insights != null && <StructuredDataView data={insights} title="learning-insights (full)" maxDepth={12} />}
          {positionTrackerLearningHealth != null && (
            <StructuredDataView data={positionTrackerLearningHealth} title="8183 monitor/learning-health" maxDepth={12} />
          )}
          {positionTrackerLearningConvergence != null && (
            <StructuredDataView data={positionTrackerLearningConvergence} title="8183 monitor/learning-convergence" maxDepth={12} />
          )}
          {leaderboard != null && <StructuredDataView data={leaderboard} title="arm-leaderboard" maxDepth={8} />}
          {learning != null && <StructuredDataView data={learning} title="arms/observability/learning" maxDepth={8} />}
          {utilization != null && <StructuredDataView data={utilization} title="arms/observability/utilization" maxDepth={8} />}
          {coverage != null && <StructuredDataView data={coverage} title="candidates/observability/coverage" maxDepth={8} />}
          {armExecutionTimeline != null && (
            <StructuredDataView data={armExecutionTimeline} title="arms/observability/execution-timeline" maxDepth={8} />
          )}
          {armRecentRuns != null && (
            <StructuredDataView data={armRecentRuns} title="arms/observability/recent-runs" maxDepth={8} />
          )}
        </Stack>
      </TabPanel>
    </Stack>
  );
};

export default LearningObservabilityHub;
