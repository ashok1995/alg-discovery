/**
 * Learner schedule / lag from GET /api/v2/monitor/learning-insights → learner_observability.
 */

import React from 'react';
import { Alert, Box, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import type { LearningInsightsResponse } from '../../types/dashboard';
import { formatAbsoluteIso, formatRelativeAgo } from '../../utils/formatObservabilityTime';
import StructuredDataView from '../ui/StructuredDataView';

function scheduleTone(status: string | undefined): 'default' | 'success' | 'warning' | 'error' {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (s.includes('ok') || s.includes('on') || s.includes('healthy')) return 'success';
  if (s.includes('late') || s.includes('warn') || s.includes('stale')) return 'warning';
  if (s.includes('err') || s.includes('fail')) return 'error';
  return 'default';
}

export interface LearningLearnerCadencePanelProps {
  insights: LearningInsightsResponse | null;
}

const LearningLearnerCadencePanel: React.FC<LearningLearnerCadencePanelProps> = ({ insights }) => {
  const lo = insights?.learner_observability;

  if (!insights) {
    return <Alert severity="info">Load learning insights to see learner cadence.</Alert>;
  }

  if (!lo) {
    return <Alert severity="info">No <code>learner_observability</code> in this response (older Seed build).</Alert>;
  }

  const processes = Array.isArray(lo.processes) ? lo.processes : [];

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
          Learner observability snapshot
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Payload time:
          </Typography>
          <Typography variant="body2" fontFamily="ui-monospace, monospace">
            {formatAbsoluteIso(lo.generated_at)}
          </Typography>
          <Chip size="small" label={formatRelativeAgo(lo.generated_at)} variant="outlined" />
        </Stack>
        {lo.error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {lo.error}
          </Alert>
        )}
      </Box>

      {processes.length === 0 ? (
        <Alert severity="info">No process rows yet (cold start or learner not scheduled).</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 440 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Process</TableCell>
                <TableCell>Scenario</TableCell>
                <TableCell>Schedule</TableCell>
                <TableCell align="right">Lag (s)</TableCell>
                <TableCell align="right">Interval (s)</TableCell>
                <TableCell>Last run</TableCell>
                <TableCell>Error</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {processes.map((p, idx) => {
                const name = typeof p.name === 'string' ? p.name : `process-${idx}`;
                const last = typeof p.last_run === 'string' ? p.last_run : null;
                return (
                  <TableRow key={`${name}-${idx}`} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{name}</TableCell>
                    <TableCell>{p.scenario != null && p.scenario !== '' ? String(p.scenario) : '—'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={p.schedule_status ?? '—'}
                        color={scheduleTone(p.schedule_status)}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {p.lag_seconds != null && Number.isFinite(p.lag_seconds) ? String(p.lag_seconds) : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {p.expected_interval_seconds != null && Number.isFinite(p.expected_interval_seconds)
                        ? String(p.expected_interval_seconds)
                        : '—'}
                    </TableCell>
                    <TableCell sx={{ minWidth: 200 }}>
                      <Typography variant="caption" display="block" fontFamily="ui-monospace, monospace">
                        {formatAbsoluteIso(last)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeAgo(last)}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 220, wordBreak: 'break-word' }}>
                      {p.error != null && p.error !== '' ? (
                        <Typography variant="caption" color="error">
                          {String(p.error)}
                        </Typography>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {lo.summary && Object.keys(lo.summary).length > 0 && (
        <Box>
          <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
            Roll-up summary
          </Typography>
          <StructuredDataView data={lo.summary} title="summary" dense maxDepth={5} />
        </Box>
      )}
    </Stack>
  );
};

export default LearningLearnerCadencePanel;
