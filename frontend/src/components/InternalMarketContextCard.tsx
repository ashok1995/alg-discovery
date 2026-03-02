/**
 * Internal Market Context Card
 * Displays internal-market-context (India) and global-context (US/commodities).
 * Redesigned for clarity, visual hierarchy, and consistent card layout.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Grid,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Public,
  LocationOn,
} from '@mui/icons-material';
import { fetchInternalMarketContext, fetchGlobalContext } from '../services/InternalMarketContextService';
import type { InternalMarketContextResponse } from '../types/apiModels';
import type { GlobalContextResponse } from '../types/apiModels';

const formatPct = (v: number): string => (v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`);
const formatPrice = (v: number): string =>
  v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatRegime = (s: string | undefined): string => {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const IndexRow: React.FC<{
  label: string;
  value: string;
  change: number;
}> = ({ label, value, change }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>{label}</Typography>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Typography variant="body1" sx={{ fontWeight: 600, fontSize: '0.95rem' }}>{value}</Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          fontSize: '0.9rem',
          color: change >= 0 ? 'success.main' : 'error.main',
        }}
      >
        {formatPct(change)}
      </Typography>
    </Box>
  </Box>
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
      setInternal(null);
      setGlobalCtx(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !internal && !globalCtx) {
    return (
      <Grid container spacing={4} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rounded" height={360} sx={{ borderRadius: 2 }} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Skeleton variant="rounded" height={360} sx={{ borderRadius: 2 }} />
        </Grid>
      </Grid>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }} onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  const breadth = internal?.market_breadth as { advances: number; declines: number; advance_decline_ratio?: number } | undefined;
  const nifty = internal?.nifty_50 as { price: number; change_percent: number } | undefined;
  const sectors = internal?.sectors as Record<string, { change_percent: number }> | undefined;

  return (
    <Grid container spacing={4} sx={{ mb: 4 }}>
      <>
        {/* India Card */}
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              borderRadius: 2,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <LocationOn color="primary" sx={{ fontSize: 24 }} />
                  <Typography variant="h6" fontWeight={700} color="primary.dark">
                    India
                  </Typography>
                  <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={formatRegime(internal?.market_regime)}
                      size="medium"
                      sx={{ bgcolor: 'primary.50', color: 'primary.dark', fontWeight: 600, py: 0.5 }}
                    />
                    <Chip
                      label={formatRegime(internal?.institutional_sentiment as string | undefined)}
                      size="medium"
                      color="success"
                      sx={{ fontWeight: 600, py: 0.5 }}
                    />
                    {internal?.india_vix != null && (
                      <Chip label={`VIX ${internal.india_vix}`} size="medium" variant="outlined" sx={{ py: 0.5 }} />
                    )}
                  </Box>
                </Box>

                {nifty && (
                  <Box sx={{ mb: 3, p: 2.5, borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontSize: '0.8rem', letterSpacing: 0.5 }}>
                      Nifty 50
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mt: 0.5 }}>
                      <Typography variant="h3" fontWeight={700} color="text.primary" sx={{ fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
                        {formatPrice(nifty.price)}
                      </Typography>
                      <Chip
                        icon={nifty.change_percent >= 0 ? <TrendingUp /> : <TrendingDown />}
                        label={formatPct(nifty.change_percent)}
                        size="medium"
                        color={nifty.change_percent >= 0 ? 'success' : 'error'}
                        sx={{ fontWeight: 600, fontSize: '0.9rem' }}
                      />
                    </Box>
                  </Box>
                )}

                {breadth && (
                  <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
                    <Chip label={`Adv ${breadth.advances}`} size="medium" color="success" sx={{ fontWeight: 600 }} />
                    <Chip label={`Dec ${breadth.declines}`} size="medium" color="error" sx={{ fontWeight: 600 }} />
                    {breadth.advance_decline_ratio != null && (
                      <Chip label={`A/D ${breadth.advance_decline_ratio.toFixed(2)}`} size="medium" variant="outlined" sx={{ fontWeight: 600 }} />
                    )}
                  </Box>
                )}

                {sectors && Object.keys(sectors).length > 0 && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'block', mb: 1.5, fontWeight: 600, fontSize: '0.85rem' }}>
                      Sector Performance
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                      {Object.entries(sectors).map(([name, s]) => (
                        <Chip
                          key={name}
                          label={`${name} ${formatPct(s.change_percent)}`}
                          size="medium"
                          variant="outlined"
                          sx={{
                            fontSize: '0.85rem',
                            fontWeight: 500,
                            py: 0.75,
                            borderColor: s.change_percent >= 0 ? 'success.light' : 'error.light',
                            color: s.change_percent >= 0 ? 'success.dark' : 'error.dark',
                          }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Global Card */}
        <Grid item xs={12} md={6}>
          <Card
            variant="outlined"
            sx={{
              height: '100%',
              borderRadius: 2,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              transition: 'box-shadow 0.2s',
              '&:hover': { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' },
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Public color="secondary" sx={{ fontSize: 24 }} />
                  <Typography variant="h6" fontWeight={700} color="secondary.dark">
                    Global
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <>
                    {globalCtx?.sp500 && (
                      <IndexRow label="S&P 500" value={formatPrice((globalCtx?.sp500 as any)?.price ?? 0)} change={(globalCtx?.sp500 as any)?.change_percent ?? 0} />
                    )}
                    {globalCtx?.nasdaq && (
                      <IndexRow label="Nasdaq" value={formatPrice((globalCtx?.nasdaq as any)?.price ?? 0)} change={(globalCtx?.nasdaq as any)?.change_percent ?? 0} />
                    )}
                    {globalCtx?.dow_jones && (
                      <IndexRow label="Dow Jones" value={formatPrice((globalCtx?.dow_jones as any)?.price ?? 0)} change={(globalCtx?.dow_jones as any)?.change_percent ?? 0} />
                    )}
                  </>
                </Box>

                <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'block', mt: 3, mb: 1.5, fontWeight: 600, fontSize: '0.85rem' }}>
                  Commodities & FX
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
                  <>
                    {(globalCtx?.vix as any)?.value != null && (
                      <Chip label={`VIX ${((globalCtx?.vix as any).value as number).toFixed(1)}`} size="medium" variant="outlined" sx={{ fontSize: '0.85rem', py: 0.75 }} />
                    )}
                    {(globalCtx?.gold as any) && (
                      <Chip
                        label={`Gold ₹${formatPrice((globalCtx?.gold as any).price)} (${formatPct((globalCtx?.gold as any).change_percent)})`}
                        size="medium"
                        variant="outlined"
                        sx={{ fontSize: '0.85rem', py: 0.75 }}
                      />
                    )}
                    {(globalCtx?.usd_inr as any) && (
                      <Chip
                        label={`USD/INR ${formatPrice((globalCtx?.usd_inr as any).rate)} (${formatPct((globalCtx?.usd_inr as any).change_percent)})`}
                        size="medium"
                        variant="outlined"
                        sx={{ fontSize: '0.85rem', py: 0.75 }}
                      />
                    )}
                    {(globalCtx?.crude_oil as any) && (
                      <Chip
                        label={`Crude $${formatPrice((globalCtx?.crude_oil as any).price)} (${formatPct((globalCtx?.crude_oil as any).change_percent)})`}
                        size="medium"
                        variant="outlined"
                        sx={{ fontSize: '0.85rem', py: 0.75 }}
                      />
                    )}
                  </>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {(internal?.timestamp || globalCtx?.timestamp) && (
          <Grid item xs={12} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Updated: {new Date(String(internal?.timestamp ?? globalCtx?.timestamp ?? '')).toLocaleString()}
            </Typography>
          </Grid>
        )}
      </>
    </Grid>
  );
};

export default InternalMarketContextCard;
