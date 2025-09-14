import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Grid, Chip, Alert, CircularProgress
} from '@mui/material';
import {
  VpnKey, Security, CheckCircle, Error as ErrorIcon, Refresh, Delete
} from '@mui/icons-material';
import { zerodhaTokenService } from '../services/zerodhaTokenService';

interface KiteTokenManagementProps {
  onTokenUpdate?: () => void;
}

const KiteTokenManagement: React.FC<KiteTokenManagementProps> = ({ onTokenUpdate }) => {
  const [tokenStatus, setTokenStatus] = useState<{
    is_valid?: boolean;
    last_updated?: string;
    expires_at?: string;
  } | null>(null);
  const [credentialStatus, setCredentialStatus] = useState<{
    has_credentials?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load token status
      const tokenResult = await zerodhaTokenService.getTokenStatus();
      setTokenStatus(tokenResult);
      
      // Load credential status
      const credentialResult = await zerodhaTokenService.getCredentialStatus();
      setCredentialStatus(credentialResult);
      
    } catch (err: unknown) {
      let errorMessage = 'Failed to load status';
      if (err instanceof Error) {
        errorMessage = (err as Error).message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else {
        errorMessage = String(err);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      const result = await zerodhaTokenService.refreshTokenAutomatically();
      
      if (result && typeof result === 'object' && 'success' in result && result.success) {
        setSuccess('Token refreshed successfully!');
        await loadStatus(); // Reload status
        onTokenUpdate?.();
      } else {
        const errorMsg = result && typeof result === 'object' && 'error' in result ? result.error : 'Failed to refresh token';
        setError(errorMsg || 'Failed to refresh token');
      }
    } catch (err: unknown) {
      let errorMessage = 'Failed to refresh token';
      if (err instanceof Error) {
        errorMessage = (err as Error).message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else {
        errorMessage = String(err);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClearToken = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      await zerodhaTokenService.clearAccessToken();
      setSuccess('Token cleared successfully!');
      await loadStatus(); // Reload status
      onTokenUpdate?.();
    } catch (err: unknown) {
      let errorMessage = 'Failed to clear token';
      if (err instanceof Error) {
        errorMessage = (err as Error).message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else {
        errorMessage = String(err);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* API Keys Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <Security color="primary" sx={{ mr: 1 }} />
                API Keys Status
              </Typography>
              
              <Box mt={2}>
                <Chip
                  label={credentialStatus?.has_credentials ? 'Available' : 'Not Configured'}
                  color={credentialStatus?.has_credentials ? 'success' : 'error'}
                  icon={credentialStatus?.has_credentials ? <CheckCircle /> : <ErrorIcon />}
                  sx={{ mb: 1 }}
                />
                
                {credentialStatus?.has_credentials ? (
                  <Typography variant="body2" color="text.secondary">
                    API keys are configured and available for token generation
                  </Typography>
                ) : (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    API keys need to be configured in your access_tokens directory for token generation
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Token Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <VpnKey color="primary" sx={{ mr: 1 }} />
                Token Status
              </Typography>
              
              <Box mt={2}>
                <Chip
                  label={tokenStatus?.is_valid ? 'Valid' : 'Invalid/Expired'}
                  color={tokenStatus?.is_valid ? 'success' : 'error'}
                  icon={tokenStatus?.is_valid ? <CheckCircle /> : <ErrorIcon />}
                  sx={{ mb: 1 }}
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Last Updated: {tokenStatus?.last_updated || 'Never'}
                </Typography>
                
                {tokenStatus?.is_valid && (
                  <Typography variant="body2" color="text.secondary">
                    Token expires: {tokenStatus?.expires_at || 'Unknown'}
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Token Actions */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center">
                <Refresh color="primary" sx={{ mr: 1 }} />
                Token Actions
              </Typography>
              
              <Box mt={2} display="flex" gap={2} flexWrap="wrap">
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Refresh />}
                  onClick={handleRefreshToken}
                  disabled={!credentialStatus?.has_credentials}
                >
                  Refresh Token
                </Button>
                
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={handleClearToken}
                  disabled={!tokenStatus?.is_valid}
                >
                  Clear Token
                </Button>
              </Box>
              
              {!credentialStatus?.has_credentials && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  Configure API keys first to enable token generation
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Status Messages */}
        {error && (
          <Grid item xs={12}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Grid>
        )}
        
        {success && (
          <Grid item xs={12}>
            <Alert severity="success" onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default KiteTokenManagement;
