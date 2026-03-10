import React from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
} from '@mui/material';

interface CredentialFormProps {
  apiKey: string;
  apiSecret: string;
  apiKeyPresent: boolean;
  showForm: boolean;
  savingCreds: boolean;
  onApiKeyChange: (value: string) => void;
  onApiSecretChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onShowForm: () => void;
}

const CredentialForm: React.FC<CredentialFormProps> = ({
  apiKey,
  apiSecret,
  apiKeyPresent,
  showForm,
  savingCreds,
  onApiKeyChange,
  onApiSecretChange,
  onSave,
  onCancel,
  onShowForm,
}) => (
  <Box
    sx={{
      mb: 2,
      p: 2,
      bgcolor: 'grey.50',
      borderRadius: 1,
      border: '1px solid',
      borderColor: 'divider',
    }}
  >
    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>
      API Key & Secret
    </Typography>
    {!showForm ? (
      <Button
        variant="outlined"
        size="small"
        onClick={onShowForm}
        sx={{ textTransform: 'none' }}
      >
        {apiKeyPresent
          ? 'Update API Key & Secret'
          : 'Configure API Key & Secret'}
      </Button>
    ) : (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
        <Typography variant="caption" display="block" color="text.secondary">
          From{' '}
          <a
            href="https://developers.kite.trade/apps"
            target="_blank"
            rel="noopener noreferrer"
          >
            developers.kite.trade/apps
          </a>
          . Carefully check similar characters (0 vs o, 1 vs l) against what Kite
          shows.
        </Typography>
        <TextField
          size="small"
          label="API Key"
          placeholder="Your Kite API key"
          value={apiKey}
          onChange={(e) => onApiKeyChange(e.target.value)}
          fullWidth
        />
        <TextField
          size="small"
          label="API Secret"
          placeholder="API secret for token generation"
          type="password"
          value={apiSecret}
          onChange={(e) => onApiSecretChange(e.target.value)}
          fullWidth
        />
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={onSave}
            disabled={!apiKey.trim() || savingCreds}
            startIcon={
              savingCreds ? <CircularProgress size={14} /> : undefined
            }
            sx={{ textTransform: 'none' }}
          >
            {savingCreds
              ? 'Saving...'
              : apiKeyPresent
                ? 'Update credentials'
                : 'Save credentials'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={onCancel}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
        </Box>
      </Box>
    )}
  </Box>
);

export default CredentialForm;
