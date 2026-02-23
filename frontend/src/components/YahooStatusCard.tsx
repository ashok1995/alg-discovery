/**
 * Yahoo Service Status Card
 * Health only - no authentication. GET /health at 8185.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Refresh, CheckCircle, Error as ErrorIcon, Storage } from '@mui/icons-material';

const YAHOO_HEALTH_URL = '/api/yahoo-health';

interface YahooHealthResponse {
  status?: string;
  service?: string;
  yahoo_finance_available?: boolean;
  alpha_vantage_available?: boolean;
  timestamp?: string;
}

const YahooStatusCard: React.FC = () => {
  const [data, setData] = useState<YahooHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(YAHOO_HEALTH_URL, { headers: { Accept: 'application/json' } });
      const json = (await res.json()) as YahooHealthResponse;
      if (res.ok) {
        setData(json);
      } else {
        setError(`HTTP ${res.status}`);
        setData(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const healthy = data?.status === 'healthy';

  return (
    <Card>
      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Storage sx={{ fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
              Yahoo Service
            </Typography>
            {loading ? (
              <CircularProgress size={16} />
            ) : (
              <Chip
                icon={healthy ? <CheckCircle /> : <ErrorIcon />}
                label={healthy ? 'Healthy' : 'Unhealthy'}
                color={healthy ? 'success' : 'error'}
                size="small"
              />
            )}
          </Box>
          <IconButton size="small" onClick={load} disabled={loading}>
            <Refresh sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        {error && (
          <Typography variant="caption" color="error" display="block">
            {error}
          </Typography>
        )}
        {data && !error && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Yahoo Finance: {data.yahoo_finance_available ? 'Available' : 'N/A'} • Alpha Vantage: {data.alpha_vantage_available ? 'Available' : 'N/A'}
            </Typography>
            {data.timestamp && (
              <Typography variant="caption" color="text.secondary" display="block">
                Last check: {new Date(data.timestamp).toLocaleString()}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default YahooStatusCard;
