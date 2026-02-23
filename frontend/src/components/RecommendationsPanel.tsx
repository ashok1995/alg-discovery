import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Refresh,
  Star,
  StarBorder,
  Info,
  Speed
} from '@mui/icons-material';

interface Recommendation {
  symbol: string;
  current_price: number;
  recommendation_score: number;
  confidence: number;
  scenario: string;
  technical_indicators: {
    change_pct: number;
    volume: number;
    rsi_5m?: number;
    sma_20?: number;
  };
  price_action_analysis: {
    score: number;
    trend_alignment: string;
    momentum_signal: string;
  };
  sector_analysis: {
    sector: string;
    sector_performance: string;
  };
  recommendation_strength: string;
  entry_signal: string;
  source: string;
  course: string;
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  summary: {
    total_recommendations: number;
    avg_recommendation_score: number;
    scenario: string;
  };
  data_quality: {
    quality_score: number;
    data_sources: Record<string, number>;
  };
}

interface RecommendationsPanelProps {
  refreshInterval?: number;
}

const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  refreshInterval = 60000 // 1 minute
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const scenarios = [
    { key: 'money_making', label: 'Money Making', icon: <Star /> },
    { key: 'top_gainers', label: 'Top Gainers', icon: <TrendingUp /> },
    { key: 'top_losers', label: 'Top Losers', icon: <TrendingDown /> },
    { key: 'volume_leaders', label: 'Volume Leaders', icon: <Speed /> }
  ];

  const fetchRecommendations = async (scenario: string) => {
    try {
      const response = await fetch('/api/seed/stocks/unified-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          limit: 10,
          horizon: 'swing',
          risk_level: 'moderate',
          include_technical_indicators: true,
          include_price_action_analysis: true,
          prefer_real_data: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setRecommendations(data);
      setError(null);
      setLastRefresh(new Date());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch recommendations';
      setError(errorMessage);
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    const scenario = scenarios[newValue].key;
    setLoading(true);
    fetchRecommendations(scenario);
  };

  const handleRefresh = () => {
    setLoading(true);
    const scenario = scenarios[activeTab].key;
    fetchRecommendations(scenario);
  };

  useEffect(() => {
    const scenario = scenarios[activeTab].key;
    fetchRecommendations(scenario);
    
    const interval = setInterval(() => {
      const currentScenario = scenarios[activeTab].key;
      fetchRecommendations(currentScenario);
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [activeTab, refreshInterval]);

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'success';
    if (score >= 0.6) return 'warning';
    return 'error';
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'success.main' : 'error.main';
  };

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'very_high': return 'success';
      case 'high': return 'warning';
      case 'moderate': return 'info';
      default: return 'default';
    }
  };

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'buy': return 'success';
      case 'sell': return 'error';
      case 'hold': return 'info';
      default: return 'default';
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Star />
            Smart Recommendations
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            {recommendations && (
              <Chip
                label={`${recommendations.summary.total_recommendations} stocks`}
                color="primary"
                variant="outlined"
                size="small"
              />
            )}
            <IconButton onClick={handleRefresh} disabled={loading} size="small">
              <Refresh className={loading ? 'spin' : ''} />
            </IconButton>
          </Box>
        </Box>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          {scenarios.map((scenario, index) => (
            <Tab
              key={scenario.key}
              label={scenario.label}
              icon={scenario.icon}
              iconPosition="start"
            />
          ))}
        </Tabs>

        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {recommendations && !loading && (
          <>
            {/* Summary Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {recommendations.summary.avg_recommendation_score.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Score
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {recommendations.summary.total_recommendations}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Recommendations
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {(recommendations.data_quality.quality_score * 100).toFixed(0)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Data Quality
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Recommendations Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Change</TableCell>
                    <TableCell align="right">Score</TableCell>
                    <TableCell align="right">Confidence</TableCell>
                    <TableCell align="center">Signal</TableCell>
                    <TableCell align="center">Sector</TableCell>
                    <TableCell align="center">Source</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recommendations.recommendations.map((rec, index) => (
                    <TableRow key={rec.symbol} hover>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {rec.symbol}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {rec.course}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          ₹{rec.current_price.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          variant="body2"
                          color={getChangeColor(rec.technical_indicators.change_pct)}
                          fontWeight="bold"
                        >
                          {rec.technical_indicators.change_pct >= 0 ? '+' : ''}
                          {rec.technical_indicators.change_pct.toFixed(2)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip
                          label={rec.recommendation_score.toFixed(2)}
                          color={getScoreColor(rec.recommendation_score) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {(rec.confidence * 100).toFixed(0)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={rec.entry_signal.toUpperCase()}
                          color={getSignalColor(rec.entry_signal) as any}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="caption">
                          {rec.sector_analysis.sector}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title={`Source: ${rec.source}`}>
                          <Chip
                            label={rec.source}
                            size="small"
                            variant="outlined"
                            color="info"
                          />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Data Sources Info */}
            <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" gap={1}>
                {Object.entries(recommendations.data_quality.data_sources).map(([source, count]) => (
                  count > 0 && (
                    <Chip
                      key={source}
                      label={`${source}: ${count}`}
                      size="small"
                      variant="outlined"
                    />
                  )
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationsPanel;
