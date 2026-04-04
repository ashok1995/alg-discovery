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
import { Refresh, Timeline, ShowChart, Storage, Security, Psychology, AccountBalance, TrendingUp, ViewList, FiberManualRecord, Bolt } from '@mui/icons-material';
import TabPanel from '../components/ui/TabPanel';
import DashboardKpiCards from '../components/dashboard/DashboardKpiCards';
import PerformanceTab from '../components/dashboard/PerformanceTab';
import MarketTrendsTab from '../components/dashboard/MarketTrendsTab';
import UniverseTab from '../components/dashboard/UniverseTab';
import PositionsTab from '../components/dashboard/PositionsTab';
import MLLearningTab from '../components/dashboard/MLLearningTab';
import CapitalPnlTab from '../components/dashboard/CapitalPnlTab';
import LivePositionsTab from '../components/dashboard/LivePositionsTab';
import MonitorTab from '../components/dashboard/MonitorTab';
import QuickStatsBar from '../components/dashboard/QuickStatsBar';
import SystemAlertsWidget from '../components/dashboard/SystemAlertsWidget';
import HorizonPositionsSection from '../components/home/HorizonPositionsSection';
import HomeMarketMoversTab from '../components/home/HomeMarketMoversTab';
import { seedDashboardService } from '../services/SeedDashboardService';
import type {
  DashboardDailySummary,
  UniverseHealthResponse,
  MarketTrendPoint,
  ArmPerformanceItem,
  LearningStatusResponse,
  PerformanceTimelineDay,
  ScoreBinPerformanceItem,
  AnalysisPerformanceResponse,
  LearningPerformanceResponse,
  CapitalSummaryResponse,
  PnlTimelineDay,
  TrendsSummary,
  GlobalContext,
} from '../types/apiModels';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [days, setDays] = useState(7);

  const [summary, setSummary] = useState<DashboardDailySummary | null>(null);
  const [universeHealth, setUniverseHealth] = useState<UniverseHealthResponse | null>(null);
  const [marketTimeline, setMarketTimeline] = useState<MarketTrendPoint[]>([]);
  const [armPerformance, setArmPerformance] = useState<ArmPerformanceItem[]>([]);
  const [learningStatus, setLearningStatus] = useState<LearningStatusResponse | null>(null);
  const [perfTimeline, setPerfTimeline] = useState<PerformanceTimelineDay[]>([]);


  const [scoreBins, setScoreBins] = useState<ScoreBinPerformanceItem[]>([]);
  const [analysisPerformance, setAnalysisPerformance] = useState<AnalysisPerformanceResponse | null>(null);
  const [learningPerformance, setLearningPerformance] = useState<LearningPerformanceResponse | null>(null);
  const [capitalSummary, setCapitalSummary] = useState<CapitalSummaryResponse | null>(null);
  const [pnlTimeline, setPnlTimeline] = useState<PnlTimelineDay[]>([]);
  const [trendsSummary, setTrendsSummary] = useState<TrendsSummary | null>(null);
  const [globalContext, setGlobalContext] = useState<GlobalContext | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        sumRes,
        univRes,
        mktRes,
        armRes,
        learnRes,
        perfRes,
        binRes,
        analysisRes,
        learnPerfRes,
        capitalRes,
        pnlRes,
      ] = await Promise.allSettled([
        seedDashboardService.getDailySummary(days),
        seedDashboardService.getUniverseHealth(),
        seedDashboardService.getMarketTrends(30),
        seedDashboardService.getArmPerformance(days),
        seedDashboardService.getLearningStatus(),
        seedDashboardService.getPerformanceTimeline(days),
        seedDashboardService.getScoreBinPerformance({ days }),
        seedDashboardService.getAnalysisPerformance(days),
        seedDashboardService.getLearningPerformance({ group_by: 'score_bin', days }),
        seedDashboardService.getCapitalSummary(days),
        seedDashboardService.getPnlTimeline(days),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (univRes.status === 'fulfilled') setUniverseHealth(univRes.value);
      if (mktRes.status === 'fulfilled') {
        setMarketTimeline(mktRes.value.timeline);
        if (mktRes.value.trends_summary) setTrendsSummary(mktRes.value.trends_summary);
        if (mktRes.value.global_context) setGlobalContext(mktRes.value.global_context);
      }
      if (armRes.status === 'fulfilled') setArmPerformance(armRes.value.arms);
      if (learnRes.status === 'fulfilled') setLearningStatus(learnRes.value);
      if (perfRes.status === 'fulfilled') setPerfTimeline(perfRes.value.timeline);
      if (binRes.status === 'fulfilled') setScoreBins(binRes.value);
      if (analysisRes.status === 'fulfilled') setAnalysisPerformance(analysisRes.value);
      if (learnPerfRes.status === 'fulfilled') setLearningPerformance(learnPerfRes.value);
      if (capitalRes.status === 'fulfilled') setCapitalSummary(capitalRes.value);
      if (pnlRes.status === 'fulfilled') setPnlTimeline(pnlRes.value.timeline);

      const failed = [sumRes, univRes, mktRes].filter((r) => r.status === 'rejected');
      if (failed.length === 3) setError('All dashboard API calls failed. Is seed-stocks-service running?');
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a1a2e', letterSpacing: '-0.02em' }}>
            Seed Stocks Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Continuous analysis pipeline — all endpoints integrated
          </Typography>
        </Box>
        <Box display="flex" gap={1.5} alignItems="center">
          <QuickStatsBar />
          <SystemAlertsWidget />
          <FormControl size="small" sx={{ minWidth: 110 }}>
            <InputLabel>Period</InputLabel>
            <Select value={days} label="Period" onChange={(e) => setDays(Number(e.target.value))}>
              <MenuItem value={1}>1 day</MenuItem>
              <MenuItem value={3}>3 days</MenuItem>
              <MenuItem value={7}>7 days</MenuItem>
              <MenuItem value={14}>14 days</MenuItem>
              <MenuItem value={30}>30 days</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh all data">
            <IconButton onClick={fetchAll} color="primary" sx={{ bgcolor: 'primary.50', '&:hover': { bgcolor: 'primary.100' } }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}
      {error && <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {summary && <DashboardKpiCards summary={summary} />}

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          '& .MuiTab-root': { textTransform: 'none', fontWeight: 600, minHeight: 48 },
        }}
      >
        <Tab icon={<ViewList />} label="Positions by Horizon" iconPosition="start" />
        <Tab icon={<TrendingUp />} label="Market Movers" iconPosition="start" />
        <Tab icon={<FiberManualRecord sx={{ fontSize: 10 }} />} label="Live Positions" iconPosition="start" />
        <Tab icon={<Timeline />} label="Performance" iconPosition="start" />
        <Tab icon={<ShowChart />} label="Market Trends" iconPosition="start" />
        <Tab icon={<Storage />} label="Universe" iconPosition="start" />
        <Tab icon={<Security />} label="All Positions" iconPosition="start" />
        <Tab icon={<AccountBalance />} label="Capital & P&L" iconPosition="start" />
        <Tab icon={<Psychology />} label="ML / Learning" iconPosition="start" />
        <Tab icon={<Bolt />} label="Monitor" iconPosition="start" />
      </Tabs>

      <TabPanel value={tab} index={0}>
        <HorizonPositionsSection />
      </TabPanel>
      <TabPanel value={tab} index={1}>
        <HomeMarketMoversTab />
      </TabPanel>
      <TabPanel value={tab} index={2}>
        <LivePositionsTab />
      </TabPanel>
      <TabPanel value={tab} index={3}>
        <PerformanceTab
          perfTimeline={perfTimeline}
          armPerformance={armPerformance}
          analysisPerformance={analysisPerformance}
          learningPerformance={learningPerformance}
        />
      </TabPanel>
      <TabPanel value={tab} index={4}>
        <MarketTrendsTab marketTimeline={marketTimeline} trendsSummary={trendsSummary} globalContext={globalContext} />
      </TabPanel>
      <TabPanel value={tab} index={5}>
        <UniverseTab universeHealth={universeHealth} />
      </TabPanel>
      <TabPanel value={tab} index={6}>
        <PositionsTab />
      </TabPanel>
      <TabPanel value={tab} index={7}>
        <CapitalPnlTab capitalSummary={capitalSummary} pnlTimeline={pnlTimeline} />
      </TabPanel>
      <TabPanel value={tab} index={8}>
        <MLLearningTab learningStatus={learningStatus} scoreBins={scoreBins} />
      </TabPanel>
      <TabPanel value={tab} index={9}>
        <MonitorTab />
      </TabPanel>
    </Box>
  );
};

export default Dashboard;
