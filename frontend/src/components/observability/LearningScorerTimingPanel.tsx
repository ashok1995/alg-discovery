/**
 * Scorer & weights timing from GET /api/v2/monitor/learning-insights → scorer_weights_timing.
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Collapse,
  Grid,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import type { LearningInsightsResponse, ScorerWeightsRecentRun } from '../../types/dashboard';
import { formatAbsoluteIso, formatRelativeAgo } from '../../utils/formatObservabilityTime';
import StructuredDataView from '../ui/StructuredDataView';

/** Collapsible section without MUI Accordion (keeps table layout simple). */
const AccordionLite: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2 }}>
      <Box
        onClick={() => setOpen(!open)}
        sx={{ px: 1.5, py: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1 }}
      >
        {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
        <Typography variant="body2" fontWeight={700}>
          {title}
        </Typography>
      </Box>
      <Collapse in={open}>{children}</Collapse>
    </Paper>
  );
};

function statusChipColor(status: string): 'success' | 'warning' | 'error' | 'default' {
  const s = status.toLowerCase();
  if (s === 'ok' || s === 'success') return 'success';
  if (s.includes('warn')) return 'warning';
  if (s.includes('err') || s.includes('fail')) return 'error';
  return 'default';
}

function pickFinishedAt(row: ScorerWeightsRecentRun): string | null {
  const extra = row.extra;
  const fromExtra =
    extra && typeof extra === 'object' && typeof (extra as Record<string, unknown>).finished_at === 'string'
      ? ((extra as Record<string, unknown>).finished_at as string)
      : null;
  return row.finished_at ?? fromExtra ?? null;
}

