/**
 * Chartink Authentication Manager Component
 * =========================================
 * 
 * Manages Chartink authentication with browser login integration
 * Uses the authentication service on port 8181
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Login as LoginIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { chartinkAuthService } from '../services/ChartinkAuthService';

interface AuthStatus {
  success: boolean;
  session_working: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error';
  health_score: number;
  message: string;
  details?: {
    endpoint_used: string;
    data_count: number;
    response_time_ms: number;
    http_status: number;
  };
  actions?: {
    login_browser: string;
    trigger_login: string;
    clear_session: string;
  };
  timestamp: number;
}

interface LoginResponse {
  success: boolean;
  message: string;
  status: string;
  login_time_seconds?: number;
  action: string;
  error?: string;
}

const ChartinkAuthManager: React.FC = () => {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch authentication status
  const fetchAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await chartinkAuthService.getSessionStatus();
      setAuthStatus(data);
      
      console.log('📈 [ChartinkAuth] Status fetched:', data);
    } catch (error) {
      console.error('❌ [ChartinkAuth] Status fetch failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch auth status');
      setAuthStatus({
        success: false,
        session_working: false,
        status: 'error',
        health_score: 0,
        message: 'Failed to connect to Chartink service',
        timestamp: Date.now() / 1000
      });
    } finally {
      setLoading(false);
    }
  };

  // Trigger browser login
  const handleBrowserLogin = async () => {
    try {
      setLoginInProgress(true);
      setError(null);

      console.log('🔐 [ChartinkAuth] Triggering browser login...');
      
      const result = await chartinkAuthService.triggerBrowserLogin();
      
      console.log('✅ [ChartinkAuth] Login response:', result);

      if (result.success) {
        // Show success message
        setError(null);
        
        // Refresh status after a delay
        setTimeout(() => {
          fetchAuthStatus();
        }, 3000);
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('❌ [ChartinkAuth] Browser login failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to trigger browser login');
    } finally {
      setLoginInProgress(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchAuthStatus();
    
    const interval = setInterval(() => {
      fetchAuthStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'unhealthy': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon color="success" />;
      case 'degraded': return <WarningIcon color="warning" />;
      case 'unhealthy': return <ErrorIcon color="error" />;
      default: return <HelpIcon color="disabled" />;
    }
  };

  return (
    <Card sx={{ maxWidth: 500, mx: 'auto', my: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            📈 Chartink Authentication
          </Typography>
          
          <Tooltip title="Refresh Status">
            <IconButton 
              onClick={fetchAuthStatus} 
              disabled={loading}
              size="small"
            >
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {authStatus && (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              {getStatusIcon(authStatus.status)}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {authStatus.message}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Health Score: {authStatus.health_score}/100
                </Typography>
              </Box>
              <Chip 
                label={authStatus.status.toUpperCase()}
                color={getStatusColor(authStatus.status) as any}
                size="small"
              />
            </Box>

            {authStatus.details && (
              <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="caption" display="block">
                  <strong>Endpoint:</strong> {authStatus.details.endpoint_used}
                </Typography>
                <Typography variant="caption" display="block">
                  <strong>Data Count:</strong> {authStatus.details.data_count}
                </Typography>
                <Typography variant="caption" display="block">
                  <strong>Response Time:</strong> {authStatus.details.response_time_ms}ms
                </Typography>
                <Typography variant="caption" display="block">
                  <strong>HTTP Status:</strong> {authStatus.details.http_status}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box sx={{ textAlign: 'center' }}>
              {!authStatus.session_working ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleBrowserLogin}
                  disabled={loginInProgress}
                  startIcon={loginInProgress ? <CircularProgress size={20} /> : <LoginIcon />}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  {loginInProgress ? 'Opening Browser...' : '🔐 Login via Browser'}
                </Button>
              ) : (
                <Alert severity="success" sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    ✅ Authentication Active - Ready for Trading!
                  </Typography>
                </Alert>
              )}
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
              Last updated: {new Date(authStatus.timestamp * 1000).toLocaleTimeString()}
            </Typography>
          </>
        )}

        {!authStatus && !loading && (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Typography color="text.secondary">
              Click refresh to check authentication status
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ChartinkAuthManager;
