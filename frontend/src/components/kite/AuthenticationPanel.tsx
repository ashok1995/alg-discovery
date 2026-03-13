import React from 'react';
import {
  Alert,
  Box,
  Button,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { ContentCopy as CopyIcon } from '@mui/icons-material';

const PLACEHOLDER =
  'Paste full callback URL (after Kite login redirect) OR paste access token directly';

/** Detect if input looks like full callback URL vs direct access token */
export function isCallbackUrl(input: string): boolean {
  const t = input.trim();
  return (
    t.includes('request_token=') ||
    (t.startsWith('http') && t.includes('request_token'))
  );
}

/** Detect if input looks like direct access token (alphanumeric, 20+ chars) */
export function looksLikeAccessToken(input: string): boolean {
  const t = input.trim();
  if (!t || t.length < 20) return false;
  return /^[a-zA-Z0-9_-]+$/.test(t) && !t.includes(' ') && !t.includes('http');
}

interface AuthenticationPanelProps {
  tokenValid: boolean;
  tokenUserName?: string;
  tokenMasked?: string;
  effectiveCallbackUrl: string;
  showCallbackDetails: boolean;
  pasteInput: string;
  submitting: boolean;
  submitButtonLabel: string;
  refreshLoginUrl?: string;
  onShowCallbackDetails: () => void;
  onPasteChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  onCopyCallbackUrl: () => void;
}

const AuthenticationPanel: React.FC<AuthenticationPanelProps> = ({
  tokenValid,
  tokenUserName,
  tokenMasked,
  effectiveCallbackUrl,
  showCallbackDetails,
  pasteInput,
  submitting,
  submitButtonLabel,
  refreshLoginUrl,
  onShowCallbackDetails,
  onPasteChange,
  onSubmit,
  onClear,
  onCopyCallbackUrl,
}) => (
  <>
    {tokenValid && (
      <Alert severity="success" sx={{ mb: 2, py: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Token valid • Expires in ~24 hrs
            </Typography>
            {tokenUserName && (
              <Typography variant="caption" color="text.secondary">
                {tokenUserName} • {tokenMasked}
              </Typography>
            )}
          </Box>
        </Box>
      </Alert>
    )}

    <Alert severity="info" sx={{ mb: 2, py: 0.5 }} variant="outlined">
      <Typography variant="caption" display="block">
        {!tokenValid && (
          <>
            <strong>Token invalid or expired?</strong> Click &quot;Open Kite Login&quot; below, then paste the callback URL or token and save.
            <br />
          </>
        )}
        Daily flow: 1) In{' '}
        <a
          href="https://developers.kite.trade/apps"
          target="_blank"
          rel="noopener noreferrer"
        >
          developers.kite.trade
        </a>
        , set Redirect URL to your app&apos;s callback URL. 2) Click &quot;Open Kite Login&quot; below to open Kite. 3)
        After login, copy the redirect URL (with request_token) or the access token and paste below. 4) Click Save.
      </Typography>
    </Alert>

    {effectiveCallbackUrl && (
      <Box sx={{ mb: 2 }}>
        {!showCallbackDetails ? (
          <Button
            size="small"
            variant="outlined"
            onClick={onShowCallbackDetails}
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
                <IconButton size="small" onClick={onCopyCallbackUrl}>
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </Box>
    )}

    {refreshLoginUrl && (
      <Box sx={{ mb: 2 }}>
        <Button
          size="medium"
          variant="contained"
          href={refreshLoginUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ textTransform: 'none', flexShrink: 0 }}
        >
          Open Kite Login
        </Button>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Opens Kite in a new tab. After login, copy the redirect URL (with request_token) or the access token and paste below.
        </Typography>
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
        onChange={(e) => onPasteChange(e.target.value)}
        multiline
        minRows={2}
        sx={{ mb: 1.5 }}
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          size="small"
          onClick={onSubmit}
          disabled={!pasteInput.trim() || submitting}
          startIcon={
            submitting ? <CircularProgress size={14} /> : undefined
          }
          sx={{ textTransform: 'none' }}
        >
          {submitting ? 'Saving...' : submitButtonLabel}
        </Button>
        <Button
          variant="outlined"
          size="small"
          onClick={onClear}
          disabled={submitting}
          sx={{ textTransform: 'none' }}
        >
          Clear
        </Button>
      </Box>
    </Box>
  </>
);

export default AuthenticationPanel;
