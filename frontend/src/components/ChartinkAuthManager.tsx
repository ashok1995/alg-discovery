/**
 * Chartink Authentication Manager
 * ==============================
 *
 * VNC-based Chartink auth (35.232.205.155:8181): session-status, vnc-url, cookie/force-update
 * Flow: 1) Open VNC → 2) Log in to Chartink in VNC → 3) Force Authenticate → 4) Poll status
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
  Logout,
} from '@mui/icons-material';
import { useChartinkAuth } from '../hooks/useChartinkAuth';

const WAIT_SECONDS = 60;

const ChartinkAuthManager: React.FC = () => {
  const {
    sessionStatus,
    loading,
    error,
    refreshStatus,
    clearError,
    isAuthenticated,
    getVncUrl,
    forceAuthenticate,
    clearSession,
  } = useChartinkAuth(5 * 60 * 1000);

  const [vncUrl, setVncUrl] = useState<string | null>(null);
  const [fetchingVnc, setFetchingVnc] = useState(false);
  const [forceInProgress, setForceInProgress] = useState(false);
  const [clearInProgress, setClearInProgress] = useState(false);
  const [waitCountdown, setWaitCountdown] = useState<number | null>(null);
  const [canRecheck, setCanRecheck] = useState(false);

  const displayVncUrl = sessionStatus?.vnc_url ?? vncUrl;

  const handleOpenVnc = useCallback(async () => {
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
      if (res?.success !== false) {
        setWaitCountdown(WAIT_SECONDS);
        if (res?.next_action === 'open_vnc' && res?.vnc_url) {
          setVncUrl(res.vnc_url);
          window.open(res.vnc_url, '_blank', 'noopener,noreferrer');
        }
      }
    } finally {
      setForceInProgress(false);
    }
  }, [forceAuthenticate, clearError]);

  const handleClearSession = useCallback(async () => {
    setClearInProgress(true);
    clearError();
    try {
      await clearSession();
    } finally {
      setClearInProgress(false);
    }
  }, [clearSession, clearError]);

  useEffect(() => {
    if (waitCountdown === null || waitCountdown <= 0) {
      if (waitCountdown === 0) setCanRecheck(true);
      return;
    }
    const t = setInterval(() => setWaitCountdown((c) => (c != null && c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [waitCountdown]);

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

        {loading && !sessionStatus && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {sessionStatus && (
          <>
            <Box sx={{ mb: 2 }}>
              <Chip
                icon={isAuthenticated ? <CheckCircle /> : <ErrorIcon />}
                label={isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
                color={isAuthenticated ? 'success' : 'error'}
                size="small"
                sx={{ mr: 1 }}
              />
              {sessionStatus.query_verified !== undefined && (
                <Chip label={`Query verified: ${sessionStatus.query_row_count ?? 0} rows`} size="small" variant="outlined" sx={{ ml: 0.5 }} />
              )}
              {sessionStatus.last_authenticated_at && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  Last auth: {new Date(sessionStatus.last_authenticated_at).toLocaleString()}
                </Typography>
              )}
              {sessionStatus.hints && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {sessionStatus.hints}
                </Typography>
              )}
            </Box>

            {isAuthenticated && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Chartink is authenticated and ready to fetch stock data.
              </Alert>
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Re-authenticate
              </Typography>
              <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                <Typography variant="caption" display="block">
                  Flow: 1) Open VNC. 2) Log in to Chartink in the VNC session. 3) Force Authenticate. 4) Wait 1 min, then Check Status.
                </Typography>
              </Alert>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={fetchingVnc ? <CircularProgress size={14} /> : <Login />}
                  onClick={handleOpenVnc}
                  disabled={fetchingVnc}
                  sx={{ textTransform: 'none' }}
                >
                  Open VNC
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
                  <Button variant="outlined" size="small" startIcon={<Refresh />} onClick={refreshStatus} disabled={loading} sx={{ textTransform: 'none' }}>
                    Check Status
                  </Button>
                )}
                {isAuthenticated && (
                  <Button variant="outlined" color="error" size="small" startIcon={clearInProgress ? <CircularProgress size={14} /> : <Logout />} onClick={handleClearSession} disabled={clearInProgress} sx={{ textTransform: 'none' }}>
                    Clear Session
                  </Button>
                )}
              </Box>

              {displayVncUrl && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">VNC URL:</Typography>
                  <Typography variant="caption" component="code" sx={{ wordBreak: 'break-all', bgcolor: 'grey.100', px: 1, py: 0.5, borderRadius: 0.5 }}>
                    {displayVncUrl}
                  </Typography>
                  <Tooltip title="Open VNC">
                    <IconButton size="small" onClick={() => window.open(displayVncUrl!, '_blank')}>
                      <OpenInNew fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
          </>
        )}

        {!sessionStatus && !loading && (
          <Alert severity="info">Click refresh to check Chartink authentication status.</Alert>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'right', mt: 2 }}>
          Auto-refresh: 5 min
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ChartinkAuthManager;
