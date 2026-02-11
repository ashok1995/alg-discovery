/**
 * Enhanced Kite Token Management Component
 * ========================================
 * 
 * Complete token management with request token to access token conversion
 * Includes the full OAuth flow from login to access token generation
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  TextField,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  VpnKey as VpnKeyIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Launch as LaunchIcon,
  ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import { kiteTokenService, type TokenStatus, type TokenRefreshInfo, type AccessTokenResponse } from '../services/KiteTokenService';

interface EnhancedKiteTokenManagementProps {
  onTokenUpdate?: () => void;
}

const EnhancedKiteTokenManagement: React.FC<EnhancedKiteTokenManagementProps> = ({ onTokenUpdate }) => {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [refreshInfo, setRefreshInfo] = useState<TokenRefreshInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Token refresh flow state
  const [activeStep, setActiveStep] = useState(0);
  const [callbackUrl, setCallbackUrl] = useState('');
  const [requestToken, setRequestToken] = useState('');
  const [accessTokenData, setAccessTokenData] = useState<AccessTokenResponse | null>(null);
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);

  // Load initial status
  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [statusData, refreshData] = await Promise.all([
        kiteTokenService.getTokenStatus(),
        kiteTokenService.getRefreshInfo()
      ]);
      
      setTokenStatus(statusData);
      setRefreshInfo(refreshData);
      
      console.log('🔐 [KiteToken] Status loaded:', statusData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load token status';
      setError(errorMessage);
      console.error('❌ [KiteToken] Status load failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start token refresh flow
  const startTokenRefresh = () => {
    setActiveStep(0);
    setCallbackUrl('');
    setRequestToken('');
    setAccessTokenData(null);
    setShowRefreshDialog(true);
  };

  // Open Kite login page
  const openKiteLogin = () => {
    if (refreshInfo?.login_url) {
      window.open(refreshInfo.login_url, '_blank');
      setActiveStep(1);
    }
  };

  // Extract request token from callback URL
  const extractRequestToken = () => {
    if (!callbackUrl) {
      setError('Please enter the callback URL');
      return;
    }

    const extractedToken = kiteTokenService.extractRequestTokenFromUrl(callbackUrl);
    
    if (extractedToken) {
      setRequestToken(extractedToken);
      setActiveStep(2);
      setError(null);
    } else {
      setError('No request token found in the callback URL. Please check the URL format.');
    }
  };

  // Generate access token
  const generateAccessToken = async () => {
    if (!requestToken) {
      setError('No request token available');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tokenData = await kiteTokenService.generateAccessToken(requestToken);
      
      if (tokenData.success) {
        setAccessTokenData(tokenData);
        setActiveStep(3);
        setSuccess('Access token generated successfully!');
        
        // Refresh status
        setTimeout(() => {
          loadStatus();
          onTokenUpdate?.();
        }, 1000);
      } else {
        setError(tokenData.error || 'Failed to generate access token');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Token generation failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Copy access token to clipboard
  const copyAccessToken = async () => {
    if (accessTokenData?.access_token) {
      try {
        await navigator.clipboard.writeText(accessTokenData.access_token);
        setSuccess('Access token copied to clipboard!');
      } catch (error) {
        setError('Failed to copy to clipboard');
      }
    }
  };

  // Clear current token
  const clearToken = async () => {
    try {
      setLoading(true);
      const result = await kiteTokenService.clearToken();
      
      if (result.success) {
        setSuccess(result.message || 'Token cleared successfully');
        loadStatus();
        onTokenUpdate?.();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear token';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(loadStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (isValid: boolean) => {
    return isValid ? 'success' : 'error';
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? <CheckCircleIcon color="success" /> : <ErrorIcon color="error" />;
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VpnKeyIcon color="primary" />
              Enhanced Kite Token Management
            </Typography>
            
            <Tooltip title="Refresh Status">
              <IconButton onClick={loadStatus} disabled={loading} size="small">
                {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {tokenStatus && (
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                {getStatusIcon(tokenStatus.is_valid)}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    Token Status: {tokenStatus.is_valid ? 'Valid & Active' : 'Invalid/Expired'}
                  </Typography>
                  {tokenStatus.user_name && (
                    <Typography variant="body2" color="text.secondary">
                      User: {tokenStatus.user_name} ({tokenStatus.user_id})
                    </Typography>
                  )}
                </Box>
                <Chip 
                  label={tokenStatus.is_valid ? 'ACTIVE' : 'EXPIRED'}
                  color={getStatusColor(tokenStatus.is_valid)}
                  size="small"
                />
              </Box>

              {tokenStatus.needs_refresh && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    ⚠️ Token refresh required for continued API access
                  </Typography>
                </Alert>
              )}

              <Grid container spacing={2}>
                {tokenStatus.expires_at && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Expires:</strong> {new Date(tokenStatus.expires_at).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
                
                {tokenStatus.last_updated && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Last Updated:</strong> {new Date(tokenStatus.last_updated).toLocaleString()}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={startTokenRefresh}
              startIcon={<RefreshIcon />}
              disabled={loading}
            >
              {tokenStatus?.needs_refresh ? 'Refresh Required' : 'Refresh Token'}
            </Button>

            {tokenStatus?.is_valid && (
              <Button
                variant="outlined"
                color="error"
                onClick={clearToken}
                startIcon={<ErrorIcon />}
                disabled={loading}
              >
                Clear Token
              </Button>
            )}

            <Button
              variant="outlined"
              onClick={loadStatus}
              startIcon={<RefreshIcon />}
              disabled={loading}
            >
              Check Status
            </Button>
          </Box>

          {refreshInfo && (
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                📋 Service Information:
              </Typography>
              <Typography variant="caption" display="block">
                <strong>API Key:</strong> {refreshInfo.api_key}
              </Typography>
              <Typography variant="caption" display="block">
                <strong>Callback URL:</strong> {refreshInfo.callback_url}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Token Refresh Dialog */}
      <Dialog 
        open={showRefreshDialog} 
        onClose={() => setShowRefreshDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          🔄 Complete Token Refresh Flow
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* Step 1: Open Login */}
            <Step>
              <StepLabel>Open Kite Connect Login</StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Click the button below to open Kite Connect login page in a new tab.
                </Typography>
                
                {refreshInfo && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="caption" display="block">
                      <strong>Login URL:</strong> {refreshInfo.login_url}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  onClick={openKiteLogin}
                  startIcon={<LaunchIcon />}
                  disabled={!refreshInfo}
                >
                  Open Kite Login
                </Button>
              </StepContent>
            </Step>

            {/* Step 2: Get Callback URL */}
            <Step>
              <StepLabel>Complete Login & Get Callback URL</StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  After logging in, you'll be redirected to a callback URL. Copy and paste the entire URL here:
                </Typography>
                
                <TextField
                  fullWidth
                  label="Callback URL"
                  placeholder="http://localhost:8079/auth/callback?action=login&status=success&request_token=..."
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  sx={{ mb: 2 }}
                  multiline
                  rows={3}
                />

                <Button
                  variant="contained"
                  onClick={extractRequestToken}
                  disabled={!callbackUrl}
                >
                  Extract Request Token
                </Button>
              </StepContent>
            </Step>

            {/* Step 3: Show Request Token */}
            <Step>
              <StepLabel>Request Token Extracted</StepLabel>
              <StepContent>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  Request token extracted successfully. Click to generate access token:
                </Typography>
                
                <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    <strong>Request Token:</strong> {requestToken}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  onClick={generateAccessToken}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : <VpnKeyIcon />}
                >
                  {loading ? 'Generating...' : 'Generate Access Token'}
                </Button>
              </StepContent>
            </Step>

            {/* Step 4: Show Access Token */}
            <Step>
              <StepLabel>Access Token Generated</StepLabel>
              <StepContent>
                {accessTokenData && (
                  <Box>
                    <Alert severity="success" sx={{ mb: 2 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        ✅ Access token generated successfully!
                      </Typography>
                    </Alert>

                    <Box sx={{ mb: 2, p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>User:</strong> {accessTokenData.user_name} ({accessTokenData.user_id})
                      </Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        <strong>Email:</strong> {accessTokenData.email}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          Access Token:
                        </Typography>
                        <IconButton size="small" onClick={copyAccessToken}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          wordBreak: 'break-all',
                          bgcolor: 'white',
                          p: 1,
                          borderRadius: 1,
                          border: '1px solid #ddd'
                        }}
                      >
                        {accessTokenData.access_token}
                      </Typography>
                    </Box>

                    <Alert severity="info" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        📝 <strong>Next Steps:</strong><br/>
                        1. Copy the access token above<br/>
                        2. Update your KITE_ACCESS_TOKEN environment variable<br/>
                        3. Restart your trading service
                      </Typography>
                    </Alert>
                  </Box>
                )}
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRefreshDialog(false)}>
            Close
          </Button>
          {accessTokenData && (
            <Button
              variant="contained"
              onClick={copyAccessToken}
              startIcon={<ContentCopyIcon />}
            >
              Copy Access Token
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EnhancedKiteTokenManagement;