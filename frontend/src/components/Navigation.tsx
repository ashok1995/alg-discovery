import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Dashboard,
  Timeline,
  Settings,
  Assessment,
  ShowChart,
  AccountBalance,
  TrendingUp,
  Menu as MenuIcon,
  Close as CloseIcon,
  Psychology,
  Analytics,
  TableChart,
  TrendingDown,
  Storage,
  FilterList
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface NavigationProps {
  title?: string;
}

const Navigation: React.FC<NavigationProps> = ({ title = "Swing Trading System" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const menuItems = [
    {
      text: 'Home',
      icon: <Dashboard />,
      path: '/',
      description: 'System overview and key metrics'
    },
    {
      text: 'Swing Buy AI',
      icon: <Psychology />,
      path: '/swing-buy-ai',
      description: 'AI-powered swing trading assistant'
    },
    {
      text: 'Swing Recommendations',
      icon: <TrendingUp />,
      path: '/swing-recommendations',
      description: 'Real-time swing trading signals'
    },
    {
      text: 'Intraday Buy',
      icon: <ShowChart />,
      path: '/intraday-buy',
      description: 'Intraday buying opportunities'
    },
    {
      text: 'Intraday Sell',
      icon: <TrendingDown />,
      path: '/intraday-sell',
      description: 'Intraday selling signals'
    },

    {
      text: 'Long Buy',
      icon: <AccountBalance />,
      path: '/long-buy',
      description: 'Long-term investment opportunities'
    },
    {
      text: 'Stock Mapping Manager',
      icon: <Storage />,
      path: '/stock-mapping-manager',
      description: 'Manage stock mappings and database'
    },
    {
      text: 'Backtesting',
      icon: <Timeline />,
      path: '/backtesting',
      description: 'Strategy backtesting and analysis'
    },
    {
      text: 'System Control',
      icon: <Settings />,
      path: '/system-control',
      description: 'Manage system components and configuration'
    },
    {
      text: 'Chartink Query Tester',
      icon: <Analytics />,
      path: '/chartink-query-tester',
      description: 'Test and optimize Chartink queries with analytics'
    },
    {
      text: 'Stock Candidate Populator',
      icon: <FilterList />,
      path: '/stock-candidate-populator',
      description: 'Populate and manage stock candidates'
    }
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const renderDesktopMenu = () => (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {menuItems.map((item) => (
        <Button
          key={item.path}
          color="inherit"
          onClick={() => handleNavigation(item.path)}
          sx={{
            backgroundColor: isActive(item.path) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.2)'
            }
          }}
        >
          {item.icon}
          <Typography sx={{ ml: 1, display: { xs: 'none', sm: 'block' } }}>
            {item.text}
          </Typography>
        </Button>
      ))}
    </Box>
  );

  const renderMobileMenu = () => (
    <>
      <IconButton
        color="inherit"
        onClick={() => setDrawerOpen(true)}
        sx={{ display: { md: 'none' } }}
      >
        <MenuIcon />
      </IconButton>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          '& .MuiDrawer-paper': {
            width: 280,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6" color="primary">
            {title}
          </Typography>
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        </Box>
        
        <Divider />
        
        <List>
          {menuItems.map((item) => (
            <ListItem
              key={item.path}
              button
              onClick={() => handleNavigation(item.path)}
              selected={isActive(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.light',
                  '&:hover': {
                    backgroundColor: 'primary.light',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                secondary={item.description}
                primaryTypographyProps={{
                  color: isActive(item.path) ? 'primary.main' : 'inherit',
                  fontWeight: isActive(item.path) ? 'bold' : 'normal',
                }}
              />
            </ListItem>
          ))}
        </List>
      </Drawer>
    </>
  );

  return (
    <AppBar position="static" elevation={2}>
      <Toolbar>
        <Typography
          variant="h6"
          component="div"
          sx={{
            flexGrow: 1,
            cursor: 'pointer',
            display: { xs: 'none', sm: 'block' }
          }}
          onClick={() => handleNavigation('/')}
        >
          {title}
        </Typography>
        
        {isMobile ? renderMobileMenu() : renderDesktopMenu()}
      </Toolbar>
    </AppBar>
  );
};

export default Navigation; 