import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Container, Paper, Typography, Chip, Alert, CircularProgress } from '@mui/material';
import { useBackgroundRefresh } from '../hooks/useBackgroundRefresh';
import { recommendationAPIService } from '../services/RecommendationAPIService';
import { StrategyType, DynamicRecommendationItem } from '../types/apiModels';
import {
  applyRiskBasedFiltering,
  computeRecommendationMetrics,
  type RecommendationMetricsData
} from '../utils/recommendationUtils';
import { strategyConfig, strategyTypeMap, riskColorMap } from '../config/recommendationsConfig';
import RecommendationFilters from '../components/recommendations/RecommendationFilters';
import RecommendationMetrics from '../components/recommendations/RecommendationMetrics';
import RecommendationTable from '../components/recommendations/RecommendationTable';

const UnifiedRecommendations: React.FC = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(StrategyType.SWING);
  const [selectedRisk, setSelectedRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [recommendations, setRecommendations] = useState<DynamicRecommendationItem[]>([]);
  const [metrics, setMetrics] = useState<RecommendationMetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [minScore, setMinScore] = useState(60);
  const [maxResults, setMaxResults] = useState(20);
  const [sortBy, setSortBy] = useState<'score' | 'price' | 'volume' | 'change'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const config = useMemo(() => strategyConfig[selectedStrategy], [selectedStrategy]);

  const fetchRecommendations = useCallback(
    async (_forceRefresh: boolean = false) => {
      try {
        setLoading(true);
        setError(null);
        const legacyType = strategyTypeMap[selectedStrategy];
        const legacyRequest = {
          risk_profile: (selectedRisk === 'low'
            ? 'conservative'
            : selectedRisk === 'high'
              ? 'aggressive'
              : 'moderate') as 'conservative' | 'moderate' | 'aggressive',
          min_score: minScore,
          max_recommendations: maxResults
        };

        const response = await recommendationAPIService.getRecommendationsByType(
          legacyType as 'swing' | 'intraday-buy' | 'intraday-sell' | 'long-buy' | 'short',
          legacyRequest
        );

        if (response.success && (response.items || response.recommendations)) {
          let items =
            (response.items || response.recommendations || []) as DynamicRecommendationItem[];
          items = applyRiskBasedFiltering(items, selectedRisk, maxResults);
          setRecommendations(items);
          setLastRefreshTime(new Date());
          setMetrics(computeRecommendationMetrics(items, response.strategy || 'Unknown'));
        } else {
          setError('No recommendations available');
          setRecommendations([]);
        }
      } catch (err: unknown) {
        const errorMessage =
          err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : 'Unknown error';
        setError(`Failed to fetch recommendations: ${errorMessage}`);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedStrategy, selectedRisk, minScore, maxResults]
  );

  useBackgroundRefresh(fetchRecommendations, {
    autoRefreshInterval: autoRefresh ? 30000 : 0,
    strategy: selectedStrategy.toLowerCase().replace('_', '-'),
    initialAutoRefresh: true,
    enableCaching: true
  });

  useEffect(() => {
    fetchRecommendations(true);
  }, [fetchRecommendations]);

  const handleStrategyChange = (strategy: StrategyType) => {
    setSelectedStrategy(strategy);
    setMinScore(strategyConfig[strategy].minScore);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <RecommendationFilters
        strategyConfig={strategyConfig}
        selectedStrategy={selectedStrategy}
        selectedRisk={selectedRisk}
        expandedFilters={expandedFilters}
        minScore={minScore}
        maxResults={maxResults}
        sortBy={sortBy}
        sortDirection={sortDirection}
        autoRefresh={autoRefresh}
        loading={loading}
        onStrategyChange={handleStrategyChange}
        onRiskChange={setSelectedRisk}
        onExpandedFiltersChange={() => setExpandedFilters((prev) => !prev)}
        onMinScoreChange={setMinScore}
        onMaxResultsChange={setMaxResults}
        onSortByChange={setSortBy}
        onSortDirectionChange={setSortDirection}
        onAutoRefreshToggle={() => setAutoRefresh((prev) => !prev)}
        onRefresh={() => fetchRecommendations(true)}
      />

      {metrics && (
        <RecommendationMetrics
          metrics={metrics}
          recommendations={recommendations}
          strategyConfig={strategyConfig}
          selectedStrategy={selectedStrategy}
          lastRefreshTime={lastRefreshTime}
        />
      )}

      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress size={60} />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!loading && recommendations.length > 0 && (
        <RecommendationTable
          recommendations={recommendations}
          strategyConfig={strategyConfig}
          selectedStrategy={selectedStrategy}
          selectedRisk={selectedRisk}
          minScore={minScore}
          lastRefreshTime={lastRefreshTime}
          loading={loading}
        />
      )}

      {!loading && recommendations.length === 0 && !error && (
        <Paper elevation={2} sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No recommendations found
          </Typography>
          <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={2}>
            <Chip
              label={config.label}
              size="small"
              sx={{ backgroundColor: config.color, color: 'white' }}
            />
            <Chip
              label={`Risk: ${selectedRisk.toUpperCase()}`}
              size="small"
              variant="outlined"
              sx={{
                borderColor: riskColorMap[selectedRisk],
                color: riskColorMap[selectedRisk]
              }}
            />
            <Chip label={`Min Score: ${minScore}`} size="small" variant="outlined" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Try adjusting your filters or refresh the data
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Last updated: {lastRefreshTime?.toLocaleTimeString()}
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default UnifiedRecommendations;
