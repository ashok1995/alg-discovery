/**
 * Modern Kite Token Management Component
 * ====================================
 *
 * Flow: Check API key → Get callback URL → Paste URL or access token → Save for other services.
 * No Kite login flow here (user logs in to Kite daily; 2-step external).
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  Alert,
  CircularProgress,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';

import {
  kiteTokenService,
  TokenStatus,
  TokenRefreshInfo,
  CallbackUrlResponse,
  CredentialsStatusResponse,
} from '../services/KiteTokenService';

const PLACEHOLDER =
  'Paste full callback URL (after Kite login redirect) OR paste access token directly';

/** Detect if input looks like full callback URL vs direct access token */
function isCallbackUrl(input: string): boolean {
  const t = input.trim();
  return (
    t.includes('request_token=') ||
    (t.startsWith('http') && t.includes('request_token'))
  );
}

/** Detect if input looks like direct access token (alphanumeric, 20+ chars) */
function looksLikeAccessToken(input: string): boolean {
  const t = input.trim();
  if (!t || t.length < 20) return false;
  return /^[a-zA-Z0-9_-]+$/.test(t) && !t.includes(' ') && !t.includes('http');
}

interface SimpleKiteTokenManagementProps {
  onTokenUpdate?: () => void;
}

const SimpleKiteTokenManagement: React.FC<SimpleKiteTokenManagementProps> = ({
  onTokenUpdate,
}) => {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [credentialsStatus, setCredentialsStatus] =
    useState<CredentialsStatusResponse | null>(null);
  const [refreshInfo, setRefreshInfo] = useState<TokenRefreshInfo | null>(null);
  const [callbackUrl, setCallbackUrl] = useState<CallbackUrlResponse | null>(
    null
  );
  const [serviceHealthy, setServiceHealthy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [pasteInput, setPasteInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [showCallbackDetails, setShowCallbackDetails] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusData, healthData, credStatus, cbData] = await Promise.all([
        kiteTokenService.getTokenStatus().catch(() => ({} as TokenStatus)),
        kiteTokenService.getHealth().catch(() => ({ status: 'unhealthy' })),
        kiteTokenService.getCredentialsStatus().catch(() => ({
          api_key_configured: false,
          message: 'Service unavailable',
        })),
        kiteTokenService.getCallbackUrl().catch(() => null),
      ]);

      setTokenStatus(statusData);
      setCredentialsStatus(credStatus);
      setCallbackUrl(cbData);
      setServiceHealthy(healthData?.status === 'healthy');

      try {
        const refreshData = await kiteTokenService.getRefreshInfo();
        setRefreshInfo(refreshData);
      } catch {
        setRefreshInfo({
          login_url: '',
          message: credStatus?.api_key_configured
            ? 'Use callback URL for login'
            : 'Configure API key first',
        });
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to load token status';
      setError(msg);
      setServiceHealthy(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!apiKey.trim()) {
      setError('API key is required');
      return;
    }
    try {
      setSavingCreds(true);
      setError(null);
      await kiteTokenService.saveCredentials(apiKey.trim(), apiSecret.trim());
      setSuccess('API credentials saved. You can now get callback URL and tokens.');
      setApiKey('');
      setApiSecret('');
      setShowApiKeyForm(false);
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setSavingCreds(false);
    }
  };

  const submitTokenOrUrl = async () => {
    const input = pasteInput.trim();
    if (!input) {
      setError('Paste callback URL or access token');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      if (isCallbackUrl(input)) {
        const requestToken =
          kiteTokenService.extractRequestTokenFromUrl(input);
        if (!requestToken) {
          setError('No request_token found in URL');
          setSubmitting(false);
          return;
        }
        const result = await kiteTokenService.generateAccessToken(
          requestToken
        );
        if (result.success && result.access_token) {
          await kiteTokenService
            .updateToken(result.access_token, result.user_id)
            .catch(() => ({ success: false }));
          setPasteInput('');
          setSuccess('Token generated and saved. Daily refresh complete.');
        } else {
          throw new Error(result.error || 'Failed to exchange token');
        }
      } else if (looksLikeAccessToken(input)) {
        const result =
          await kiteTokenService.validateAndSaveAccessToken(input);
        if (result.success) {
          setPasteInput('');
          setSuccess(
            result.message ||
              'Access token validated and saved for other services.'
          );
        } else {
          throw new Error(result.error || 'Failed to save token');
        }
      } else {
        setError(
          'Paste either the full callback URL (contains request_token) or the access token directly'
        );
        setSubmitting(false);
        return;
      }

      await loadStatus();
      onTokenUpdate?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to process token'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasteChange = (value: string) => {
    setPasteInput(value);
    if (value.trim()) setError(null);
    if (value.includes('request_token=')) {
      const token = kiteTokenService.extractRequestTokenFromUrl(value);
      if (token) setPasteInput(value);
    }
  };

  /** Use backend callback URL from GET /api/token/callback-url (source of truth) */
  const effectiveCallbackUrl = callbackUrl?.callback_url ?? '';

  const copyCallbackUrl = () => {
    if (effectiveCallbackUrl) {
      navigator.clipboard.writeText(effectiveCallbackUrl);
      setSuccess('Callback URL copied to clipboard');
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getStatusInfo = (): {
    color: 'default' | 'success' | 'warning' | 'error';
    icon: React.ReactElement;
    text: string;
  } => {
    if (!tokenStatus) return { color: 'default', icon: <SecurityIcon />, text: 'Unknown' };
    if (tokenStatus.kite_token_valid)
      return { color: 'success', icon: <CheckIcon />, text: 'Valid' };
    if (tokenStatus.needs_refresh)
      return { color: 'warning', icon: <WarningIcon />, text: 'Expired' };
    return { color: 'error', icon: <ErrorIcon />, text: 'Invalid' };
  };

  if (loading && !tokenStatus) {
    return (
      <Card>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={20} sx={{ mr: 1.5 }} />
            <Typography variant="body2">Loading Kite status...</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = getStatusInfo();
  const apiKeyPresent = credentialsStatus?.api_key_configured ?? false;

  return (
    <Card>
      <CardContent sx={{ py: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
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
          <IconButton size="small" onClick={loadStatus} disabled={loading} sx={{ p: 0.5 }}>
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

        {/* API Key – 2-step: button to reveal form */}
        <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
            API Key & Secret
          </Typography>
          {!showApiKeyForm ? (
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowApiKeyForm(true)}
              sx={{ textTransform: 'none' }}
            >
              {apiKeyPresent ? 'Update API Key & Secret' : 'Configure API Key & Secret'}
            </Button>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
              <Typography variant="caption" display="block" color="text.secondary">
                From <a href="https://developers.kite.trade/apps" target="_blank" rel="noopener noreferrer">developers.kite.trade/apps</a>. Carefully check similar characters (0 vs o, 1 vs l) against what Kite shows.
              </Typography>
              <TextField
                size="small"
                label="API Key"
                placeholder="Your Kite API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                fullWidth
              />
              <TextField
                size="small"
                label="API Secret"
                placeholder="API secret for token generation"
                type="password"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                fullWidth
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveCredentials}
                  disabled={!apiKey.trim() || savingCreds}
                  startIcon={savingCreds ? <CircularProgress size={14} /> : undefined}
                  sx={{ textTransform: 'none' }}
                >
                  {savingCreds ? 'Saving...' : apiKeyPresent ? 'Update credentials' : 'Save credentials'}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setShowApiKeyForm(false);
                    setApiKey('');
                    setApiSecret('');
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
        </Box>

        {/* Valid token display */}
        {tokenStatus?.kite_token_valid && (
          <Alert severity="success" sx={{ mb: 2, py: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Token valid • Expires in ~24 hrs
                </Typography>
                {tokenStatus.user_name && (
                  <Typography variant="caption" color="text.secondary">
                    {tokenStatus.user_name} • {tokenStatus.kite_token_masked}
                  </Typography>
                )}
              </Box>
            </Box>
          </Alert>
        )}

        {/* Token flow: always show when API key is set – get callback URL, open login, paste result */}
        {apiKeyPresent && (
            <Box>
              <Alert severity="info" sx={{ mb: 2, py: 0.5 }} variant="outlined">
                <Typography variant="caption" display="block">
                  Daily flow: 1) Click &quot;Get Redirect URL&quot; to fetch callback URL from backend. 2) Set that as Redirect URL in{' '}
                  <a href="https://developers.kite.trade/apps" target="_blank" rel="noopener noreferrer">developers.kite.trade</a>. 3) Then click &quot;Open Kite Login&quot; to start Kite login. 4) After redirect, paste the callback URL or token below.
                </Typography>
              </Alert>

              {effectiveCallbackUrl && (
                <Box sx={{ mb: 2 }}>
                  {!showCallbackDetails ? (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setShowCallbackDetails(true)}
                      sx={{ textTransform: 'none' }}
                    >
                      Get Redirect URL
                    </Button>
                  ) : (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
                        Redirect URL – copy to developers.kite.trade (must match)
                      </Typography>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Typography
                          variant="caption"
                          component="code"
                          sx={{
                            wordBreak: 'break-all',
                            bgcolor: 'grey.100',
                            px: 1,
                            py: 0.5,
                            borderRadius: 0.5,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {effectiveCallbackUrl}
                        </Typography>
                        <Tooltip title="Copy redirect URL">
                          <IconButton size="small" onClick={copyCallbackUrl}>
                            <CopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  )}
                </Box>
              )}

              {showCallbackDetails && refreshInfo?.login_url && (
                <Box sx={{ mb: 2 }}>
                  <Button
                    size="medium"
                    variant="contained"
                    href={refreshInfo.login_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ textTransform: 'none', flexShrink: 0 }}
                  >
                    Open Kite Login
                  </Button>
                </Box>
              )}

              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 500 }}>
                  Paste callback URL or access token
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder={PLACEHOLDER}
                  value={pasteInput}
                  onChange={(e) => handlePasteChange(e.target.value)}
                  multiline
                  minRows={2}
                  sx={{ mb: 1.5 }}
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    onClick={submitTokenOrUrl}
                    disabled={!pasteInput.trim() || submitting}
                    startIcon={
                      submitting ? <CircularProgress size={14} /> : undefined
                    }
                    sx={{ textTransform: 'none' }}
                  >
                    {submitting
                      ? 'Saving...'
                      : isCallbackUrl(pasteInput)
                        ? 'Generate & Save'
                        : looksLikeAccessToken(pasteInput)
                          ? 'Validate & Save'
                          : 'Save Token'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setPasteInput('');
                      setError(null);
                    }}
                    disabled={submitting}
                    sx={{ textTransform: 'none' }}
                  >
                    Clear
                  </Button>
                </Box>
              </Box>
            </Box>
        )}

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', textAlign: 'right' }}
        >
          Auto-refresh: 5 min
        </Typography>
      </CardContent>
    </Card>
  );
};

export default SimpleKiteTokenManagement;
