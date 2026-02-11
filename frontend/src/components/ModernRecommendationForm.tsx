import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Slider,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import {
  UIQuickRecommendationRequest,
  UIRecommendationRequest,
  UIOptionsResponse,
  StrategyType,
  RiskLevel,
  InvestmentHorizon,
  MarketCondition,
  Sector,
  MarketCap,
  LossTighteningMode,
  SortBy,
  SortDirection,
  validateUIRequest,
  getDefaultUIRequest,
  getDropdownOptions
} from '../types/apiModels';
import { recommendationAPIService } from '../services/RecommendationAPIService';

interface ModernRecommendationFormProps {
  onRecommendationsReceived: (data: any) => void;
  onError: (error: string) => void;
}

const ModernRecommendationForm: React.FC<ModernRecommendationFormProps> = ({
  onRecommendationsReceived,
  onError
}) => {
  // 🔴 MANDATORY FIELDS STATE
  const [strategy, setStrategy] = useState<StrategyType>(StrategyType.SWING);
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(RiskLevel.MEDIUM);
  const [investmentHorizon, setInvestmentHorizon] = useState<InvestmentHorizon>(InvestmentHorizon.MEDIUM_TERM);
  const [maxPositions, setMaxPositions] = useState<number>(10);

  // 🟡 OPTIONAL FIELDS STATE
  const [profitTargetValue, setProfitTargetValue] = useState<number | undefined>();
  const [stopLossPercentage, setStopLossPercentage] = useState<number | undefined>();
  const [preferredSectors, setPreferredSectors] = useState<Sector[]>([]);
  const [excludedSectors, setExcludedSectors] = useState<Sector[]>([]);
  const [minLiquidity, setMinLiquidity] = useState<number | undefined>();
  const [executionUrgency, setExecutionUrgency] = useState<string>('');
  const [marketCondition, setMarketCondition] = useState<MarketCondition | undefined>();
  const [marketCaps, setMarketCaps] = useState<MarketCap[]>([]);
  const [rsiRange, setRsiRange] = useState<[number, number]>([30, 70]);
  const [minScore, setMinScore] = useState<number>(60);
  const [maxScore, setMaxScore] = useState<number | undefined>();
  const [limit, setLimit] = useState<number>(20);
  const [lossTightening, setLossTightening] = useState<LossTighteningMode | undefined>();
  const [sortBy, setSortBy] = useState<SortBy>(SortBy.SCORE);
  const [sortDirection, setSortDirection] = useState<SortDirection>(SortDirection.DESC);

  // UI STATE
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<UIOptionsResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [requestType, setRequestType] = useState<'quick' | 'full' | 'preset'>('quick');

  // Load options on component mount
  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    try {
      const optionsData = await recommendationAPIService.getOptions();
      setOptions(optionsData);
    } catch (error) {
      console.error('Failed to load options:', error);
      // Fallback to static options
      setOptions({
        strategies: getDropdownOptions().strategies,
        risk_levels: getDropdownOptions().riskLevels,
        investment_horizons: getDropdownOptions().investmentHorizons,
        market_conditions: [
          { value: MarketCondition.BULLISH, label: 'Bullish' },
          { value: MarketCondition.BEARISH, label: 'Bearish' },
          { value: MarketCondition.NEUTRAL, label: 'Neutral' },
          { value: MarketCondition.AUTO_DETECTED, label: 'Auto Detected' }
        ],
        sectors: getDropdownOptions().sectors,
        market_caps: getDropdownOptions().marketCaps,
        loss_tightening_modes: getDropdownOptions().lossTighteningModes,
        sort_options: getDropdownOptions().sortOptions,
        sort_directions: getDropdownOptions().sortDirections,
        presets: []
      });
    }
  };

  const validateForm = (): boolean => {
    const request: Partial<UIRecommendationRequest> = {
      strategy,
      risk_level: riskLevel,
      investment_horizon: investmentHorizon,
      max_positions: maxPositions,
      profit_target_value: profitTargetValue,
      stop_loss_percentage: stopLossPercentage,
      preferred_sectors: preferredSectors,
      excluded_sectors: excludedSectors,
      min_liquidity: minLiquidity,
      execution_urgency: executionUrgency,
      market_condition: marketCondition,
      market_caps: marketCaps,
      rsi_range: rsiRange,
      min_score: minScore,
      max_score: maxScore,
      limit,
      loss_tightening: lossTightening,
      sort_by: sortBy,
      sort_direction: sortDirection
    };

    const errors = validateUIRequest(request);
    setValidationErrors(errors.map((e: any) => e.message));
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setValidationErrors([]);

    try {
      let response;
      
      if (requestType === 'quick') {
        const quickRequest: UIQuickRecommendationRequest = {
          strategy,
          risk_level: riskLevel,
          investment_horizon: investmentHorizon,
          max_positions: maxPositions,
          profit_target_value: profitTargetValue,
          stop_loss_percentage: stopLossPercentage,
          min_score: minScore,
          limit
        };
        response = await recommendationAPIService.getQuickRecommendations(quickRequest);
      } else {
        const fullRequest: UIRecommendationRequest = {
          strategy,
          risk_level: riskLevel,
          investment_horizon: investmentHorizon,
          max_positions: maxPositions,
          profit_target_value: profitTargetValue,
          stop_loss_percentage: stopLossPercentage,
          preferred_sectors: preferredSectors.length > 0 ? preferredSectors : undefined,
          excluded_sectors: excludedSectors.length > 0 ? excludedSectors : undefined,
          min_liquidity: minLiquidity,
          execution_urgency: executionUrgency || undefined,
          market_condition: marketCondition,
          market_caps: marketCaps.length > 0 ? marketCaps : undefined,
          rsi_range: rsiRange,
          min_score: minScore,
          max_score: maxScore,
          limit,
          loss_tightening: lossTightening,
          sort_by: sortBy,
          sort_direction: sortDirection
        };
        response = await recommendationAPIService.getFullRecommendations(fullRequest);
      }

      onRecommendationsReceived(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStrategy(StrategyType.SWING);
    setRiskLevel(RiskLevel.MEDIUM);
    setInvestmentHorizon(InvestmentHorizon.MEDIUM_TERM);
    setMaxPositions(10);
    setProfitTargetValue(undefined);
    setStopLossPercentage(undefined);
    setPreferredSectors([]);
    setExcludedSectors([]);
    setMinLiquidity(undefined);
    setExecutionUrgency('');
    setMarketCondition(undefined);
    setMarketCaps([]);
    setRsiRange([30, 70]);
    setMinScore(60);
    setMaxScore(undefined);
    setLimit(20);
    setLossTightening(undefined);
    setSortBy(SortBy.SCORE);
    setSortDirection(SortDirection.DESC);
    setValidationErrors([]);
  };

  if (!options) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
        <Typography variant="body2" sx={{ ml: 2 }}>Loading options...</Typography>
      </Box>
    );
  }

  return (
    <Card sx={{ maxWidth: 1200, margin: '0 auto' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" component="h2">
            🎯 Modern Recommendation Engine
          </Typography>
          <Box>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadOptions}
              sx={{ mr: 1 }}
            >
              Refresh Options
            </Button>
            <Button
              variant="outlined"
              onClick={handleReset}
            >
              Reset Form
            </Button>
          </Box>
        </Box>

        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Validation Errors:
            </Typography>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {/* Request Type Selection */}
        <Box mb={3}>
          <FormControl fullWidth>
            <InputLabel>Request Type</InputLabel>
            <Select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as 'quick' | 'full' | 'preset')}
            >
              <MenuItem value="quick">Quick (Mandatory Fields Only)</MenuItem>
              <MenuItem value="full">Full (All Options)</MenuItem>
              <MenuItem value="preset">Preset (Coming Soon)</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* 🔴 MANDATORY FIELDS */}
        <Typography variant="h6" color="error" gutterBottom>
          🔴 Required Fields
        </Typography>
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth required>
              <InputLabel>Strategy</InputLabel>
              <Select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as StrategyType)}
              >
                {options.strategies.map((option: any) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth required>
              <InputLabel>Risk Level</InputLabel>
              <Select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
              >
                {options.risk_levels.map((option: any) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth required>
              <InputLabel>Investment Horizon</InputLabel>
              <Select
                value={investmentHorizon}
                onChange={(e) => setInvestmentHorizon(e.target.value as InvestmentHorizon)}
              >
                {getDropdownOptions().investmentHorizons.map((option: any) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              required
              label="Max Positions"
              type="number"
              value={maxPositions}
              onChange={(e) => setMaxPositions(parseInt(e.target.value) || 10)}
              inputProps={{ min: 1, max: 100 }}
              helperText="1-100 stocks"
            />
          </Grid>
        </Grid>

        {/* 🟡 OPTIONAL FIELDS */}
        <Accordion expanded={showAdvanced} onChange={() => setShowAdvanced(!showAdvanced)}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6" color="warning.main">
              🟡 Optional Fields & Advanced Options
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              {/* Trading Execution */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Trading Execution (Optional)
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Profit Target Value (%)"
                  type="number"
                  value={profitTargetValue || ''}
                  onChange={(e) => setProfitTargetValue(e.target.value ? parseFloat(e.target.value) : undefined)}
                  inputProps={{ min: 0.1, max: 100, step: 0.1 }}
                  helperText="Optional - Trading execution parameter"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Stop Loss Percentage (%)"
                  type="number"
                  value={stopLossPercentage || ''}
                  onChange={(e) => setStopLossPercentage(e.target.value ? parseFloat(e.target.value) : undefined)}
                  inputProps={{ min: 0.1, max: 50, step: 0.1 }}
                  helperText="Optional - Trading execution parameter"
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>

              {/* Sector Preferences */}
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Sector Preferences
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Preferred Sectors</InputLabel>
                  <Select
                    multiple
                    value={preferredSectors}
                    onChange={(e) => setPreferredSectors(e.target.value as Sector[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as Sector[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {options.sectors.map((option: any) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Excluded Sectors</InputLabel>
                  <Select
                    multiple
                    value={excludedSectors}
                    onChange={(e) => setExcludedSectors(e.target.value as Sector[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as Sector[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {options.sectors.map((option: any) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Market Filters */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Market Filters
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Market Condition</InputLabel>
                  <Select
                    value={marketCondition || ''}
                    onChange={(e) => setMarketCondition(e.target.value as MarketCondition || undefined)}
                  >
                    <MenuItem value="">Auto Detect</MenuItem>
                    {options.market_conditions.map((option: any) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Market Caps</InputLabel>
                  <Select
                    multiple
                    value={marketCaps}
                    onChange={(e) => setMarketCaps(e.target.value as MarketCap[])}
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as MarketCap[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    )}
                  >
                    {options.market_caps.map((option: any) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* RSI Range */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  RSI Range: {rsiRange[0]} - {rsiRange[1]}
                </Typography>
                <Slider
                  value={rsiRange}
                  onChange={(_, newValue) => setRsiRange(newValue as [number, number])}
                  valueLabelDisplay="auto"
                  min={0}
                  max={100}
                  step={1}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 30, label: '30' },
                    { value: 70, label: '70' },
                    { value: 100, label: '100' }
                  ]}
                />
              </Grid>

              {/* Score Filters */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Score Filters
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Min Score"
                  type="number"
                  value={minScore}
                  onChange={(e) => setMinScore(parseFloat(e.target.value) || 60)}
                  inputProps={{ min: 0, max: 100, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Max Score"
                  type="number"
                  value={maxScore || ''}
                  onChange={(e) => setMaxScore(e.target.value ? parseFloat(e.target.value) : undefined)}
                  inputProps={{ min: minScore, max: 100, step: 0.1 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Limit"
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 20)}
                  inputProps={{ min: 1, max: 100 }}
                />
              </Grid>

              {/* Sorting */}
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Sorting Options
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortBy)}
                  >
                    {options.sort_options.map((option: any) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Sort Direction</InputLabel>
                  <Select
                    value={sortDirection}
                    onChange={(e) => setSortDirection(e.target.value as SortDirection)}
                  >
                    {options.sort_directions.map((option: any) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* Submit Button */}
        <Box mt={3} display="flex" justifyContent="center">
          <Button
            variant="contained"
            size="large"
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            onClick={handleSubmit}
            disabled={loading}
            sx={{ minWidth: 200 }}
          >
            {loading ? 'Getting Recommendations...' : 'Get Recommendations'}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ModernRecommendationForm;
