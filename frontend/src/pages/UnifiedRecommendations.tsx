import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Box, Container, Paper, Typography, Chip, Alert, CircularProgress, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { recommendationAPIService } from '../services/RecommendationAPIService';
import { StrategyType, DynamicRecommendationItem } from '../types/apiModels';
import {
  limitRecommendationRows,
  computeRecommendationMetrics,
  type RecommendationMetricsData,
} from '../utils/recommendationUtils';
import { strategyConfig, strategyTypeMap } from '../config/recommendationsConfig';
import RecommendationFilters from '../components/recommendations/RecommendationFilters';
import RecommendationMetrics from '../components/recommendations/RecommendationMetrics';
import RecommendationTable from '../components/recommendations/RecommendationTable';
import { useWorkspacePreferences } from '../context/WorkspacePreferencesContext';

const UnifiedRecommendations: React.FC = () => {
  const { settings: workspace } = useWorkspacePreferences();
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(StrategyType.SWING);
  const [recommendations, setRecommendations] = useState<DynamicRecommendationItem[]>([]);
  const [metrics, setMetrics] = useState<RecommendationMetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const fetchSeq = useRef(0);

  const config = useMemo(() => strategyConfig[selectedStrategy], [selectedStrategy]);

  const minScore = workspace.recommendationsMinScore;
  const maxResults = workspace.recommendationsMaxResults;

  const fetchRecommendations = useCallback(
    async (_forceRefresh: boolean = false) => {
      const seq = ++fetchSeq.current;
      try {
        setLoading(true);
        setError(null);
        const legacyType = strategyTypeMap[selectedStrategy];
        const legacyRequest = {
          min_score: minScore,
          max_recommendations: maxResults,
        };

        const response = await recommendationAPIService.getRecommendationsByType(
          legacyType as 'swing' | 'intraday-buy' | 'intraday-sell' | 'long-buy' | 'short',
          legacyRequest
        );

        if (seq !== fetchSeq.current) return;

        if (response.success && (response.items || response.recommendations)) {
          let items =
            (response.items || response.recommendations || []) as DynamicRecommendationItem[];
          items = limitRecommendationRows(items, maxResults);
          setRecommendations(items);
          setLastRefreshTime(new Date());
          setMetrics(computeRecommendationMetrics(items, response.strategy || 'Unknown'));
        } else {
          setError('No recommendations available');
          setRecommendations([]);
        }
      } catch (err: unknown) {
        if (seq !== fetchSeq.current) return;
        const errorMessage =
          err && typeof err === 'object' && 'message' in err ? String((err as Error).message) : 'Unknown error';
        setError(`Failed to fetch recommendations: ${errorMessage}`);
        setRecommendations([]);
      } finally {
        if (seq === fetchSeq.current) {
          setLoading(false);
        }
      }
    },
    [selectedStrategy, minScore, maxResults]
  );

  /** Timed refresh only while this page is mounted, tab visible, and workspace auto-refresh on. */
  useEffect(() => {
    if (!workspace.autoRefresh || workspace.refreshInterval <= 0) {
      return undefined;
    }
    const ms = Math.max(5000, workspace.refreshInterval * 1000);
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void fetchRecommendations(false);
    }, ms);
    return () => clearInterval(id);
  }, [workspace.autoRefresh, workspace.refreshInterval, fetchRecommendations]);

  useEffect(() => {
    void fetchRecommendations(true);
  }, [fetchRecommendations]);

  const handleStrategyChange = (strategy: StrategyType) => {
    setSelectedStrategy(strategy);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          Min score, max results, auto refresh, and session windows are in{' '}
          <Link component={RouterLink} to="/settings" underline="hover" fontWeight={600}>
            System settings → Workspace preferences
          </Link>
          . Seed API uses <code>trade_type</code>, <code>limit</code>, <code>min_score</code> only.
        </Typography>
      </Box>

      <RecommendationFilters
        strategyConfig={strategyConfig}
        selectedStrategy={selectedStrategy}
        loading={loading}
        autoRefreshEnabled={workspace.autoRefresh}
        refreshIntervalSec={workspace.refreshInterval}
        onStrategyChange={handleStrategyChange}
        onRefresh={() => void fetchRecommendations(true)}
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
            <Chip label={`Min Score: ${minScore}`} size="small" variant="outlined" />
            <Chip label={`Limit: ${maxResults}`} size="small" variant="outlined" />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Adjust min score / max results in workspace preferences or refresh the data
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
