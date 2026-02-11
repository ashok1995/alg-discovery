import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  ExpandMore,
  Warning,
  CheckCircle,
  Error,
  Edit,
  Save
} from '@mui/icons-material';

interface SystemComponent {
  name: string;
  status: 'running' | 'stopped' | 'error';
  last_start: string;
  uptime: string;
  performance: {
    cpu_usage: number;
    memory_usage: number;
    error_count: number;
  };
  config: Record<string, any>;
}

interface DataCollectionSchedule {
  component: string;
  enabled: boolean;
  interval_minutes: number;
  last_run: string;
  next_run: string;
  success_rate: number;
}

interface SystemConfig {
  redis: {
    host: string;
    port: number;
    db: number;
  };
  database: {
    type: string;
    host: string;
    port: number;
    name: string;
  };
  zerodha: {
    api_key: string;
    access_token: string;
    rate_limit_per_minute: number;
  };
  chartink: {
    enabled: boolean;
    api_key: string;
    rate_limit_per_minute: number;
  };
  trading: {
    max_positions: number;
    risk_per_trade: number;
    max_capital_per_trade: number;
  };
}

const SystemControl: React.FC = () => {
  const [components, setComponents] = useState<SystemComponent[]>([]);
  const [schedules, setSchedules] = useState<DataCollectionSchedule[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState(false);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      
      // Fetch system components
      const componentsResponse = await fetch('/api/system/components');
      const componentsData = await componentsResponse.json();
      setComponents(componentsData);

      // Fetch data collection schedules
      const schedulesResponse = await fetch('/api/system/schedules');
      const schedulesData = await schedulesResponse.json();
      setSchedules(schedulesData);

      // Fetch system configuration
      const configResponse = await fetch('/api/system/config');
      const configData = await configResponse.json();
      setConfig(configData);

    } catch (err) {
      setError('Failed to fetch system data');
      console.error('System data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleComponent = async (componentName: string, action: 'start' | 'stop') => {
    try {
      const response = await fetch(`/api/system/components/${componentName}/${action}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        fetchSystemData(); // Refresh data
      } else {
        setError(`Failed to ${action} ${componentName}`);
      }
    } catch (err) {
      setError(`Failed to ${action} ${componentName}`);
    }
  };

  const updateSchedule = async (component: string, enabled: boolean, interval: number) => {
    try {
      const response = await fetch(`/api/system/schedules/${component}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          enabled,
          interval_minutes: interval
        })
      });
      
      if (response.ok) {
        fetchSystemData();
      } else {
        setError(`Failed to update schedule for ${component}`);
      }
    } catch (err) {
      setError(`Failed to update schedule for ${component}`);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    
    try {
      const response = await fetch('/api/system/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        setEditingConfig(false);
        fetchSystemData();
      } else {
        setError('Failed to save configuration');
      }
    } catch (err) {
      setError('Failed to save configuration');
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'stopped': return 'default';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle color="success" />;
      case 'stopped': return <Stop color="action" />;
      case 'error': return <Error color="error" />;
      default: return <Warning color="warning" />;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        System Control
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* System Components */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  System Components
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchSystemData}
                >
                  Refresh
                </Button>
              </Box>

              {components.map((component) => (
                <Accordion key={component.name} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                      <Box display="flex" alignItems="center">
                        {getStatusIcon(component.status)}
                        <Typography variant="subtitle1" sx={{ ml: 1 }}>
                          {component.name.replace(/_/g, ' ').toUpperCase()}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center">
                        <Chip
                          label={component.status.toUpperCase()}
                          color={getStatusColor(component.status)}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Tooltip title={`${component.status === 'running' ? 'Stop' : 'Start'} ${component.name}`}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleComponent(component.name, component.status === 'running' ? 'stop' : 'start');
                            }}
                            color={component.status === 'running' ? 'error' : 'success'}
                          >
                            {component.status === 'running' ? <Stop /> : <PlayArrow />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Last Start
                        </Typography>
                        <Typography variant="body2">
                          {new Date(component.last_start).toLocaleString()}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="textSecondary">
                          Uptime
                        </Typography>
                        <Typography variant="body2">
                          {component.uptime}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                          Performance
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={4}>
                            <Typography variant="caption">
                              CPU: {component.performance.cpu_usage}%
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption">
                              Memory: {component.performance.memory_usage}%
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="error">
                              Errors: {component.performance.error_count}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Data Collection Schedules */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Data Collection Schedules
              </Typography>

              {schedules.map((schedule) => (
                <Card key={schedule.component} variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle2">
                        {schedule.component.replace(/_/g, ' ').toUpperCase()}
                      </Typography>
                      <Chip
                        label={`${schedule.success_rate.toFixed(1)}% Success`}
                        color={schedule.success_rate > 90 ? 'success' : schedule.success_rate > 70 ? 'warning' : 'error'}
                        size="small"
                      />
                    </Box>

                    <FormControlLabel
                      control={
                        <Switch
                          checked={schedule.enabled}
                          onChange={(e) => updateSchedule(schedule.component, e.target.checked, schedule.interval_minutes)}
                          size="small"
                        />
                      }
                      label="Enabled"
                    />

                    <Box mt={1}>
                      <Typography variant="body2" color="textSecondary">
                        Interval: {schedule.interval_minutes} minutes
                      </Typography>
                      <Slider
                        value={schedule.interval_minutes}
                        onChange={(_, value) => updateSchedule(schedule.component, schedule.enabled, value as number)}
                        min={1}
                        max={60}
                        step={1}
                        marks
                        size="small"
                        disabled={!schedule.enabled}
                      />
                    </Box>

                    <Box mt={1}>
                      <Typography variant="caption" color="textSecondary">
                        Last Run: {new Date(schedule.last_run).toLocaleString()}
                      </Typography>
                      <br />
                      <Typography variant="caption" color="textSecondary">
                        Next Run: {new Date(schedule.next_run).toLocaleString()}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* System Configuration */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  System Configuration
                </Typography>
                <Box>
                  {editingConfig ? (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={<Save />}
                        onClick={saveConfig}
                        sx={{ mr: 1 }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="text"
                        onClick={() => {
                          setEditingConfig(false);
                          fetchSystemData(); // Reset to original values
                        }}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => setEditingConfig(true)}
                    >
                      Edit
                    </Button>
                  )}
                </Box>
              </Box>

              {config && (
                <Grid container spacing={3}>
                  {/* Redis Configuration */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" gutterBottom>
                      Redis Configuration
                    </Typography>
                    <TextField
                      fullWidth
                      label="Host"
                      value={config.redis.host}
                      onChange={(e) => setConfig({...config, redis: {...config.redis, host: e.target.value}})}
                      disabled={!editingConfig}
                      margin="normal"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="Port"
                      type="number"
                      value={config.redis.port}
                      onChange={(e) => setConfig({...config, redis: {...config.redis, port: Number(e.target.value)}})}
                      disabled={!editingConfig}
                      margin="normal"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="Database"
                      type="number"
                      value={config.redis.db}
                      onChange={(e) => setConfig({...config, redis: {...config.redis, db: Number(e.target.value)}})}
                      disabled={!editingConfig}
                      margin="normal"
                      size="small"
                    />
                  </Grid>

                  {/* Database Configuration */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" gutterBottom>
                      Database Configuration
                    </Typography>
                    <TextField
                      fullWidth
                      label="Type"
                      value={config.database.type}
                      onChange={(e) => setConfig({...config, database: {...config.database, type: e.target.value}})}
                      disabled={!editingConfig}
                      margin="normal"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="Host"
                      value={config.database.host}
                      onChange={(e) => setConfig({...config, database: {...config.database, host: e.target.value}})}
                      disabled={!editingConfig}
                      margin="normal"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="Port"
                      type="number"
                      value={config.database.port}
                      onChange={(e) => setConfig({...config, database: {...config.database, port: Number(e.target.value)}})}
                      disabled={!editingConfig}
                      margin="normal"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="Database Name"
                      value={config.database.name}
                      onChange={(e) => setConfig({...config, database: {...config.database, name: e.target.value}})}
                      disabled={!editingConfig}
                      margin="normal"
                      size="small"
                    />
                  </Grid>

                  {/* Trading Configuration */}
                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle1" gutterBottom>
                      Trading Configuration
                    </Typography>
                    <TextField
                      fullWidth
                      label="Max Positions"
                      type="number"
                      value={config.trading.max_positions}
                      onChange={(e) => setConfig({...config, trading: {...config.trading, max_positions: Number(e.target.value)}})}
                      disabled={!editingConfig}
                      margin="normal"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="Risk Per Trade (%)"
                      type="number"
                      value={config.trading.risk_per_trade}
                      onChange={(e) => setConfig({...config, trading: {...config.trading, risk_per_trade: Number(e.target.value)}})}
                      disabled={!editingConfig}
                      margin="normal"
                      size="small"
                    />
                    <TextField
                      fullWidth
                      label="Max Capital Per Trade"
                      type="number"
                      value={config.trading.max_capital_per_trade}
                      onChange={(e) => setConfig({...config, trading: {...config.trading, max_capital_per_trade: Number(e.target.value)}})}
                      disabled={!editingConfig}
                      margin="normal"
                      size="small"
                    />
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default SystemControl; 