/**
 * RecommendationTable Component
 * =============================
 * 
 * A comprehensive table component for displaying recommendations from all 4 scenarios:
 * 1. Swing Trading
 * 2. Long-term Buy
 * 3. Intraday Buy
 * 4. Intraday Sell
 * 
 * Features:
 * - Sortable columns
 * - Filtering by score, sector, etc.
 * - Real-time data updates
 * - Export functionality
 * - Responsive design
 */

import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Divider
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Visibility as VisibilityIcon,
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material';
import { useRecommendationAPI, useRecommendationServiceStatus } from '../hooks/useRecommendationAPI';
import { type Recommendation, type RiskProfile } from '../services/RecommendationAPIService';
import { API_CONFIG } from '../config/api';

// Component props interface
interface RecommendationTableProps {
  type: 'swing' | 'long-buy' | 'intraday-buy' | 'intraday-sell';
  title?: string;
  maxRecommendations?: number;
  minScore?: number;
  riskProfile?: RiskProfile;
  autoRefresh?: boolean;
  refreshInterval?: number;
  showFilters?: boolean;
  showExport?: boolean;
  onRecommendationClick?: (recommendation: Recommendation) => void;
}

// Sort configuration
interface SortConfig {
  key: keyof Recommendation;
  direction: 'asc' | 'desc';
}

// Filter configuration
interface FilterConfig {
  minScore: number;
  maxScore: number;
  sector: string;
  searchTerm: string;
}

