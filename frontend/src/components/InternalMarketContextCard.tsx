/**
 * Market Context Card — India + Global
 * Compact trend tables: Regime, RSI, ROC per timeframe.
 * Global: regime chips per horizon with tooltip details.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Skeleton,
  Alert,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  alpha,
} from '@mui/material';
import { TrendingUp, TrendingDown, Public, LocationOn } from '@mui/icons-material';
import { fetchInternalMarketContext, fetchGlobalContext } from '../services/InternalMarketContextService';
import type {
  InternalMarketContextResponse,
  GlobalContextResponse,
  TrendTimeframe,
  GlobalAsset,
  IndexTrend,
} from '../types/apiModels';

const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
const fmtPrice = (v: number) => v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type IndiaIndexCard = {
  name: string;
  price: string;
  chg: number;
  trend: IndexTrend;
  extra?: string;
};

/** API may return null index snapshots — never assume nested objects exist. */
function buildIndiaIndexCards(internal: InternalMarketContextResponse): IndiaIndexCard[] {
  const out: IndiaIndexCard[] = [];
  const n = internal.nifty_50;
  if (n && typeof n.price === 'number' && Number.isFinite(n.price)) {
    out.push({
      name: 'NIFTY 50',
      price: fmtPrice(n.price),
      chg: typeof n.change_percent === 'number' && Number.isFinite(n.change_percent) ? n.change_percent : 0,
      trend: n.trend ?? {},
    });
  }
  const b = internal.bank_nifty;
  if (b && typeof b.price === 'number' && Number.isFinite(b.price)) {
    out.push({
      name: 'BANK NIFTY',
      price: fmtPrice(b.price),
      chg: typeof b.change_percent === 'number' && Number.isFinite(b.change_percent) ? b.change_percent : 0,
      trend: b.trend ?? {},
    });
  }
  const v = internal.india_vix;
  if (v && typeof v.value === 'number' && Number.isFinite(v.value)) {
    out.push({
      name: 'INDIA VIX',
      price: v.value.toFixed(2),
      chg: 0,
      trend: v.trend ?? {},
      extra: typeof v.level === 'string' ? v.level : undefined,
    });
  }
  return out;
}

type GlobalTableRow = {
  name: string;
  price: string;
  change: number;
  trend: Omit<IndexTrend, 'intraday'>;
};

function globalAssetRow(
  name: string,
  asset: GlobalAsset | null | undefined,
  formatPrice: (n: number) => string
): GlobalTableRow {
  if (!asset) {
    return { name, price: '—', change: 0, trend: {} };
  }
  const raw = asset.price ?? asset.value ?? asset.rate;
  const num = raw == null ? NaN : Number(raw);
  const price = Number.isFinite(num) ? formatPrice(num) : '—';
  const change =
    typeof asset.change_percent === 'number' && Number.isFinite(asset.change_percent) ? asset.change_percent : 0;
  return { name, price, change, trend: asset.trend ?? {} };
}

function buildGlobalTableRows(ctx: GlobalContextResponse): GlobalTableRow[] {
  const vixRow: GlobalTableRow =
    ctx.vix && typeof ctx.vix.value === 'number' && Number.isFinite(ctx.vix.value)
      ? {
          name: 'VIX US',
          price: ctx.vix.value.toFixed(1),
          change: 0,
          trend: ctx.vix.trend ?? {},
        }
      : { name: 'VIX US', price: '—', change: 0, trend: {} };

  return [
    globalAssetRow('S&P 500', ctx.sp500, fmtPrice),
    globalAssetRow('NASDAQ', ctx.nasdaq, fmtPrice),
    globalAssetRow('Dow', ctx.dow_jones, fmtPrice),
    vixRow,
    globalAssetRow('Gold', ctx.gold, (n) => `$${fmtPrice(n)}`),
    globalAssetRow('USD/INR', ctx.usd_inr, (n) => n.toFixed(2)),
    globalAssetRow('Crude', ctx.crude_oil, (n) => `$${n.toFixed(2)}`),
    globalAssetRow('Nikkei', ctx.nikkei, fmtPrice),
    globalAssetRow('Hang Seng', ctx.hang_seng, fmtPrice),
  ];
}

const regimeColor = (r: string | null | undefined): string => {
  if (r == null || typeof r !== 'string') return '#ff9800';
  if (r.includes('strong_bullish')) return '#2e7d32';
  if (r.includes('bullish') || r.includes('weak_bullish')) return '#4caf50';
  if (r.includes('strong_bearish')) return '#c62828';
  if (r.includes('bearish')) return '#f44336';
  return '#ff9800';
};

