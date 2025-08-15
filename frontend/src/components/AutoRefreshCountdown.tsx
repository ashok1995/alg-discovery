import React, { useEffect, useMemo, useState } from 'react';
import { Chip, Tooltip } from '@mui/material';
import { Refresh, Schedule } from '@mui/icons-material';

export interface AutoRefreshCountdownProps {
  lastRefreshTime: Date | null;
  intervalMs: number;
  loading?: boolean;
  autoRefreshEnabled?: boolean;
  onForceRefresh: () => void;
  onToggleAutoRefresh?: () => void;
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export const AutoRefreshCountdown: React.FC<AutoRefreshCountdownProps> = ({
  lastRefreshTime,
  intervalMs,
  loading = false,
  autoRefreshEnabled = true,
  onForceRefresh,
  onToggleAutoRefresh,
}) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const secondsRemaining = useMemo(() => {
    if (!autoRefreshEnabled) return null;
    const base = lastRefreshTime ? lastRefreshTime.getTime() : now;
    const nextAt = base + intervalMs;
    const remainingMs = Math.max(0, nextAt - now);
    return Math.floor(remainingMs / 1000);
  }, [autoRefreshEnabled, lastRefreshTime, intervalMs, now]);

  const color: 'default' | 'success' | 'warning' | 'error' = useMemo(() => {
    if (!autoRefreshEnabled) return 'default';
    if (loading) return 'warning';
    if (secondsRemaining === null) return 'default';
    if (secondsRemaining <= 5) return 'error';
    if (secondsRemaining <= 20) return 'warning';
    return 'success';
  }, [autoRefreshEnabled, loading, secondsRemaining]);

  const label = useMemo(() => {
    if (!autoRefreshEnabled) return 'Auto: Off';
    if (loading) return 'Refreshing…';
    if (secondsRemaining === null) return 'Next: —';
    return `Next: ${formatSeconds(secondsRemaining)}`;
  }, [autoRefreshEnabled, loading, secondsRemaining]);

  const tooltip = useMemo(() => {
    if (!autoRefreshEnabled) return 'Auto refresh is OFF. Click to force refresh.';
    if (loading) return 'Fetching data… Click to queue a force refresh.';
    return 'Click to force refresh now';
  }, [autoRefreshEnabled, loading]);

  return (
    <Tooltip title={tooltip} placement="bottom">
      <Chip
        icon={autoRefreshEnabled ? <Schedule /> : <Refresh />}
        label={label}
        color={color}
        variant="outlined"
        onClick={onForceRefresh}
        onDoubleClick={onToggleAutoRefresh}
        sx={{ cursor: 'pointer' }}
      />
    </Tooltip>
  );
};

export default AutoRefreshCountdown;
