import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Chip,
  IconButton,
  Tooltip,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  AppBar,
  Toolbar,
  Badge,
  LinearProgress
} from '@mui/material';
import { Settings, Refresh, Notifications, Menu } from '@mui/icons-material';

import ServiceStatusMonitor from './ServiceStatusMonitor';
import ServiceHealthCard from './dashboard/ServiceHealthCard';
import { getStatusColor, getStatusIcon } from '../utils/statusHelpers';
import { serviceConfig } from '../config/serviceHealthConfig';
import type { ServiceInfoConfig } from '../config/serviceHealthConfig';

interface UnifiedDashboardProps {
  onServiceSelect?: (service: string) => void;
  activeService?: string;
}

interface ServiceStatus {
  name: string;
  displayName: string;
  port: number;
  status: 'healthy' | 'unhealthy' | 'error' | 'unknown';
  lastCheck: string;
  responseTime?: number;
  uptime?: string;
  error?: string;
}

interface ServiceWithStatus extends ServiceInfoConfig {
  status: 'healthy' | 'unhealthy' | 'error' | 'unknown';
}

const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
  onServiceSelect,
  activeService = 'dashboard'
}) => {
  const [services, setServices] = useState<ServiceWithStatus[]>(() =>
    serviceConfig.map(s => ({ ...s, status: 'unknown' as const }))
  );
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, ServiceStatus>>({});

  const checkServiceHealth = async (service: ServiceInfoConfig): Promise<ServiceStatus> => {
    const startTime = Date.now();
    try {
      const response = await fetch(`http://localhost:${service.port}/health`, {
        method: 'GET'
      });
      const responseTime = Date.now() - startTime;
      if (response.ok) {
        const data = await response.json();
        return {
          name: service.name,
          displayName: service.displayName,
          port: service.port,
          status: 'healthy',
          lastCheck: new Date().toISOString(),
          responseTime,
          uptime: data.uptime || 'Unknown'
        };
      }
      return {
        name: service.name,
        displayName: service.displayName,
        port: service.port,
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        responseTime,
        error: `HTTP ${response.status}`
      };
    } catch (error: unknown) {
      const responseTime = Date.now() - startTime;
      return {
        name: service.name,
        displayName: service.displayName,
        port: service.port,
        status: 'error',
        lastCheck: new Date().toISOString(),
        responseTime,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  };

  const refreshServices = async () => {
    setLoading(true);
    try {
      const healthChecks = serviceConfig.map(checkServiceHealth);
      const results = await Promise.allSettled(healthChecks);
      const statuses: Record<string, ServiceStatus> = {};
      const updatedServices = serviceConfig.map((service, index) => {
        let status: ServiceStatus;
        const result = results[index];
        if (result.status === 'fulfilled') {
          status = result.value;
        } else {
          status = {
            name: service.name,
            displayName: service.displayName,
            port: service.port,
            status: 'error',
            lastCheck: new Date().toISOString(),
            error: 'Check failed'
          };
        }
        statuses[service.name] = status;
        return { ...service, status: status.status };
      });
      setServices(updatedServices);
      setServiceStatuses(statuses);
    } catch (error) {
      console.error('Error refreshing services:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshServices();
    const interval = setInterval(refreshServices, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const totalCount = services.length;
  const healthPercentage = totalCount > 0 ? (healthyCount / totalCount) * 100 : 0;

  const getServicesByCategory = (category: string) =>
    services.filter(service => service.category === category);

  const handleServiceSelect = (serviceName: string) => {
    onServiceSelect?.(serviceName);
    setDrawerOpen(false);
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)}>
            <Menu />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Algorithm Discovery Dashboard
          </Typography>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh Services">
              <IconButton color="inherit" onClick={refreshServices} disabled={loading}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Notifications">
              <IconButton color="inherit">
                <Badge badgeContent={totalCount - healthyCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton color="inherit">
                <Settings />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 3 }}>
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">System Health Overview</Typography>
              <Chip
                label={`${healthyCount}/${totalCount} Healthy`}
                color={healthPercentage >= 80 ? 'success' : healthPercentage >= 60 ? 'warning' : 'error'}
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={healthPercentage}
              color={healthPercentage >= 80 ? 'success' : healthPercentage >= 60 ? 'warning' : 'error'}
              sx={{ height: 8, borderRadius: 4, mb: 2 }}
            />
            <Typography variant="body2" color="text.secondary">
              Overall system health: {healthPercentage.toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Trading Services" />
          <Tab label="Analysis Services" />
          <Tab label="Management Services" />
          <Tab label="Tools Services" />
        </Tabs>

        <Grid container spacing={2}>
          {getServicesByCategory(['trading', 'analysis', 'management', 'tools'][activeTab]).map((service) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={service.name}>
              <ServiceHealthCard
                service={service}
                statusDetail={{ responseTime: serviceStatuses[service.name]?.responseTime }}
                onClick={() => handleServiceSelect(service.name)}
              />
            </Grid>
          ))}
        </Grid>

        <Box mt={4}>
          <ServiceStatusMonitor
            refreshInterval={30}
            onServiceClick={(service) => handleServiceSelect(service.name)}
          />
        </Box>
      </Box>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" mb={2}>
            Service Navigation
          </Typography>
          <List>
            {serviceConfig.map((cfg) => {
              const svc = services.find(s => s.name === cfg.name);
              const status = svc?.status ?? 'unknown';
              return (
                <ListItemButton key={cfg.name} onClick={() => handleServiceSelect(cfg.name)}>
                  <ListItemIcon>{cfg.icon}</ListItemIcon>
                  <ListItemText primary={cfg.displayName} secondary={`Port ${cfg.port}`} />
                  <Chip
                    icon={getStatusIcon(status)}
                    label={status}
                    color={getStatusColor(status)}
                    size="small"
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default UnifiedDashboard;
