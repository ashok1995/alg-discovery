/**
 * Status color and icon helpers for consistent UI across components
 */

import React from 'react';
import { CheckCircle, Error, Warning, Info, Stop } from '@mui/icons-material';

export type StatusColor = 'success' | 'warning' | 'error' | 'info' | 'default';

export function getStatusColor(status: string): StatusColor {
  switch (status?.toLowerCase()) {
    case 'running':
    case 'completed':
    case 'healthy':
    case 'good':
    case 'closed':
    case 'active':
      return 'success';
    case 'inactive':
      return 'error';
    case 'stopped':
      return 'default';
    case 'unhealthy':
    case 'warning':
    case 'degraded':
      return 'warning';
    case 'error':
    case 'failed':
    case 'bearish':
      return 'error';
    case 'open':
    case 'info':
      return 'info';
    default:
      return 'default';
  }
}

export function getStatusIcon(status: string): React.ReactElement {
  switch (status?.toLowerCase()) {
    case 'running':
    case 'completed':
    case 'healthy':
    case 'good':
      return <CheckCircle color="success" />;
    case 'stopped':
      return <Stop color="action" />;
    case 'error':
    case 'failed':
    case 'unhealthy':
      return <Error color="error" />;
    case 'warning':
    case 'degraded':
      return <Warning color="warning" />;
    default:
      return <Info color="info" />;
  }
}
