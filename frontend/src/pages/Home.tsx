import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Tabs,
  Tab,
  alpha,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Insights,
  ShowChart,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { seedDashboardService } from '../services/SeedDashboardService';
import type { DashboardDailySummary, TrackedPositionItem, TopMoverItem } from '../types/apiModels';
import { InternalMarketContextCard } from '../components/InternalMarketContextCard';
import HomeOverviewTab from '../components/home/HomeOverviewTab';
import HomeDetailsTab from '../components/home/HomeDetailsTab';
import HomeMarketMoversTab from '../components/home/HomeMarketMoversTab';
import TabPanel from '../components/ui/TabPanel';

interface MarketCard {
  name: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [liveSummary, setLiveSummary] = useState<DashboardDailySummary | null>(null);
  const [recentPositions, setRecentPositions] = useState<TrackedPositionItem[]>([]);
  const [topGainers, setTopGainers] = useState<TopMoverItem[]>([]);
  const [topLosers, setTopLosers] = useState<TopMoverItem[]>([]);
  const [topTraded, setTopTraded] = useState<TopMoverItem[]>([]);
  const [loadingSeed, setLoadingSeed] = useState(true);

  const fetchLiveData = useCallback(async () => {
    try {
      const [sumRes, posRes, gainRes, loseRes, tradedRes] = await Promise.allSettled([
        seedDashboardService.getDailySummary(1),
        seedDashboardService.getPositions({ days: 1, limit: 10 }),
        seedDashboardService.getTopGainers(10, 24),
        seedDashboardService.getTopLosers(10, 24),
        seedDashboardService.getTopTraded(10, 24),
      ]);
      if (sumRes.status === 'fulfilled') setLiveSummary(sumRes.value);
      if (posRes.status === 'fulfilled') setRecentPositions(posRes.value.positions);
      if (gainRes.status === 'fulfilled') setTopGainers(gainRes.value.gainers);
      if (loseRes.status === 'fulfilled') setTopLosers(loseRes.value.losers);
      if (tradedRes.status === 'fulfilled') setTopTraded(tradedRes.value.top_traded);
    } catch { /* silent */ } finally { setLoadingSeed(false); }
  }, []);

  useEffect(() => {
    fetchLiveData();
    const iv = setInterval(fetchLiveData, 60000);
    return () => clearInterval(iv);
  }, [fetchLiveData]);

  const mktCtx = liveSummary?.market_context;
  const nifty = mktCtx?.nifty_50;
  const breadth = mktCtx?.market_breadth;
  const regime = mktCtx?.market_regime;

  const marketCards: MarketCard[] = [
    {
      name: 'NIFTY 50',
      value: nifty?.price ? nifty.price.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—',
      change: nifty?.change_percent != null ? `${nifty.change_percent >= 0 ? '+' : ''}${nifty.change_percent.toFixed(2)}%` : '—',
      trend: (nifty?.change_percent ?? 0) >= 0 ? 'up' : 'down',
      icon: <ShowChart />,
    },
    {
      name: 'VIX India',
      value: mktCtx?.vix_india != null ? mktCtx.vix_india.toFixed(2) : '—',
      change: mktCtx?.vix_level ?? '—',
      trend: (mktCtx?.vix_india ?? 0) > 18 ? 'down' : 'up',
      icon: <Insights />,
    },
    {
      name: 'Market Regime',
      value: regime ? regime.charAt(0).toUpperCase() + regime.slice(1) : '—',
      change: mktCtx?.market_sentiment ?? '—',
      trend: regime === 'bullish' ? 'up' : regime === 'bearish' ? 'down' : 'neutral',
      icon: regime === 'bullish' ? <TrendingUpIcon /> : <TrendingDownIcon />,
    },
    {
      name: 'Advance / Decline',
      value: breadth?.advance_decline_ratio != null ? breadth.advance_decline_ratio.toFixed(2) : '—',
      change: breadth?.advance_count != null ? `${breadth.advance_count}A / ${breadth.decline_count}D` : '—',
      trend: (breadth?.advance_decline_ratio ?? 0) >= 1 ? 'up' : 'down',
      icon: <ShowChart />,
    },
  ];

  const trendColor = (t: string) => (t === 'up' ? '#4caf50' : t === 'down' ? '#f44336' : '#ff9800');

  const recentActivities = recentPositions.map((p) => ({
    time: p.opened_at ? new Date(p.opened_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
    action: p.trade_type.replace(/_/g, ' '),
    stock: p.symbol,
    price: p.entry_price ? `₹${p.entry_price.toFixed(2)}` : '—',
    status: p.status,
  }));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.02em' }}>
          Financial Markets Overview
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
          Real-time market data, indices, and trading opportunities
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1.5 }}>
          <Chip
            label={regime ? `Market: ${regime}` : 'Loading...'}
            color={regime === 'bullish' ? 'success' : regime === 'bearish' ? 'error' : 'warning'}
            size="small"
            sx={{ fontWeight: 600 }}
          />
          <Typography variant="caption" color="text.secondary">
            {liveSummary?.generated_at ? `Updated ${new Date(liveSummary.generated_at).toLocaleTimeString('en-IN')}` : ''}
          </Typography>
        </Box>
      </Box>

      <InternalMarketContextCard />

      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {marketCards.map((card) => {
          const color = trendColor(card.trend);
          return (
            <Grid item xs={12} sm={6} md={3} key={card.name}>
              <Card
                elevation={0}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2.5,
                  transition: 'all 0.25s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: `0 12px 32px ${alpha(color, 0.15)}`,
                  },
                }}
              >
                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="body2" fontWeight={600} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} fontSize="0.72rem">
                      {card.name}
                    </Typography>
                    <Box sx={{ bgcolor: alpha(color, 0.1), borderRadius: 1.5, p: 0.6, display: 'flex', color }}>
                      {card.icon}
                    </Box>
                  </Box>
                  <Typography variant="h4" fontWeight={800} sx={{ mt: 1.5, mb: 0.5, color }}>
                    {card.value}
                  </Typography>
                  <Chip
                    label={card.change}
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.72rem',
                      bgcolor: alpha(color, 0.08),
                      color,
                    }}
                  />
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box sx={{ flexGrow: 1 }}>
        <Tabs
          value={tabValue}
          onChange={(_, v) => setTabValue(v)}
          sx={{
            mb: 2,
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, fontSize: '0.9rem' },
          }}
        >
          <Tab label="Trading Overview" />
          <Tab label="Market Movers" />
          <Tab label="Recent Activities" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <HomeOverviewTab liveSummary={liveSummary} loadingSeed={loadingSeed} onStrategyClick={(p) => navigate(p)} />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
          <HomeMarketMoversTab topGainers={topGainers} topLosers={topLosers} topTraded={topTraded} loading={loadingSeed} />
        </TabPanel>
        <TabPanel value={tabValue} index={2}>
          <HomeDetailsTab recentActivities={recentActivities} />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default Home;
