import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Button,
  Chip,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Wifi,
  WifiOff,
  Settings,
  Refresh,
  CheckCircle,
  Error,
  Warning
} from '@mui/icons-material';
import { useCentralizedPriceManager } from '../hooks/useCentralizedPriceManager';

interface KiteConnectionStatusProps {
  onConfigUpdate?: (config: { apiKey: string; accessToken: string }) => void;
}

const KiteConnectionStatus: React.FC<KiteConnectionStatusProps> = ({ onConfigUpdate }) => {
  const [apiKey, setApiKey] = useState(process.env.REACT_APP_KITE_API_KEY || '');
  const [accessToken, setAccessToken] = useState(process.env.REACT_APP_KITE_ACCESS_TOKEN || '');
  const [showConfig, setShowConfig] = useState(false);
  const [testResult, setTestResult] = useState<string>('');

  const {
    isConnected,
    isLoading,
    stats,
    connect,
    disconnect,
    getSubscribedSymbols
  } = useCentralizedPriceManager({
    autoConnect: false
  });

  const checkConfiguration = () => {
    const issues = [];
    
    if (!apiKey) issues.push('API Key is missing');
    if (!accessToken) issues.push('Access Token is missing');
    if (apiKey && apiKey.length < 10) issues.push('API Key appears to be invalid');
    if (accessToken && accessToken.length < 10) issues.push('Access Token appears to be invalid');
    
    return {
      isValid: issues.length === 0,
      issues
    };
  };

  const testConnection = async () => {
    setTestResult('Testing connection...');
    
    try {
      const config = {
        apiKey,
        accessToken,
        maxReconnectAttempts: 3,
        reconnectDelay: 2000,
        heartbeatInterval: 15000
      };

      await connect(config);
      
      // Wait a bit to see if connection establishes
      setTimeout(() => {
        if (isConnected) {
          setTestResult('✅ Connection successful! WebSocket is connected.');
        } else {
          setTestResult('❌ Connection failed. Check credentials and network.');
        }
      }, 3000);
      
    } catch (error: any) {
      setTestResult(`❌ Connection error: ${error.message}`);
    }
  };

  const handleConfigSave = () => {
    if (onConfigUpdate) {
      onConfigUpdate({ apiKey, accessToken });
    }
    
    // Save to localStorage for persistence
    localStorage.setItem('kite_config', JSON.stringify({ apiKey, accessToken }));
    setShowConfig(false);
  };

  const loadSavedConfig = () => {
    const saved = localStorage.getItem('kite_config');
    if (saved) {
      try {
        const config = JSON.parse(saved);
        setApiKey(config.apiKey || '');
        setAccessToken(config.accessToken || '');
      } catch (error) {
        console.error('Failed to load saved config:', error);
      }
    }
  };

  useEffect(() => {
    loadSavedConfig();
  }, []);

  const config = checkConfiguration();

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Kite Connect Status
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Chip
              icon={isConnected ? <Wifi /> : <WifiOff />}
              label={isConnected ? 'CONNECTED' : 'OFFLINE'}
              color={isConnected ? 'success' : 'error'}
              size="small"
            />
            <Button
              size="small"
              startIcon={<Settings />}
              onClick={() => setShowConfig(!showConfig)}
            >
              Config
            </Button>
          </Box>
        </Box>

        {/* Configuration Section */}
        {showConfig && (
          <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
              Kite Connect Configuration
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  size="small"
                  type="password"
                  helperText={apiKey ? `${apiKey.length} characters` : 'Enter your Kite Connect API Key'}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Access Token"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  size="small"
                  type="password"
                  helperText={accessToken ? `${accessToken.length} characters` : 'Enter your Kite Connect Access Token'}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleConfigSave}
                disabled={!config.isValid}
              >
                Save Configuration
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={testConnection}
                disabled={!config.isValid || isLoading}
                startIcon={<Refresh />}
              >
                Test Connection
              </Button>
            </Box>

            {!config.isValid && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Configuration issues:
                </Typography>
                <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                  {config.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </Alert>
            )}

            {testResult && (
              <Alert severity={testResult.includes('✅') ? 'success' : 'error'} sx={{ mb: 2 }}>
                {testResult}
              </Alert>
            )}
          </Box>
        )}

        {/* Status Information */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Connection Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {isConnected ? (
                  <CheckCircle color="success" />
                ) : (
                  <Error color="error" />
                )}
                <Typography variant="body2">
                  {isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Configuration Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {config.isValid ? (
                  <CheckCircle color="success" />
                ) : (
                  <Warning color="warning" />
                )}
                <Typography variant="body2">
                  {config.isValid ? 'Configuration Valid' : 'Configuration Issues'}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Statistics
              </Typography>
              <Typography variant="body2">
                Subscribed Symbols: {getSubscribedSymbols().length}
              </Typography>
              <Typography variant="body2">
                Cache Hit Rate: {stats.cacheHitRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2">
                Memory Usage: {stats.memoryUsage}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Environment Variables Info */}
        <Divider sx={{ my: 2 }} />
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Environment Variables
          </Typography>
          <Typography variant="caption" color="text.secondary">
            REACT_APP_KITE_API_KEY: {process.env.REACT_APP_KITE_API_KEY ? '✅ Set' : '❌ Not Set'}
          </Typography>
          <br />
          <Typography variant="caption" color="text.secondary">
            REACT_APP_KITE_ACCESS_TOKEN: {process.env.REACT_APP_KITE_ACCESS_TOKEN ? '✅ Set' : '❌ Not Set'}
          </Typography>
        </Box>

        {/* Troubleshooting Tips */}
        <Divider sx={{ my: 2 }} />
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Troubleshooting
          </Typography>
          <Typography variant="caption" color="text.secondary">
            • Ensure your Kite Connect API key and access token are valid
          </Typography>
          <br />
          <Typography variant="caption" color="text.secondary">
            • Check if your Zerodha account has WebSocket permissions enabled
          </Typography>
          <br />
          <Typography variant="caption" color="text.secondary">
            • Verify your access token hasn't expired (tokens expire daily)
          </Typography>
          <br />
          <Typography variant="caption" color="text.secondary">
            • Check browser console for WebSocket connection errors
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default KiteConnectionStatus; 