import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';

import AppLevelCacheManager from './services/AppLevelCacheManager';
import SharedPriceManager from './services/SharedPriceManager';
import SidebarLayout from './components/SidebarLayout';
import UnifiedDashboard from './components/UnifiedDashboard';
import RecommendationServiceTest from './components/RecommendationServiceTest';
import KiteWebSocketTest from './components/KiteWebSocketTest';
import Dashboard from './pages/Dashboard';
import Backtesting from './pages/Backtesting';
import SystemControl from './pages/SystemControl';
import QueryManager from './pages/QueryManager';
import Home from './pages/Home';
import Investing from './pages/Investing';
import Settings from './pages/Settings';
import StockMappingManager from './pages/StockMappingManager';
import StockCandidatePopulatorPage from './pages/StockCandidatePopulatorPage';
import UnifiedRecommendations from './pages/UnifiedRecommendations';
import RecommendationObservabilityPage from './pages/RecommendationObservabilityPage';

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
  useEffect(() => {
    try {
      const appCache = AppLevelCacheManager.getInstance();
      const priceManager = SharedPriceManager.getInstance();

      const cleanupInterval = setInterval(() => {
        appCache.cleanExpiredEntries();
      }, 5 * 60 * 1000);

      return () => {
        clearInterval(cleanupInterval);
        priceManager.stop();
      };
    } catch (error) {
      console.error('Failed to initialize cache managers:', error);
    }
  }, []);

  const handleServiceSelect = (serviceName: string) => {
    setActiveService(serviceName);
  };

  const SERVICE_ROUTES: Record<string, React.ReactElement> = {
    'swing-api': <UnifiedRecommendations />,
    'shortterm-api': <UnifiedRecommendations />,
    'intraday-api': <UnifiedRecommendations />,
    'intraday-service-api': <UnifiedRecommendations />,
    'swing-recommendations': <UnifiedRecommendations />,
    'longterm-api': <Investing />,
    'dashboard-api': <Dashboard />,
    'stock-mapping-api': <StockMappingManager />,
    'stock-candidate-populator-api': <StockCandidatePopulatorPage />,
    'chartink-query-tester': <QueryManager />,
    'candidate-query-registry': <QueryManager />,
    'backtesting': <Backtesting />,
    'system-control': <SystemControl />,
    'settings': <Settings />,
  };

  const getServiceComponent = (serviceName: string) =>
    SERVICE_ROUTES[serviceName] ?? <UnifiedDashboard onServiceSelect={handleServiceSelect} activeService={activeService} />;

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
              <Route path="/seed-dashboard" element={<Dashboard />} />
              <Route path="/recommendations" element={<UnifiedRecommendations />} />
              <Route path="/investing" element={<Investing />} />
              <Route path="/backtesting" element={<Backtesting />} />
              <Route path="/system-control" element={<SystemControl />} />
              <Route path="/query-manager" element={<QueryManager />} />
              <Route path="/recommendation-observability" element={<RecommendationObservabilityPage />} />
              <Route path="/chartink-query-tester" element={<QueryManager />} />
              <Route path="/candidate-query-registry" element={<QueryManager />} />
              <Route path="/swing-recommendations" element={<UnifiedRecommendations />} />
              <Route path="/unified-recommendations" element={<UnifiedRecommendations />} />
              <Route path="/long-term-trading" element={<Investing />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/stock-mapping" element={<StockMappingManager />} />
              <Route path="/stock-candidate-populator" element={<StockCandidatePopulatorPage />} />
              <Route path="/kite-websocket-test" element={<KiteWebSocketTest />} />
              <Route path="/test/recommendation-service" element={<RecommendationServiceTest />} />
            </Routes>
          </SidebarLayout>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 