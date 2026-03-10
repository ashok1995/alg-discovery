import React from 'react';
import {
  Box,
  Chip,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import type { TokenStatus } from '../../services/KiteTokenService';
import type { CredentialsStatusResponse } from '../../services/KiteTokenService';

interface TokenStatusPanelProps {
  tokenStatus: TokenStatus | null;
  credentialsStatus: CredentialsStatusResponse | null;
  serviceHealthy: boolean | null;
  loading: boolean;
  error: string | null;
  success: string | null;
  onRefresh: () => void;
}

const getStatusInfo = (
  tokenStatus: TokenStatus | null
): { color: 'default' | 'success' | 'warning' | 'error'; icon: React.ReactElement; text: string } => {
  if (!tokenStatus)
    return { color: 'default', icon: <SecurityIcon />, text: 'Unknown' };
  if (tokenStatus.kite_token_valid)
    return { color: 'success', icon: <CheckIcon />, text: 'Valid' };
  if (tokenStatus.needs_refresh)
    return { color: 'warning', icon: <WarningIcon />, text: 'Expired' };
  return { color: 'error', icon: <ErrorIcon />, text: 'Invalid' };
};

const TokenStatusPanel: React.FC<TokenStatusPanelProps> = ({
  tokenStatus,
  credentialsStatus,
  serviceHealthy,
  loading,
  error,
  success,
  onRefresh,
}) => {
  const statusInfo = getStatusInfo(tokenStatus);
  const apiKeyPresent = credentialsStatus?.api_key_configured ?? false;

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexWrap: 'wrap',
          }}
        >
          <SecurityIcon sx={{ fontSize: 20 }} />
          <Typography variant="h6" sx={{ fontSize: '1.1rem' }}>
            Kite Connect
          </Typography>
          <Chip
            icon={statusInfo.icon}
            label={`Token ${statusInfo.text}`}
            color={statusInfo.color}
            size="small"
            sx={{ height: 24, fontSize: '0.75rem' }}
          />
          <Chip
            label={apiKeyPresent ? 'API key set' : 'No API key'}
            color={apiKeyPresent ? 'success' : 'default'}
            size="small"
            variant="outlined"
            sx={{ height: 24, fontSize: '0.7rem' }}
          />
          {serviceHealthy !== null && (
            <Chip
              label={serviceHealthy ? 'Service connected' : 'Service offline'}
              color={serviceHealthy ? 'success' : 'error'}
              size="small"
              variant="outlined"
              sx={{ height: 24, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <IconButton
          size="small"
          onClick={onRefresh}
          disabled={loading}
          sx={{ p: 0.5 }}
        >
          {loading ? (
            <CircularProgress size={16} />
          ) : (
            <RefreshIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2, py: 0.5 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2, py: 0.5 }}>
          {success}
        </Alert>
      )}
    </>
  );
};

export default TokenStatusPanel;
export { getStatusInfo };
