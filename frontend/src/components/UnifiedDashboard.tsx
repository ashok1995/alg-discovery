import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';
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
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  AppBar,
  Toolbar,
  Badge,
  LinearProgress
} from '@mui/material';
import {
  Dashboard,
  TrendingUp,
  TrendingDown,
  ShowChart,
  Assessment,
  PieChart,
  Timeline,
  Settings,
  Refresh,
  Notifications,
  Menu,
  CheckCircle,
  Error,
  Warning,
  Info,
  Business,
  Analytics,
  Security,
  Build,
  Science,
  AccountTree,
  Map,
  People
} from '@mui/icons-material';

import ServiceStatusMonitor from './ServiceStatusMonitor';
import { ServiceStatus } from '../services/BaseAPIService';

interface UnifiedDashboardProps {
  onServiceSelect?: (service: string) => void;
  activeService?: string;
}

interface ServiceInfo {
  name: string;
  displayName: string;
  port: number;
  icon: React.ReactNode;
  description: string;
  category: 'trading' | 'analysis' | 'management' | 'tools';
  status: 'healthy' | 'unhealthy' | 'error' | 'unknown';
}

const UnifiedDashboard: React.FC<UnifiedDashboardProps> = ({
  onServiceSelect,
  activeService = 'dashboard'
}) => {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [serviceStatuses, setServiceStatuses] = useState<Record<string, ServiceStatus>>({});

  // Service configuration
  const serviceConfig: ServiceInfo[] = [
    // Trading Services
    {
      name: 'swing-api',
      displayName: 'Swing Buy AI',
      port: API_CONFIG.PORTS.SWING_API,
      icon: <TrendingUp />,
      description: 'AI-powered swing trading recommendations with real-time data',
      category: 'trading',
      status: 'unknown'
    },
    {
      name: 'longterm-api',
      displayName: 'Long Term Trading',
      port: API_CONFIG.PORTS.LONGTERM_API,
      icon: <Timeline />,
      description: 'Long-term investment strategies and portfolio optimization',
      category: 'trading',
      status: 'unknown'
    },

    {
      name: 'intraday-api',
      displayName: 'Intraday Trading',
      port: API_CONFIG.PORTS.SWING_API,
      icon: <ShowChart />,
      description: 'Intraday trading signals and real-time analysis',
      category: 'trading',
      status: 'unknown'
    },
    {
      name: 'intraday-service-api',
      displayName: 'Intraday Service',
      port: API_CONFIG.PORTS.SWING_API,
      icon: <Analytics />,
      description: 'Advanced intraday service with enhanced features',
      category: 'trading',
      status: 'unknown'
    },

    // Analysis Services
    {
      name: 'variants-api',
      displayName: 'Strategy Variants',
      port: API_CONFIG.PORTS.SWING_API,
      icon: <PieChart />,
      description: 'Multiple trading strategy variants and backtesting',
      category: 'analysis',
      status: 'unknown'
    },
    {
      name: 'algorithm-api',
      displayName: 'Algorithm Analysis',
      port: API_CONFIG.PORTS.ALGORITHM_API,
      icon: <Science />,
      description: 'Algorithmic trading analysis and optimization',
      category: 'analysis',
      status: 'unknown'
    },
    {
      name: 'unified-strategy-api',
      displayName: 'Unified Strategy',
      port: API_CONFIG.PORTS.UNIFIED_STRATEGY_API,
      icon: <AccountTree />,
      description: 'Unified strategy framework and cross-analysis',
      category: 'analysis',
      status: 'unknown'
    },

    // Management Services
    {
      name: 'dashboard-api',
      displayName: 'Dashboard',
      port: API_CONFIG.PORTS.SWING_API,
      icon: <Dashboard />,
      description: 'Main dashboard and overview analytics',
      category: 'management',
      status: 'unknown'
    },
    {
      name: 'zerodha-api',
      displayName: 'Zerodha Management',
      port: API_CONFIG.PORTS.ZERODHA_API,
      icon: <Business />,
      description: 'Zerodha broker integration and management',
      category: 'management',
      status: 'unknown'
    },
    {
      name: 'stock-mapping-api',
      displayName: 'Stock Mapping',
      port: API_CONFIG.PORTS.SWING_API,
      icon: <Map />,
      description: 'Stock mapping and categorization services',
      category: 'management',
      status: 'unknown'
    },
    {
      name: 'stock-candidate-populator-api',
      displayName: 'Stock Candidate',
      port: 8018,
      icon: <People />,
      description: 'Stock candidate population and screening',
      category: 'management',
      status: 'unknown'
    },

    // Tools Services
    {
      name: 'facts-api',
      displayName: 'Market Facts',
      port: 8008,
      icon: <Assessment />,
      description: 'Market facts and fundamental data',
      category: 'tools',
      status: 'unknown'
    },
    {
      name: 'misc-api',
      displayName: 'Misc Tools',
      port: 8006,
      icon: <Build />,
      description: 'Miscellaneous trading tools and utilities',
      category: 'tools',
      status: 'unknown'
    },
    {
      name: 'zerodha-test-api',
      displayName: 'Zerodha Test',
      port: 8010,
      icon: <Security />,
      description: 'Zerodha connection testing and validation',
      category: 'tools',
      status: 'unknown'
    },
    {
      name: 'validation-api',
      displayName: 'Validation Tools',
      port: 8012,
      icon: <CheckCircle />,
      description: 'Data validation and quality assurance tools',
      category: 'tools',
      status: 'unknown'
    }
  ];

  // Check service health
  const checkServiceHealth = async (service: ServiceInfo): Promise<ServiceStatus> => {
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
        return {
          ...service,
          status: status.status
        };
      });
      
      setServices(updatedServices);
      setServiceStatuses(statuses);
    } catch (error) {
      console.error('Error refreshing services:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh
  useEffect(() => {
    refreshServices();
    
    const interval = setInterval(refreshServices, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

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

  // Get services by category
  const getServicesByCategory = (category: string) => {
    return services.filter(service => service.category === category);
  };

  // Handle service selection
  const handleServiceSelect = (serviceName: string) => {
    onServiceSelect?.(serviceName);
    setDrawerOpen(false);
  };

  return (
    <Box>
      {/* App Bar */}
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
          >
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

      {/* Main Content */}
      <Box sx={{ p: 3 }}>
        {/* Health Overview */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                System Health Overview
              </Typography>
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

        {/* Service Categories */}
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Trading Services" />
          <Tab label="Analysis Services" />
          <Tab label="Management Services" />
          <Tab label="Tools Services" />
        </Tabs>

        {/* Service Grid */}
        <Grid container spacing={2}>
          {getServicesByCategory(['trading', 'analysis', 'management', 'tools'][activeTab]).map((service) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={service.name}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { 
                    backgroundColor: 'action.hover',
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease'
                  }
                }}
                onClick={() => handleServiceSelect(service.name)}
              >
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                      {service.icon}
                      <Typography variant="h6" fontWeight="bold">
                        {service.displayName}
                      </Typography>
                    </Box>
                    <Chip
                      icon={getStatusIcon(service.status)}
                      label={service.status}
                      color={getStatusColor(service.status)}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {service.description}
                  </Typography>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Port {service.port}
                    </Typography>
                    {serviceStatuses[service.name]?.responseTime && (
                      <Typography variant="caption" color="text.secondary">
                        {serviceStatuses[service.name].responseTime}ms
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Service Status Monitor */}
        <Box mt={4}>
          <ServiceStatusMonitor 
            refreshInterval={30}
            onServiceClick={(service) => handleServiceSelect(service.name)}
          />
        </Box>
      </Box>

      {/* Navigation Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Box sx={{ width: 300, p: 2 }}>
          <Typography variant="h6" mb={2}>
            Service Navigation
          </Typography>
          
          <List>
            {serviceConfig.map((service) => (
              <ListItem key={service.name} disablePadding>
                <ListItemButton onClick={() => handleServiceSelect(service.name)}>
                  <ListItemIcon>
                    {service.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={service.displayName}
                    secondary={`Port ${service.port}`}
                  />
                  <Chip
                    icon={getStatusIcon(service.status)}
                    label={service.status}
                    color={getStatusColor(service.status)}
                    size="small"
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
    </Box>
  );
};

export default UnifiedDashboard; 