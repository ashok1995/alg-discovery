import React from 'react';
import { Box, Typography, Link, Tooltip, alpha } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';

interface SymbolLinkProps {
  symbol: string;
  chartUrl?: string;
  exchange?: string;
  /** Color accent for the avatar square */
  accentColor?: string;
  showAvatar?: boolean;
  fontSize?: string;
}

const CHARTINK_BASE = 'https://chartink.com/stocks-new?symbol=';

const SymbolLink: React.FC<SymbolLinkProps> = ({
  symbol,
  chartUrl,
  exchange = 'NSE',
  accentColor = '#1976d2',
  showAvatar = false,
  fontSize = '0.875rem',
}) => {
  const href = chartUrl || `${CHARTINK_BASE}${encodeURIComponent(symbol)}`;

  return (
    <Box display="flex" alignItems="center" gap={showAvatar ? 1 : 0.5}>
      {showAvatar && (
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            bgcolor: alpha(accentColor, 0.1),
            color: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.8rem',
            flexShrink: 0,
          }}
        >
          {symbol.charAt(0)}
        </Box>
      )}
      <Box>
        <Tooltip title={`Open ${symbol} chart`} arrow>
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              fontWeight: 700,
              fontSize,
              color: 'text.primary',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.4,
              '&:hover': { color: 'primary.main' },
            }}
          >
            {symbol}
            <OpenInNew sx={{ fontSize: '0.75rem', opacity: 0.5 }} />
          </Link>
        </Tooltip>
        {showAvatar && (
          <Typography variant="caption" color="text.secondary" display="block" lineHeight={1}>
            {exchange}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default SymbolLink;
