import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
} from '@mui/material';
import {
  Business,
  TrendingUp,
  Assessment,
  AccountBalance,
  PieChart,
  AttachMoney,
  Refresh,
  AccountBalanceWallet,
} from '@mui/icons-material';
import { recommendationAPIService } from '../services/RecommendationAPIService';
import type { DynamicRecommendationItem } from '../types/trading';
import { seedDashboardService } from '../services/SeedDashboardService';
import TabPanel from '../components/ui/TabPanel';
import InvestmentPreferences from '../components/investing/InvestmentPreferences';
import PortfolioOverview from '../components/investing/PortfolioOverview';
import InvestmentOpportunities from '../components/investing/InvestmentOpportunities';
import FundamentalAnalysis from '../components/investing/FundamentalAnalysis';
import AssetAllocation from '../components/investing/AssetAllocation';
import type { InvestmentOpportunity, PortfolioAllocation } from '../components/investing/types';
import type { CapitalSummaryResponse } from '../types/apiModels';

const DAYS_OPTIONS = [1, 7, 14, 30, 60];

const formatCurrency = (v: number): string => {
  if (Math.abs(v) >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (Math.abs(v) >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (Math.abs(v) >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const Investing: React.FC = () => {
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [capitalSummary, setCapitalSummary] = useState<CapitalSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [days, setDays] = useState(30);
  const [investmentHorizon, setInvestmentHorizon] = useState('medium');
  const [riskTolerance, setRiskTolerance] = useState('moderate');
  const [minMarketCap, setMinMarketCap] = useState(1000);
  const [autoRebalance, setAutoRebalance] = useState(true);

  const fetchSeedData = useCallback(async () => {
    setSeedLoading(true);
    try {
      const summary = await seedDashboardService.getCapitalSummary(days);
      setCapitalSummary(summary);
    } catch {
      setCapitalSummary(null);
    } finally {
      setSeedLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchSeedData();
  }, [fetchSeedData]);

  const fetchInvestmentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const portfolioRequests = [
        { type: 'long-buy' as const, max_recommendations: 20, min_score: 70, risk_profile: 'conservative' as const },
      ];

      const responses = await Promise.all(
        portfolioRequests.map(async (request) => {
          if (request.type === 'long-buy') {
            return await recommendationAPIService.getRecommendationsByType('long-buy', {
              max_recommendations: request.max_recommendations,
              min_score: request.min_score,
              risk_profile: request.risk_profile,
              include_metadata: true,
            });
          }
          return { status: 'error' as const, recommendations: [], total_count: 0, execution_time: 0, timestamp: new Date().toISOString() };
        })
      );

      const allOpportunities: InvestmentOpportunity[] = [];
      responses.forEach((response) => {
        if ('success' in response && response.success && (response.items || response.recommendations)) {
          const items = response.items || response.recommendations || [];
          const enhanced = (items as DynamicRecommendationItem[]).map((stock) => ({
            symbol: stock.symbol ?? '',
            companyName: stock.company_name || 'Unknown',
            name: stock.company_name || 'Unknown',
            sector: stock.sector || 'Unknown',
            marketCap: stock.market_cap ?? 0,
            peRatio: stock.pe_ratio ?? 0,
            pbRatio: stock.pb_ratio ?? 0,
            dividendYield: 0,
            roe: stock.roe ?? 0,
            debt_to_equity: stock.debt_to_equity ?? 0,
            currentRatio: 0,
            price: stock.current_price || stock.last_price || 0,
            targetPrice: stock.current_price || stock.last_price || 0,
            analystRating: 'N/A',
            investmentScore: stock.score || 0,
            fundamentalScore: stock.fundamental_score || 0,
            growthScore: 0,
            valueScore: 0,
            qualityScore: 0,
            riskScore: 0,
            recommendation: 'N/A',
            investmentHorizon: 'N/A',
            allocation_percentage: 0,
          }));
          allOpportunities.push(...enhanced);
        }
      });

      if (allOpportunities.length === 0) {
        setError('No opportunities: recommendation service returned zero items');
      }
      setOpportunities(allOpportunities);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestmentData();
  }, []);

  const cs = capitalSummary;
  const byTradeType = (cs?.by_trade_type ?? {}) as Record<string, { capital_deployed?: number; pnl?: number; positions?: number } | number>;

  const allocationFromSeed: PortfolioAllocation[] = Object.entries(byTradeType).length > 0
    ? Object.entries(byTradeType).map(([key, val]) => {
        const num = typeof val === 'number' ? val : (val?.capital_deployed ?? 0);
        const total = cs ? cs.open_capital_deployed + cs.closed_capital_deployed : 1;
        const pct = total > 0 ? (num / total) * 100 : 0;
        return {
          category: key.replace(/_/g, ' '),
          percentage: Math.round(pct),
          color: '#1976D2',
          description: typeof val === 'object' && val?.positions != null ? `${val.positions} positions` : '',
          amount: typeof num === 'number' ? num : undefined,
        };
      }).filter((a) => a.percentage > 0 || (a.amount ?? 0) > 0)
    : cs
      ? [
          { category: 'Open (deployed)', percentage: cs.open_capital_deployed + cs.closed_capital_deployed > 0 ? Math.round((cs.open_capital_deployed / (cs.open_capital_deployed + cs.closed_capital_deployed)) * 100) : 50, color: '#2E7D32', description: 'Capital in open positions', amount: cs.open_capital_deployed },
          { category: 'Closed', percentage: cs.open_capital_deployed + cs.closed_capital_deployed > 0 ? Math.round((cs.closed_capital_deployed / (cs.open_capital_deployed + cs.closed_capital_deployed)) * 100) : 50, color: '#1976D2', description: 'Capital from closed positions', amount: cs.closed_capital_deployed },
        ]
      : [];

  const portfolioAllocation: PortfolioAllocation[] = allocationFromSeed.length > 0
    ? allocationFromSeed
    : [
        { category: 'Large Cap Growth', percentage: 35, color: '#2E7D32', description: 'Stable growth companies' },
        { category: 'Mid Cap Value', percentage: 25, color: '#1976D2', description: 'Undervalued mid-size companies' },
        { category: 'Dividend Stocks', percentage: 20, color: '#F57C00', description: 'Income generating stocks' },
        { category: 'Small Cap', percentage: 10, color: '#7B1FA2', description: 'High growth potential' },
        { category: 'REITs', percentage: 10, color: '#D32F2F', description: 'Real Estate Investment Trusts' },
      ];

  return (
    <Box sx={{ flexGrow: 1, p: 3, background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)', minHeight: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Business sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a1a2e' }}>
              Investing & Money Monitoring
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Where your capital is deployed, performance and returns
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Period</InputLabel>
            <Select value={days} label="Period" onChange={(e) => setDays(Number(e.target.value))}>
              {DAYS_OPTIONS.map((d) => (
                <MenuItem key={d} value={d}>{d}D</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={fetchSeedData} disabled={seedLoading}>
            Refresh
          </Button>
        </Box>
      </Box>

      {seedLoading && <LinearProgress sx={{ mb: 2 }} />}
      {!cs && !seedLoading && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Connect to Seed (seed-stocks-service) to see live capital deployment and P&L. KPIs below will show real data when available.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <AccountBalanceWallet sx={{ fontSize: 28, color: 'primary.main', mb: 0.5 }} />
              <Typography variant="h5" fontWeight={700}>
                {cs ? formatCurrency(cs.open_capital_deployed) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Open capital deployed</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <PieChart sx={{ fontSize: 28, color: 'info.main', mb: 0.5 }} />
              <Typography variant="h5" fontWeight={700}>
                {cs ? formatCurrency(cs.closed_capital_deployed) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Closed capital ({days}D)</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              {cs && (
                <Box sx={{ color: cs.total_net_pnl >= 0 ? 'success.main' : 'error.main' }}>
                  {cs.total_net_pnl >= 0 ? <TrendingUp sx={{ fontSize: 28, mb: 0.5 }} /> : <AttachMoney sx={{ fontSize: 28, mb: 0.5 }} />}
                </Box>
              )}
              <Typography variant="h5" fontWeight={700} color={cs && cs.total_net_pnl >= 0 ? 'success.main' : cs && cs.total_net_pnl < 0 ? 'error.main' : 'text.primary'}>
                {cs ? formatCurrency(cs.total_net_pnl) : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Net P&L ({days}D)</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h5" fontWeight={700} color={cs && cs.net_return_on_capital_pct >= 0 ? 'success.main' : cs && cs.net_return_on_capital_pct < 0 ? 'error.main' : 'text.primary'}>
                {cs != null && cs.net_return_on_capital_pct != null
                  ? `${cs.net_return_on_capital_pct >= 0 ? '+' : ''}${cs.net_return_on_capital_pct.toFixed(2)}%`
                  : '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary">Return on capital ({days}D)</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <InvestmentPreferences
        investmentHorizon={investmentHorizon}
        riskTolerance={riskTolerance}
        minMarketCap={minMarketCap}
        autoRebalance={autoRebalance}
        onHorizonChange={setInvestmentHorizon}
        onRiskChange={setRiskTolerance}
        onMarketCapChange={setMinMarketCap}
        onAutoRebalanceChange={setAutoRebalance}
      />

      {loading && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>Loading recommendations…</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <CardContent>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tab label="Where is money" icon={<PieChart />} iconPosition="start" />
            <Tab label="Investment opportunities" icon={<TrendingUp />} iconPosition="start" />
            <Tab label="Fundamental analysis" icon={<Assessment />} iconPosition="start" />
            <Tab label="Asset allocation" icon={<AccountBalance />} iconPosition="start" />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <PortfolioOverview portfolioAllocation={portfolioAllocation} />
            {cs && (
              <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#1976d2', 0.06), borderRadius: 2 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>Summary (last {days} days)</Typography>
                <Typography variant="body2">Open positions: {cs.open_positions} · Closed: {cs.closed_positions} · Gross P&L: {formatCurrency(cs.total_gross_pnl)} · Charges: {formatCurrency(cs.total_charges)}</Typography>
              </Box>
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <InvestmentOpportunities opportunities={opportunities} />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <FundamentalAnalysis opportunities={opportunities} />
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <AssetAllocation portfolioAllocation={portfolioAllocation} />
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Investing;
