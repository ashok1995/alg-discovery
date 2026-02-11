import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  IconButton,
  Box,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Refresh,
  CloudOff,
  Api,
  Speed
} from '@mui/icons-material';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  healthScore: number;
  responseTime?: number;
  lastChecked: string;
  details?: any;
  endpoint: string;
}

interface ServiceStatusMonitorProps {
  refreshInterval?: number;
  onStatusChange?: (statuses: ServiceStatus[]) => void;
  onServiceClick?: (service: ServiceStatus) => void;
}

const ServiceStatusMonitor: React.FC<ServiceStatusMonitorProps> = ({
  refreshInterval = 60000, // 60 seconds
  onStatusChange,
  onServiceClick
}) => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Kite status/token: Settings page only. Do not add here.
  const serviceConfigs = [
    {
      name: 'Seed Service',
      endpoint: '/api/seed/health',
      description: 'Stock recommendations & analysis'
    },
    {
      name: 'Chartink Service',
      endpoint: '/api/chartink/check',
      description: 'Technical analysis & screening'
    }
  ];

  const checkServiceStatus = async (config: typeof serviceConfigs[0]): Promise<ServiceStatus> => {
    const startTime = Date.now();
    
    try {
      const response = await fetch(config.endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const responseTime = Date.now() - startTime;
      const data = await response.json();
      
      let status: ServiceStatus['status'] = 'unknown';
      let healthScore = 0;
      
      if (response.ok) {
        if (config.name === 'Seed Service') {
          status = data.status === 'healthy' ? 'healthy' : 'degraded';
          healthScore = status === 'healthy' ? 100 : 70;
        } else if (config.name === 'Chartink Service') {
          const ok = data.success && data.status?.authenticated === true;
          status = ok ? 'healthy' : 'unhealthy';
          healthScore = ok ? 100 : 0;
        }
      } else {
        status = 'unhealthy';
        healthScore = 0;
      }
      
      return {
        name: config.name,
        status,
        healthScore,
        responseTime,
        lastChecked: new Date().toISOString(),
        details: data,
        endpoint: config.endpoint
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? (error as Error).message : String(error);
      return {
        name: config.name,
        status: 'unhealthy',
        healthScore: 0,
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        details: { error: errorMessage },
        endpoint: config.endpoint
      };
    }
  };

  const refreshStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const statusPromises = serviceConfigs.map(config => checkServiceStatus(config));
      const statuses = await Promise.allSettled(statusPromises);
      
      const results = statuses.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            name: serviceConfigs[index].name,
            status: 'unhealthy' as const,
            healthScore: 0,
            responseTime: 0,
            lastChecked: new Date().toISOString(),
            details: { error: result.reason?.message || 'Failed to check status' },
            endpoint: serviceConfigs[index].endpoint
          };
        }
      });
      
      setServices(results);
      setLastRefresh(new Date());
      onStatusChange?.(results);
    } catch (error: unknown) {
      console.error('Failed to refresh service statuses:', error);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  useEffect(() => {
    refreshStatuses();
    
    const interval = setInterval(refreshStatuses, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshStatuses, refreshInterval]);

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle color="success" />;
      case 'degraded':
        return <Warning color="warning" />;
      case 'unhealthy':
        return <Error color="error" />;
      default:
        return <CloudOff color="disabled" />;
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'unhealthy':
        return 'error';
      default:
        return 'default';
    }
  };

  const overallStatus = services.length > 0 
    ? services.every(s => s.status === 'healthy') 
      ? 'healthy' 
      : services.some(s => s.status === 'unhealthy') 
        ? 'unhealthy' 
        : 'degraded'
    : 'unknown';

  const overallHealthScore = services.length > 0 
    ? Math.round(services.reduce((sum, s) => sum + s.healthScore, 0) / services.length)
    : 0;

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Api />
            Service Status
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <Chip
              icon={getStatusIcon(overallStatus)}
              label={`${overallStatus.toUpperCase()} (${overallHealthScore}%)`}
              color={getStatusColor(overallStatus) as any}
              variant="outlined"
            />
            <IconButton onClick={refreshStatuses} disabled={loading} size="small">
              <Refresh className={loading ? 'spin' : ''} />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={2}>
          {services.map((service, index) => {
            const config = serviceConfigs[index];
            return (
              <Grid item xs={12} md={4} key={service.name}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    height: '100%',
                    cursor: onServiceClick ? 'pointer' : 'default',
                    '&:hover': onServiceClick ? {
                      boxShadow: 2,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s'
                    } : {}
                  }}
                  onClick={() => onServiceClick?.(service)}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {service.name}
                      </Typography>
                      {getStatusIcon(service.status)}
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {config.description}
                    </Typography>
                    
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <Chip
                        label={`${service.healthScore}%`}
                        color={getStatusColor(service.status) as any}
                        size="small"
                        variant="outlined"
                      />
                      {service.responseTime && (
                        <Chip
                          icon={<Speed />}
                          label={`${service.responseTime}ms`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    
                    <LinearProgress
                      variant="determinate"
                      value={service.healthScore}
                      color={getStatusColor(service.status) as any}
                      sx={{ mb: 1 }}
                    />
                    
                    <Typography variant="caption" color="text.secondary">
                      Last checked: {new Date(service.lastChecked).toLocaleTimeString()}
                    </Typography>
                    
                    {service.details?.error && (
                      <Alert severity="error" sx={{ mt: 1, fontSize: '0.75rem' }}>
                        {service.details.error}
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Auto-refresh every {refreshInterval / 1000}s
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Last refresh: {lastRefresh.toLocaleTimeString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ServiceStatusMonitor;