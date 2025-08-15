import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';

// Import cache managers
import AppLevelCacheManager from './services/AppLevelCacheManager';
import SharedPriceManager from './services/SharedPriceManager';

// Import components
import SidebarLayout from './components/SidebarLayout';
import UnifiedDashboard from './components/UnifiedDashboard';
import RecommendationServiceTest from './components/RecommendationServiceTest';

// Import pages
import Dashboard from './pages/Dashboard';
import Backtesting from './pages/Backtesting';
import SystemControl from './pages/SystemControl';
import SwingBuy from './pages/SwingBuy';
import QueryManager from './pages/QueryManager';
import Home from './pages/Home';
import IntradayBuy from './pages/IntradayBuy';
import IntradaySell from './pages/IntradaySell';
import CandidateQueryRegistry from './pages/CandidateQueryRegistry';

import LongBuy from './pages/LongBuy';
import Investing from './pages/Investing';
import Settings from './pages/Settings';
import StockMappingManager from './pages/StockMappingManager';
import StockCandidatePopulatorPage from './pages/StockCandidatePopulatorPage';
import KiteWebSocketTest from './components/KiteWebSocketTest';

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Create theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 8,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 6,
        },
      },
    },
  },
});

function App() {
  const [activeService, setActiveService] = useState<string>('dashboard');
  const [cacheInitialized, setCacheInitialized] = useState(false); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Initialize cache managers on app startup
  useEffect(() => {
    const initializeCacheManagers = () => {
      try {
        // Initialize app-level cache manager
        const appCache = AppLevelCacheManager.getInstance();
        
        // Initialize shared price manager
        const priceManager = SharedPriceManager.getInstance();
        
        // Set up periodic cache cleanup
        const cleanupInterval = setInterval(() => {
          appCache.cleanExpiredEntries();
        }, 5 * 60 * 1000); // Every 5 minutes
        
        setCacheInitialized(true);
        console.log('🚀 App cache managers initialized successfully');
        
        // Cleanup on unmount
        return () => {
          clearInterval(cleanupInterval);
          priceManager.stop();
        };
      } catch (error) {
        console.error('❌ Failed to initialize cache managers:', error);
      }
    };

    initializeCacheManagers();
  }, []);

  const handleServiceSelect = (serviceName: string) => {
    setActiveService(serviceName);
  };

  // Service routing mapping
  const getServiceComponent = (serviceName: string) => {
    switch (serviceName) {
      case 'swing-api':
        return <SwingBuy />;
      case 'longterm-api':
        return <LongBuy />;
      case 'shortterm-api':
        return <SwingBuy />;
      case 'intraday-api':
        return <IntradayBuy />;
      case 'intraday-service-api':
        return <IntradaySell />;
      case 'dashboard-api':
        return <Dashboard />;
      case 'stock-mapping-api':
        return <StockMappingManager />;
      case 'stock-candidate-populator-api':
        return <StockCandidatePopulatorPage />;
      case 'chartink-query-tester':
        return <QueryManager />;
      case 'candidate-query-registry':
        return <QueryManager />;
      case 'swing-recommendations':
        return <SwingBuy />;
      case 'backtesting':
        return <Backtesting />;
      case 'system-control':
        return <SystemControl />;
      case 'settings':
        return <Settings />;
      default:
        return <UnifiedDashboard onServiceSelect={handleServiceSelect} activeService={activeService} />;
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <SidebarLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<UnifiedDashboard onServiceSelect={handleServiceSelect} activeService={activeService} />} />
              <Route path="/service/:serviceName" element={getServiceComponent(activeService)} />
              
              {/* Legacy routes */}
              <Route path="/backtesting" element={<Backtesting />} />
              <Route path="/system-control" element={<SystemControl />} />
              <Route path="/swing-buy-ai" element={<SwingBuy />} />
              <Route path="/chartink-query-tester" element={<QueryManager />} />
              <Route path="/candidate-query-registry" element={<QueryManager />} />
              <Route path="/swing-recommendations" element={<SwingBuy />} />
              <Route path="/intraday-buy" element={<IntradayBuy />} />
              <Route path="/intraday-sell" element={<IntradaySell />} />
              <Route path="/short-buy" element={<SwingBuy />} />
              <Route path="/long-buy" element={<LongBuy />} />
              <Route path="/investing" element={<Investing />} />
              
              {/* Redirect old long-term-trading route */}
              <Route path="/long-term-trading" element={<Investing />} />
              
              <Route path="/settings" element={<Settings />} />
              <Route path="/stock-mapping" element={<StockMappingManager />} />
              <Route path="/stock-candidate-populator" element={<StockCandidatePopulatorPage />} />
              
              {/* Service-specific routes */}
              <Route path="/swing-api" element={<SwingBuy />} />
              <Route path="/longterm-api" element={<Investing />} />
              <Route path="/shortterm-api" element={<SwingBuy />} />
              <Route path="/intraday-api" element={<IntradayBuy />} />
              <Route path="/intraday-service-api" element={<IntradaySell />} />
              <Route path="/variants-api" element={<div>Strategy Variants - Coming Soon</div>} />
              <Route path="/facts-api" element={<div>Market Facts - Coming Soon</div>} />
              <Route path="/dashboard-api" element={<Dashboard />} />
              <Route path="/unified-strategy-api" element={<div>Unified Strategy - Coming Soon</div>} />
              <Route path="/misc-api" element={<div>Misc Tools - Coming Soon</div>} />
              <Route path="/kite-websocket-test" element={<KiteWebSocketTest />} />
              <Route path="/zerodha-test-api" element={<div>Zerodha Test - Coming Soon</div>} />
              <Route path="/zerodha-api" element={<div>Zerodha Management - Coming Soon</div>} />
              <Route path="/validation-api" element={<div>Validation Tools - Coming Soon</div>} />
              <Route path="/algorithm-api" element={<div>Algorithm Analysis - Coming Soon</div>} />
              <Route path="/stock-mapping-api" element={<StockMappingManager />} />
              <Route path="/stock-candidate-populator-api" element={<StockCandidatePopulatorPage />} />
              <Route path="/candidate-query-registry" element={<QueryManager />} />
              
              {/* New Recommendations Dashboard */}
              <Route path="/recommendations" element={<div>Recommendations Dashboard - Coming Soon</div>} />
              <Route path="/recommendations/:type" element={<div>Recommendations Dashboard - Coming Soon</div>} />
              
              {/* Test Routes */}
              <Route path="/test/recommendation-service" element={<RecommendationServiceTest />} />
            </Routes>
          </SidebarLayout>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 