const RecommendationTable: React.FC<RecommendationTableProps> = ({
  type,
  title,
  maxRecommendations = 50,
  minScore = 70,
  riskProfile = 'moderate',
  autoRefresh = false,
  refreshInterval = 300000, // 5 minutes
  showFilters = true,
  showExport = true,
  onRecommendationClick
}) => {
  // State management
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'score', direction: 'desc' });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    minScore: 0,
    maxScore: 100,
    sector: '',
    searchTerm: ''
  });

  // Recommendation API hook
  const {
    state,
    serviceStatus,
    fetchRecommendations,
    refreshRecommendations,
    clearError,
    isLoading,
    hasError,
    hasData,
    isEmpty
  } = useRecommendationAPI(type, {
    max_recommendations: maxRecommendations,
    min_score: minScore,
    risk_profile: riskProfile,
    include_metadata: true
  }, {
    autoFetch: true,
    refreshInterval: autoRefresh ? refreshInterval : undefined
  });

  // Service status hook
  const { isConnected } = useRecommendationServiceStatus();

  // Get type-specific configuration
  const typeConfig = useMemo(() => {
    const configs = {
      'swing': {
        title: 'Swing Trading Recommendations',
        description: 'Medium-term positions (3-10 days)',
        color: 'primary',
        icon: TrendingUpIcon
      },
      'long-buy': {
        title: 'Long-term Buy Recommendations',
        description: 'Long-term investing (weeks to months)',
        color: 'success',
        icon: TrendingUpIcon
      },
      'intraday-buy': {
        title: 'Intraday Buy Recommendations',
        description: 'Same-day buying opportunities',
        color: 'info',
        icon: TrendingUpIcon
      },
      'intraday-sell': {
        title: 'Intraday Sell Recommendations',
        description: 'Same-day selling opportunities',
        color: 'warning',
        icon: TrendingDownIcon
      }
    };
    return configs[type];
  }, [type]);

  // Filtered and sorted recommendations
  const processedRecommendations = useMemo(() => {
    let filtered = state.recommendations.filter(rec => {
      const matchesScore = rec.score >= filterConfig.minScore && rec.score <= filterConfig.maxScore;
      const matchesSector = !filterConfig.sector || rec.sector.toLowerCase().includes(filterConfig.sector.toLowerCase());
      const matchesSearch = !filterConfig.searchTerm || 
        rec.symbol.toLowerCase().includes(filterConfig.searchTerm.toLowerCase()) ||
        rec.name.toLowerCase().includes(filterConfig.searchTerm.toLowerCase());
      
      return matchesScore && matchesSector && matchesSearch;
    });

    // Sort recommendations
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });

    return filtered;
  }, [state.recommendations, filterConfig, sortConfig]);

  // Handle sort
  const handleSort = (key: keyof Recommendation) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Handle filter change
  const handleFilterChange = (field: keyof FilterConfig, value: string | number) => {
    setFilterConfig(prev => ({ ...prev, [field]: value }));
  };

  // Export recommendations
  const handleExport = () => {
    const csvContent = [
      ['Symbol', 'Name', 'Score', 'Price', 'Change %', 'Volume', 'Market Cap', 'Sector', 'Technical Score', 'Fundamental Score', 'Sentiment Score'],
      ...processedRecommendations.map(rec => [
        rec.symbol,
        rec.name,
        rec.score.toString(),
        (rec.price ?? 0).toString(),
        rec.change_percent.toString(),
        rec.volume.toString(),
        rec.market_cap.toString(),
        rec.sector,
        (rec.analysis?.technical_score ?? 0).toString(),
        (rec.analysis?.fundamental_score ?? 0).toString(),
        (rec.analysis?.sentiment_score ?? 0).toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-recommendations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  // Get change color
  const getChangeColor = (change: number) => {
    return change >= 0 ? 'success' : 'error';
  };

  // Format market cap
  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(1)}T`;
    if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(1)}B`;
    if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(1)}M`;
    return marketCap.toLocaleString();
  };

  return (
    <Card>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <typeConfig.icon color={typeConfig.color as any} />
            <Typography variant="h6">{title || typeConfig.title}</Typography>
            {!isConnected && (
              <Chip 
                label="Service Offline" 
                color="error" 
                size="small" 
                variant="outlined"
              />
            )}
          </Box>
        }
        subheader={typeConfig.description}
        action={
          <Box display="flex" gap={1}>
            {showExport && (
              <Tooltip title="Export to CSV">
                <IconButton onClick={handleExport} disabled={!hasData}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={refreshRecommendations} disabled={isLoading}>
                {isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        }
      />
      
      <CardContent>
        {/* Filters */}
        {showFilters && (
          <Box mb={2}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search"
                  value={filterConfig.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                  placeholder="Search symbols or names..."
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Min Score"
                  type="number"
                  value={filterConfig.minScore}
                  onChange={(e) => handleFilterChange('minScore', Number(e.target.value))}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Max Score"
                  type="number"
                  value={filterConfig.maxScore}
                  onChange={(e) => handleFilterChange('maxScore', Number(e.target.value))}
                  inputProps={{ min: 0, max: 100 }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sector</InputLabel>
                  <Select
                    value={filterConfig.sector}
                    onChange={(e: SelectChangeEvent) => handleFilterChange('sector', e.target.value)}
                    label="Sector"
                  >
                    <MenuItem value="">All Sectors</MenuItem>
                    {Array.from(new Set(state.recommendations.map(r => r.sector))).map(sector => (
                      <MenuItem key={sector} value={sector}>{sector}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={2}>
                <Typography variant="body2" color="textSecondary">
                  {processedRecommendations.length} of {state.totalCount} recommendations
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Error Alert */}
        {hasError && (
          <Alert severity="error" onClose={clearError} sx={{ mb: 2 }}>
            {state.error}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && !hasData && (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        )}

        {/* Empty State */}
        {isEmpty && !isLoading && (
          <Box textAlign="center" p={4}>
            <Typography variant="body1" color="textSecondary">
              No recommendations found for the current criteria.
            </Typography>
          </Box>
        )}

        {/* Recommendations Table */}
        {hasData && (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell 
                    onClick={() => handleSort('symbol')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Symbol
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('name')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Name
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('score')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Score
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('price')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Price
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('change_percent')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Change %
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('volume')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Volume
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('market_cap')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Market Cap
                  </TableCell>
                  <TableCell 
                    onClick={() => handleSort('sector')}
                    sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Sector
                  </TableCell>
                  <TableCell>Analysis</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {processedRecommendations.map((recommendation) => (
                  <TableRow key={recommendation.symbol} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {recommendation.symbol}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {recommendation.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${recommendation.score.toFixed(1)}`}
                        color={getScoreColor(recommendation.score) as any}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        ₹{(recommendation.price ?? 0).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={0.5}>
                        {recommendation.change_percent >= 0 ? (
                          <TrendingUpIcon color="success" fontSize="small" />
                        ) : (
                          <TrendingDownIcon color="error" fontSize="small" />
                        )}
                        <Typography
                          variant="body2"
                          color={getChangeColor(recommendation.change_percent)}
                        >
                          {recommendation.change_percent >= 0 ? '+' : ''}{recommendation.change_percent.toFixed(2)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {recommendation.volume.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        ₹{formatMarketCap(recommendation.market_cap)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={recommendation.sector} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexDirection="column" gap={0.5}>
                        <Typography variant="caption">
                          T: {(recommendation.analysis?.technical_score ?? 0).toFixed(1)}
                        </Typography>
                        <Typography variant="caption">
                          F: {(recommendation.analysis?.fundamental_score ?? 0).toFixed(1)}
                        </Typography>
                        <Typography variant="caption">
                          S: {(recommendation.analysis?.sentiment_score ?? 0).toFixed(1)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => onRecommendationClick?.(recommendation)}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Open Chart">
                          <IconButton
                            size="small"
                            onClick={() => window.open(`${API_CONFIG.EXTERNAL.CHARTINK.STOCKS_URL}?symbol=${recommendation.symbol}`, '_blank')}
                          >
                            <OpenInNewIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Summary */}
        {hasData && (
          <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="textSecondary">
              Last updated: {state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : 'N/A'}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Execution time: {state.executionTime.toFixed(2)}s
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecommendationTable;
