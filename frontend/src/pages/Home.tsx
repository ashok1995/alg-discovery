import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  Psychology,
  AccountBalance,
  Speed,
  Storage,
  Wifi,
  Timeline as TimelineIcon,
  AccessTime,
  Memory
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import InternalMarketContextCard from '../components/InternalMarketContextCard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 4 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [systemStatus] = useState({
    marketOpen: true,
    lastUpdate: new Date().toLocaleTimeString(),
    activeStrategies: 12,
    totalPositions: 45,
    dailyPnL: 12500,
    weeklyPnL: 45000
  });

  const [tradingStrategies] = useState([
    {
      category: 'Swing Trading',
      strategies: [
        { title: 'Swing Buy AI', description: 'AI-powered swing signals', count: 8, color: 'primary', path: '/swing-buy-ai', icon: <Psychology /> },
        { title: 'Swing Recommendations', description: 'Real-time swing alerts', count: 12, color: 'success', path: '/swing-recommendations', icon: <TrendingUp /> }
      ]
    },
    {
      category: 'Intraday Trading',
      strategies: [
        { title: 'Intraday Buy', description: 'Morning momentum plays', count: 15, color: 'info', path: '/intraday-buy', icon: <ShowChart /> },
        { title: 'Intraday Sell', description: 'Exit strategies', count: 6, color: 'warning', path: '/intraday-sell', icon: <TrendingDown /> }
      ]
    },
    {
      category: 'Positional Trading',
      strategies: [

        { title: 'Long Buy', description: 'Long-term investments', count: 4, color: 'success', path: '/long-buy', icon: <AccountBalance /> },
        { title: 'Long Term Trading', description: 'Extended positions', count: 7, color: 'info', path: '/long-term-trading', icon: <TimelineIcon /> }
      ]
    }
  ]);

  const [recentActivities] = useState([
    { time: '09:15', action: 'Swing Buy Signal', stock: 'RELIANCE', price: '2,456.78', status: 'executed' },
    { time: '09:30', action: 'Intraday Entry', stock: 'TCS', price: '3,234.56', status: 'pending' },
    { time: '10:15', action: 'Stop Loss Hit', stock: 'INFY', price: '1,567.89', status: 'executed' },
    { time: '11:00', action: 'Take Profit', stock: 'HDFC', price: '1,789.12', status: 'executed' },
    { time: '11:45', action: 'New Signal', stock: 'WIPRO', price: '456.78', status: 'pending' }
  ]);

  const [systemMetrics] = useState([
    { name: 'API Response Time', value: '45ms', status: 'good', icon: <Speed /> },
    { name: 'Database Health', value: '99.9%', status: 'good', icon: <Storage /> },
    { name: 'Network Latency', value: '12ms', status: 'good', icon: <Wifi /> },
    { name: 'Memory Usage', value: '67%', status: 'warning', icon: <Memory /> }
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleStrategyClick = (path: string) => {
    const routeMap: Record<string, string> = {
      '/swing-buy-ai': '/unified-recommendations',
      '/swing-recommendations': '/unified-recommendations',
      '/intraday-buy': '/unified-recommendations',
      '/intraday-sell': '/unified-recommendations',
      '/long-buy': '/investing',
      '/long-term-trading': '/investing',
    };
    navigate(routeMap[path] ?? path);
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 1200, mx: 'auto' }}>
      {/* Header Section */}
      <Box
        sx={{
          mb: 4,
          p: 3.5,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, color: 'grey.900', mb: 0.5 }}>
          Financial Markets Overview
        </Typography>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Real-time market data, indices, and trading opportunities
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          <Chip
            label={systemStatus.marketOpen ? 'Market Open' : 'Market Closed'}
            color={systemStatus.marketOpen ? 'success' : 'error'}
            size="small"
            icon={<AccessTime />}
            sx={{ fontWeight: 600 }}
          />
          <Typography variant="caption" color="text.secondary">
            Last Update: {systemStatus.lastUpdate}
          </Typography>
        </Box>
      </Box>

      {/* Internal & Global Market Context (live from APIs) */}
      <InternalMarketContextCard />

      {/* Main Content Tabs */}
      <Box sx={{ flexGrow: 1 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="dashboard tabs"
            sx={{
              '& .MuiTab-root': { fontWeight: 600, textTransform: 'none' },
              '& .Mui-selected': { color: 'primary.main' },
            }}
          >
            <Tab label="Trading Overview" />
            <Tab label="Recent Activities" />
            <Tab label="System Health" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Trading Strategies */}
            <Grid item xs={12} md={8}>
              <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Active Trading Strategies
                  </Typography>
                  <Grid container spacing={2}>
                    {tradingStrategies.map((category, categoryIndex) => (
                      <Grid item xs={12} key={categoryIndex}>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, fontWeight: 'bold' }}>
                          {category.category}
                        </Typography>
                        <Grid container spacing={1}>
                          {category.strategies.map((strategy, strategyIndex) => (
                            <Grid item xs={12} sm={6} key={strategyIndex}>
                              <Card
                                variant="outlined"
                                sx={{
                                  cursor: 'pointer',
                                  borderRadius: 1.5,
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    backgroundColor: 'action.hover',
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    borderColor: 'primary.light',
                                  },
                                }}
                                onClick={() => handleStrategyClick(strategy.path)}
                              >
                                <CardContent sx={{ py: 2, px: 2 }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      {strategy.icon}
                                      <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                          {strategy.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {strategy.description}
                                        </Typography>
                                      </Box>
                                    </Box>
                                    <Chip
                                      label={strategy.count}
                                      color={strategy.color as any}
                                      size="small"
                                    />
                                  </Box>
                                </CardContent>
                              </Card>
                            </Grid>
                          ))}
                        </Grid>
                      </Grid>
                    ))}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Quick Stats */}
            <Grid item xs={12} md={4}>
              <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', height: '100%' }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Quick Stats
                  </Typography>
                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Active Strategies</Typography>
                      <Chip label={systemStatus.activeStrategies} color="primary" size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Total Positions</Typography>
                      <Chip label={systemStatus.totalPositions} color="info" size="small" />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Daily P&L</Typography>
                      <Chip 
                        label={`₹${systemStatus.dailyPnL.toLocaleString()}`} 
                        color={systemStatus.dailyPnL >= 0 ? 'success' : 'error'} 
                        size="small" 
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Weekly P&L</Typography>
                      <Chip 
                        label={`₹${systemStatus.weeklyPnL.toLocaleString()}`} 
                        color={systemStatus.weeklyPnL >= 0 ? 'success' : 'error'} 
                        size="small" 
                      />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                Recent Trading Activities
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Time</TableCell>
                      <TableCell>Action</TableCell>
                      <TableCell>Stock</TableCell>
                      <TableCell>Price</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {recentActivities.map((activity, index) => (
                      <TableRow key={index}>
                        <TableCell>{activity.time}</TableCell>
                        <TableCell>{activity.action}</TableCell>
                        <TableCell>{activity.stock}</TableCell>
                        <TableCell>₹{activity.price}</TableCell>
                        <TableCell>
                          <Chip
                            label={activity.status}
                            color={activity.status === 'executed' ? 'success' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {systemMetrics.map((metric, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card variant="outlined" sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'all 0.2s', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } }}>
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={{ 
                        p: 1, 
                        borderRadius: 1, 
                        backgroundColor: `${getStatusColor(metric.status)}.light`,
                        color: `${getStatusColor(metric.status)}.main`
                      }}>
                        {metric.icon}
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {metric.name}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {metric.value}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Box>
    </Box>
  );
};

export default Home; 