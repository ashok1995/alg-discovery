/**
 * Chartink Authentication Manager
 * ==============================
 *
 * 2-step flow for VNC-based Chartink auth (prod 8181):
 * 1) Check status → Login to VNC (opens URL)
 * 2) Force Authenticate → Wait 1 min → Check Status
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Security,
  Refresh,
  Login,
  CheckCircle,
  Error as ErrorIcon,
  OpenInNew,
  HourglassEmpty,
} from '@mui/icons-material';
import { useChartinkAuth } from '../hooks/useChartinkAuth';

const WAIT_SECONDS = 60;

const ChartinkAuthManager: React.FC = () => {
  const {
    checkStatus,
    loading,
    error,
    refreshStatus,
    clearError,
    isAuthenticated,
    getVncUrl,
    forceAuthenticate,
  } = useChartinkAuth(5 * 60 * 1000);

  const [vncUrl, setVncUrl] = useState<string | null>(null);
  const [fetchingVnc, setFetchingVnc] = useState(false);
  const [forceInProgress, setForceInProgress] = useState(false);
  const [forceDone, setForceDone] = useState(false);
  const [waitCountdown, setWaitCountdown] = useState<number | null>(null);
  const [canRecheck, setCanRecheck] = useState(false);

  const handleLoginToVnc = useCallback(async () => {
    setFetchingVnc(true);
    clearError();
    try {
      const url = await getVncUrl();
      if (url) {
        setVncUrl(url);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setFetchingVnc(false);
    }
  }, [getVncUrl, clearError]);

  const handleForceAuthenticate = useCallback(async () => {
    setForceInProgress(true);
    clearError();
    try {
      const res = await forceAuthenticate();
      setForceDone(true);
      if (res?.success !== false) {
        setWaitCountdown(WAIT_SECONDS);
      }
    } finally {
      setForceInProgress(false);
    }
  }, [forceAuthenticate, clearError]);

  useEffect(() => {
    if (waitCountdown === null || waitCountdown <= 0) {
      if (waitCountdown === 0) setCanRecheck(true);
      return;
    }
    const t = setInterval(() => setWaitCountdown((c) => (c != null && c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [waitCountdown]);

  const statusDetails = checkStatus?.status;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Security sx={{ mr: 1 }} />
          <Typography variant="h6">Chartink Authentication</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title="Check Status">
            <IconButton size="small" onClick={refreshStatus} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
            {error}
          </Alert>
        )}

        {loading && !checkStatus && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {checkStatus && (
          <>
            <Box sx={{ mb: 2 }}>
              <Chip
                icon={isAuthenticated ? <CheckCircle /> : <ErrorIcon />}
                label={isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                color={isAuthenticated ? 'success' : 'error'}
                size="small"
                sx={{ mr: 1 }}
              />
              {statusDetails?.hints && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {statusDetails.hints}
                </Typography>
              )}
              {statusDetails?.url && (
                <Typography variant="caption" color="text.secondary" display="block">
                  URL: {statusDetails.url}
                </Typography>
              )}
            </Box>

            {isAuthenticated && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Chartink is authenticated and ready to fetch stock data.
              </Alert>
            )}

            {/* Force auth flow – always visible for re-auth */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Re-authenticate
              </Typography>
              <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                <Typography variant="caption" display="block">
                  Flow: 1) Login to VNC. 2) Log in to Chartink in the VNC session. 3) Force Authenticate. 4) Wait 1 min, then Check Status.
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={fetchingVnc ? <CircularProgress size={14} /> : <Login />}
                  onClick={handleLoginToVnc}
                  disabled={fetchingVnc}
                  sx={{ textTransform: 'none' }}
                >
                  Login to VNC
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={forceInProgress ? <CircularProgress size={14} /> : undefined}
                  onClick={handleForceAuthenticate}
                  disabled={forceInProgress}
                  sx={{ textTransform: 'none' }}
                >
                  {forceInProgress ? 'Authenticating...' : 'Force Authenticate'}
                </Button>
                {waitCountdown != null && waitCountdown > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <HourglassEmpty fontSize="small" />
                    Wait {waitCountdown}s before recheck
                  </Typography>
                )}
                {(canRecheck || isAuthenticated) && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Refresh />}
                    onClick={refreshStatus}
                    disabled={loading}
                    sx={{ textTransform: 'none' }}
                  >
                    Check Status
                  </Button>
                )}
              </Box>

              {vncUrl && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    VNC URL:
                  </Typography>
                  <Typography
                    variant="caption"
                    component="code"
                    sx={{ wordBreak: 'break-all', bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 0.5 }}
                  >
                    {vncUrl}
                  </Typography>
                  <Tooltip title="Open VNC">
                    <IconButton
                      size="small"
                      onClick={() => window.open(vncUrl!, '_blank')}
                    >
                      <OpenInNew fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
          </>
        )}

        {!checkStatus && !loading && (
          <Alert severity="info">
            Click refresh to check Chartink authentication status.
          </Alert>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 2 }}>
          Auto-refresh: 5 min
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ChartinkAuthManager;
