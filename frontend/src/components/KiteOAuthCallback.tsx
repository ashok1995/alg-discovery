import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';

interface KiteOAuthCallbackProps {
  onTokenReceived: (token: string) => void;
  onError: (error: string) => void;
}

const KiteOAuthCallback: React.FC<KiteOAuthCallbackProps> = ({ onTokenReceived, onError }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing OAuth callback...');

  useEffect(() => {
    // Parse URL parameters to extract tokens
    const urlParams = new URLSearchParams(window.location.search);
    const requestToken = urlParams.get('request_token');
    const accessToken = urlParams.get('access_token');
    const error = urlParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(`OAuth error: ${error}`);
      onError(error);
      return;
    }

    if (accessToken) {
      // Direct access token received
      setStatus('success');
      setMessage('Access token received successfully!');
      onTokenReceived(accessToken);
      
      // Close window after a short delay
      setTimeout(() => {
        window.close();
      }, 2000);
      return;
    }

    if (requestToken) {
      // Request token received, need to exchange for access token
      setStatus('loading');
      setMessage('Exchanging request token for access token...');
      
      // Exchange request token for access token
      exchangeRequestToken(requestToken);
      return;
    }

    // No tokens found
    setStatus('error');
    setMessage('No tokens found in callback URL');
    onError('No tokens found in callback URL');
  }, [onTokenReceived, onError]);

  const exchangeRequestToken = async (requestToken: string) => {
    try {
      // This would call your backend to exchange the request token
      // For now, we'll simulate the exchange
      const response = await fetch('/api/zerodha/exchange-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_token: requestToken })
      });

      if (!response.ok) {
        throw new Error('Failed to exchange request token');
      }

      const result = await response.json();
      
      if (result.access_token) {
        setStatus('success');
        setMessage('Access token received successfully!');
        onTokenReceived(result.access_token);
        
        // Close window after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);
      } else {
        throw new Error('No access token in response');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Failed to exchange token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '300px',
      p: 3,
      textAlign: 'center'
    }}>
      {status === 'loading' && (
        <>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Processing OAuth Callback
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
        </>
      )}

      {status === 'success' && (
        <>
          <CheckCircle color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h6" gutterBottom color="success.main">
            Success!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This window will close automatically...
          </Typography>
        </>
      )}

      {status === 'error' && (
        <>
          <ErrorIcon color="error" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h6" gutterBottom color="error.main">
            Error
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {message}
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => window.close()}
            sx={{ mt: 2 }}
          >
            Close Window
          </Button>
        </>
      )}
    </Box>
  );
};

export default KiteOAuthCallback;
