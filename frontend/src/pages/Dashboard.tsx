import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import { Refresh, Timeline, ShowChart, Storage, Security, Psychology, TrendingUp } from '@mui/icons-material';
import TabPanel from '../components/ui/TabPanel';
import DashboardKpiCards from '../components/dashboard/DashboardKpiCards';
import PerformanceTab from '../components/dashboard/PerformanceTab';
import MarketTrendsTab from '../components/dashboard/MarketTrendsTab';
import UniverseTab from '../components/dashboard/UniverseTab';
import PositionsTab from '../components/dashboard/PositionsTab';
import MLLearningTab from '../components/dashboard/MLLearningTab';
import MarketMoversTab from '../components/dashboard/MarketMoversTab';
import { seedDashboardService } from '../services/SeedDashboardService';
import type {
  DashboardDailySummary,
  TrackedPositionItem,
  UniverseHealthResponse,
  MarketTrendPoint,
  ArmPerformanceItem,
  LearningStatusResponse,
  PerformanceTimelineDay,
  TopMoverItem,
  ScoreBinPerformanceItem,
} from '../types/apiModels';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [days, setDays] = useState(7);

  const [summary, setSummary] = useState<DashboardDailySummary | null>(null);
  const [positions, setPositions] = useState<TrackedPositionItem[]>([]);
  const [universeHealth, setUniverseHealth] = useState<UniverseHealthResponse | null>(null);
  const [marketTimeline, setMarketTimeline] = useState<MarketTrendPoint[]>([]);
  const [armPerformance, setArmPerformance] = useState<ArmPerformanceItem[]>([]);
  const [learningStatus, setLearningStatus] = useState<LearningStatusResponse | null>(null);
  const [perfTimeline, setPerfTimeline] = useState<PerformanceTimelineDay[]>([]);
  const [topGainers, setTopGainers] = useState<TopMoverItem[]>([]);
  const [topLosers, setTopLosers] = useState<TopMoverItem[]>([]);
  const [topTraded, setTopTraded] = useState<TopMoverItem[]>([]);
  const [scoreBins, setScoreBins] = useState<ScoreBinPerformanceItem[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, posRes, univRes, mktRes, armRes, learnRes, perfRes, gainRes, loseRes, tradedRes, binRes] = await Promise.allSettled([
        seedDashboardService.getDailySummary(days),
        seedDashboardService.getPositions({ days, limit: 50 }),
        seedDashboardService.getUniverseHealth(),
        seedDashboardService.getMarketTrends(30),
        seedDashboardService.getArmPerformance(days),
        seedDashboardService.getLearningStatus(),
        seedDashboardService.getPerformanceTimeline(days),
        seedDashboardService.getTopGainers(20, 24),
        seedDashboardService.getTopLosers(20, 24),
        seedDashboardService.getTopTraded(20, 24),
        seedDashboardService.getScoreBinPerformance(undefined, days),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (posRes.status === 'fulfilled') setPositions(posRes.value.positions);
      if (univRes.status === 'fulfilled') setUniverseHealth(univRes.value);
      if (mktRes.status === 'fulfilled') setMarketTimeline(mktRes.value.timeline);
      if (armRes.status === 'fulfilled') setArmPerformance(armRes.value.arms);
      if (learnRes.status === 'fulfilled') setLearningStatus(learnRes.value);
      if (perfRes.status === 'fulfilled') setPerfTimeline(perfRes.value.timeline);
      if (gainRes.status === 'fulfilled') setTopGainers(gainRes.value.gainers);
      if (loseRes.status === 'fulfilled') setTopLosers(loseRes.value.losers);
      if (tradedRes.status === 'fulfilled') setTopTraded(tradedRes.value.top_traded);
      if (binRes.status === 'fulfilled') setScoreBins(binRes.value);

      const failed = [sumRes, posRes, univRes, mktRes].filter((r) => r.status === 'rejected');
      if (failed.length === 4) setError('All dashboard API calls failed. Is seed-stocks-service running?');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  if (loading && !summary) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Seed Stocks Dashboard</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Period</InputLabel>
            <Select value={days} label="Period" onChange={(e) => setDays(Number(e.target.value))}>
              <MenuItem value={1}>1 day</MenuItem>
              <MenuItem value={3}>3 days</MenuItem>
              <MenuItem value={7}>7 days</MenuItem>
              <MenuItem value={14}>14 days</MenuItem>
              <MenuItem value={30}>30 days</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchAll} color="primary"><Refresh /></IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1 }} />}
      {error && <Alert severity="warning" sx={{ mb: 2 }}>{error}</Alert>}

      {summary && <DashboardKpiCards summary={summary} />}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1 }} variant="scrollable" scrollButtons="auto">
        <Tab icon={<Timeline />} label="Performance" iconPosition="start" />
        <Tab icon={<TrendingUp />} label="Market Movers" iconPosition="start" />
        <Tab icon={<ShowChart />} label="Market Trends" iconPosition="start" />
        <Tab icon={<Storage />} label="Universe" iconPosition="start" />
        <Tab icon={<Security />} label="Positions" iconPosition="start" />
        <Tab icon={<Psychology />} label="ML / Learning" iconPosition="start" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <PerformanceTab perfTimeline={perfTimeline} armPerformance={armPerformance} />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <MarketMoversTab topGainers={topGainers} topLosers={topLosers} topTraded={topTraded} />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <MarketTrendsTab marketTimeline={marketTimeline} />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <UniverseTab universeHealth={universeHealth} />
      </TabPanel>
      <TabPanel value={tab} index={4}>
        <PositionsTab positions={positions} />
      </TabPanel>
      <TabPanel value={tab} index={5}>
        <MLLearningTab learningStatus={learningStatus} scoreBins={scoreBins} />
      </TabPanel>
    </Box>
  );
};

export default Dashboard;