const RecentRunRow: React.FC<{ row: ScorerWeightsRecentRun; fields: Record<string, string> }> = ({ row, fields }) => {
  const [open, setOpen] = useState(false);
  const started = row.started_at;
  const finished = pickFinishedAt(row);
  const hasExtra = row.extra && typeof row.extra === 'object' && Object.keys(row.extra).length > 0;

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          bgcolor:
            row.status && row.status.toLowerCase() !== 'ok'
              ? (theme) => alpha(theme.palette.error.main, 0.1)
              : undefined,
        }}
      >
        <TableCell width={48}>
          {hasExtra ? (
            <IconButton size="small" aria-label="expand row" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          ) : null}
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={700}>
            {row.process}
          </Typography>
          {row.scenario != null && row.scenario !== '' && (
            <Typography variant="caption" color="text.secondary" display="block">
              {row.scenario}
            </Typography>
          )}
        </TableCell>
        <TableCell>
          <Chip size="small" label={row.status} color={statusChipColor(row.status)} variant="filled" />
        </TableCell>
        <TableCell align="right">{row.duration_ms != null ? `${row.duration_ms.toFixed(0)} ms` : '—'}</TableCell>
        <TableCell sx={{ minWidth: 200 }}>
          <Typography variant="caption" display="block" fontFamily="ui-monospace, monospace">
            {formatAbsoluteIso(started)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatRelativeAgo(started)}
          </Typography>
        </TableCell>
        <TableCell sx={{ minWidth: 200 }}>
          <Typography variant="caption" display="block" fontFamily="ui-monospace, monospace">
            {formatAbsoluteIso(finished)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatRelativeAgo(finished)}
          </Typography>
        </TableCell>
        <TableCell align="right">{row.rows_scanned ?? '—'}</TableCell>
        <TableCell align="right">{row.rows_updated ?? '—'}</TableCell>
        <TableCell>
          <Tooltip title={row.metric_used && fields[row.metric_used] ? fields[row.metric_used] : row.metric_used ?? ''}>
            <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
              {row.metric_used ?? '—'}
            </Typography>
          </Tooltip>
        </TableCell>
      </TableRow>
      {hasExtra && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ py: 1.5, px: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                <StructuredDataView data={row.extra} title="extra (timing breakdown)" dense maxDepth={6} />
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

export interface LearningScorerTimingPanelProps {
  insights: LearningInsightsResponse | null;
}

const LearningScorerTimingPanel: React.FC<LearningScorerTimingPanelProps> = ({ insights }) => {
  const swt = insights?.scorer_weights_timing;
  const fields = swt?.fields && typeof swt.fields === 'object' ? swt.fields : {};

  const recent = useMemo(() => {
    const runs = swt?.recent_runs;
    if (!Array.isArray(runs)) return [];
    return [...runs].reverse().slice(0, 40);
  }, [swt?.recent_runs]);

  const summaryEntries = useMemo(() => {
    const s = swt?.summary_by_process;
    if (!s || typeof s !== 'object') return [];
    return Object.entries(s);
  }, [swt?.summary_by_process]);

  const orchEntries = useMemo(() => {
    const o = swt?.orchestrator_last_scenario_timing;
    if (!o || typeof o !== 'object') return [];
    return Object.entries(o);
  }, [swt?.orchestrator_last_scenario_timing]);

  if (!insights) {
    return <Alert severity="info">Load learning insights to see scorer timing.</Alert>;
  }

  if (!swt) {
    return <Alert severity="info">No <code>scorer_weights_timing</code> in this response (older Seed build).</Alert>;
  }

  return (
    <Stack spacing={2}>
      {Object.keys(fields).length > 0 && (
        <AccordionLite title="Field glossary (server)">
          <StructuredDataView data={fields} title="fields" dense maxDepth={2} />
        </AccordionLite>
      )}

      {summaryEntries.length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
            Summary by process
          </Typography>
          <Grid container spacing={1.5}>
            {summaryEntries.map(([proc, stat]) => (
              <Grid item xs={12} sm={6} md={4} key={proc}>
                <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      {proc}
                    </Typography>
                    <Typography variant="body2">
                      n={stat?.n ?? '—'} · avg{' '}
                      {typeof stat?.avg_duration_ms === 'number' ? `${(stat.avg_duration_ms / 1000).toFixed(2)}s` : '—'} · max{' '}
                      {typeof stat?.max_duration_ms === 'number' ? `${(stat.max_duration_ms / 1000).toFixed(2)}s` : '—'}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      <Box>
        <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
          Recent runs (newest first, up to 40)
        </Typography>
        {recent.length === 0 ? (
          <Alert severity="info">
            No scorer/weight timing recorded yet (service just started, market off, or no cycles yet).
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Process / scenario</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Duration</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Finished</TableCell>
                  <TableCell align="right">Scanned</TableCell>
                  <TableCell align="right">Updated</TableCell>
                  <TableCell>Metric</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recent.map((row, idx) => (
                  <RecentRunRow key={`${row.process}-${row.started_at ?? idx}-${idx}`} row={row} fields={fields} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Box>
        <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
          Orchestrator — last scenario timing
        </Typography>
        {orchEntries.length === 0 ? (
          <Alert severity="info">
            Per-scenario last timing is empty (stateless API or orchestrator not bound). <code>recent_runs</code> above still
            reflects this instance when populated.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Scenario</TableCell>
                  <TableCell align="right">Pipeline ms</TableCell>
                  <TableCell align="right">Scored</TableCell>
                  <TableCell align="right">Ranked</TableCell>
                  <TableCell>Finished</TableCell>
                  <TableCell>Mode</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orchEntries.map(([scenario, raw]) => {
                  const o = raw as Record<string, unknown>;
                  const finished = typeof o.finished_at === 'string' ? o.finished_at : null;
                  const pipelineMs = typeof o.pipeline_total_ms === 'number' ? o.pipeline_total_ms : null;
                  return (
                    <TableRow key={scenario}>
                      <TableCell sx={{ fontWeight: 700 }}>{scenario}</TableCell>
                      <TableCell align="right">{pipelineMs != null ? `${pipelineMs.toFixed(0)}` : '—'}</TableCell>
                      <TableCell align="right">{typeof o.scored === 'number' ? o.scored : '—'}</TableCell>
                      <TableCell align="right">{typeof o.ranked === 'number' ? o.ranked : '—'}</TableCell>
                      <TableCell>
                        <Typography variant="caption" display="block" fontFamily="ui-monospace, monospace">
                          {formatAbsoluteIso(finished)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeAgo(finished)}
                        </Typography>
                      </TableCell>
                      <TableCell>{typeof o.mode === 'string' ? o.mode : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Stack>
  );
};

export default LearningScorerTimingPanel;
