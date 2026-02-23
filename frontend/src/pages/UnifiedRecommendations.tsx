import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  CircularProgress,
  Fade,
  Zoom,
  TableSortLabel
} from '@mui/material';
import {
  Refresh,
  TrendingUp,
  TrendingDown,
  FilterList,
  Analytics,
  Timeline,
  AccountBalance,
  Assessment,
  ExpandMore,
  Star,
} from '@mui/icons-material';
import { useBackgroundRefresh } from '../hooks/useBackgroundRefresh';
import { fetchV2Recommendations, buildV2RecommendationsUrl } from '../services/RecommendationV2Service';
import {
  StrategyType,
  DynamicRecommendationItem,
} from '../types/apiModels';
import type { RankedStockResponse } from '../types/apiModels';

interface RecommendationMetrics {
  totalRecommendations: number;
  averageScore: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  topSector: string;
  averagePrice: number;
  priceRange: { min: number; max: number };
  riskDistribution: { low: number; medium: number; high: number };
  // technicalSignals: string[]; // Removed unused
  marketCondition: string;
  lastUpdated: string;
}

const UnifiedRecommendations: React.FC = () => {
  // State Management
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(StrategyType.SWING);
  const [selectedRisk, setSelectedRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [recommendations, setRecommendations] = useState<DynamicRecommendationItem[]>([]);
  const [metrics, setMetrics] = useState<RecommendationMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCount, setRefreshCount] = useState(0);
  void refreshCount; // display or effects may use
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [minScore, setMinScore] = useState(60);
  const [maxResults, setMaxResults] = useState(20);
  const [sortBy, setSortBy] = useState<'score' | 'price' | 'volume' | 'change' | 'change_5m' | 'change_30m' | 'change_1d' | 'value_traded'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Strategy Configuration
  const strategyConfig = {
    [StrategyType.SWING]: {
      label: 'Swing Trading',
      description: '3-10 day positions',
      icon: <Timeline />,
      color: '#1976d2',
      riskLevel: 'medium',
      minScore: 65,
      timeFrame: '3-10 days'
    },
    [StrategyType.INTRADAY_BUY]: {
      label: 'Intraday Buy',
      description: 'Same day buy signals',
      icon: <TrendingUp />,
      color: '#2e7d32',
      riskLevel: 'high',
      minScore: 70,
      timeFrame: 'Same day'
    },
    [StrategyType.INTRADAY_SELL]: {
      label: 'Intraday Sell',
      description: 'Same day sell signals',
      icon: <TrendingDown />,
      color: '#d32f2f',
      riskLevel: 'high',
      minScore: 0, // Lower default: intraday_sell often has fewer high-scoring stocks; use slider to filter
      timeFrame: 'Same day'
    },
    [StrategyType.LONG_TERM]: {
      label: 'Long Term',
      description: 'Weeks to months holding',
      icon: <AccountBalance />,
      color: '#7b1fa2',
      riskLevel: 'low',
      minScore: 75,
      timeFrame: 'Weeks-Months'
    },
    [StrategyType.SHORT_TERM]: {
      label: 'Short Term',
      description: '1-3 day positions',
      icon: <Timeline />,
      color: '#f57c00',
      riskLevel: 'medium',
      minScore: 70,
      timeFrame: '1-3 days'
    }
  };

  /** Convert prod RankedStockResponse to DynamicRecommendationItem */
  const convertRankedStockToDynamic = (r: RankedStockResponse): DynamicRecommendationItem => {
    const target1 = r.target_1 ?? 0;
    const entry = r.entry_price;
    const expectedReturn = entry > 0 ? ((target1 - entry) / entry) * 100 : 0;
    return {
      symbol: r.symbol,
      nsecode: r.symbol,
      company_name: r.symbol,
      last_price: r.last_price,
      current_price: r.last_price,
      change_percent: r.change_pct ?? 0,
      score: r.score,
      combined_score: r.score,
      technical_score: r.score * 0.7,
      fundamental_score: r.score * 0.3,
      rank: r.rank,
      volume: 0,
      market_cap: 0,
      sector: 'Unknown',
      industry: null,
      rsi: r.rsi_14 ?? 0,
      sma_20: 0,
      sma_50: 0,
      macd: r.macd_state ?? null,
      bollinger_bands: null,
      pe_ratio: 0,
      pb_ratio: 0,
      debt_to_equity: 0,
      roe: 0,
      roa: null,
      indicators: { rsi: r.rsi_14 ?? 0, sma_20: 0, sma_50: 0 },
      metadata: {
        target_price: target1,
        stop_loss: r.stop_loss,
        risk_reward_ratio: r.risk_reward_ratio,
        expected_return_pct: expectedReturn,
        change_5m: null,
        change_30m: null,
        change_1d: r.change_pct ?? null,
        chart_url: `https://chartink.com/stocks-new?symbol=${r.symbol}`,
      },
      confidence: (r.score / 100).toString(),
      source: 'indicators',
      fetched_at: r.ranked_at,
      strategy_type: r.trade_type,
      risk_level: r.max_risk_pct >= 4 ? 'high' : r.max_risk_pct >= 3 ? 'medium' : 'low',
    };
  };

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const config = strategyConfig[selectedStrategy];
      
      console.log(`🎯 [${new Date().toISOString()}] Fetching ${config.label} recommendations using V2 API (risk: ${selectedRisk})`);

      // Prod API: strategy + risk_level (API applies risk-based min_score)
      const v2Request = {
        strategy: selectedStrategy as 'swing' | 'intraday_buy' | 'intraday_sell' | 'long_term' | 'short_term',
        risk_level: selectedRisk,
        limit: Math.min(maxResults, 20),
        min_score: minScore,
      };

      const v2Response = await fetchV2Recommendations(v2Request);

      // Convert prod RankedStockResponse to DynamicRecommendationItem
      const items: DynamicRecommendationItem[] = v2Response.recommendations.map(convertRankedStockToDynamic);
      
      // Apply client-side sorting
      const sortedItems = items.sort((a, b) => {
        let valA: number | null;
        let valB: number | null;

        switch (sortBy) {
          case 'change_5m':
            valA = a.metadata?.change_5m ?? null;
            valB = b.metadata?.change_5m ?? null;
            break;
          case 'change_30m':
            valA = a.metadata?.change_30m ?? null;
            valB = b.metadata?.change_30m ?? null;
            break;
          case 'change_1d':
            valA = a.metadata?.change_1d ?? null;
            valB = b.metadata?.change_1d ?? null;
            break;
          case 'value_traded':
            valA = (a.volume || 0) * (a.current_price || a.last_price || 0);
            valB = (b.volume || 0) * (b.current_price || b.last_price || 0);
            break;
          case 'score':
            valA = a.score;
            valB = b.score;
            break;
          case 'price':
            valA = a.current_price || a.last_price;
            valB = b.current_price || b.last_price;
            break;
          case 'volume':
            valA = a.volume;
            valB = b.volume;
            break;
          case 'change':
            valA = a.change_percent;
            valB = b.change_percent;
            break;
          default:
            valA = null;
            valB = null;
            break;
        }

        // Handle null values for sorting (nulls typically go to the end for numerical sorts)
        if (valA === null && valB === null) return 0;
        if (valA === null) return sortDirection === 'asc' ? 1 : -1;
        if (valB === null) return sortDirection === 'asc' ? -1 : 1;

        if (sortDirection === 'asc') {
          return valA - valB;
        } else {
          return valB - valA;
        }
      });

      setRecommendations(sortedItems);
      setLastRefreshTime(new Date());
      setRefreshCount(prev => prev + 1);
      
      // Calculate metrics from V2 response
      const avgScore = items.length > 0 ? items.reduce((s, i) => s + (i.score ?? 0), 0) / items.length : 0;
      const calculatedMetrics: RecommendationMetrics = {
        totalRecommendations: items.length,
        averageScore: avgScore,
        highConfidenceCount: items.filter(item => parseFloat(item.confidence) >= 0.8).length,
        mediumConfidenceCount: items.filter(item => parseFloat(item.confidence) >= 0.6 && parseFloat(item.confidence) < 0.8).length,
        lowConfidenceCount: items.filter(item => parseFloat(item.confidence) < 0.6).length,
        topSector: getTopSector(items),
        averagePrice: items.length > 0 ? items.reduce((sum, item) => sum + (item.current_price || item.last_price || 0), 0) / items.length : 0,
        priceRange: items.length > 0 ? {
          min: Math.min(...items.map(item => item.current_price || item.last_price || 0)),
          max: Math.max(...items.map(item => item.current_price || item.last_price || 0))
        } : { min: 0, max: 0 },
        riskDistribution: {
          low: items.filter(item => item.risk_level === 'low').length,
          medium: items.filter(item => item.risk_level === 'moderate' || item.risk_level === 'medium').length,
          high: items.filter(item => item.risk_level === 'high').length
        },
        marketCondition: v2Response.trade_type ?? 'LONG',
        lastUpdated: v2Response.generated_at
      };
      
      setMetrics(calculatedMetrics);
      
      console.log('✅ V2 Recommendations loaded successfully:', {
        count: items.length,
        avgScore,
        tradeType: v2Response.trade_type,
        riskLevel: v2Response.risk_level,
        minScoreApplied: v2Response.min_score_applied
      });
    } catch (err: unknown) {
      console.error('❌ Error fetching V2 recommendations:', err);
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : 'Unknown error';
      setError(`Failed to fetch recommendations: ${errorMessage}`);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- applyRiskBasedFiltering, strategyConfig are stable
  }, [selectedStrategy, selectedRisk, minScore, maxResults, sortBy, sortDirection]);

  // Helper functions
  const getTopSector = (items: DynamicRecommendationItem[]): string => {
    if (items.length === 0) return 'Unknown';
    const sectors = items.map((item: DynamicRecommendationItem) => item.sector || 'Unknown');
    const sectorCounts = sectors.reduce((acc: Record<string, number>, sector: string) => {
      acc[sector] = (acc[sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const entries = Object.entries(sectorCounts);
    if (entries.length === 0) return 'Unknown';
    return entries.reduce((a, b) => sectorCounts[a[0]] > sectorCounts[b[0]] ? a : b, entries[0])[0];
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#2e7d32'; // Green
    if (score >= 70) return '#f57c00'; // Orange
    if (score >= 60) return '#d32f2f'; // Red
    return '#757575'; // Gray
  };

  // Background refresh hook
  useBackgroundRefresh(fetchRecommendations, {
    autoRefreshInterval: autoRefresh ? 30000 : 0,
    strategy: selectedStrategy.toLowerCase().replace('_', '-'),
    initialAutoRefresh: true,
    enableCaching: true
  });

  // Effects
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Event handlers
  const handleStrategyChange = (strategy: StrategyType) => {
    setSelectedStrategy(strategy);
    const config = strategyConfig[strategy];
    setMinScore(config.minScore);
    // Sync risk to strategy default (e.g. intraday_sell uses high; API overrides min_score by risk_level)
    setSelectedRisk((config.riskLevel as 'low' | 'medium' | 'high') ?? 'medium');
  };

  const handleRefresh = () => {
    fetchRecommendations();
  };

  const handleAutoRefreshToggle = () => {
    setAutoRefresh(!autoRefresh);
  };

  const handleSortRequest = (property: 'score' | 'price' | 'volume' | 'change' | 'change_5m' | 'change_30m' | 'change_1d' | 'value_traded') => {
    const isAsc = sortBy === property && sortDirection === 'asc';
    setSortDirection(isAsc ? 'desc' : 'asc');
    setSortBy(property);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      {/* Compact Header Banner */}
      <Paper elevation={3} sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        {/* Top Row - Title and Controls */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
              📊 Stock Recommendations
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, fontSize: '0.85rem' }}>
              AI-Powered Analysis with Real-time Metrics
            </Typography>
          </Box>
          <Box display="flex" gap={1.5} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={handleAutoRefreshToggle}
                  color="default"
                  size="small"
                />
              }
              label="Auto Refresh"
              sx={{ color: 'white', fontSize: '0.8rem' }}
            />
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
              size="small"
              sx={{ 
                backgroundColor: 'rgba(255,255,255,0.2)', 
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' },
                fontSize: '0.8rem',
                px: 2
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Middle Row - Strategy and Risk Selection */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          {/* Left: Current Strategy */}
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
              🎯 {strategyConfig[selectedStrategy].label}
            </Typography>
            <Chip
              icon={strategyConfig[selectedStrategy].icon}
              label={strategyConfig[selectedStrategy].description}
              size="small"
              sx={{
                backgroundColor: strategyConfig[selectedStrategy].color,
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.75rem',
                height: '24px'
              }}
            />
            <Chip
              label={`Min: ${strategyConfig[selectedStrategy].minScore}`}
              size="small"
              sx={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                height: '22px'
              }}
            />
          </Box>

          {/* Right: Risk Selector */}
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
              ⚡ Risk:
            </Typography>
            {[
              { value: 'low', label: 'Low', color: '#4caf50', icon: '🟢' },
              { value: 'medium', label: 'Med', color: '#ff9800', icon: '🟡' },
              { value: 'high', label: 'High', color: '#f44336', icon: '🔴' }
            ].map((risk) => (
              <Button
                key={risk.value}
                variant={selectedRisk === risk.value ? 'contained' : 'outlined'}
                onClick={() => setSelectedRisk(risk.value as 'low' | 'medium' | 'high')}
                size="small"
                sx={{
                  backgroundColor: selectedRisk === risk.value ? risk.color : 'rgba(255,255,255,0.1)',
                  borderColor: risk.color,
                  color: selectedRisk === risk.value ? 'white' : 'white',
                  fontWeight: selectedRisk === risk.value ? 'bold' : 'normal',
                  fontSize: '0.7rem',
                  px: 1.5,
                  py: 0.5,
                  minWidth: '60px',
                  '&:hover': {
                    backgroundColor: selectedRisk === risk.value ? risk.color : 'rgba(255,255,255,0.2)',
                    borderColor: risk.color
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {risk.icon} {risk.label}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Bottom Row - Strategy Selector */}
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', fontSize: '0.8rem' }}>
            🔄 Switch Strategy:
          </Typography>
          <Box display="flex" gap={1} flexWrap="wrap">
            {Object.entries(strategyConfig).map(([strategy, config]) => (
              <Button
                key={strategy}
                variant={selectedStrategy === strategy ? 'contained' : 'outlined'}
                startIcon={config.icon}
                onClick={() => handleStrategyChange(strategy as StrategyType)}
                size="small"
                sx={{
                  backgroundColor: selectedStrategy === strategy ? config.color : 'rgba(255,255,255,0.1)',
                  borderColor: selectedStrategy === strategy ? config.color : 'rgba(255,255,255,0.3)',
                  color: selectedStrategy === strategy ? 'white' : 'white',
                  fontWeight: selectedStrategy === strategy ? 'bold' : 'normal',
                  fontSize: '0.75rem',
                  px: 2,
                  py: 0.5,
                  '&:hover': {
                    backgroundColor: selectedStrategy === strategy ? config.color : 'rgba(255,255,255,0.2)',
                    borderColor: config.color,
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {config.label}
              </Button>
            ))}
          </Box>
        </Box>
      </Paper>

      {/* Compact Metrics Dashboard */}
      {metrics && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Card elevation={1} sx={{ height: '80px' }}>
              <CardContent sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box display="flex" alignItems="center" mb={0.5}>
                  <Analytics color="primary" sx={{ mr: 0.5, fontSize: '1rem' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Total</Typography>
                </Box>
                <Typography variant="h5" color="primary" sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {metrics.totalRecommendations}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  {strategyConfig[selectedStrategy].description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card elevation={1} sx={{ height: '80px' }}>
              <CardContent sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box display="flex" alignItems="center" mb={0.5}>
                  <Star color="warning" sx={{ mr: 0.5, fontSize: '1rem' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Avg Score</Typography>
                </Box>
                <Typography variant="h5" sx={{ fontSize: '1.2rem', fontWeight: 'bold', color: getScoreColor(metrics.averageScore) }}>
                  {metrics.averageScore.toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  Range: {Math.min(...recommendations.map((r: DynamicRecommendationItem) => r.score || 0)).toFixed(0)} - {Math.max(...recommendations.map((r: DynamicRecommendationItem) => r.score || 0)).toFixed(0)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card elevation={1} sx={{ height: '80px' }}>
              <CardContent sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box display="flex" alignItems="center" mb={0.5}>
                  <Assessment color="success" sx={{ mr: 0.5, fontSize: '1rem' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Confidence</Typography>
                </Box>
                <Box display="flex" gap={0.5} mb={0.5}>
                  <Chip label={`H:${metrics.highConfidenceCount}`} size="small" color="success" sx={{ fontSize: '0.6rem', height: '18px' }} />
                  <Chip label={`M:${metrics.mediumConfidenceCount}`} size="small" color="warning" sx={{ fontSize: '0.6rem', height: '18px' }} />
                  <Chip label={`L:${metrics.lowConfidenceCount}`} size="small" color="error" sx={{ fontSize: '0.6rem', height: '18px' }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  Top: {metrics.topSector}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Card elevation={1} sx={{ height: '80px' }}>
              <CardContent sx={{ p: 1.5, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box display="flex" alignItems="center" mb={0.5}>
                  <Timeline color="info" sx={{ mr: 0.5, fontSize: '1rem' }} />
                  <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Risk</Typography>
                </Box>
                <Box display="flex" gap={0.5} mb={0.5}>
                  <Chip label={`L:${recommendations.filter((r: DynamicRecommendationItem) => r.risk_level === 'low').length}`} size="small" sx={{ backgroundColor: '#2e7d32', color: 'white', fontSize: '0.6rem', height: '18px' }} />
                  <Chip label={`M:${recommendations.filter((r: DynamicRecommendationItem) => r.risk_level === 'medium').length}`} size="small" sx={{ backgroundColor: '#f57c00', color: 'white', fontSize: '0.6rem', height: '18px' }} />
                  <Chip label={`H:${recommendations.filter((r: DynamicRecommendationItem) => r.risk_level === 'high').length}`} size="small" sx={{ backgroundColor: '#d32f2f', color: 'white', fontSize: '0.6rem', height: '18px' }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                  Updated: {lastRefreshTime?.toLocaleTimeString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Compact Filters */}
      <Paper elevation={1} sx={{ mb: 2 }}>
        <Accordion expanded={expandedFilters} onChange={() => setExpandedFilters(!expandedFilters)}>
          <AccordionSummary 
            expandIcon={<ExpandMore />} 
            sx={{ 
              minHeight: '48px', 
              '& .MuiAccordionSummary-content': { 
                margin: '12px 0',
                alignItems: 'center'
              },
              '& .MuiAccordionSummary-expandIconWrapper': {
                marginRight: '8px'
              }
            }}
          >
            <Box display="flex" alignItems="center">
              <FilterList sx={{ mr: 1, fontSize: '1rem' }} />
              <Typography variant="subtitle2" sx={{ fontSize: '0.9rem' }}>Advanced Filters</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 2, pb: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Box sx={{ mb: 1 }}>
                  <Typography gutterBottom sx={{ fontSize: '0.8rem', mb: 1 }}>Min Score: {minScore}</Typography>
                  <Slider
                    value={minScore}
                    onChange={(_event: Event, value: number | number[]) => setMinScore(value as number)}
                    min={0}
                    max={100}
                    step={5}
                    size="small"
                    marks={[
                      { value: 0, label: '0' },
                      { value: 50, label: '50' },
                      { value: 100, label: '100' }
                    ]}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ mb: 1 }}>
                  <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <InputLabel sx={{ fontSize: '0.8rem' }}>Max Results</InputLabel>
                    <Select
                      value={maxResults}
                      onChange={(e) => setMaxResults(e.target.value as number)}
                      label="Max Results"
                    >
                      <MenuItem value={10}>10</MenuItem>
                      <MenuItem value={20}>20</MenuItem>
                      <MenuItem value={50}>50</MenuItem>
                      <MenuItem value={100}>100</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ mb: 1 }}>
                  <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <InputLabel sx={{ fontSize: '0.8rem' }}>Sort By</InputLabel>
                    <Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'score' | 'price' | 'volume' | 'change' | 'change_5m' | 'change_30m' | 'change_1d' | 'value_traded')}
                      label="Sort By"
                    >
                      <MenuItem value="score">Score</MenuItem>
                      <MenuItem value="price">Price</MenuItem>
                      <MenuItem value="volume">Volume</MenuItem>
                      <MenuItem value="value_traded">Value Traded</MenuItem>
                      <MenuItem value="change">Change %</MenuItem>
                      <MenuItem value="change_5m">5m % Change</MenuItem>
                      <MenuItem value="change_30m">30m % Change</MenuItem>
                      <MenuItem value="change_1d">Day % Change</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ mb: 1 }}>
                  <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                    <InputLabel sx={{ fontSize: '0.8rem' }}>Sort Direction</InputLabel>
                    <Select
                      value={sortDirection}
                      onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                      label="Sort Direction"
                    >
                      <MenuItem value="desc">Descending</MenuItem>
                      <MenuItem value="asc">Ascending</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress size={60} />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Enhanced Recommendations Table */}
      {!loading && recommendations.length > 0 && (
        <Fade in={!loading}>
          <Paper elevation={2} sx={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
            <Box p={2} display="flex" justifyContent="space-between" alignItems="center" sx={{ borderBottom: '1px solid #e0e0e0' }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: strategyConfig[selectedStrategy].color }}>
                  {strategyConfig[selectedStrategy].label} Recommendations
                </Typography>
                <Chip 
                  label={`${recommendations.length} stocks`} 
                  size="small" 
                  sx={{ backgroundColor: strategyConfig[selectedStrategy].color, color: 'white' }}
                />
                <Chip 
                  label={`Risk: ${selectedRisk.toUpperCase()}`} 
                  size="small" 
                  variant="outlined"
                  sx={{ 
                    borderColor: selectedRisk === 'low' ? '#4caf50' : 
                               selectedRisk === 'medium' ? '#ff9800' : '#f44336',
                    color: selectedRisk === 'low' ? '#4caf50' : 
                           selectedRisk === 'medium' ? '#ff9800' : '#f44336'
                  }}
                />
              </Box>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="body2" color="text.secondary">
                  Min Score: {minScore}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Last updated: {lastRefreshTime?.toLocaleTimeString()}
                </Typography>
              </Box>
            </Box>
            <TableContainer sx={{ height: 'calc(100% - 60px)', overflow: 'auto' }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Symbol</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Score</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Price</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Value Traded</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      <TableSortLabel
                        active={sortBy === 'change_5m'}
                        direction={sortDirection}
                        onClick={() => handleSortRequest('change_5m')}
                      >
                        5m %
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      <TableSortLabel
                        active={sortBy === 'change_30m'}
                        direction={sortDirection}
                        onClick={() => handleSortRequest('change_30m')}
                      >
                        30m %
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                      <TableSortLabel
                        active={sortBy === 'change_1d'}
                        direction={sortDirection}
                        onClick={() => handleSortRequest('change_1d')}
                      >
                        Day %
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Target</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Stop Loss</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Sector</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>Risk</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recommendations.map((item: DynamicRecommendationItem, index: number) => (
                    <Zoom in={!loading} timeout={300 + index * 100} key={item.symbol}>
                      <TableRow hover sx={{ '&:hover': { backgroundColor: '#f8f9fa' } }}>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Tooltip title={item.metadata?.chart_url ? "View Chart" : "View on Chartink"}>
                              <Button 
                                variant="contained"
                                size="small"
                                onClick={() => window.open(item.metadata?.chart_url || `https://chartink.com/stocks-new?symbol=${item.symbol}`, '_blank')}
                                sx={{ 
                                  bgcolor: strategyConfig[selectedStrategy].color,
                                  '&:hover': { bgcolor: strategyConfig[selectedStrategy].color },
                                  minWidth: 80,
                                  fontWeight: 'bold',
                                  fontSize: '0.8rem'
                                }}
                              >
                                {item.symbol}
                              </Button>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Chip
                            label={item.score?.toFixed(1) || 'N/A'}
                            size="small"
                            sx={{
                              backgroundColor: getScoreColor(item.score || 0),
                              color: 'white',
                              fontWeight: 'bold',
                              fontSize: '0.75rem'
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                            ₹{(item.current_price || item.last_price || 0).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {( (item.volume || 0) * (item.current_price || item.last_price || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                            {(item.metadata?.change_5m ?? null) !== null ? (
                              <>
                                {item.metadata.change_5m >= 0 ? <TrendingUp fontSize="small" sx={{ color: '#2e7d32' }} /> : <TrendingDown fontSize="small" sx={{ color: '#d32f2f' }} />}
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    fontSize: '0.75rem',
                                    color: item.metadata.change_5m >= 0 ? '#2e7d32' : '#d32f2f'
                                  }}
                                >
                                  {item.metadata.change_5m >= 0 ? '+' : ''}{item.metadata.change_5m.toFixed(2)}%
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="caption" color="text.secondary">N/A</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                            {(item.metadata?.change_30m ?? null) !== null ? (
                              <>
                                {item.metadata.change_30m >= 0 ? <TrendingUp fontSize="small" sx={{ color: '#2e7d32' }} /> : <TrendingDown fontSize="small" sx={{ color: '#d32f2f' }} />}
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    fontSize: '0.75rem',
                                    color: item.metadata.change_30m >= 0 ? '#2e7d32' : '#d32f2f'
                                  }}
                                >
                                  {item.metadata.change_30m >= 0 ? '+' : ''}{item.metadata.change_30m.toFixed(2)}%
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="caption" color="text.secondary">N/A</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                            {(item.metadata?.change_1d ?? item.change_percent ?? null) !== null ? (
                              <>
                                {(item.metadata?.change_1d ?? item.change_percent ?? 0) >= 0 ? <TrendingUp fontSize="small" sx={{ color: '#2e7d32' }} /> : <TrendingDown fontSize="small" sx={{ color: '#d32f2f' }} />}
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontWeight: 'bold',
                                    fontSize: '0.75rem',
                                    color: (item.metadata?.change_1d ?? item.change_percent ?? 0) >= 0 ? '#2e7d32' : '#d32f2f'
                                  }}
                                >
                                  {(item.metadata?.change_1d ?? item.change_percent ?? 0) >= 0 ? '+' : ''}{(item.metadata?.change_1d ?? item.change_percent ?? 0).toFixed(2)}%
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="caption" color="text.secondary">N/A</Typography>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {item.metadata?.target_price ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#2e7d32' }}>
                                ₹{item.metadata.target_price.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                +{item.metadata.expected_return_pct?.toFixed(1)}%
                              </Typography>
                            </Box>
                          ) : <Typography variant="caption" color="text.secondary">N/A</Typography>}
                        </TableCell>
                        <TableCell align="right">
                          {item.metadata?.stop_loss ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem', color: '#d32f2f' }}>
                                ₹{item.metadata.stop_loss.toFixed(2)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                R:R {item.metadata.risk_reward_ratio?.toFixed(1)}
                              </Typography>
                            </Box>
                          ) : <Typography variant="caption" color="text.secondary">N/A</Typography>}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={item.sector || 'N/A'} 
                            size="small" 
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={item.metadata?.risk_tag || item.risk_level || 'moderate'}
                            size="small"
                            sx={{
                              backgroundColor: (item.metadata?.risk_tag || '').includes('high') ? '#4caf50' : 
                                             (item.metadata?.risk_tag || '').includes('moderate') ? '#ff9800' : '#9e9e9e',
                              color: 'white',
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    </Zoom>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Fade>
      )}

      {/* Empty State */}
      {!loading && recommendations.length === 0 && !error && (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No recommendations found
          </Typography>
          <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={2}>
            <Chip 
              label={strategyConfig[selectedStrategy].label} 
              size="small" 
              sx={{ backgroundColor: strategyConfig[selectedStrategy].color, color: 'white' }}
            />
            <Chip 
              label={`Risk: ${selectedRisk}`} 
              size="small" 
              variant="outlined"
              sx={{ 
                borderColor: selectedRisk === 'low' ? '#4caf50' : 
                           selectedRisk === 'medium' ? '#ff9800' : '#f44336',
                color: selectedRisk === 'low' ? '#4caf50' : 
                           selectedRisk === 'medium' ? '#ff9800' : '#f44336'
              }}
            />
            <Chip 
              label={`Min Score: ${minScore}`} 
              size="small" 
              variant="outlined"
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters or refresh the data
          </Typography>
          <Tooltip title="Copy as curl">
            <Typography
              variant="caption"
              component="code"
              sx={{
                mt: 1,
                display: 'block',
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                wordBreak: 'break-all',
                cursor: 'pointer',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' }
              }}
              onClick={() => {
                const url = buildV2RecommendationsUrl({
                  strategy: selectedStrategy as 'swing' | 'intraday_buy' | 'intraday_sell' | 'long_term' | 'short_term',
                  risk_level: selectedRisk,
                  limit: Math.min(maxResults, 20),
                  min_score: minScore
                });
                const curl = `curl -X 'GET' '${url.startsWith('/') ? window.location.origin + url : url}' -H 'accept: application/json'`;
                void navigator.clipboard.writeText(curl);
              }}
            >
              API request: {buildV2RecommendationsUrl({
                strategy: selectedStrategy as 'swing' | 'intraday_buy' | 'intraday_sell' | 'long_term' | 'short_term',
                risk_level: selectedRisk,
                limit: Math.min(maxResults, 20),
                min_score: minScore
              })}
            </Typography>
          </Tooltip>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Last updated: {lastRefreshTime?.toLocaleTimeString() ?? '—'} · Click API request to copy as curl
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default UnifiedRecommendations;
