import React from 'react';
import { Grid, Card, CardContent, Typography, Box, Chip, alpha } from '@mui/material';
import { TrendingUp, ShowChart, EmojiEvents, Insights } from '@mui/icons-material';
import type { DashboardDailySummary } from '../../types/apiModels';

interface DashboardKpiCardsProps {
  summary: DashboardDailySummary;
  winRateOverride?: number | null;
  avgReturnOverride?: number | null;
  winRateScopeLabel?: string;
}

interface KpiDef {
  label: string;
  value: string;
  subtitle?: string;
  color: string;
  icon: React.ReactNode;
}

const DashboardKpiCards: React.FC<DashboardKpiCardsProps> = ({
  summary,
  winRateOverride,
  avgReturnOverride,
  winRateScopeLabel,
}) => {
  const mktCtx = summary.market_context;
  const regime = mktCtx?.market_regime ?? 'unknown';
  const regimeColor = regime === 'bullish' ? '#4caf50' : regime === 'bearish' ? '#f44336' : '#ff9800';
  const displayedWinRate = winRateOverride ?? summary.positions.win_rate;
  const displayedAvgReturn = avgReturnOverride ?? summary.positions.avg_return_pct;

  const kpis: KpiDef[] = [
    {
      label: 'Open Positions',
      value: String(summary.positions.open),
      subtitle: `${summary.positions.total} total / ${summary.positions.closed} closed`,
      color: '#1976d2',
      icon: <ShowChart />,
    },
    {
      label: 'Win Rate',
      value: `${displayedWinRate.toFixed(1)}%`,
      subtitle: winRateScopeLabel ?? `${summary.positions.wins} wins of ${summary.positions.total}`,
      color: displayedWinRate >= 50 ? '#4caf50' : '#f44336',
      icon: <EmojiEvents />,
    },
    {
      label: 'Avg Return',
      value: `${displayedAvgReturn > 0 ? '+' : ''}${displayedAvgReturn.toFixed(2)}%`,
      subtitle: `${summary.period_days}-day period`,
      color: displayedAvgReturn >= 0 ? '#4caf50' : '#f44336',
      icon: <TrendingUp />,
    },
    {
      label: 'Market Regime',
      value: regime.charAt(0).toUpperCase() + regime.slice(1),
      subtitle: mktCtx?.vix_india != null ? `VIX ${mktCtx.vix_india.toFixed(1)} (${mktCtx.vix_level ?? ''})` : undefined,
      color: regimeColor,
      icon: <Insights />,
    },
  ];

  return (
    <Grid container spacing={2} sx={{ mb: 3 }}>
      {kpis.map((kpi) => (
        <Grid item xs={6} sm={3} key={kpi.label}>
          <Card
            elevation={0}
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${alpha(kpi.color, 0.15)}` },
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                  {kpi.label}
                </Typography>
                <Box sx={{ bgcolor: alpha(kpi.color, 0.1), borderRadius: 1.5, p: 0.75, display: 'flex', color: kpi.color }}>
                  {kpi.icon}
                </Box>
              </Box>
              <Typography variant="h4" fontWeight={700} sx={{ mt: 1, color: kpi.color }}>
                {kpi.value}
              </Typography>
              {kpi.subtitle && (
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  {kpi.subtitle}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}

      {summary.universe && Object.keys(summary.universe).length > 0 && (
        <Grid item xs={12}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ py: 1.5, px: 2 }}>
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Typography variant="body2" fontWeight={600} color="text.secondary">Universe:</Typography>
                {Object.entries(summary.universe).map(([k, v]) => (
                  <Chip
                    key={k}
                    label={`${k.replace(/_/g, ' ')} ${v}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 500, textTransform: 'capitalize' }}
                  />
                ))}
                <Chip
                  label={`Total: ${Object.values(summary.universe).reduce((a, b) => a + b, 0)}`}
                  size="small"
                  color="primary"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default DashboardKpiCards;
