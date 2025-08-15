import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Typography,
  IconButton,
  Toolbar,
  AppBar,
  useTheme,
  useMediaQuery,
  Collapse
} from '@mui/material';
import {
  Dashboard,
  TrendingUp,
  TrendingDown,
  ShowChart,
  Assessment,
  Timeline,
  Settings,
  Psychology,
  Analytics,
  Storage,
  FilterList,
  Menu as MenuIcon,
  Close as CloseIcon,
  ExpandLess,
  ExpandMore,
  AccountBalance,
  Business,
  Build,
  Home,
  Code
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  description: string;
  category: 'main' | 'trading' | 'analysis' | 'management' | 'tools';
}

const SidebarLayout: React.FC<SidebarLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    main: true,
    trading: true,
    analysis: true,
    management: true,
    tools: true
  });

  const menuItems: MenuItem[] = [
    // Main
    {
      text: 'Home',
      icon: <Home />,
      path: '/',
      description: 'System overview and key metrics',
      category: 'main'
    },
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
      description: 'Unified dashboard with all services',
      category: 'main'
    },
    
    // Trading Services
    {
      text: 'Swing Buy',
      icon: <TrendingUp />,
      path: '/swing-recommendations',
      description: 'Swing trading with AI mode & customizable algorithms',
      category: 'trading'
    },
    {
      text: 'Intraday Buy',
      icon: <ShowChart />,
      path: '/intraday-buy',
      description: 'Intraday buying opportunities',
      category: 'trading'
    },
    {
      text: 'Intraday Sell',
      icon: <TrendingDown />,
      path: '/intraday-sell',
      description: 'Intraday selling signals',
      category: 'trading'
    },
    {
      text: 'Long Buy',
      icon: <AccountBalance />,
      path: '/long-buy',
      description: 'Long-term stock buying opportunities',
      category: 'trading'
    },
    {
      text: 'Investing',
      icon: <Business />,
      path: '/investing',
      description: 'Comprehensive investment opportunities & portfolio building',
      category: 'trading'
    },
    
    // Analysis Services
    {
      text: 'Backtesting',
      icon: <Assessment />,
      path: '/backtesting',
      description: 'Strategy backtesting and analysis',
      category: 'analysis'
    },
    {
      text: 'Query Manager',
      icon: <Analytics />,
      path: '/candidate-query-registry',
      description: 'Register, test, and manage queries',
      category: 'analysis'
    },
    
    // Management Services
    {
      text: 'System Control',
      icon: <Settings />,
      path: '/system-control',
      description: 'Manage system components and configuration',
      category: 'management'
    },
    {
      text: 'Stock Mapping Manager',
      icon: <Storage />,
      path: '/stock-mapping',
      description: 'Manage stock mappings and database',
      category: 'management'
    },
    {
      text: 'Stock Candidate Populator',
      icon: <FilterList />,
      path: '/stock-candidate-populator',
      description: 'Populate and manage stock candidates',
      category: 'management'
    },
    
    // Tools
    {
      text: 'Settings',
      icon: <Build />,
      path: '/settings',
      description: 'Application settings and configuration',
      category: 'tools'
    },
    {
      text: 'Recommendation Service Test',
      icon: <Code />,
      path: '/test/recommendation-service',
      description: 'Test and debug recommendation service connection',
      category: 'tools'
    }
  ];

  const categories = {
    main: { title: 'Main', icon: <Dashboard /> },
    trading: { title: 'Trading', icon: <TrendingUp /> },
    analysis: { title: 'Analysis', icon: <Assessment /> },
    management: { title: 'Management', icon: <Settings /> },
    tools: { title: 'Tools', icon: <Build /> }
  };

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

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getItemsByCategory = (category: string) => {
    return menuItems.filter(item => item.category === category);
  };

  const drawerWidth = 280;

  const renderSidebarContent = () => (
    <Box sx={{ width: drawerWidth }}>
      {/* Header */}
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
          Trading System
        </Typography>
        {isMobile && (
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation List */}
      <List sx={{ pt: 1 }}>
        {Object.entries(categories).map(([categoryKey, categoryInfo]) => {
          const categoryItems = getItemsByCategory(categoryKey);
          if (categoryItems.length === 0) return null;

          return (
            <Box key={categoryKey}>
              <ListItemButton
                onClick={() => toggleCategory(categoryKey)}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  backgroundColor: expandedCategories[categoryKey] ? 'action.selected' : 'transparent'
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {categoryInfo.icon}
                </ListItemIcon>
                <ListItemText 
                  primary={categoryInfo.title}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: 'bold'
                  }}
                />
                {expandedCategories[categoryKey] ? <ExpandLess /> : <ExpandMore />}
              </ListItemButton>
              
              <Collapse in={expandedCategories[categoryKey]} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {categoryItems.map((item) => (
                    <ListItemButton
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      selected={isActive(item.path)}
                      sx={{
                        pl: 4,
                        minHeight: 40,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.light',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ 
                        minWidth: 36,
                        color: isActive(item.path) ? 'primary.main' : 'inherit'
                      }}>
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: 13,
                          color: isActive(item.path) ? 'primary.main' : 'inherit',
                          fontWeight: isActive(item.path) ? 'bold' : 'normal',
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile App Bar */}
      {isMobile && (
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
            display: { md: 'none' }
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              onClick={() => setDrawerOpen(!drawerOpen)}
              edge="start"
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              Trading System
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Sidebar Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper'
          },
        }}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
      >
        {renderSidebarContent()}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: { xs: isMobile ? 8 : 0, md: 0 }
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SidebarLayout; 