import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Box,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Refresh,
  SignalCellular4Bar,
  SignalCellularConnectedNoInternet0Bar,
  SignalCellular0Bar,
  CheckCircle,
  Error,
  Warning,
  Info
} from '@mui/icons-material';

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

interface ServiceStatusMonitorProps {
  onServiceClick?: (service: ServiceStatus) => void;
  refreshInterval?: number; // seconds
}

const ServiceStatusMonitor: React.FC<ServiceStatusMonitorProps> = ({
  onServiceClick,
  refreshInterval = 30
}) => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Service configuration
  const serviceConfig = [
    { name: 'swing-api', displayName: 'Swing Buy AI', port: API_CONFIG.PORTS.SWING_API },
    { name: 'longterm-api', displayName: 'Long Term Trading', port: API_CONFIG.PORTS.LONGTERM_API },
    { name: 'shortterm-api', displayName: 'Short Term Trading', port: API_CONFIG.PORTS.SWING_API },
    { name: 'intraday-api', displayName: 'Intraday Trading', port: API_CONFIG.PORTS.SWING_API },
    { name: 'variants-api', displayName: 'Strategy Variants', port: API_CONFIG.PORTS.SWING_API },
    { name: 'facts-api', displayName: 'Market Facts', port: API_CONFIG.PORTS.SWING_API },
    { name: 'dashboard-api', displayName: 'Dashboard', port: API_CONFIG.PORTS.SWING_API },
    { name: 'unified-strategy-api', displayName: 'Unified Strategy', port: API_CONFIG.PORTS.UNIFIED_STRATEGY_API },
    { name: 'misc-api', displayName: 'Misc Tools', port: API_CONFIG.PORTS.SWING_API },
    { name: 'zerodha-test-api', displayName: 'Zerodha Test', port: API_CONFIG.PORTS.ZERODHA_API },
    { name: 'zerodha-api', displayName: 'Zerodha Management', port: API_CONFIG.PORTS.ZERODHA_API },
    { name: 'validation-api', displayName: 'Validation Tools', port: API_CONFIG.PORTS.SWING_API },
    { name: 'algorithm-api', displayName: 'Algorithm Analysis', port: API_CONFIG.PORTS.ALGORITHM_API },
    { name: 'intraday-service-api', displayName: 'Intraday Service', port: API_CONFIG.PORTS.SWING_API },
    { name: 'stock-mapping-api', displayName: 'Stock Mapping', port: API_CONFIG.PORTS.SWING_API },
    { name: 'stock-candidate-populator-api', displayName: 'Stock Candidate', port: API_CONFIG.PORTS.STOCK_CANDIDATE_POPULATOR_API }
  ];

  // Check service health
  const checkServiceHealth = async (service: typeof serviceConfig[0]): Promise<ServiceStatus> => {
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
      } else {
        return {
          name: service.name,
          displayName: service.displayName,
          port: service.port,
          status: 'unhealthy',
          lastCheck: new Date().toISOString(),
          responseTime,
          error: `HTTP ${response.status}`
        };
      }
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        name: service.name,
        displayName: service.displayName,
        port: service.port,
        status: 'error',
        lastCheck: new Date().toISOString(),
        responseTime,
        error: error.message || 'Connection failed'
      };
    }
  };

  // Refresh all services
  const refreshServices = async () => {
    setLoading(true);
    try {
      const healthChecks = serviceConfig.map(checkServiceHealth);
      const results = await Promise.allSettled(healthChecks);
      
      const serviceStatuses: ServiceStatus[] = results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            name: serviceConfig[index].name,
            displayName: serviceConfig[index].displayName,
            port: serviceConfig[index].port,
            status: 'error',
            lastCheck: new Date().toISOString(),
            error: 'Check failed'
          };
        }
      });
      
      setServices(serviceStatuses);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error refreshing services:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    refreshServices();
    
    const interval = setInterval(refreshServices, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'unhealthy': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle />;
      case 'unhealthy': return <Warning />;
      case 'error': return <Error />;
      default: return <Info />;
    }
  };

  // Calculate summary statistics
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const totalCount = services.length;
  const healthPercentage = totalCount > 0 ? (healthyCount / totalCount) * 100 : 0;

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6" fontWeight="bold">
              Service Status Monitor
            </Typography>
            <Chip 
              label={`${healthyCount}/${totalCount} Healthy`}
              color={healthPercentage >= 80 ? 'success' : healthPercentage >= 60 ? 'warning' : 'error'}
              size="small"
            />
          </Box>
          <Box display="flex" gap={1}>
            <Tooltip title="Refresh Services">
              <IconButton 
                onClick={refreshServices} 
                disabled={loading}
                size="small"
              >
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title={expanded ? "Collapse Details" : "Expand Details"}>
              <IconButton 
                onClick={() => setExpanded(!expanded)}
                size="small"
              >
                {expanded ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Health Progress Bar */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="caption" color="text.secondary">
              Overall Health
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {healthPercentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={healthPercentage}
            color={healthPercentage >= 80 ? 'success' : healthPercentage >= 60 ? 'warning' : 'error'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Last Refresh */}
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Last refreshed: {lastRefresh.toLocaleTimeString()}
        </Typography>

        {/* Service Grid */}
        <Grid container spacing={1}>
          {services.map((service) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={service.name}>
              <Card 
                variant="outlined"
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    backgroundColor: 'action.hover',
                    transform: 'translateY(-1px)',
                    transition: 'all 0.2s ease'
                  }
                }}
                onClick={() => onServiceClick?.(service)}
              >
                <CardContent sx={{ p: 1.5 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2" fontWeight="bold" noWrap>
                        {service.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Port {service.port}
                      </Typography>
                    </Box>
                    <Chip
                      icon={getStatusIcon(service.status)}
                      label={service.status}
                      color={getStatusColor(service.status)}
                      size="small"
                    />
                  </Box>
                  {service.responseTime && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      {service.responseTime}ms
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Detailed Table */}
        <Collapse in={expanded}>
          <Box mt={2}>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Service</TableCell>
                    <TableCell>Port</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Response Time</TableCell>
                    <TableCell>Last Check</TableCell>
                    <TableCell>Error</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {services.map((service) => (
                    <TableRow key={service.name} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {service.displayName}
                        </Typography>
                      </TableCell>
                      <TableCell>{service.port}</TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(service.status)}
                          label={service.status}
                          color={getStatusColor(service.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {service.responseTime ? `${service.responseTime}ms` : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(service.lastCheck).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        {service.error ? (
                          <Tooltip title={service.error}>
                            <Typography variant="caption" color="error" noWrap>
                              {service.error}
                            </Typography>
                          </Tooltip>
                        ) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default ServiceStatusMonitor; 