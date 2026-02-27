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
} from '@mui/material';
import { AccessTime, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { seedDashboardService } from '../services/SeedDashboardService';
import type { DashboardDailySummary, TrackedPositionItem, TopMoverItem } from '../types/apiModels';
import HomeOverviewTab from '../components/home/HomeOverviewTab';
import HomeDetailsTab from '../components/home/HomeDetailsTab';
import HomeMarketMoversTab from '../components/home/HomeMarketMoversTab';
import TabPanel from '../components/ui/TabPanel';

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
  const niftyPrice = mktCtx?.nifty_50?.price;
  const niftyChg = mktCtx?.nifty_50?.change_percent;
  const vix = mktCtx?.vix_india;
  const regime = mktCtx?.market_regime;
  const adRatio = mktCtx?.market_breadth?.advance_decline_ratio;

  const marketIndices = [
    {
      name: 'NIFTY 50',
      value: niftyPrice ? niftyPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—',
      change: niftyChg ? (niftyChg >= 0 ? '+' : '') + niftyChg.toFixed(2) + '%' : '—',
      changePercent: niftyChg ? (niftyChg >= 0 ? '+' : '') + niftyChg.toFixed(2) + '%' : '—',
      trend: (niftyChg ?? 0) >= 0 ? 'up' : 'down',
      volume: '',
    },
    {
      name: 'VIX India',
      value: vix ? vix.toFixed(2) : '—',
      change: mktCtx?.vix_level || '—',
      changePercent: mktCtx?.vix_level || '—',
      trend: vix && vix > 18 ? 'down' : 'up',
      volume: '',
    },
    {
      name: 'Market Regime',
      value: regime ? regime.charAt(0).toUpperCase() + regime.slice(1) : '—',
      change: mktCtx?.market_sentiment || '—',
      changePercent: '',
      trend: regime === 'bullish' ? 'up' : regime === 'bearish' ? 'down' : 'up',
      volume: '',
    },
    {
      name: 'A/D Ratio',
      value: adRatio ? adRatio.toFixed(2) : '—',
      change: mktCtx?.market_breadth?.advance_count
        ? `${mktCtx.market_breadth.advance_count}A / ${mktCtx.market_breadth.decline_count}D`
        : '—',
      changePercent: '',
      trend: (adRatio ?? 0) >= 1 ? 'up' : 'down',
      volume: '',
    },
  ];

  const recentActivities = recentPositions.map((p) => ({
    time: p.opened_at ? new Date(p.opened_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
    action: p.trade_type.replace(/_/g, ' '),
    stock: p.symbol,
    price: p.entry_price ? `₹${p.entry_price.toFixed(2)}` : '—',
    status: p.status,
  }));

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleStrategyClick = (path: string) => {
    navigate(path);
  };

  const getTrendIcon = (trend: string) =>
    trend === 'up' ? <TrendingUpIcon /> : <TrendingDownIcon />;
  const getTrendColor = (trend: string) => (trend === 'up' ? 'success' : 'error');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#1a1a1a' }}>
          Financial Markets Overview
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Real-time market data, indices, and trading opportunities
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <Chip
            label={regime ? `Market: ${regime}` : 'Loading...'}
            color={regime === 'bullish' ? 'success' : regime === 'bearish' ? 'error' : 'warning'}
            size="small"
            icon={<AccessTime />}
          />
          <Typography variant="body2" color="text.secondary">
            Last Update: {liveSummary?.generated_at ? new Date(liveSummary.generated_at).toLocaleTimeString('en-IN') : '—'}
          </Typography>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {marketIndices.map((index, indexKey) => (
          <Grid item xs={12} sm={6} md={3} key={indexKey}>
            <Card
              sx={{
                height: '100%',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                    {index.name}
                  </Typography>
                  <Chip
                    icon={getTrendIcon(index.trend)}
                    label={index.changePercent}
                    color={getTrendColor(index.trend) as 'success' | 'error'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {index.value}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {index.change}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Vol: {index.volume}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="dashboard tabs">
            <Tab label="Trading Overview" />
            <Tab label="Market Movers" />
            <Tab label="Recent Activities" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <HomeOverviewTab
            liveSummary={liveSummary}
            loadingSeed={loadingSeed}
            onStrategyClick={handleStrategyClick}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <HomeMarketMoversTab
            topGainers={topGainers}
            topLosers={topLosers}
            topTraded={topTraded}
            loading={loadingSeed}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <HomeDetailsTab recentActivities={recentActivities} />
        </TabPanel>
      </Box>
    </Box>
  );
};

export default Home;
