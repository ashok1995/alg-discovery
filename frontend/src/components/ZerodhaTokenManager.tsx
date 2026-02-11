import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  Grid
} from '@mui/material';
import {
  Security,
  Link,
  ContentCopy,
  OpenInNew,
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  Delete,
  Person,
  Schedule,
  VpnKey
} from '@mui/icons-material';
import { zerodhaTokenService, TokenStatus, TokenInstructions, CredentialStatus, CredentialTestResult, AllZerodhaData } from '../services/zerodhaTokenService';
import KiteOAuthCallback from './KiteOAuthCallback';

interface ZerodhaTokenManagerProps {
  onTokenUpdate?: () => void;
}

const ZerodhaTokenManager: React.FC<ZerodhaTokenManagerProps> = ({ onTokenUpdate }) => {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [instructions, setInstructions] = useState<TokenInstructions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Token generation states
  const [loginUrl, setLoginUrl] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [callbackUrl, setCallbackUrl] = useState<string>('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCallbackDialog, setShowCallbackDialog] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Credential management states
  const [credentialStatus, setCredentialStatus] = useState<CredentialStatus | null>(null);
  const [showCredentialDialog, setShowCredentialDialog] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');

  // Partner service test states
  const [chartinkStatus, setChartinkStatus] = useState<boolean>(false);
  const [yahooFinanceStatus, setYahooFinanceStatus] = useState<boolean>(false);

  // OAuth flow states
  const [showOAuthCallback, setShowOAuthCallback] = useState<boolean>(false);
  const [oauthToken, setOauthToken] = useState<string>('');

  // Load initial data
  useEffect(() => {
    loadTokenStatus();
    loadInstructions();
    loadCredentialStatus();
    loadPartnerServiceStatus();
  }, []);

  const loadTokenStatus = async () => {
    try {
      setLoading(true);
      const status = await zerodhaTokenService.getTokenStatus();
      setTokenStatus(status);
    } catch (error) {
      setError('Failed to load token status');
      console.error('Error loading token status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstructions = async () => {
    try {
      const inst = await zerodhaTokenService.getInstructions();
      setInstructions(inst);
    } catch (error) {
      console.error('Error loading instructions:', error);
    }
  };

  const loadCredentialStatus = async () => {
    try {
      const status = await zerodhaTokenService.getCredentialsStatus();
      setCredentialStatus(status);
    } catch (error) {
      console.error('Error loading credential status:', error);
    }
  };

  const loadPartnerServiceStatus = async () => {
    try {
      setLoading(true);
      const status = await zerodhaTokenService.getPartnerServiceStatus();
      setChartinkStatus(status.chartink_status);
      setYahooFinanceStatus(status.yahoo_finance_status);
    } catch (error) {
      console.error('Error loading partner service status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateLoginUrl = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await zerodhaTokenService.generateLoginUrl();
      setLoginUrl(response.login_url);
      setActiveStep(1);
      setSuccess('Login URL generated successfully!');
    } catch (error) {
      setError('Failed to generate login URL');
      console.error('Error generating login URL:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLoginUrl = () => {
    if (loginUrl) {
      zerodhaTokenService.openLoginUrl(loginUrl);
    }
  };

  const handleCopyLoginUrl = () => {
    if (loginUrl) {
      navigator.clipboard.writeText(loginUrl);
      setSuccess('Login URL copied to clipboard!');
    }
  };

  const handleGenerateFromCallback = async () => {
    if (!callbackUrl.trim()) {
      setError('Please enter the callback URL');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await zerodhaTokenService.generateTokenFromCallback(callbackUrl);
      
      if (result.success) {
        setSuccess('Access token generated and saved successfully!');
        setShowCallbackDialog(false);
        setCallbackUrl('');
        handleResetTokenGeneration(); // Reset the generation step
        await loadTokenStatus();
        onTokenUpdate?.();
      } else {
        setError(result.error || 'Failed to generate token');
      }
    } catch (error: any) {
      // Handle specific Zerodha API errors
      let errorMessage = 'Failed to generate token from callback URL';
      
      if (error.message) {
        if (error.message.includes('Invalid API secret') || error.message.includes('checksum')) {
          errorMessage = 'Invalid API secret. Please check your Zerodha API secret in the configuration.';
        } else if (error.message.includes('Invalid API key')) {
          errorMessage = 'Invalid API key. Please check your Zerodha API key in the configuration.';
        } else if (error.message.includes('Invalid request token')) {
          errorMessage = 'Invalid request token. The token may have expired. Please try logging in again.';
        } else if (error.message.includes('Could not extract request token')) {
          errorMessage = 'Could not extract request token from URL. Please ensure you copied the entire callback URL.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      console.error('Error generating token:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateToken = async () => {
    if (!accessToken.trim()) {
      setError('Please enter the access token');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await zerodhaTokenService.updateAccessToken(accessToken);
      
      // Handle the new response format
      if (result.success) {
        if (result.validation_status === 'validated') {
          setSuccess('Access token updated and validated successfully!');
        } else {
          // Token was saved but validation failed
          setSuccess(`Access token saved for daily usage. ${result.validation_warning || 'Validation was not performed.'}`);
        }
        setAccessToken('');
        setActiveStep(0);
        await loadTokenStatus();
        onTokenUpdate?.();
      } else {
        setError('Failed to update access token');
      }
    } catch (error: any) {
      // Handle specific error messages from the API
      if (error.message && error.message.includes('saved for daily usage')) {
        setSuccess(error.message);
        setAccessToken('');
        setActiveStep(0);
        await loadTokenStatus();
        onTokenUpdate?.();
      } else {
        setError('Failed to update access token');
        console.error('Error updating token:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteToken = async () => {
    if (!window.confirm('Are you sure you want to delete the current access token?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await zerodhaTokenService.deleteToken();
      setSuccess('Access token deleted successfully!');
      await loadTokenStatus();
      onTokenUpdate?.();
    } catch (error) {
      setError('Failed to delete access token');
      console.error('Error deleting token:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = () => {
    loadTokenStatus();
    loadCredentialStatus();
    loadPartnerServiceStatus();
  };

  const handleResetTokenGeneration = () => {
    setActiveStep(0);
    setLoginUrl('');
    setCallbackUrl('');
  };

  const handleUpdateCredentials = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setError('Please enter both API key and API secret');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await zerodhaTokenService.updateCredentials(apiKey, apiSecret);
      setSuccess('API credentials updated successfully!');
      setShowCredentialDialog(false);
      setApiKey('');
      setApiSecret('');
      await loadCredentialStatus();
    } catch (error: any) {
      setError(error.message || 'Failed to update credentials');
      console.error('Error updating credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestCredentials = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await zerodhaTokenService.testCredentials();
      // setCredentialTestResult(result); // This state was removed, so this line is removed.
    } catch (error: any) {
      setError(error.message || 'Failed to test credentials');
      console.error('Error testing credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUnifiedData = async () => {
    // This function was removed, so it's removed.
  };

  const handleTestKite = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await zerodhaTokenService.testKite();
      if (result.success) {
        setSuccess('Kite service is connected!');
        await loadPartnerServiceStatus();
      } else {
        setError(result.error || 'Failed to test Kite service');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to test Kite service');
      console.error('Error testing Kite service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestChartink = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await zerodhaTokenService.testChartink();
      if (result.success) {
        setSuccess('Chartink service is connected!');
        await loadPartnerServiceStatus();
      } else {
        setError(result.error || 'Failed to test Chartink service');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to test Chartink service');
      console.error('Error testing Chartink service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestYahooFinance = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await zerodhaTokenService.testYahooFinance();
      if (result.success) {
        setSuccess('Yahoo Finance service is connected!');
        await loadPartnerServiceStatus();
      } else {
        setError(result.error || 'Failed to test Yahoo Finance service');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to test Yahoo Finance service');
      console.error('Error testing Yahoo Finance service:', error);
    } finally {
      setLoading(false);
    }
  };

  // New automated token refresh functionality
  const handleAutomatedTokenRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // First check if credentials are available
      if (!credentialStatus?.api_key_valid) {
        setError('API credentials not configured. Please update credentials first.');
        return;
      }

      // Show OAuth callback component to handle the flow
      setShowOAuthCallback(true);
      
      // Attempt automated token refresh
      const result = await zerodhaTokenService.refreshTokenAutomatically();
      
      if (result.success) {
        if (result.token_refreshed) {
          setSuccess('Token refreshed automatically! New token is now active.');
        } else if (result.token_valid) {
          setSuccess('Token is still valid. No refresh needed.');
        } else {
          setError(result.error || 'Failed to refresh token automatically');
        }
        
        // Reload status to show updated information
        await loadTokenStatus();
        onTokenUpdate?.();
      } else {
        setError(result.error || 'Failed to refresh token automatically');
        setShowOAuthCallback(false);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to refresh token automatically');
      console.error('Error in automated token refresh:', error);
      setShowOAuthCallback(false);
    } finally {
      setLoading(false);
    }
  };

  const handleForceTokenRefresh = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      // Force refresh even if token seems valid
      const result = await zerodhaTokenService.forceTokenRefresh();
      
      if (result.success) {
        setSuccess('Token force refreshed successfully! New token is now active.');
        await loadTokenStatus();
        onTokenUpdate?.();
      } else {
        setError(result.error || 'Failed to force refresh token');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to force refresh token');
      console.error('Error in force token refresh:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthTokenReceived = (token: string) => {
    setOauthToken(token);
    setShowOAuthCallback(false);
    setSuccess('Access token received successfully!');
    
    // Store the token locally and update status
    zerodhaTokenService.storeAccessToken(token);
    loadTokenStatus();
    if (onTokenUpdate) onTokenUpdate();
  };

  const handleOAuthError = (error: string) => {
    setShowOAuthCallback(false);
    setError(`OAuth error: ${error}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = () => {
    if (!tokenStatus) return 'default';
    if (tokenStatus.is_valid) return 'success';
    if (tokenStatus.has_token) return 'warning';
    return 'error';
  };

  const getStatusText = () => {
    if (!tokenStatus) return 'Unknown';
    if (tokenStatus.is_valid) return 'Valid';
    if (tokenStatus.has_token) return 'Invalid';
    return 'Not Set';
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Security sx={{ mr: 1 }} />
          <Typography variant="h6">Partners Configuration & Details</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* Automated Token Refresh Button */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<Refresh />}
            onClick={handleAutomatedTokenRefresh}
            disabled={loading}
            size="small"
            sx={{ 
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
              fontWeight: 'bold',
              minWidth: '140px'
            }}
          >
            🔄 Auto Refresh
          </Button>
          
          {/* Force Token Refresh Button */}
          <Button
            variant="outlined"
            color="warning"
            startIcon={<Refresh />}
            onClick={handleForceTokenRefresh}
            disabled={loading}
            size="small"
            title="Force refresh token even if current one seems valid"
          >
            ⚡ Force
          </Button>
          
          <Chip
            label={getStatusText()}
            color={getStatusColor()}
            size="small"
            icon={tokenStatus?.is_valid ? <CheckCircle /> : <Error />}
          />
          <Tooltip title="Refresh Status">
            <IconButton onClick={handleRefreshStatus} disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Status Alerts */}
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

      {/* Automated Token Refresh Status */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKey color="primary" />
            Automated Token Management
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Automatically refresh your Kite access token using stored API credentials. 
            No manual intervention required for daily token refresh.
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Security color="primary" />
                <Typography variant="body2">
                  <strong>Credentials:</strong> {credentialStatus?.api_key_valid ? '✅ Valid' : '❌ Invalid'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CheckCircle color={tokenStatus?.is_valid ? "success" : "error"} />
                <Typography variant="body2">
                  <strong>Token:</strong> {tokenStatus?.is_valid ? '✅ Valid' : '❌ Invalid'}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VpnKey color="primary" />
                <Typography variant="body2">
                  <strong>File:</strong> {tokenStatus?.token_file_exists ? '✅ Exists' : '❌ Missing'}
                </Typography>
              </Box>
            </Grid>
          </Grid>
          
          {/* Quick Actions */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleAutomatedTokenRefresh}
              disabled={loading}
              startIcon={<Refresh />}
            >
              Quick Refresh
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleForceTokenRefresh}
              disabled={loading}
              startIcon={<Refresh />}
              color="warning"
            >
              Force Refresh
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => zerodhaTokenService.clearAccessToken()}
              disabled={loading}
              startIcon={<Delete />}
              color="error"
            >
              Clear Token
            </Button>
          </Box>
          
          {/* Current Token Display */}
          {zerodhaTokenService.getCurrentAccessToken() && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Access Token:
              </Typography>
              <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                {zerodhaTokenService.getCurrentAccessToken()?.substring(0, 20)}...
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left Column - Partner Configurations */}
        <Grid item xs={12} md={8}>
          {/* Partner Service Tests */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Partner Service Tests
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {/* Kite (Zerodha) Test */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Kite (Zerodha)
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                        <CheckCircle color={tokenStatus?.is_valid ? "success" : "error"} sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {tokenStatus?.is_valid ? "Connected" : "Disconnected"}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleTestKite}
                        disabled={loading}
                        startIcon={<Refresh />}
                      >
                        Test Kite
                      </Button>
                    </Box>
                  </Grid>

                  {/* Chartink Test */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Chartink
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                        <CheckCircle color={chartinkStatus ? "success" : "error"} sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {chartinkStatus ? "Connected" : "Disconnected"}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleTestChartink}
                        disabled={loading}
                        startIcon={<Refresh />}
                      >
                        Test Chartink
                      </Button>
                    </Box>
                  </Grid>

                  {/* Yahoo Finance Test */}
                  <Grid item xs={12} md={4}>
                    <Box sx={{ textAlign: 'center', p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Yahoo Finance
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                        <CheckCircle color={yahooFinanceStatus ? "success" : "error"} sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          {yahooFinanceStatus ? "Connected" : "Disconnected"}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleTestYahooFinance}
                        disabled={loading}
                        startIcon={<Refresh />}
                      >
                        Test Yahoo Finance
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>

          {/* Zerodha Configuration */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Zerodha API Credentials
              </Typography>
              
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Grid container spacing={2}>
                  {/* API Credentials Status */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      API Credentials
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color={credentialStatus?.api_key_valid ? "success" : "error"} />
                        </ListItemIcon>
                        <ListItemText
                          primary="API Key"
                          secondary={credentialStatus?.api_key_valid ? "Valid" : "Invalid"}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color={credentialStatus?.api_secret_configured ? "success" : "error"} />
                        </ListItemIcon>
                        <ListItemText
                          primary="API Secret"
                          secondary={credentialStatus?.api_secret_configured ? "Configured" : "Not Configured"}
                        />
                      </ListItem>
                    </List>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setShowCredentialDialog(true)}
                        startIcon={<Security />}
                      >
                        Update API Key & Secret
                      </Button>
                    </Box>
                  </Grid>

                  {/* Token Status with Generation */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" gutterBottom>
                      Access Token
                    </Typography>
                    <List dense>
                      <ListItem>
                        <ListItemIcon>
                          <CheckCircle color={tokenStatus?.is_valid ? "success" : "error"} />
                        </ListItemIcon>
                        <ListItemText
                          primary="Token Status"
                          secondary={tokenStatus?.is_valid ? "Valid" : "Invalid/Expired"}
                        />
                      </ListItem>
                      {tokenStatus?.user_info?.user_name && (
                        <ListItem>
                          <ListItemIcon>
                            <Person />
                          </ListItemIcon>
                          <ListItemText
                            primary="User"
                            secondary={tokenStatus.user_info.user_name}
                          />
                        </ListItem>
                      )}
                      <ListItem>
                        <ListItemIcon>
                          <Schedule />
                        </ListItemIcon>
                        <ListItemText
                          primary="Last Updated"
                          secondary={formatDate(tokenStatus?.last_updated)}
                        />
                      </ListItem>
                    </List>
                    <Box sx={{ mt: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setActiveStep(0)}
                        startIcon={<Link />}
                      >
                        Generate New Token
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>

          {/* Token Generation (Integrated) */}
          {activeStep > 0 && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6">
                    Generate Access Token
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleResetTokenGeneration}
                    startIcon={<Refresh />}
                  >
                    Reset
                  </Button>
                </Box>
                
                <Stepper activeStep={activeStep} orientation="vertical">
                  <Step>
                    <StepLabel>Generate Login URL</StepLabel>
                    <StepContent>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Click the button below to generate a Zerodha login URL.
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleGenerateLoginUrl}
                        disabled={loading}
                        startIcon={<Link />}
                      >
                        Generate Login URL
                      </Button>
                    </StepContent>
                  </Step>
                  
                  <Step>
                    <StepLabel>Login to Zerodha</StepLabel>
                    <StepContent>
                      {loginUrl && (
                        <Box sx={{ mb: 2 }}>
                          <TextField
                            fullWidth
                            label="Login URL"
                            value={loginUrl}
                            InputProps={{ readOnly: true }}
                            size="small"
                          />
                          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                            <Button
                              variant="outlined"
                              onClick={handleOpenLoginUrl}
                              startIcon={<OpenInNew />}
                              size="small"
                            >
                              Open URL
                            </Button>
                            <Button
                              variant="outlined"
                              onClick={handleCopyLoginUrl}
                              startIcon={<ContentCopy />}
                              size="small"
                            >
                              Copy URL
                            </Button>
                          </Box>
                        </Box>
                      )}
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        After logging in, you'll be redirected to a URL. Copy that URL and use it in the next step.
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={() => setShowCallbackDialog(true)}
                      >
                        Enter Callback URL
                      </Button>
                    </StepContent>
                  </Step>
                </Stepper>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right Column - System Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                System Status
              </Typography>
              
              <List dense>
                {/* Kite (Zerodha) Status */}
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color={tokenStatus?.is_valid ? "success" : "error"} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Kite Status"
                    secondary={tokenStatus?.is_valid ? "Connected" : "Disconnected"}
                  />
                </ListItem>
                
                {/* Chartink Status */}
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color={chartinkStatus ? "success" : "error"} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Chartink"
                    secondary={chartinkStatus ? "Connected" : "Disconnected"}
                  />
                </ListItem>
                
                {/* Yahoo Finance Status */}
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color={yahooFinanceStatus ? "success" : "error"} />
                  </ListItemIcon>
                  <ListItemText
                    primary="Yahoo Finance"
                    secondary={yahooFinanceStatus ? "Connected" : "Disconnected"}
                  />
                </ListItem>
                
                {/* Market Status */}
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Market Status"
                    secondary="Open"
                  />
                </ListItem>
                
                {/* Cache Status */}
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Cache Status"
                    secondary="Active"
                  />
                </ListItem>
                
                {/* Security Status */}
                <ListItem>
                  <ListItemIcon>
                    <CheckCircle color="success" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Security"
                    secondary="Authenticated"
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Instructions Dialog */}
      <Dialog
        open={showInstructions}
        onClose={() => setShowInstructions(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>How to Generate Zerodha Access Token</DialogTitle>
        <DialogContent>
          {instructions && (
            <Box>
              <List>
                {instructions.steps.map((step) => (
                  <ListItem key={step.step}>
                    <ListItemIcon>
                      <Typography variant="h6" color="primary">
                        {step.step}
                      </Typography>
                    </ListItemIcon>
                    <ListItemText
                      primary={step.title}
                      secondary={step.description}
                    />
                  </ListItem>
                ))}
              </List>
              
              <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                Important Notes:
              </Typography>
              <List dense>
                {instructions.notes.map((note, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Info color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={note} />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowInstructions(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Credential Management Dialog */}
      <Dialog
        open={showCredentialDialog}
        onClose={() => setShowCredentialDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Update Zerodha API Credentials</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Update your Zerodha API key and secret. These are used to generate access tokens.
          </Typography>
          <TextField
            fullWidth
            label="API Key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            margin="normal"
            placeholder="Enter your Zerodha API key..."
          />
          <TextField
            fullWidth
            label="API Secret"
            type="password"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            margin="normal"
            placeholder="Enter your Zerodha API secret..."
          />
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Note:</strong> API key and secret are used to generate access tokens. Update these only if they change.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCredentialDialog(false)}>Cancel</Button>
          <Button
            onClick={handleUpdateCredentials}
            variant="contained"
            disabled={!apiKey.trim() || !apiSecret.trim() || loading}
          >
            Update Credentials
          </Button>
        </DialogActions>
      </Dialog>

      {/* Callback URL Dialog */}
      <Dialog
        open={showCallbackDialog}
        onClose={() => setShowCallbackDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Enter Callback URL</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Step 1:</strong> After logging in to Zerodha, you'll be redirected to a URL in your browser.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Step 2:</strong> Copy the <strong>entire URL</strong> from your browser's address bar.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            <strong>Step 3:</strong> Paste the URL below. It should contain a "request_token" parameter.
          </Typography>
          <TextField
            fullWidth
            label="Callback URL"
            value={callbackUrl}
            onChange={(e) => setCallbackUrl(e.target.value)}
            multiline
            rows={4}
            placeholder="https://your-app.com/?action=login&status=success&request_token=abc123..."
            sx={{ mb: 2 }}
          />
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Example URL format:</strong><br/>
              https://your-app.com/?action=login&status=success&request_token=abc123def456...
            </Typography>
          </Alert>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Important:</strong> Do NOT paste an access token here. Paste the callback URL that contains the request_token.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCallbackDialog(false)}>Cancel</Button>
          <Button
            onClick={handleGenerateFromCallback}
            variant="contained"
            disabled={!callbackUrl.trim() || loading}
          >
            Generate Token
          </Button>
        </DialogActions>
      </Dialog>

      {/* OAuth Callback Component */}
      {showOAuthCallback && (
        <KiteOAuthCallback
          onTokenReceived={handleOAuthTokenReceived}
          onError={handleOAuthError}
        />
      )}
    </Box>
  );
};

export default ZerodhaTokenManager; 