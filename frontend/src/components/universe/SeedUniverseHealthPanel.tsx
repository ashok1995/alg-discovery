/**
 * Seed stock universe from GET /api/v2/dashboard/universe-health (per-scenario counts & score stats).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import { Refresh } from '@mui/icons-material';
import UniverseTab from '../dashboard/UniverseTab';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type { UniverseHealthResponse } from '../../types/apiModels';

const SeedUniverseHealthPanel: React.FC = () => {
  const [data, setData] = useState<UniverseHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await seedDashboardService.getUniverseHealth();
      setData(res);
    } catch (e: unknown) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Failed to load universe health from Seed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Seed universe health
          </Typography>
          <Typography variant="body2" color="text.secondary">
            <code>GET /api/v2/dashboard/universe-health</code> — active symbols and score distribution per trade scenario.
            Stock mapping and candidates are separate operational tabs.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button onClick={() => void load()}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {loading && !data ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : data ? (
        <UniverseTab universeHealth={data} />
      ) : !error ? (
        <Typography color="text.secondary">No data.</Typography>
      ) : null}
    </Box>
  );
};

export default SeedUniverseHealthPanel;
