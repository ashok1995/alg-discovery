import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Alert,
  Snackbar,
  Paper,
  Tabs,
  Tab,
  Chip,
  Switch,
  FormControlLabel,
  Button,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  BarChart as BarChartIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  ShowChart as ShowChartIcon,
  TrendingDown as TrendingDownIcon,
  Business as BusinessIcon,
  PlayArrow as PlayArrowIcon
} from '@mui/icons-material';
import ModernRecommendationForm from '../components/ModernRecommendationForm';
import ModernRecommendationTable from '../components/ModernRecommendationTable';
import { UIRecommendationResponse, InvestmentHorizon } from '../types/apiModels';

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
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ModernRecommendationPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [recommendations, setRecommendations] = useState<UIRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('swing');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState('med');
  const [selectedHorizon, setSelectedHorizon] = useState(InvestmentHorizon.MEDIUM_TERM);
  const [riskLevel, setRiskLevel] = useState('medium');
  const [investmentHorizon, setInvestmentHorizon] = useState('medium_term');
  const [maxPositions, setMaxPositions] = useState(10);

  const handleRecommendationsReceived = (data: UIRecommendationResponse) => {
    setRecommendations(data);
    setLoading(false);
    setError(null);
    setSnackbarMessage(`🎉 Successfully loaded ${data.total_count} recommendations!`);
    setSnackbarOpen(true);
    
    // Switch to results tab with smooth animation
    setTimeout(() => setTabValue(1), 300);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    setLoading(false);
    setRecommendations(null);
    setSnackbarMessage(`❌ Error: ${errorMessage}`);
    setSnackbarOpen(true);
  };


  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleRefresh = () => {
    setTabValue(0);
    setRecommendations(null);
    setError(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Concise Banner Header */}
      <Paper elevation={2} sx={{ p: 4, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Box display="flex" alignItems="center" mb={1}>
              <BarChartIcon sx={{ fontSize: 32, mr: 1 }} />
              <Typography variant="h4" component="h1" fontWeight="bold">
                Stock Recommendations
              </Typography>
            </Box>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              AI-Powered Analysis with Real-time Metrics
            </Typography>
            
            {/* Current Strategy */}
            <Box display="flex" alignItems="center" mt={2} mb={2}>
              <Typography variant="body1" sx={{ mr: 1 }}>
                🎯 Swing Trading
              </Typography>
              <Chip label="3-10 day positions" size="small" sx={{ mr: 1, bgcolor: 'rgba(255,255,255,0.2)', color: 'white' }} />
              <Chip label="Min: 65" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }} />
            </Box>
            
            {/* Strategy Switcher */}
            <Box>
              <Typography variant="body2" sx={{ mb: 1, opacity: 0.9 }}>
                Switch Strategy:
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant={selectedStrategy === 'swing' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<ShowChartIcon />}
                  onClick={() => setSelectedStrategy('swing')}
                  sx={{ 
                    bgcolor: selectedStrategy === 'swing' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  Swing Trading
                </Button>
                <Button
                  variant={selectedStrategy === 'intraday_buy' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<TrendingUpIcon />}
                  onClick={() => setSelectedStrategy('intraday_buy')}
                  sx={{ 
                    bgcolor: selectedStrategy === 'intraday_buy' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  Intraday Buy
                </Button>
                <Button
                  variant={selectedStrategy === 'intraday_sell' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<TrendingDownIcon />}
                  onClick={() => setSelectedStrategy('intraday_sell')}
                  sx={{ 
                    bgcolor: selectedStrategy === 'intraday_sell' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  Intraday Sell
                </Button>
                <Button
                  variant={selectedStrategy === 'long_term' ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={<BusinessIcon />}
                  onClick={() => setSelectedStrategy('long_term')}
                  sx={{ 
                    bgcolor: selectedStrategy === 'long_term' ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.3)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  Long Term
                </Button>
              </Box>
            </Box>
          </Box>
          
          {/* Right Controls */}
          <Box display="flex" flexDirection="column" alignItems="flex-end" gap={2}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  sx={{ 
                    '& .MuiSwitch-switchBase.Mui-checked': { color: 'white' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.3)' }
                  }}
                />
              }
              label="Auto Refresh"
              sx={{ color: 'white', '& .MuiFormControlLabel-label': { color: 'white' } }}
            />
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
              }}
            >
              Refresh
            </Button>
            
            {/* Risk Indicators */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Risk:
              </Typography>
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: selectedRisk === 'low' ? '#4caf50' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  border: selectedRisk === 'low' ? '2px solid white' : '2px solid transparent'
                }}
                onClick={() => setSelectedRisk('low')}
              />
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: selectedRisk === 'med' ? '#ff9800' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  border: selectedRisk === 'med' ? '2px solid white' : '2px solid transparent'
                }}
                onClick={() => setSelectedRisk('med')}
              />
              <Box
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  bgcolor: selectedRisk === 'high' ? '#f44336' : 'rgba(255,255,255,0.3)',
                  cursor: 'pointer',
                  border: selectedRisk === 'high' ? '2px solid white' : '2px solid transparent'
                }}
                onClick={() => setSelectedRisk('high')}
              />
              <Typography variant="caption" sx={{ ml: 1, opacity: 0.8 }}>
                Low Med High
              </Typography>
            </Box>
            
            {/* Investment Horizon Selector */}
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Horizon:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={selectedHorizon}
                  onChange={(e) => setSelectedHorizon(e.target.value as InvestmentHorizon)}
                  sx={{
                    color: 'white',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
                    '& .MuiSvgIcon-root': { color: 'white' },
                    fontSize: '0.875rem'
                  }}
                >
                  <MenuItem value={InvestmentHorizon.INTRADAY}>Intraday</MenuItem>
                  <MenuItem value={InvestmentHorizon.SHORT_TERM}>Short Term</MenuItem>
                  <MenuItem value={InvestmentHorizon.MEDIUM_TERM}>Medium Term</MenuItem>
                  <MenuItem value={InvestmentHorizon.LONG_TERM}>Long Term</MenuItem>
                  <MenuItem value={InvestmentHorizon.POSITION}>Position</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </Box>
      </Paper>
      
      {/* Form Section */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, display: 'flex', alignItems: 'center' }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'red', mr: 1 }} />
          Required Fields
        </Typography>
        
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Strategy *</InputLabel>
              <Select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
              >
                <MenuItem value="swing">Swing Trading</MenuItem>
                <MenuItem value="intraday_buy">Intraday Buy</MenuItem>
                <MenuItem value="intraday_sell">Intraday Sell</MenuItem>
                <MenuItem value="long_term">Long Term</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Risk Level *</InputLabel>
              <Select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value)}
              >
                <MenuItem value="low">Low Risk</MenuItem>
                <MenuItem value="medium">Medium Risk</MenuItem>
                <MenuItem value="high">High Risk</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Investment Horizon *</InputLabel>
              <Select
                value={investmentHorizon}
                onChange={(e) => setInvestmentHorizon(e.target.value)}
              >
                <MenuItem value="short_term">Short Term (1-3 days)</MenuItem>
                <MenuItem value="medium_term">Medium Term (1-4 weeks)</MenuItem>
                <MenuItem value="long_term">Long Term (1+ months)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                label="Max Positions *"
                type="number"
                value={maxPositions}
                onChange={(e) => setMaxPositions(parseInt(e.target.value) || 10)}
                inputProps={{ min: 1, max: 100 }}
                helperText="1-100 stocks"
                sx={{ flexGrow: 1 }}
              />
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                size="large"
                sx={{ 
                  px: 3,
                  py: 1.5,
                  minWidth: 200
                }}
                onClick={() => {
                  // Handle get recommendations
                  setSnackbarMessage('🎉 Getting recommendations...');
                  setSnackbarOpen(true);
                }}
              >
                GET RECOMMENDATIONS
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <BarChartIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Total
                </Typography>
              </Box>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                7
              </Typography>
              <Typography variant="caption" color="text.secondary">
                3-10 day positions
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <StarIcon sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Avg Score
                </Typography>
              </Box>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                61.5
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Range: 62 - 62
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <BarChartIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Confidence
                </Typography>
              </Box>
              <Box display="flex" gap={0.5} mb={1}>
                <Chip label="H:0" size="small" color="success" />
                <Chip label="M:0" size="small" color="warning" />
                <Chip label="L:0" size="small" color="error" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Top: Unknown
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" alignItems="center" mb={1}>
                <TrendingUpIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="subtitle2" color="text.secondary">
                  Risk
                </Typography>
              </Box>
              <Box display="flex" gap={0.5} mb={1}>
                <Chip label="L:0" size="small" color="success" />
                <Chip label="M:7" size="small" color="warning" />
                <Chip label="H:0" size="small" color="error" />
              </Box>
              <Typography variant="caption" color="text.secondary">
                Updated: 03:26:45
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recommendations Display Area */}
      <Paper elevation={1} sx={{ minHeight: 400, p: 3 }}>
        {recommendations ? (
          <ModernRecommendationTable
            data={recommendations}
            loading={loading}
            error={error}
          />
        ) : (
          <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight={300}>
            <AssessmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Recommendations Yet
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Use the form above to configure your parameters and get AI-powered stock recommendations
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={error ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Simple Footer */}
      <Box mt={4} pt={3} borderTop="1px solid" borderColor="divider">
        <Typography variant="body2" color="text.secondary" align="center">
          Stock Recommendations • Powered by Advanced AI Algorithms
        </Typography>
      </Box>
    </Container>
  );
};

export default ModernRecommendationPage;
