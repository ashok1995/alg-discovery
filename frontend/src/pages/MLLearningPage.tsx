import React, { useState, useEffect, useCallback } from 'react';
import { Box, CircularProgress, Alert, IconButton, Tooltip, alpha } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import PageHero from '../components/layout/PageHero';
import MLLearningTab from '../components/dashboard/MLLearningTab';
import { seedDashboardService } from '../services/SeedDashboardService';
import type { LearningStatusResponse } from '../types/apiModels';
import type { ScoreBinPerformanceItem } from '../types/apiModels';

const MLLearningPage: React.FC = () => {
  const [learningStatus, setLearningStatus] = useState<LearningStatusResponse | null>(null);
  const [scoreBins, setScoreBins] = useState<ScoreBinPerformanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const days = 30;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, binsRes] = await Promise.allSettled([
        seedDashboardService.getLearningStatus(),
        seedDashboardService.getScoreBinPerformance({ days }),
      ]);
      if (statusRes.status === 'fulfilled') setLearningStatus(statusRes.value);
      if (binsRes.status === 'fulfilled') setScoreBins(binsRes.value);
      if (statusRes.status === 'rejected' && binsRes.status === 'rejected') {
        setError('Failed to load ML / Learning data. Is seed-stocks-service running?');
      }
    } catch {
      setError('Failed to load ML / Learning data');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !learningStatus) {
    return (
      <Box
        sx={{
          p: 3,
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        }}
      >
        <CircularProgress size={48} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 3,
        minHeight: '100%',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
        <PageHero
          title="ML / Learning"
          subtitle="Thompson Sampling weights, ARM leaderboard, score-bin performance, and self-learning analytics."
          variant="purple"
        />
        <Box display="flex" alignItems="center" gap={0.5} sx={{ mt: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={fetchData} color="primary" sx={{ bgcolor: alpha('#7b1fa2', 0.08), '&:hover': { bgcolor: alpha('#7b1fa2', 0.15) } }}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          bgcolor: 'background.paper',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          p: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        {loading && <CircularProgress size={24} sx={{ mb: 1 }} />}
        <MLLearningTab learningStatus={learningStatus} scoreBins={scoreBins} />
      </Box>
    </Box>
  );
};

export default MLLearningPage;