const RegimeChip: React.FC<{ label: string; small?: boolean }> = ({ label, small }) => (
  <Chip
    label={label.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
    size="small"
    sx={{
      fontWeight: 700,
      fontSize: small ? '0.55rem' : '0.58rem',
      height: small ? 16 : 18,
      bgcolor: alpha(regimeColor(label), 0.12),
      color: regimeColor(label),
    }}
  />
);

const TrendRow: React.FC<{ label: string; tf?: TrendTimeframe }> = ({ label, tf }) => {
  if (!tf) return null;
  const rsiColor = tf.rsi < 30 ? '#f44336' : tf.rsi > 70 ? '#4caf50' : '#ff9800';
  return (
    <TableRow sx={{ '&:last-child td': { borderBottom: 0 } }}>
      <TableCell sx={{ py: 0.2, px: 0.5, fontSize: '0.62rem', fontWeight: 700, color: 'text.disabled', width: 36 }}>
        {label}
      </TableCell>
      <TableCell sx={{ py: 0.2, px: 0.3 }}>
        <RegimeChip label={tf.regime} small />
      </TableCell>
      <TableCell align="right" sx={{ py: 0.2, px: 0.3, width: 30 }}>
        <Tooltip title={`Vol: ${tf.volatility_regime} | ATR: ${tf.atr_pct.toFixed(1)}% | SMA dist: ${tf.sma_distance_pct >= 0 ? '+' : ''}${tf.sma_distance_pct.toFixed(1)}%`} arrow>
          <Typography variant="body2" component="span" sx={{ fontWeight: 700, fontSize: '0.65rem', color: rsiColor, cursor: 'help' }}>
            {tf.rsi.toFixed(0)}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell align="right" sx={{ py: 0.2, px: 0.3, width: 40, fontSize: '0.62rem', fontWeight: 600, color: tf.roc >= 0 ? 'success.main' : 'error.main' }}>
        {tf.roc >= 0 ? '+' : ''}{tf.roc.toFixed(1)}%
      </TableCell>
    </TableRow>
  );
};

const TrendTable: React.FC<{ trend: { intraday?: TrendTimeframe; short_term?: TrendTimeframe; medium_term?: TrendTimeframe; long_term?: TrendTimeframe } }> = ({ trend }) => (
  <Table size="small" sx={{ '& td, & th': { px: 0.3 }, tableLayout: 'auto' }}>
    <TableHead>
      <TableRow>
        <TableCell sx={{ py: 0, fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>TF</TableCell>
        <TableCell sx={{ py: 0, fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>Regime</TableCell>
        <TableCell align="right" sx={{ py: 0, fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>RSI</TableCell>
        <TableCell align="right" sx={{ py: 0, fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>ROC</TableCell>
      </TableRow>
    </TableHead>
    <TableBody>
      <TrendRow label="Intra" tf={trend.intraday} />
      <TrendRow label="Short" tf={trend.short_term} />
      <TrendRow label="Med" tf={trend.medium_term} />
      <TrendRow label="Long" tf={trend.long_term} />
    </TableBody>
  </Table>
);

const GlobalAssetRow: React.FC<{ name: string; price: string; change: number; trend: { short_term?: TrendTimeframe; medium_term?: TrendTimeframe; long_term?: TrendTimeframe } }> = ({ name, price, change, trend }) => (
  <TableRow hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
    <TableCell sx={{ py: 0.4, px: 0.5, fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{name}</TableCell>
    <TableCell align="right" sx={{ py: 0.4, px: 0.5, fontSize: '0.7rem', fontWeight: 600 }}>{price}</TableCell>
    <TableCell align="right" sx={{ py: 0.4, px: 0.5, fontSize: '0.68rem', fontWeight: 700, color: change >= 0 ? 'success.main' : 'error.main' }}>
      {fmtPct(change)}
    </TableCell>
    {['short_term', 'medium_term', 'long_term'].map((tf) => {
      const t = trend[tf as keyof typeof trend];
      return (
        <TableCell key={tf} align="center" sx={{ py: 0.4, px: 0.3 }}>
          {t ? (
            <Tooltip title={`RSI: ${t.rsi.toFixed(1)} | ROC: ${t.roc >= 0 ? '+' : ''}${t.roc.toFixed(1)}% | Vol: ${t.volatility_regime}`} arrow>
              <span><RegimeChip label={t.regime} small /></span>
            </Tooltip>
          ) : '—'}
        </TableCell>
      );
    })}
  </TableRow>
);

export const InternalMarketContextCard: React.FC = () => {
  const [internal, setInternal] = useState<InternalMarketContextResponse | null>(null);
  const [globalCtx, setGlobalCtx] = useState<GlobalContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [intRes, globRes] = await Promise.all([
        fetchInternalMarketContext(),
        fetchGlobalContext(),
      ]);
      setInternal(intRes);
      setGlobalCtx(globRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load market context');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 120_000);
    return () => clearInterval(iv);
  }, [load]);

  const indiaCards = useMemo(() => (internal ? buildIndiaIndexCards(internal) : []), [internal]);

  if (loading) {
    return (
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}><Skeleton variant="rectangular" height={260} sx={{ borderRadius: 3 }} /></Grid>
        <Grid item xs={12} md={5}><Skeleton variant="rectangular" height={260} sx={{ borderRadius: 3 }} /></Grid>
      </Grid>
    );
  }
  if (error) return <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>;

  return (
    <Grid container spacing={2}>
      {/* India */}
      <Grid item xs={12} md={7}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 1.5 } }}>
            {/* Header badges */}
            <Box display="flex" alignItems="center" gap={0.8} mb={1} flexWrap="wrap">
              <LocationOn sx={{ color: '#ff9800', fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={800}>India</Typography>
              {internal && (
                <>
                  <RegimeChip label={internal.market_regime ?? '—'} />
                  <Chip label={`Vol: ${internal.volatility_regime ?? '—'}`} size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 600 }} />
                  {typeof internal.confidence_score === 'number' && Number.isFinite(internal.confidence_score) && (
                    <Chip label={`Conf: ${(internal.confidence_score * 100).toFixed(0)}%`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 600 }} />
                  )}
                  {internal.institutional_sentiment != null && internal.institutional_sentiment !== '' && (
                    <Chip
                      label={`Inst: ${internal.institutional_sentiment}`}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: '0.55rem',
                        fontWeight: 600,
                        bgcolor: alpha(regimeColor(internal.institutional_sentiment), 0.1),
                        color: regimeColor(internal.institutional_sentiment),
                      }}
                    />
                  )}
                </>
              )}
            </Box>

            {internal && (
              <>
                {/* Index cards — only entries the API returned with valid numbers */}
                <Grid container spacing={1.5}>
                  {indiaCards.length === 0 ? (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">
                        Index snapshots unavailable (feed may be offline).
                      </Typography>
                    </Grid>
                  ) : (
                    indiaCards.map((idx) => (
                      <Grid item xs={12} sm={4} key={idx.name}>
                        <Box sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 1 }}>
                          <Box display="flex" justifyContent="space-between" alignItems="baseline" mb={0.3}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" fontSize="0.6rem">{idx.name}</Typography>
                            {idx.extra ? (
                              <Chip label={idx.extra} size="small" sx={{ height: 14, fontSize: '0.5rem', fontWeight: 700, bgcolor: alpha(idx.extra === 'low' ? '#4caf50' : '#f44336', 0.1), color: idx.extra === 'low' ? '#4caf50' : '#f44336' }} />
                            ) : (
                              <Typography variant="caption" fontWeight={700} fontSize="0.6rem" color={idx.chg >= 0 ? 'success.main' : 'error.main'}>
                                {fmtPct(idx.chg)}
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.3 }}>{idx.price}</Typography>
                          <TrendTable trend={idx.trend} />
                        </Box>
                      </Grid>
                    ))
                  )}
                </Grid>

                {/* Breadth + Sectors */}
                {internal.market_breadth && (
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Chip icon={<TrendingUp sx={{ fontSize: 10 }} />} label={`Adv ${internal.market_breadth.advances}`} size="small" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 600, bgcolor: alpha('#4caf50', 0.1), color: '#4caf50' }} />
                    <Chip icon={<TrendingDown sx={{ fontSize: 10 }} />} label={`Dec ${internal.market_breadth.declines}`} size="small" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 600, bgcolor: alpha('#f44336', 0.1), color: '#f44336' }} />
                    <Chip label={`A/D ${Number(internal.market_breadth.advance_decline_ratio).toFixed(2)}`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.58rem', fontWeight: 600 }} />
                    {internal.sectors && Object.keys(internal.sectors).length > 0 && (
                      <>
                        <Box sx={{ width: 1, height: 12, bgcolor: 'divider', mx: 0.3 }} />
                        {Object.entries(internal.sectors).map(([name, s]) => (
                          <Chip
                            key={name}
                            label={`${name} ${s.change_percent >= 0 ? '+' : ''}${s.change_percent.toFixed(1)}%`}
                            size="small"
                            sx={{ height: 18, fontSize: '0.55rem', fontWeight: 600, bgcolor: alpha(s.change_percent >= 0 ? '#4caf50' : '#f44336', 0.06), color: s.change_percent >= 0 ? '#2e7d32' : '#c62828' }}
                          />
                        ))}
                      </>
                    )}
                  </Box>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Global */}
      <Grid item xs={12} md={5}>
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 1.5 } }}>
            <Box display="flex" alignItems="center" gap={0.8} mb={1}>
              <Public sx={{ color: '#2196f3', fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={800}>Global</Typography>
            </Box>

            {globalCtx && (
              <Table size="small" sx={{ '& td, & th': { px: 0.4 } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ py: 0, fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>Asset</TableCell>
                    <TableCell align="right" sx={{ py: 0, fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>Price</TableCell>
                    <TableCell align="right" sx={{ py: 0, fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>Chg%</TableCell>
                    <TableCell align="center" sx={{ py: 0, fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>Short</TableCell>
                    <TableCell align="center" sx={{ py: 0, fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>Med</TableCell>
                    <TableCell align="center" sx={{ py: 0, fontSize: '0.5rem', fontWeight: 700, color: 'text.disabled' }}>Long</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {buildGlobalTableRows(globalCtx).map((row) => (
                    <GlobalAssetRow key={row.name} name={row.name} price={row.price} change={row.change} trend={row.trend} />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};
