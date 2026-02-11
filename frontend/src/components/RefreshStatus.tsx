import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, LinearProgress } from '@mui/material';
import { Refresh, Schedule, Timer } from '@mui/icons-material';
import DataCacheManager from '../services/DataCacheManager';

interface RefreshStatusProps {
  backgroundRefreshQueue: boolean;
  lastRefreshTime: Date | null;
  loading?: boolean;
  showIcon?: boolean;
  strategy?: string;
  nextRefreshInterval?: number;
}

const RefreshStatus: React.FC<RefreshStatusProps> = ({
  backgroundRefreshQueue,
  lastRefreshTime,
  loading = false,
  showIcon = true,
  strategy = 'unknown',
  nextRefreshInterval = 30000
}) => {
  const [countdown, setCountdown] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const cacheManager = DataCacheManager.getInstance();

  // Update countdown every second
  useEffect(() => {
    const updateCountdown = () => {
      if (loading) {
        setCountdown('Refreshing...');
        setProgress(0);
        return;
      }

      const timeRemaining = cacheManager.getTimeUntilRefresh(strategy);
      const formattedTime = cacheManager.getFormattedTimeUntilRefresh(strategy);
      
      setCountdown(formattedTime);
      
      // Calculate progress percentage (0% = just refreshed, 100% = ready to refresh)
      if (timeRemaining === 0) {
        setProgress(100);
      } else {
        const elapsed = nextRefreshInterval - timeRemaining;
        const progressPercent = Math.max(0, Math.min(100, (elapsed / nextRefreshInterval) * 100));
        setProgress(progressPercent);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [strategy, loading, nextRefreshInterval, cacheManager]);

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getCountdownColor = () => {
    if (loading) return 'primary';
    if (countdown === 'Ready to refresh') return 'success';
    if (progress > 80) return 'warning';
    return 'info';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 300 }}>
      {showIcon && (loading ? <Refresh sx={{ animation: 'spin 1s linear infinite', '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } }} /> : <Timer />)}
      
      {backgroundRefreshQueue && (
        <Chip
          label="Queued"
          size="small"
          color="warning"
          variant="outlined"
          icon={<Schedule />}
        />
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 200 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Last: {formatTime(lastRefreshTime)}
          </Typography>
          
          <Chip
            label={countdown}
            size="small"
            color={getCountdownColor()}
            variant={loading ? 'filled' : 'outlined'}
            icon={loading ? <Refresh /> : <Timer />}
          />
        </Box>
        
        {!loading && (
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 4,
              borderRadius: 2,
              '& .MuiLinearProgress-bar': {
                borderRadius: 2,
                transition: 'transform 0.4s ease'
              }
            }}
            color={getCountdownColor()}
          />
        )}
      </Box>
    </Box>
  );
};

export default RefreshStatus; 