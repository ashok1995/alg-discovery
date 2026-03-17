/**
 * SystemAlertsWidget
 * ==================
 * Polls GET /api/v2/monitor/system-alerts every 60 seconds.
 * Shows a bell icon with badge count. Clicking opens a popover listing alerts.
 * medium severity → orange, high severity → red.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Badge,
  Box,
  Chip,
  IconButton,
  Paper,
  Popover,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import {
  NotificationsNone,
  NotificationsActive,
  WarningAmber,
  Error as ErrorIcon,
  CheckCircleOutline,
} from '@mui/icons-material';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type { SystemAlertsResponse, SystemAlert } from '../../types/apiModels';

const POLL_INTERVAL_MS = 60_000;

const severityColor = (severity: string) =>
  severity === 'high' ? '#f44336' : '#ff9800';

const AlertRow: React.FC<{ alert: SystemAlert }> = ({ alert }) => {
  const color = severityColor(alert.severity);
  const Icon = alert.severity === 'high' ? ErrorIcon : WarningAmber;
  return (
    <Box
      display="flex"
      gap={1}
      alignItems="flex-start"
      py={1}
      px={1.5}
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
        bgcolor: alpha(color, 0.04),
      }}
    >
      <Icon sx={{ fontSize: 16, color, mt: 0.2, flexShrink: 0 }} />
      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={0.5} mb={0.3}>
          <Chip
            label={alert.severity.toUpperCase()}
            size="small"
            sx={{
              fontSize: '0.58rem',
              fontWeight: 700,
              height: 16,
              bgcolor: alpha(color, 0.12),
              color,
            }}
          />
          <Typography variant="caption" color="text.secondary" fontSize="0.65rem">
            {alert.type.replace(/_/g, ' ')}
          </Typography>
        </Box>
        <Typography variant="body2" fontSize="0.75rem" fontWeight={500}>
          {alert.message}
        </Typography>
        {alert.action && (
          <Typography variant="caption" color="text.secondary" fontSize="0.68rem" mt={0.2} display="block">
            → {alert.action}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

const SystemAlertsWidget: React.FC = () => {
  const [data, setData] = useState<SystemAlertsResponse | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const fetch = async () => {
    try {
      const res = await seedDashboardService.getSystemAlerts();
      setData(res);
    } catch {
      // endpoint may 500 temporarily — keep previous data
    }
  };

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const alertCount = data?.alert_count ?? 0;
  const hasAlerts = alertCount > 0;
  const highSeverity = data?.alerts?.some((a) => a.severity === 'high') ?? false;
  const open = Boolean(anchorEl);

  return (
    <>
      <Tooltip title={hasAlerts ? `${alertCount} system alert${alertCount !== 1 ? 's' : ''}` : 'No alerts'} arrow>
        <IconButton
          ref={btnRef}
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            color: highSeverity ? 'error.main' : hasAlerts ? 'warning.main' : 'text.secondary',
          }}
        >
          <Badge badgeContent={alertCount} color={highSeverity ? 'error' : 'warning'} max={9}>
            {hasAlerts ? <NotificationsActive fontSize="small" /> : <NotificationsNone fontSize="small" />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { borderRadius: 2, mt: 1 } }}
      >
        <Paper elevation={0} sx={{ width: 340, maxHeight: 400, overflow: 'auto' }}>
          {/* Header */}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            px={2}
            py={1.5}
            sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Typography variant="subtitle2" fontWeight={700}>System Alerts</Typography>
            <Box display="flex" alignItems="center" gap={0.8}>
              {data && (
                <Chip
                  label={data.system_status.replace(/_/g, ' ')}
                  size="small"
                  sx={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    height: 18,
                    bgcolor: data.system_status === 'healthy'
                      ? alpha('#4caf50', 0.1)
                      : alpha('#ff9800', 0.1),
                    color: data.system_status === 'healthy' ? 'success.dark' : 'warning.dark',
                  }}
                />
              )}
            </Box>
          </Box>

          {/* Alert list */}
          {hasAlerts ? (
            data!.alerts.map((alert, idx) => <AlertRow key={idx} alert={alert} />)
          ) : (
            <Box display="flex" flexDirection="column" alignItems="center" py={3} gap={1}>
              <CheckCircleOutline sx={{ color: 'success.main', fontSize: 32 }} />
              <Typography variant="body2" color="text.secondary">All systems healthy</Typography>
            </Box>
          )}
        </Paper>
      </Popover>
    </>
  );
};

export default SystemAlertsWidget;
