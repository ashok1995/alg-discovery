import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import { useKiteWebSocket } from '../hooks/useKiteWebSocket';
import { KiteWebSocketConfig } from '../services/KiteWebSocketService';

const KiteWebSocketTest: React.FC = () => {
  const [apiKey, setApiKey] = useState(process.env.REACT_APP_KITE_API_KEY || '');
  const [accessToken, setAccessToken] = useState(process.env.REACT_APP_KITE_ACCESS_TOKEN || '');
  const [priceUpdates, setPriceUpdates] = useState<any[]>([]);

  const {
    isConnected,
    isConnecting,
    stats,
    connect,
    disconnect,
    subscribeToInstruments,
    getSubscribedSymbols
  } = useKiteWebSocket({
    autoConnect: false,
    onPriceUpdate: (priceData) => {
      setPriceUpdates(prev => [priceData, ...prev.slice(0, 9)]); // Keep last 10 updates
    }
  });

  const handleConnect = async () => {
    try {
      const config: KiteWebSocketConfig = {
        apiKey,
        accessToken
      };
      await connect(config);
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleTestSubscription = () => {
    if (isConnected) {
      // Test with some common instrument tokens
      subscribeToInstruments([
        { instrument_token: 256265, symbol: 'RELIANCE' },
        { instrument_token: 11536, symbol: 'TCS' },
        { instrument_token: 1594, symbol: 'INFY' },
        { instrument_token: 1330, symbol: 'HDFC' },
        { instrument_token: 3045, symbol: 'ICICIBANK' }
      ]);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom>
        Kite WebSocket Test
      </Typography>

      {/* Connection Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Connection Status
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Chip 
                label={isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}
                color={isConnected ? 'success' : isConnecting ? 'warning' : 'error'}
              />
            </Grid>
            <Grid item>
              <Typography variant="body2">
                Connection ID: {stats.connectionId || 'N/A'}
              </Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2">
                Subscribed: {stats.subscribedSymbols} symbols
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Configuration
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                type="password"
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Access Token"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                type="password"
                margin="normal"
              />
            </Grid>
          </Grid>
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="success"
              onClick={handleConnect}
              disabled={isConnecting || isConnected}
              sx={{ mr: 2 }}
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={disconnect}
              disabled={!isConnected}
              sx={{ mr: 2 }}
            >
              Disconnect
            </Button>
            <Button
              variant="outlined"
              onClick={handleTestSubscription}
              disabled={!isConnected}
            >
              Test Subscription
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Statistics
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Last Connected
              </Typography>
              <Typography variant="body1">
                {stats.lastConnected ? new Date(stats.lastConnected).toLocaleTimeString() : 'Never'}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Last Message
              </Typography>
              <Typography variant="body1">
                {stats.lastMessageTime ? new Date(stats.lastMessageTime).toLocaleTimeString() : 'Never'}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Reconnect Attempts
              </Typography>
              <Typography variant="body1">
                {stats.reconnectAttempts}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="body2" color="text.secondary">
                Subscribed Symbols
              </Typography>
              <Typography variant="body1">
                {getSubscribedSymbols().join(', ') || 'None'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Price Updates */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Price Updates (Last 10)
          </Typography>
          {priceUpdates.length === 0 ? (
            <Alert severity="info">
              No price updates received yet. Connect to Kite WebSocket and subscribe to instruments to see real-time updates.
            </Alert>
          ) : (
            <List>
              {priceUpdates.map((update, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemText
                      primary={`${update.symbol || 'Unknown'} - ₹${update.last_price}`}
                      secondary={`Change: ${update.change} (${update.change_percent}%) | Volume: ${update.volume} | Time: ${new Date(update.timestamp).toLocaleTimeString()}`}
                    />
                  </ListItem>
                  {index < priceUpdates.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default KiteWebSocketTest; 