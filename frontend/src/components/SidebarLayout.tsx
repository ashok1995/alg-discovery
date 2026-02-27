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
import { Menu as MenuIcon, Close as CloseIcon, ExpandLess, ExpandMore } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { menuItems, categories } from '../config/sidebarConfig';

interface SidebarLayoutProps {
  children: React.ReactNode;
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

  const getItemsByCategory = (category: string) =>
    menuItems.filter(item => item.category === category);

  const drawerWidth = 280;

  const renderSidebarContent = () => (
    <Box sx={{ width: drawerWidth }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
          Trading System
        </Typography>
        {isMobile && (
          <IconButton onClick={() => setDrawerOpen(false)}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

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
                            backgroundColor: 'primary.light'
                          }
                        }
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 36,
                          color: isActive(item.path) ? 'primary.main' : 'inherit'
                        }}
                      >
                        {item.icon}
                      </ListItemIcon>
                      <ListItemText
                        primary={item.text}
                        primaryTypographyProps={{
                          fontSize: 13,
                          color: isActive(item.path) ? 'primary.main' : 'inherit',
                          fontWeight: isActive(item.path) ? 'bold' : 'normal'
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

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
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
          }
        }}
        ModalProps={{ keepMounted: true }}
      >
        {renderSidebarContent()}
      </Drawer>

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
