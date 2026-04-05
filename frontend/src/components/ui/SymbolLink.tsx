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
  /**
   * When true, only link if chartUrl is non-empty (no TradingView or other client default).
   * Use for recommendations and other flows where the chart provider must come from the API.
   */
  useApiChartOnly?: boolean;
}

const DEFAULT_CHART_BASE = 'https://www.tradingview.com/symbols/NSE-';

const SymbolLink: React.FC<SymbolLinkProps> = ({
  symbol,
  chartUrl,
  exchange = 'NSE',
  accentColor = '#1976d2',
  showAvatar = false,
  fontSize = '0.875rem',
  useApiChartOnly = false,
}) => {
  const trimmed = typeof chartUrl === 'string' ? chartUrl.trim() : '';
  const hasApiUrl = trimmed.length > 0;
  const href = hasApiUrl ? trimmed : useApiChartOnly ? undefined : `${DEFAULT_CHART_BASE}${encodeURIComponent(symbol)}/`;

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
        <Tooltip
          title={href ? `Open ${symbol} chart` : 'No chart URL in API response for this symbol'}
          arrow
        >
          {href ? (
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
          ) : (
            <Typography component="span" sx={{ fontWeight: 700, fontSize, color: 'text.primary' }}>
              {symbol}
            </Typography>
          )}
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
