import React, { useState, useEffect } from 'react';
import { 
  containerConfigService, 
  ContainerStatus, 
  ContainerConfig,
  ZerodhaTokenStatus,
  ConnectionTestResult,
  CredentialStatus,
  AutoRefreshTokenResponse,
  GenerateLoginUrlResponse
} from '../services/containerConfigService';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  IconButton,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Info,
  Refresh,
  Settings,
  Security,
  Wifi,
  Cloud,
  Build,
  HealthAndSafety,
  Api,
  Link,
  Save,
  VpnKey
} from '@mui/icons-material';



const ZerodhaContainerIntegration: React.FC = () => {
  const [status, setStatus] = useState<ContainerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<ContainerConfig>(containerConfigService.getConfig());

  // New state for comprehensive data
  const [tokenStatus, setTokenStatus] = useState<ZerodhaTokenStatus | null>(null);
  const [connectionTest, setConnectionTest] = useState<ConnectionTestResult | null>(null);
  const [credentialsStatus, setCredentialsStatus] = useState<CredentialStatus | null>(null);
  const [autoRefreshResult, setAutoRefreshResult] = useState<AutoRefreshTokenResponse | null>(null);
  const [loginUrl, setLoginUrl] = useState<GenerateLoginUrlResponse | null>(null);

  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [customHost, setCustomHost] = useState(config.host);
  const [customPort, setCustomPort] = useState(config.port.toString());

  // Token management dialog state
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [tokenType, setTokenType] = useState('access_token');
  const [tokenLoading, setTokenLoading] = useState(false);

  useEffect(() => {
    checkContainerStatus();
    // Set up periodic status check every 30 seconds
    const interval = setInterval(checkContainerStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkContainerStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get comprehensive status from the dedicated endpoint
      const comprehensiveStatusData = await containerConfigService.getComprehensiveStatusFromEndpoint();

      // Create a simple status object for display
      const status: ContainerStatus = {
        container: {
          status: comprehensiveStatusData.service.running ? 'running' : 'stopped',
          port: comprehensiveStatusData.service.port,
          health: comprehensiveStatusData.summary.all_systems_operational ? 'healthy' : 'unhealthy',
          lastCheck: comprehensiveStatusData.connection.timestamp
        },
        api: {
          status: comprehensiveStatusData.connection.connected ? 'connected' : 'disconnected',
          responseTime: 0, // We don't have this data
          endpoints: ['comprehensive-status', 'health', 'settings']
        },
        services: {
          zerodha: {
            status: comprehensiveStatusData.summary.all_systems_operational ? 'active' : 'inactive',
            tokenValid: comprehensiveStatusData.summary.token_valid,
            credentialsValid: comprehensiveStatusData.summary.api_key_configured
          },
          redis: {
            status: 'inactive' // We don't have redis data, so assume inactive
          }
        }
      };
      setStatus(status);

      // Also get individual endpoint data for detailed display
      const [tokenStatusData, connectionTestData, credentialsStatusData] = await Promise.allSettled([
        containerConfigService.getZerodhaTokenStatus(),
        containerConfigService.testZerodhaConnection(),
        containerConfigService.getCredentialsStatus()
      ]);

      setTokenStatus(tokenStatusData.status === 'fulfilled' ? tokenStatusData.value : null);
      setConnectionTest(connectionTestData.status === 'fulfilled' ? connectionTestData.value : null);
      setCredentialsStatus(credentialsStatusData.status === 'fulfilled' ? credentialsStatusData.value : null);
    } catch (error) {
      console.error('Error checking container status:', error);
      setError('Failed to connect to Zerodha container');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoRefreshToken = async () => {
    try {
      const result = await containerConfigService.autoRefreshToken();
      setAutoRefreshResult(result);
    } catch (error) {
      console.error('Error auto refreshing token:', error);
      setError('Failed to auto refresh token');
    }
  };

  const handleGenerateLoginUrl = async () => {
    try {
      const result = await containerConfigService.generateLoginUrl();
      setLoginUrl(result);
    } catch (error) {
      console.error('Error generating login URL:', error);
      setError('Failed to generate login URL');
    }
  };

  const handleSaveToken = async () => {
    if (!accessToken.trim()) {
      setError('Please enter a valid access token');
      return;
    }

    setTokenLoading(true);
    setError(null);

    try {
      const response = await fetch(`${containerConfigService.getBaseUrl()}/api/zerodha/token/api/zerodha/update-access-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          access_token: accessToken,
          token_type: tokenType
        }),
      });

      if (!response.ok) {
        throw new globalThis.Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setShowTokenDialog(false);
        setAccessToken('');
        // Refresh status to show updated token info
        await checkContainerStatus();
      } else {
        setError(result.message || 'Failed to save token');
      }
    } catch (error) {
      console.error('Error saving token:', error);
      setError('Failed to save access token');
    } finally {
      setTokenLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'active':
      case 'healthy':
        return 'success';
      case 'stopped':
      case 'disconnected':
      case 'inactive':
        return 'warning';
      case 'error':
      case 'unhealthy':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
      case 'connected':
      case 'active':
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'stopped':
      case 'disconnected':
      case 'inactive':
        return <Warning color="warning" />;
      case 'error':
      case 'unhealthy':
        return <Error color="error" />;
      default:
        return <Info color="info" />;
    }
  };

  const handleConfigUpdate = () => {
    containerConfigService.updateConfig({
      host: customHost,
      port: parseInt(customPort)
    });
    setConfig(containerConfigService.getConfig());
    setShowConfigDialog(false);
    checkContainerStatus();
  };

  const openContainerDocs = () => {
    window.open(containerConfigService.getEndpointUrl('docs'), '_blank');
  };

  const openContainerHealth = () => {
    window.open(containerConfigService.getEndpointUrl('health'), '_blank');
  };

  if (!status) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Checking container status...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Cloud sx={{ mr: 1 }} />
              <Typography variant="h6">Kite Services Status</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={checkContainerStatus} disabled={loading}>
                <Refresh />
              </IconButton>
              <IconButton onClick={() => setShowConfigDialog(true)}>
                <Settings />
              </IconButton>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Kite Services Status Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Service Status
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Service</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Details</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Container Status */}
                <TableRow>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Build sx={{ mr: 1 }} />
                      Container
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(status.container.status)}
                      label={status.container.status}
                      color={getStatusColor(status.container.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    Port: {status.container.port} | Health: {status.container.health}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<HealthAndSafety />}
                      onClick={openContainerHealth}
                    >
                      Health
                    </Button>
                  </TableCell>
                </TableRow>

                {/* API Connection */}
                <TableRow>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Api sx={{ mr: 1 }} />
                      API Connection
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(status.api.status)}
                      label={status.api.status}
                      color={getStatusColor(status.api.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    Response: {status.api.responseTime}ms
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Api />}
                      onClick={openContainerDocs}
                    >
                      Docs
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Token Status */}
                <TableRow>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <VpnKey sx={{ mr: 1 }} />
                      Access Token
                    </Box>
                  </TableCell>
                  <TableCell>
                    {tokenStatus ? (
                      <Chip
                        icon={getStatusIcon(tokenStatus.is_valid ? 'active' : 'inactive')}
                        label={tokenStatus.is_valid ? 'Valid' : 'Invalid'}
                        color={getStatusColor(tokenStatus.is_valid ? 'active' : 'inactive') as any}
                        size="small"
                      />
                    ) : (
                      <Chip label="Unknown" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {tokenStatus ? (
                      <>
                        Present: {tokenStatus.has_token ? 'Yes' : 'No'} | 
                        Last Updated: {tokenStatus.last_updated ? new Date(tokenStatus.last_updated).toLocaleDateString() : 'Never'}
                      </>
                    ) : (
                      'Loading...'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Link />}
                      onClick={handleGenerateLoginUrl}
                      disabled={loading}
                    >
                      Get Login URL
                    </Button>
                    <Button
                      size="small"
                      startIcon={<Save />}
                      onClick={() => setShowTokenDialog(true)}
                      sx={{ ml: 1 }}
                    >
                      Save Token
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Credentials Status */}
                <TableRow>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Security sx={{ mr: 1 }} />
                      API Credentials
                    </Box>
                  </TableCell>
                  <TableCell>
                    {credentialsStatus ? (
                      <Chip
                        icon={getStatusIcon(credentialsStatus.api_key_valid ? 'active' : 'inactive')}
                        label={credentialsStatus.api_key_valid ? 'Valid' : 'Invalid'}
                        color={getStatusColor(credentialsStatus.api_key_valid ? 'active' : 'inactive') as any}
                        size="small"
                      />
                    ) : (
                      <Chip label="Unknown" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {credentialsStatus ? (
                      <>
                        Key: {credentialsStatus.api_key ? 'Configured' : 'Missing'} | 
                        Secret: {credentialsStatus.api_secret_configured ? 'Yes' : 'No'}
                      </>
                    ) : (
                      'Loading...'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Settings />}
                      onClick={() => setShowConfigDialog(true)}
                    >
                      Configure
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Connection Test */}
                <TableRow>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Wifi sx={{ mr: 1 }} />
                      Kite Connection
                    </Box>
                  </TableCell>
                  <TableCell>
                    {connectionTest ? (
                      <Chip
                        icon={getStatusIcon(connectionTest.success ? 'active' : 'inactive')}
                        label={connectionTest.success ? 'Connected' : 'Failed'}
                        color={getStatusColor(connectionTest.success ? 'active' : 'inactive') as any}
                        size="small"
                      />
                    ) : (
                      <Chip label="Unknown" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {connectionTest ? (
                      <>
                        Kite: {connectionTest.kite_available ? 'Available' : 'Unavailable'} | 
                        {connectionTest.message}
                      </>
                    ) : (
                      'Loading...'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<Refresh />}
                      onClick={handleAutoRefreshToken}
                      disabled={loading}
                    >
                      Refresh
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Login URL Result */}
      {loginUrl && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Alert severity="info">
              <Typography variant="subtitle2">Login URL Generated</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                API Key: {loginUrl.api_key}
              </Typography>
              <Button
                variant="text"
                size="small"
                onClick={() => window.open(loginUrl.login_url, '_blank')}
                sx={{ mt: 1 }}
              >
                Open Login URL
              </Button>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Auto Refresh Result */}
      {autoRefreshResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Alert severity={autoRefreshResult.success ? 'success' : 'warning'}>
              <Typography variant="subtitle2">{autoRefreshResult.message}</Typography>
              {autoRefreshResult.token_age_hours && (
                <Typography variant="body2">
                  Token Age: {autoRefreshResult.token_age_hours.toFixed(2)} hours
                </Typography>
              )}
              {autoRefreshResult.instructions && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight="bold">Instructions:</Typography>
                  {autoRefreshResult.instructions.map((instruction, index) => (
                    <Typography key={index} variant="body2">• {instruction}</Typography>
                  ))}
                </Box>
              )}
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onClose={() => setShowConfigDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Container Configuration</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Host"
              value={customHost}
              onChange={(e) => setCustomHost(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Port"
              value={customPort}
              onChange={(e) => setCustomPort(e.target.value)}
              type="number"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfigDialog(false)}>Cancel</Button>
          <Button onClick={handleConfigUpdate} variant="contained">Update</Button>
        </DialogActions>
      </Dialog>

      {/* Token Management Dialog */}
      <Dialog open={showTokenDialog} onClose={() => setShowTokenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Access Token</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter the access token obtained from the Zerodha login callback URL.
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Token Type</InputLabel>
              <Select
                value={tokenType}
                label="Token Type"
                onChange={(e) => setTokenType(e.target.value)}
              >
                <MenuItem value="access_token">Access Token</MenuItem>
                <MenuItem value="request_token">Request Token</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Access Token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              multiline
              rows={3}
              placeholder="Paste your access token here..."
              helperText="This token will be saved securely and used for API calls"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTokenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveToken} 
            variant="contained" 
            disabled={tokenLoading || !accessToken.trim()}
            startIcon={tokenLoading ? <CircularProgress size={16} /> : <Save />}
          >
            {tokenLoading ? 'Saving...' : 'Save Token'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ZerodhaContainerIntegration; 