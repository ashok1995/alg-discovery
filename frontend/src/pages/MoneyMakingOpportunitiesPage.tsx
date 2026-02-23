/**
 * Money Making Opportunities Page
 * ===============================
 *
 * Main page for displaying and managing money-making opportunities from the seed-stocks-service.
 * Provides filtering, sorting, and detailed analysis of stock opportunities.
 */

import React, { useState, useMemo } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  Divider,
  Stack,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { useMoneyMakingOpportunities } from '../hooks/useMoneyMakingOpportunities';
import { OpportunityResponse, OpportunityRequest } from '../services/MoneyMakingOpportunitiesService';

type SortableKeys = 'rank' | 'symbol' | 'current_price' | 'daily_change_pct' | 'opportunity_score' | 'opportunity_type' | 'risk_level';

interface SortConfig {
  key: SortableKeys;
  direction: 'asc' | 'desc';
}

const MoneyMakingOpportunitiesPage: React.FC = () => {
  const {
    opportunities,
    summary,
    loading,
    error,
    serviceInfo,
    rankOpportunities,
    getQuickOpportunities,
    getHighConfidenceOpportunities,
    getLowRiskOpportunities,
    getMomentumOpportunities,
    getVolumeSurgeOpportunities,
    clearError,
    totalOpportunities,
    averageScore,
    topOpportunity,
    isServiceAvailable,
  } = useMoneyMakingOpportunities(60000); // Auto-refresh every minute

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'opportunity_score', direction: 'desc' });
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [minScore, setMinScore] = useState<number>(0);

  /**
   * Handle sorting
   */
  const handleSort = (key: SortableKeys) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  /**
   * Filter opportunities
   */
  const filteredOpportunities = useMemo(() => {
    let filtered = opportunities;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(opp => opp.opportunity_type === filterType);
    }

    // Filter by risk level
    if (filterRisk !== 'all') {
      filtered = filtered.filter(opp => opp.risk_level === filterRisk);
    }

    // Filter by minimum score
    if (minScore > 0) {
      filtered = filtered.filter(opp => opp.opportunity_score >= minScore);
    }

    // Sort
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof OpportunityResponse];
      const bVal = b[sortConfig.key as keyof OpportunityResponse];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return 0;
    });

    return filtered;
  }, [opportunities, sortConfig, filterType, filterRisk, minScore]);

  /**
   * Handle custom ranking request
   */
  const handleCustomRanking = async () => {
    const request: OpportunityRequest = {
      min_opportunity_score: minScore || undefined,
      opportunity_types: filterType !== 'all' ? [filterType] : undefined,
      max_risk_level: filterRisk !== 'all' ? filterRisk : undefined,
      limit: 50,
      include_analysis: true,
      include_volume_analysis: true,
    };

    await rankOpportunities(request);
  };

  /**
   * Get opportunity type color
   */
  const getOpportunityTypeColor = (type: string): 'primary' | 'secondary' | 'success' | 'warning' | 'error' => {
    const colorMap: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
      'breakout': 'success',
      'momentum': 'primary',
      'reversal': 'warning',
      'support_bounce': 'secondary',
      'volume_surge': 'error',
      'gap_up': 'warning',
      'technical_setup': 'primary',
    };
    return colorMap[type] || 'primary';
  };

  /**
   * Get risk level color
   */
  const getRiskLevelColor = (risk: string): 'success' | 'warning' | 'error' => {
    const colorMap: Record<string, 'success' | 'warning' | 'error'> = {
      'low': 'success',
      'medium': 'warning',
      'high': 'error',
      'very_high': 'error',
    };
    return colorMap[risk] || 'warning';
  };

  if (!isServiceAvailable) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Money Making Opportunities service is not available. Please check your configuration.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        💰 Money Making Opportunities
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Total Opportunities
              </Typography>
              <Typography variant="h4">
                {totalOpportunities}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Average Score
              </Typography>
              <Typography variant="h4">
                {averageScore.toFixed(1)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Top Opportunity
              </Typography>
              <Typography variant="h6">
                {topOpportunity?.symbol || 'None'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Score: {topOpportunity?.opportunity_score?.toFixed(1) || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="text.secondary">
                Service Status
              </Typography>
              <Typography variant="h6" color={isServiceAvailable ? 'success.main' : 'error.main'}>
                {isServiceAvailable ? '✅ Available' : '❌ Unavailable'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Action Buttons */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item>
          <Button
            variant="contained"
            onClick={() => getQuickOpportunities()}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          >
            Quick Refresh
          </Button>
        </Grid>

        <Grid item>
          <Button
            variant="outlined"
            onClick={() => getHighConfidenceOpportunities()}
            disabled={loading}
          >
            High Confidence
          </Button>
        </Grid>

        <Grid item>
          <Button
            variant="outlined"
            onClick={() => getLowRiskOpportunities()}
            disabled={loading}
          >
            Low Risk
          </Button>
        </Grid>

        <Grid item>
          <Button
            variant="outlined"
            onClick={() => getMomentumOpportunities()}
            disabled={loading}
          >
            Momentum
          </Button>
        </Grid>

        <Grid item>
          <Button
            variant="outlined"
            onClick={() => getVolumeSurgeOpportunities()}
            disabled={loading}
          >
            Volume Surge
          </Button>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Filters & Customization
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Minimum Score"
              type="number"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value) || 0)}
              fullWidth
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Opportunity Type</InputLabel>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Types</MenuItem>
                {serviceInfo?.opportunity_types && Object.entries(serviceInfo.opportunity_types).map(([type, description]) => (
                  <MenuItem key={type} value={type}>
                    {type.replace('_', ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Risk Level</InputLabel>
              <Select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
              >
                <MenuItem value="all">All Risks</MenuItem>
                {serviceInfo?.risk_levels && Object.entries(serviceInfo.risk_levels).map(([level, description]) => (
                  <MenuItem key={level} value={level}>
                    {level.replace('_', ' ').toUpperCase()}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              onClick={handleCustomRanking}
              disabled={loading}
              fullWidth
              sx={{ height: 56 }}
            >
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Opportunities Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'rank'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('rank')}
                  >
                    Rank
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'symbol'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('symbol')}
                  >
                    Symbol
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortConfig.key === 'current_price'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('current_price')}
                  >
                    Price
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortConfig.key === 'daily_change_pct'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('daily_change_pct')}
                  >
                    Daily Change
                  </TableSortLabel>
                </TableCell>
                <TableCell align="right">
                  <TableSortLabel
                    active={sortConfig.key === 'opportunity_score'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('opportunity_score')}
                  >
                    Opportunity Score
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'opportunity_type'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('opportunity_type')}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === 'risk_level'}
                    direction={sortConfig.direction}
                    onClick={() => handleSort('risk_level')}
                  >
                    Risk
                  </TableSortLabel>
                </TableCell>
                <TableCell>Entry/Exit</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Loading opportunities...
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!loading && filteredOpportunities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <Typography variant="body1">
                      No opportunities found with current filters.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {!loading && filteredOpportunities.map((opportunity) => (
                <TableRow key={opportunity.symbol} hover>
                  <TableCell>{opportunity.rank}</TableCell>
                  <TableCell>
                    <Typography variant="h6" component="div">
                      {opportunity.symbol}
                    </Typography>
                    {opportunity.sector && (
                      <Typography variant="caption" color="text.secondary">
                        {opportunity.sector}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    ₹{opportunity.current_price.toFixed(2)}
                  </TableCell>
                  <TableCell align="right">
                    <Typography
                      color={opportunity.daily_change_pct >= 0 ? 'success.main' : 'error.main'}
                    >
                      {opportunity.daily_change_pct.toFixed(2)}%
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="h6" color="primary.main">
                      {opportunity.opportunity_score.toFixed(1)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {opportunity.confidence_score.toFixed(1)}% confidence
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={opportunity.opportunity_type.replace('_', ' ').toUpperCase()}
                      color={getOpportunityTypeColor(opportunity.opportunity_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={opportunity.risk_level.replace('_', ' ').toUpperCase()}
                      color={getRiskLevelColor(opportunity.risk_level)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="caption">
                        Entry: ₹{opportunity.entry_price.toFixed(2)}
                      </Typography>
                      {opportunity.target_price && (
                        <Typography variant="caption" color="success.main">
                          Target: ₹{opportunity.target_price.toFixed(2)}
                        </Typography>
                      )}
                      {opportunity.stop_loss && (
                        <Typography variant="caption" color="error.main">
                          Stop: ₹{opportunity.stop_loss.toFixed(2)}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined">
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Service Information */}
      {serviceInfo && (
        <Accordion sx={{ mt: 4 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">
              📋 Service Information & Methodology
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Opportunity Types
                </Typography>
                {Object.entries(serviceInfo.opportunity_types).map(([type, description]) => (
                  <Box key={type} sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" color="primary">
                      {type.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {String(description)}
                    </Typography>
                  </Box>
                ))}
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>
                  Risk Levels
                </Typography>
                {Object.entries(serviceInfo.risk_levels).map(([level, description]) => (
                  <Box key={level} sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" color="primary">
                      {level.replace('_', ' ').toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {String(description)}
                    </Typography>
                  </Box>
                ))}
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Analysis Features
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(serviceInfo.analysis_features).map(([feature, description]) => (
                    <Grid item xs={12} sm={6} key={feature}>
                      <Typography variant="subtitle2" color="primary">
                        {feature.replace('_', ' ').toUpperCase()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {String(description)}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Summary Information */}
      {summary && (
        <Paper sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            📊 Analysis Summary
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Total Opportunities
              </Typography>
              <Typography variant="h6">
                {summary.total_opportunities}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Average Score
              </Typography>
              <Typography variant="h6">
                {summary.average_score?.toFixed(1) || '0'}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Score Range
              </Typography>
              <Typography variant="h6">
                {summary.score_range?.min?.toFixed(1) || '0'} - {summary.score_range?.max?.toFixed(1) || '0'}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Top Performers
              </Typography>
              <Typography variant="h6">
                {summary.top_performers?.slice(0, 3).join(', ') || 'None'}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default MoneyMakingOpportunitiesPage;
