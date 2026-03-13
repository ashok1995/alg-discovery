/**
 * Kite Token Management – two-step flow:
 * 1) If API key not configured: show API key & secret form first (one-time via API).
 * 2) If API key configured: show callback URL + token flow (get redirect URL, open Kite login, paste URL/token, save).
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import {
  kiteTokenService,
  TokenStatus,
  TokenRefreshInfo,
  CallbackUrlResponse,
  CredentialsStatusResponse,
} from '../services/KiteTokenService';
import TokenStatusPanel from './kite/TokenStatusPanel';
import CredentialForm from './kite/CredentialForm';
import AuthenticationPanel, {
  isCallbackUrl,
  looksLikeAccessToken,
} from './kite/AuthenticationPanel';

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
  const [callbackUrl, setCallbackUrl] = useState<CallbackUrlResponse | null>(null);
  const [serviceHealthy, setServiceHealthy] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pasteInput, setPasteInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [savingCreds, setSavingCreds] = useState(false);
  /** When API key is present, show token flow; "Update API key" reveals form. When absent, form is shown by default. */
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [showCallbackDetails, setShowCallbackDetails] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statusData, healthData] = await Promise.all([
        kiteTokenService.getTokenStatus().catch(() => ({} as TokenStatus)),
        kiteTokenService.getHealth().catch(() => ({ status: 'unhealthy' })),
      ]);
      setTokenStatus(statusData);
      setServiceHealthy(healthData?.status === 'healthy');
      const credsConfigured = statusData?.credentials_configured ?? false;
      setCredentialsStatus({
        api_key_configured: credsConfigured,
        message: credsConfigured ? null : 'Configure API key and secret first',
      });
      if (credsConfigured) {
        try {
          const refreshData = await kiteTokenService.getRefreshInfo();
          setRefreshInfo(refreshData);
        } catch {
          setRefreshInfo({
            login_url: '',
            message: 'Use Open Kite Login and paste callback URL to save token',
          });
        }
      } else {
        setRefreshInfo({ login_url: '', message: 'Configure API key first' });
      }
      setCallbackUrl(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load token status');
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
      setSuccess(null);
      const result = await kiteTokenService.saveCredentials(apiKey.trim(), apiSecret.trim());
      setSuccess(result.message ?? 'API credentials saved. Next: get callback URL and save your token below.');
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
        const requestToken = kiteTokenService.extractRequestTokenFromUrl(input);
        if (!requestToken) {
          setError('No request_token found in URL');
          setSubmitting(false);
          return;
        }
        const result = await kiteTokenService.saveTokenByRequestToken(requestToken);
        if (result.success) {
          setPasteInput('');
          setSuccess(result.message ?? 'Token saved. You are authenticated.');
        } else {
          throw new Error(result.message ?? 'Failed to save token');
        }
      } else if (looksLikeAccessToken(input)) {
        const result = await kiteTokenService.validateAndSaveAccessToken(input);
        if (result.success) {
          setPasteInput('');
          setSuccess(result.message || 'Access token validated and saved for other services.');
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
      setError(err instanceof Error ? err.message : 'Failed to process token');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasteChange = (value: string) => {
    setPasteInput(value);
    if (value.trim()) setError(null);
  };

  const effectiveCallbackUrl = callbackUrl?.callback_url ?? '';
  const copyCallbackUrl = () => {
    if (effectiveCallbackUrl) {
      navigator.clipboard.writeText(effectiveCallbackUrl);
      setSuccess('Callback URL copied to clipboard');
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  const getSubmitButtonLabel = () => {
    if (isCallbackUrl(pasteInput)) return 'Generate & Save';
    if (looksLikeAccessToken(pasteInput)) return 'Validate & Save';
    return 'Save Token';
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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

  const apiKeyPresent = credentialsStatus?.api_key_configured ?? false;
  /** Step 1: no API key → show credentials form only. Step 2: key present → show callback URL + token flow. */
  const showCredentialsFirst = !apiKeyPresent;

  return (
    <Card>
      <CardContent sx={{ py: 2 }}>
        <TokenStatusPanel
          tokenStatus={tokenStatus}
          credentialsStatus={credentialsStatus}
          serviceHealthy={serviceHealthy}
          loading={loading}
          error={error}
          success={success}
          onRefresh={loadStatus}
        />

        {showCredentialsFirst ? (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure API key and secret one time. After saving, you can get the callback URL and save your token.
            </Typography>
            <CredentialForm
              apiKey={apiKey}
              apiSecret={apiSecret}
              apiKeyPresent={false}
              showForm={true}
              savingCreds={savingCreds}
              onApiKeyChange={setApiKey}
              onApiSecretChange={setApiSecret}
              onSave={handleSaveCredentials}
              onCancel={() => {
                setApiKey('');
                setApiSecret('');
              }}
              onShowForm={() => {}}
            />
          </>
        ) : (
          <>
            <CredentialForm
              apiKey={apiKey}
              apiSecret={apiSecret}
              apiKeyPresent={true}
              showForm={showApiKeyForm}
              savingCreds={savingCreds}
              onApiKeyChange={setApiKey}
              onApiSecretChange={setApiSecret}
              onSave={handleSaveCredentials}
              onCancel={() => {
                setShowApiKeyForm(false);
                setApiKey('');
                setApiSecret('');
              }}
              onShowForm={() => setShowApiKeyForm(true)}
            />
            <AuthenticationPanel
              tokenValid={tokenStatus?.kite_token_valid ?? false}
              tokenUserName={tokenStatus?.user_name}
              tokenMasked={tokenStatus?.kite_token_masked}
              effectiveCallbackUrl={effectiveCallbackUrl}
              showCallbackDetails={showCallbackDetails}
              pasteInput={pasteInput}
              submitting={submitting}
              submitButtonLabel={getSubmitButtonLabel()}
              refreshLoginUrl={refreshInfo?.login_url}
              onShowCallbackDetails={() => setShowCallbackDetails(true)}
              onPasteChange={handlePasteChange}
              onSubmit={submitTokenOrUrl}
              onClear={() => {
                setPasteInput('');
                setError(null);
              }}
              onCopyCallbackUrl={copyCallbackUrl}
            />
          </>
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
