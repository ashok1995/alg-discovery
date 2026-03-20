import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';

import AppLevelCacheManager from './services/AppLevelCacheManager';
import SharedPriceManager from './services/SharedPriceManager';
import SidebarLayout from './components/SidebarLayout';
import UnifiedDashboard from './components/UnifiedDashboard';
import KiteWebSocketTest from './components/KiteWebSocketTest';
import Dashboard from './pages/Dashboard';
import ArmManagerPage from './pages/ArmManagerPage';
import Home from './pages/Home';
import Investing from './pages/Investing';
import UnifiedRecommendations from './pages/UnifiedRecommendations';
import RecommendationObservabilityPage from './pages/RecommendationObservabilityPage';
import DetailedPositionsPage from './pages/DetailedPositionsPage';
import MLLearningPage from './pages/MLLearningPage';
import MarketMoversPage from './pages/MarketMoversPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import ObservabilityPage from './pages/ObservabilityPage';
import UniverseManagerPage from './pages/UniverseManagerPage';
import { WorkspacePreferencesProvider } from './context/WorkspacePreferencesContext';

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
    primary: { main: '#1976d2', light: '#e3f2fd' },
    secondary: { main: '#7c4dff' },
    success: { main: '#4caf50', dark: '#2e7d32' },
    error: { main: '#f44336', dark: '#c62828' },
    warning: { main: '#ff9800', dark: '#e65100' },
    background: { default: '#f8f9fc', paper: '#ffffff' },
    divider: 'rgba(0,0,0,0.08)',
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h6: { fontWeight: 600 },
    body2: { fontSize: '0.85rem' },
    caption: { fontSize: '0.75rem' },
  },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { borderRadius: 12, border: '1px solid rgba(0,0,0,0.08)' } },
    },
    MuiButton: {
      styleOverrides: { root: { textTransform: 'none', borderRadius: 8, fontWeight: 600 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 500 }, sizeSmall: { height: 24 } },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderColor: 'rgba(0,0,0,0.06)' } },
    },
    MuiTab: {
      styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
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
    'stock-mapping-api': <UniverseManagerPage />,
    'stock-candidate-populator-api': <UniverseManagerPage />,
    'chartink-query-tester': <ArmManagerPage />,
    'candidate-query-registry': <ArmManagerPage />,
    'system-control': <ObservabilityPage />,
    'observability': <ObservabilityPage />,
    'settings': <SystemSettingsPage />,
  };

  const getServiceComponent = (serviceName: string) =>
    SERVICE_ROUTES[serviceName] ?? <UnifiedDashboard onServiceSelect={handleServiceSelect} activeService={activeService} />;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <WorkspacePreferencesProvider>
          <SidebarLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<UnifiedDashboard onServiceSelect={handleServiceSelect} activeService={activeService} />} />
              <Route path="/service/:serviceName" element={getServiceComponent(activeService)} />
              <Route path="/seed-dashboard" element={<Dashboard />} />
              <Route path="/positions" element={<DetailedPositionsPage />} />
              <Route path="/ml-learning" element={<MLLearningPage />} />
              <Route path="/recommendations" element={<UnifiedRecommendations />} />
              <Route path="/market-movers" element={<MarketMoversPage />} />
              <Route path="/investing" element={<Investing />} />
              <Route path="/system-control" element={<Navigate to="/observability" replace />} />
              <Route path="/arm-manager" element={<ArmManagerPage />} />
              <Route path="/query-manager" element={<Navigate to="/arm-manager" replace />} />
              <Route path="/recommendation-observability" element={<RecommendationObservabilityPage />} />
              <Route path="/chartink-query-tester" element={<Navigate to="/arm-manager" replace />} />
              <Route path="/candidate-query-registry" element={<Navigate to="/arm-manager" replace />} />
              <Route path="/swing-recommendations" element={<UnifiedRecommendations />} />
              <Route path="/unified-recommendations" element={<UnifiedRecommendations />} />
              <Route path="/long-term-trading" element={<Investing />} />
              <Route path="/observability" element={<ObservabilityPage />} />
              <Route path="/settings" element={<SystemSettingsPage />} />
              <Route path="/universe" element={<UniverseManagerPage />} />
              <Route path="/stock-mapping" element={<Navigate to="/universe" replace />} />
              <Route path="/stock-candidate-populator" element={<Navigate to="/universe" replace />} />
              <Route path="/kite-websocket-test" element={<KiteWebSocketTest />} />
              <Route path="/backtesting" element={<Navigate to="/seed-dashboard" replace />} />
              <Route path="/test/recommendation-service" element={<Navigate to="/seed-dashboard" replace />} />
            </Routes>
          </SidebarLayout>
          </WorkspacePreferencesProvider>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 