import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Avatar
} from '@mui/material';
import {
  Business,
  TrendingUp,
  Assessment,
  AccountBalance,
  PieChart,
  AttachMoney,
  Security,
  Refresh,
  FilterList,
  Analytics,
  ShowChart
} from '@mui/icons-material';
import { recommendationAPIService } from '../services/RecommendationAPIService';

interface InvestmentOpportunity {
  symbol: string;
  companyName: string;
  name: string;
  sector: string;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  roe: number;
  debt_to_equity: number;
  currentRatio: number;
  price: number;
  targetPrice: number;
  analystRating: string;
  investmentScore: number;
  fundamentalScore: number;
  growthScore: number;
  valueScore: number;
  qualityScore: number;
  riskScore: number;
  recommendation: string;
  investmentHorizon: string;
  allocation_percentage: number;
}

interface PortfolioAllocation {
  category: string;
  percentage: number;
  color: string;
  description: string;
}

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

  const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );

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

      {/* Investment Preferences */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList /> Investment Preferences
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Investment Horizon</InputLabel>
                <Select
                  value={investmentHorizon}
                  label="Investment Horizon"
                  onChange={(e) => setInvestmentHorizon(e.target.value)}
                >
                  <MenuItem value="short">Short Term (1-2 years)</MenuItem>
                  <MenuItem value="medium">Medium Term (3-5 years)</MenuItem>
                  <MenuItem value="long">Long Term (5+ years)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Risk Tolerance</InputLabel>
                <Select
                  value={riskTolerance}
                  label="Risk Tolerance"
                  onChange={(e) => setRiskTolerance(e.target.value)}
                >
                  <MenuItem value="conservative">Conservative</MenuItem>
                  <MenuItem value="moderate">Moderate</MenuItem>
                  <MenuItem value="aggressive">Aggressive</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography gutterBottom>Minimum Market Cap (₹Cr)</Typography>
              <Slider
                value={minMarketCap}
                onChange={(_, value) => setMinMarketCap(value as number)}
                min={100}
                max={10000}
                step={100}
                valueLabelDisplay="auto"
                marks={[
                  { value: 100, label: '₹100Cr' },
                  { value: 5000, label: '₹5000Cr' },
                  { value: 10000, label: '₹10000Cr' }
                ]}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoRebalance}
                    onChange={(e) => setAutoRebalance(e.target.checked)}
                  />
                }
                label="Auto Rebalance"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

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

// Portfolio Overview Component
const PortfolioOverview: React.FC<{ portfolioAllocation: PortfolioAllocation[] }> = ({ portfolioAllocation }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 3 }}>Current Portfolio Allocation</Typography>
    <Grid container spacing={3}>
      {portfolioAllocation.map((allocation, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card sx={{ border: `3px solid ${allocation.color}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: allocation.color, mr: 2 }}>
                  {allocation.percentage}%
                </Avatar>
                <Box>
                  <Typography variant="h6">{allocation.category}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {allocation.description}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: allocation.color }}>
                ₹{(allocation.percentage * 1250 / 100).toFixed(1)}K
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Box>
);

// Investment Opportunities Component
const InvestmentOpportunities: React.FC<{ opportunities: InvestmentOpportunity[] }> = ({ opportunities }) => {
  const getInvestmentGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', color: 'success' };
    if (score >= 80) return { grade: 'A', color: 'success' };
    if (score >= 70) return { grade: 'B+', color: 'info' };
    if (score >= 60) return { grade: 'B', color: 'warning' };
    return { grade: 'C', color: 'error' };
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Investment Opportunities ({opportunities.length})
      </Typography>
      
      <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell><strong>Company</strong></TableCell>
              <TableCell><strong>Sector</strong></TableCell>
              <TableCell><strong>Investment Grade</strong></TableCell>
              <TableCell><strong>Market Cap</strong></TableCell>
              <TableCell><strong>P/E Ratio</strong></TableCell>
              <TableCell><strong>Dividend Yield</strong></TableCell>
              <TableCell><strong>Target Price</strong></TableCell>
              <TableCell><strong>Allocation</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {opportunities.slice(0, 15).map((opportunity, index) => {
              const grade = getInvestmentGrade(opportunity.investmentScore);
              return (
                <TableRow key={`${opportunity.symbol}-${index}`} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {opportunity.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {opportunity.companyName}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={opportunity.sector} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={grade.grade}
                      color={grade.color as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>₹{opportunity.marketCap.toFixed(0)}Cr</TableCell>
                  <TableCell>{opportunity.peRatio.toFixed(1)}</TableCell>
                  <TableCell>{opportunity.dividendYield.toFixed(2)}%</TableCell>
                  <TableCell>
                    <Typography variant="body2" color="success.main">
                      ₹{opportunity.targetPrice.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>{opportunity.allocation_percentage.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Detailed Analysis">
                        <IconButton size="small" color="primary">
                          <Analytics />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Add to Watchlist">
                        <IconButton size="small" color="secondary">
                          <ShowChart />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

// Fundamental Analysis Component
const FundamentalAnalysis: React.FC<{ opportunities: InvestmentOpportunity[] }> = ({ opportunities }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 3 }}>Fundamental Analysis Dashboard</Typography>
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Valuation Metrics</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>P/E</TableCell>
                    <TableCell>P/B</TableCell>
                    <TableCell>ROE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {opportunities.slice(0, 8).map((opp, index) => (
                    <TableRow key={index}>
                      <TableCell>{opp.symbol}</TableCell>
                      <TableCell>{opp.peRatio.toFixed(1)}</TableCell>
                      <TableCell>{opp.pbRatio.toFixed(1)}</TableCell>
                      <TableCell>{opp.roe.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Financial Health</Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>Debt/Equity</TableCell>
                    <TableCell>Current Ratio</TableCell>
                    <TableCell>Rating</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {opportunities.slice(0, 8).map((opp, index) => (
                    <TableRow key={index}>
                      <TableCell>{opp.symbol}</TableCell>
                      <TableCell>{opp.debt_to_equity.toFixed(2)}</TableCell>
                      <TableCell>{opp.currentRatio.toFixed(1)}</TableCell>
                      <TableCell>
                        <Chip label={opp.analystRating} size="small" color="primary" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

// Asset Allocation Component
const AssetAllocation: React.FC<{ portfolioAllocation: PortfolioAllocation[] }> = ({ portfolioAllocation }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 3 }}>Strategic Asset Allocation</Typography>
    <Alert severity="info" sx={{ mb: 3 }}>
      <Typography variant="body2">
        <strong>Recommended Allocation:</strong> Based on your moderate risk profile and 3-5 year investment horizon.
        <br />
        <strong>Next Rebalancing:</strong> March 2025 or when any category deviates by &gt;5% from target.
      </Typography>
    </Alert>
    
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Current vs Target Allocation</Typography>
            {portfolioAllocation.map((allocation, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{allocation.category}</Typography>
                  <Typography variant="body2">{allocation.percentage}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={allocation.percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: allocation.color
                    }
                  }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>Diversification Metrics</Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Portfolio Beta</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>1.15</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Sharpe Ratio</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>1.8</Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Correlation to Index</Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>0.85</Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="success.main">
              ✓ Well diversified across sectors and market caps
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

export default Investing;