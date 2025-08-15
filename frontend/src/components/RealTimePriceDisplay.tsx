/**
 * Real-Time Price Display Component
 * =================================
 * 
 * A reusable component that displays real-time stock prices.
 * Can be used across the application to show live price updates.
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  Skeleton
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccessTime,
  Wifi,
  WifiOff
} from '@mui/icons-material';
import { usePriceContext } from '../contexts/PriceContext';
import { StockPrice } from '../services/CentralizedPriceManager';

interface RealTimePriceDisplayProps {
  symbol: string;
  fallbackPrice?: number;
  fallbackChange?: number;
  fallbackChangePercent?: number;
  showVolume?: boolean;
  showTime?: boolean;
  showConnectionStatus?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'inline' | 'card' | 'detailed';
}

const RealTimePriceDisplay: React.FC<RealTimePriceDisplayProps> = ({
  symbol,
  fallbackPrice,
  fallbackChange = 0,
  fallbackChangePercent = 0,
  showVolume = false,
  showTime = true,
  showConnectionStatus = false,
  size = 'medium',
  variant = 'inline'
}) => {
  const { getPrice, isConnected, isSubscribed } = usePriceContext();
  const [priceData, setPriceData] = useState<StockPrice | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Get real-time price data
  useEffect(() => {
    const updatePrice = () => {
      const realTimePrice = getPrice(symbol);
      if (realTimePrice) {
        setPriceData(realTimePrice);
        setLastUpdate(realTimePrice.lastUpdated);
      }
    };

    // Update immediately
    updatePrice();

    // Update every second for real-time feel
    const interval = setInterval(updatePrice, 1000);

    return () => clearInterval(interval);
  }, [symbol, getPrice]);

  // Use real-time data or fallback
  const displayPrice = priceData?.price || fallbackPrice || 0;
  const displayChange = priceData?.change ?? fallbackChange;
  const displayChangePercent = priceData?.changePercent ?? fallbackChangePercent;
  const displayVolume = priceData?.volume || 0;
  const isRealTime = priceData && priceData.source === 'websocket';
  const isSubscribedToSymbol = isSubscribed(symbol);

  // Format time ago
  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes < 1) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Get color based on change
  const getChangeColor = (change: number) => {
    return change >= 0 ? 'success' : 'error';
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: '0.75rem',
          iconSize: 16,
          chipSize: 'small' as const
        };
      case 'large':
        return {
          fontSize: '1.25rem',
          iconSize: 24,
          chipSize: 'medium' as const
        };
      default:
        return {
          fontSize: '1rem',
          iconSize: 20,
          chipSize: 'small' as const
        };
    }
  };

  const sizeStyles = getSizeStyles();

  // Render based on variant
  if (variant === 'card') {
    return (
      <Box
        sx={{
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'background.paper',
          minWidth: 200
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            {symbol}
          </Typography>
          {showConnectionStatus && (
            <Chip
              size={sizeStyles.chipSize}
              label={isConnected ? 'LIVE' : 'OFFLINE'}
              color={isConnected ? 'success' : 'error'}
              icon={isConnected ? <Wifi /> : <WifiOff />}
            />
          )}
        </Box>
        
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>
          ₹{displayPrice.toFixed(2)}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {displayChange >= 0 ? (
            <TrendingUp color="success" fontSize="small" />
          ) : (
            <TrendingDown color="error" fontSize="small" />
          )}
          <Typography
            variant="body2"
            color={getChangeColor(displayChange)}
            fontWeight="bold"
          >
            {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)} 
            ({displayChangePercent.toFixed(2)}%)
          </Typography>
        </Box>
        
        {showVolume && (
          <Typography variant="body2" color="text.secondary">
            Volume: {displayVolume.toLocaleString()}
          </Typography>
        )}
        
        {showTime && isRealTime && (
          <Typography variant="caption" color="text.secondary">
            {formatTimeAgo(lastUpdate)}
          </Typography>
        )}
      </Box>
    );
  }

  if (variant === 'detailed') {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            {symbol}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {isRealTime && (
              <Chip
                size={sizeStyles.chipSize}
                label="LIVE"
                color="success"
                icon={<TrendingUp />}
              />
            )}
            {showConnectionStatus && (
              <Chip
                size={sizeStyles.chipSize}
                label={isConnected ? 'CONNECTED' : 'OFFLINE'}
                color={isConnected ? 'success' : 'error'}
                icon={isConnected ? <Wifi /> : <WifiOff />}
              />
            )}
          </Box>
        </Box>
        
        <Typography variant="h4" fontWeight="bold">
          ₹{displayPrice.toFixed(2)}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {displayChange >= 0 ? (
            <TrendingUp color="success" fontSize="large" />
          ) : (
            <TrendingDown color="error" fontSize="large" />
          )}
          <Typography
            variant="h6"
            color={getChangeColor(displayChange)}
            fontWeight="bold"
          >
            {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)} 
            ({displayChangePercent.toFixed(2)}%)
          </Typography>
        </Box>
        
        {showVolume && (
          <Typography variant="body1" color="text.secondary">
            Volume: {displayVolume.toLocaleString()}
          </Typography>
        )}
        
        {showTime && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <AccessTime fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {isRealTime ? formatTimeAgo(lastUpdate) : 'Static data'}
            </Typography>
          </Box>
        )}
        
        <Typography variant="caption" color="text.secondary">
          {isSubscribedToSymbol ? 'Subscribed to real-time updates' : 'Not subscribed'}
        </Typography>
      </Box>
    );
  }

  // Default inline variant
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        variant="body2"
        sx={{ fontSize: sizeStyles.fontSize, fontWeight: 'bold' }}
      >
        ₹{displayPrice.toFixed(2)}
      </Typography>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {displayChange >= 0 ? (
          <TrendingUp color="success" sx={{ fontSize: sizeStyles.iconSize }} />
        ) : (
          <TrendingDown color="error" sx={{ fontSize: sizeStyles.iconSize }} />
        )}
        <Typography
          variant="body2"
          color={getChangeColor(displayChange)}
          sx={{ fontSize: sizeStyles.fontSize }}
        >
          {displayChange >= 0 ? '+' : ''}{displayChange.toFixed(2)}%
        </Typography>
      </Box>
      
      {isRealTime && (
        <Tooltip title={`Live price updated ${formatTimeAgo(lastUpdate)}`}>
          <Chip
            size={sizeStyles.chipSize}
            label="LIVE"
            color="success"
            sx={{ fontSize: sizeStyles.fontSize }}
          />
        </Tooltip>
      )}
      
      {showTime && isRealTime && (
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontSize: sizeStyles.fontSize }}
        >
          {formatTimeAgo(lastUpdate)}
        </Typography>
      )}
    </Box>
  );
};

export default RealTimePriceDisplay; 