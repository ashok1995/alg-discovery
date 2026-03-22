/**
 * First-class UI for extended GET /api/v2/monitor/learning-insights:
 * Thompson convergence, reward posterior health, learned_insights snapshot.
 * Falls back gracefully when Seed omits v2 fields (older builds).
 */

import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { LearningInsightsResponse } from '../../types/dashboard';
import StructuredDataView from '../ui/StructuredDataView';

function healthTone(health: string | undefined): 'default' | 'success' | 'warning' | 'error' {
  if (!health) return 'default';
  const s = health.toLowerCase();
  if (s.includes('ok') || s.includes('healthy') || s.includes('good') || s.includes('active')) return 'success';
  if (s.includes('warn') || s.includes('degraded') || s.includes('stale') || s.includes('mild')) return 'warning';
  if (s.includes('fail') || s.includes('error') || s.includes('bad') || s.includes('critical')) return 'error';
  return 'default';
}

function formatScalar(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'number' && Number.isFinite(v)) {
    const t = v.toFixed(4).replace(/\.?0+$/, '');
    return t === '' ? '0' : t;
  }
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'string') return v;
  return '…';
}

function formatCacheAge(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
}

const MiniMetric: React.FC<{ label: string; value: string; tone?: 'default' | 'success' | 'warning' | 'error' }> = ({
  label,
  value,
  tone = 'default',
}) => {
  const color =
    tone === 'success'
      ? 'success.main'
      : tone === 'warning'
        ? 'warning.main'
        : tone === 'error'
          ? 'error.main'
          : 'text.primary';
  return (
    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
      <CardContent sx={{ py: 1.25, '&:last-child': { pb: 1.25 } }}>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="subtitle1" sx={{ color, fontWeight: 700 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
};

export interface LearningInsightsV2PanelProps {
  insights: LearningInsightsResponse | null;
}

const LEARNED_SECTION_KEYS: Array<keyof NonNullable<LearningInsightsResponse['learned_insights']>> = [
  'signal_weights',
  'paper_trade_eligible_bins',
  'dynamic_expectations',
  'profit_protection',
  'high_score_perf',
  'context_correlations',
  'regime_horizon_weights',
  'score_band_weights',
];

const LearningInsightsV2Panel: React.FC<LearningInsightsV2PanelProps> = ({ insights }) => {
  if (!insights) {
    return null;
  }

  const conv = insights.convergence;
  const th = conv?.convergence;
  const rd = conv?.reward_distribution;
  const li = insights.learned_insights;

  const hasMeaningfulLi =
    li != null && typeof li === 'object' && !Array.isArray(li) && Object.keys(li as object).length > 0;
  const hasV2 = Boolean(conv || hasMeaningfulLi);
  if (!hasV2) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        Extended learning fields (<strong>convergence</strong>, <strong>learned_insights</strong>) are not in this
        response yet. Use the raw snapshot below or upgrade Seed; see <code>learning-pipeline-improvements-integration.md</code>.
      </Alert>
    );
  }

  const stuck = th?.stuck_arms ?? [];
  const topConfidentRaw = th?.top_confident;
  const topConf = Array.isArray(topConfidentRaw) ? topConfidentRaw : [];

  return (
    <Stack spacing={2} sx={{ mb: 2 }}>
      {conv && (
        <Box>
          <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
            Thompson &amp; reward posterior (convergence)
          </Typography>
          {conv.timestamp && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Computed: {conv.timestamp}
            </Typography>
          )}
          <Grid container spacing={1.5}>
            <Grid item xs={6} sm={4} md={2}>
              <MiniMetric label="Thompson total ARMs" value={formatScalar(th?.total_arms ?? insights.total_arms)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <MiniMetric label="Weight stability" value={formatScalar(th?.weight_stability)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <MiniMetric label="Stuck ARMs" value={String(stuck.length)} tone={stuck.length > 0 ? 'warning' : 'success'} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <MiniMetric label="Saturation %" value={formatScalar(rd?.saturation_pct)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <MiniMetric
                label="Posterior health"
                value={rd?.health ?? '—'}
                tone={healthTone(rd?.health)}
              />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <MiniMetric label="Saturated" value={formatScalar(rd?.is_saturated)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <MiniMetric label="Avg α" value={formatScalar(rd?.avg_alpha)} />
            </Grid>
            <Grid item xs={6} sm={4} md={2}>
              <MiniMetric label="Avg β" value={formatScalar(rd?.avg_beta)} />
            </Grid>
          </Grid>
          {stuck.length > 0 && (
            <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>
                Stuck:
              </Typography>
              {stuck.map((a) => (
                <Chip key={a} size="small" label={a} color="warning" variant="outlined" />
              ))}
            </Stack>
          )}
          {topConf.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" gutterBottom>
                Top confident
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={0.5}>
                {topConf.slice(0, 12).map((row, i) => {
                  const arm = typeof row.arm === 'string' ? row.arm : `row-${i}`;
                  const conf = row.confidence;
                  return (
                    <Chip
                      key={`${arm}-${i}`}
                      size="small"
                      variant="outlined"
                      label={`${arm}: ${formatScalar(conf)}`}
                    />
                  );
                })}
              </Stack>
            </Box>
          )}
          {(th?.evidence_summary && Object.keys(th.evidence_summary).length > 0) || th?.regime_coverage ? (
            <Accordion disableGutters sx={{ mt: 1, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" fontWeight={700}>
                  Evidence &amp; regime coverage (detail)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {th?.evidence_summary && Object.keys(th.evidence_summary).length > 0 && (
                    <StructuredDataView data={th.evidence_summary} title="evidence_summary" dense maxDepth={4} />
                  )}
                  {th?.regime_coverage && Object.keys(th.regime_coverage).length > 0 && (
                    <StructuredDataView data={th.regime_coverage} title="regime_coverage" dense maxDepth={4} />
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ) : null}
          {rd?.posterior_distribution != null ? (
            <Accordion disableGutters sx={{ mt: 0.5, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="body2" fontWeight={700}>
                  Posterior distribution (raw)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <StructuredDataView data={rd.posterior_distribution} title="posterior_distribution" dense maxDepth={5} />
              </AccordionDetails>
            </Accordion>
          ) : null}
        </Box>
      )}

      {li && (
        <Box>
          <Typography variant="subtitle2" fontWeight={800} gutterBottom color="text.secondary">
            Learned insights snapshot
          </Typography>
          <Grid container spacing={1.5} sx={{ mb: 1 }}>
            <Grid item xs={6} sm={4}>
              <MiniMetric label="Cache age" value={formatCacheAge(li.cache_age_seconds)} />
            </Grid>
            <Grid item xs={6} sm={4}>
              <MiniMetric label="Min score adj." value={formatScalar(li.min_score_adj)} />
            </Grid>
          </Grid>
          {LEARNED_SECTION_KEYS.map((key) => {
            const data = li[key];
            if (data === null || data === undefined) return null;
            if (typeof data === 'object' && !Array.isArray(data) && Object.keys(data as object).length === 0) return null;
            return (
              <Accordion key={key} disableGutters sx={{ '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                    {String(key).replace(/_/g, ' ')}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <StructuredDataView data={data} title={key} dense maxDepth={5} />
                </AccordionDetails>
              </Accordion>
            );
          })}
          {li.min_score_adj !== null &&
            li.min_score_adj !== undefined &&
            typeof li.min_score_adj === 'object' && (
              <Accordion disableGutters sx={{ '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2" fontWeight={700}>
                    Min score adj. (detail)
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <StructuredDataView data={li.min_score_adj} title="min_score_adj" dense maxDepth={5} />
                </AccordionDetails>
              </Accordion>
            )}
        </Box>
      )}
    </Stack>
  );
};

export default LearningInsightsV2Panel;
