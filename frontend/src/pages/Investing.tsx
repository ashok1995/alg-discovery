import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button,
  Alert, LinearProgress, Tabs, Tab,
} from '@mui/material';
import {
  Business, TrendingUp, Assessment, AccountBalance,
  PieChart, AttachMoney, Security, Refresh,
} from '@mui/icons-material';
import { recommendationAPIService } from '../services/RecommendationAPIService';
import TabPanel from '../components/ui/TabPanel';
import InvestmentPreferences from '../components/investing/InvestmentPreferences';
import PortfolioOverview from '../components/investing/PortfolioOverview';
import InvestmentOpportunities from '../components/investing/InvestmentOpportunities';
import FundamentalAnalysis from '../components/investing/FundamentalAnalysis';
import AssetAllocation from '../components/investing/AssetAllocation';
import type { InvestmentOpportunity, PortfolioAllocation } from '../components/investing/types';

const Investing: React.FC = () => {
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [investmentHorizon, setInvestmentHorizon] = useState('medium');
  const [riskTolerance, setRiskTolerance] = useState('moderate');
  const [minMarketCap, setMinMarketCap] = useState(1000);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future sector filter
  const [sectors] = useState<string[]>(['Technology', 'Healthcare', 'Finance']);
  const [autoRebalance, setAutoRebalance] = useState(true);

  // Portfolio allocation data
  const portfolioAllocation: PortfolioAllocation[] = [
    { category: 'Large Cap Growth', percentage: 35, color: '#2E7D32', description: 'Stable growth companies' },
    { category: 'Mid Cap Value', percentage: 25, color: '#1976D2', description: 'Undervalued mid-size companies' },
    { category: 'Dividend Stocks', percentage: 20, color: '#F57C00', description: 'Income generating stocks' },
    { category: 'Small Cap', percentage: 10, color: '#7B1FA2', description: 'High growth potential' },
    { category: 'REITs', percentage: 10, color: '#D32F2F', description: 'Real Estate Investment Trusts' }
  ];

  const fetchInvestmentData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch multiple investment categories via centralized service
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
              include_metadata: true
            });
          }
          return { status: 'error' as const, recommendations: [], total_count: 0, execution_time: 0, timestamp: new Date().toISOString() };
        })
      );

      // Process and enhance data for investment analysis
      const allOpportunities: InvestmentOpportunity[] = [];
      
      responses.forEach((response, index) => {
        if ('success' in response && response.success && (response.items || response.recommendations)) {
          const items = response.items || response.recommendations || [];
          const enhanced = items.map((stock: any) => ({
            symbol: stock.symbol,
            companyName: stock.company_name || stock.name || 'Unknown',
            name: stock.company_name || stock.name || 'Unknown',
            sector: stock.sector || 'Unknown',
            marketCap: stock.market_cap ?? 0,
            peRatio: stock.pe_ratio ?? 0,
            pbRatio: stock.pb_ratio ?? 0,
            dividendYield: stock.dividend_yield ?? 0,
            roe: stock.roe ?? 0,
            debt_to_equity: stock.debt_to_equity ?? 0,
            currentRatio: stock.current_ratio ?? 0,
            price: stock.current_price || stock.last_price || 0,
            targetPrice: stock.current_price || stock.last_price || 0,
            analystRating: 'N/A',
            investmentScore: stock.score || 0,
            fundamentalScore: stock.fundamental_score || 0,
            growthScore: 0,
            valueScore: 0,
            qualityScore: 0,
            riskScore: 0,
            recommendation: stock.recommendation_type || 'N/A',
            investmentHorizon: 'N/A',
            allocation_percentage: 0
          }));
          
          allOpportunities.push(...enhanced);
        }
      });

      if (allOpportunities.length === 0) {
        setError('No opportunities: recommendation service returned zero items');
      }

      setOpportunities(allOpportunities);
      console.log(`✅ [${new Date().toISOString()}] Investing: Loaded ${allOpportunities.length} investment opportunities`);
      
    } catch (err: any) {
      console.error(`❌ [${new Date().toISOString()}] Investing: Failed to fetch data:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestmentData();
  }, []);

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Business sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Investment Platform
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Comprehensive investment analysis, portfolio management & wealth building
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<Refresh />}
            onClick={fetchInvestmentData}
            disabled={loading}
            sx={{ minWidth: 120 }}
          >
            {loading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {/* Investment Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <PieChart sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" gutterBottom>Portfolio Value</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>₹12.5L</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>+15.2% this year</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" gutterBottom>Active Investments</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{opportunities.length}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Across 8 sectors</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AttachMoney sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" gutterBottom>Monthly Dividend</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>₹8,200</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>3.2% yield</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Security sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" gutterBottom>Risk Score</Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>Medium</Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>Balanced portfolio</Typography>
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

      {/* Loading and Error States */}
      {loading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
            Analyzing investment opportunities across multiple asset classes...
          </Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to fetch investment data: {error}
        </Alert>
      )}

      {/* Investment Analysis Tabs */}
      <Card>
        <CardContent>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}
          >
            <Tab 
              label="Portfolio Overview" 
              icon={<PieChart />} 
              iconPosition="start"
            />
            <Tab 
              label="Investment Opportunities" 
              icon={<TrendingUp />} 
              iconPosition="start"
            />
            <Tab 
              label="Fundamental Analysis" 
              icon={<Assessment />} 
              iconPosition="start"
            />
            <Tab 
              label="Asset Allocation" 
              icon={<AccountBalance />} 
              iconPosition="start"
            />
          </Tabs>

          <TabPanel value={activeTab} index={0}>
            <PortfolioOverview portfolioAllocation={portfolioAllocation} />
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
