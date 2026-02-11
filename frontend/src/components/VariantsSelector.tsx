import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  Alert,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  Card,
  CardContent,
  Grid,
  InputLabel,
  Select,
  MenuItem,
  Snackbar
} from '@mui/material';
import {
  Science,
  ExpandMore,
  CheckCircle,
  Refresh
} from '@mui/icons-material';

interface Variant {
  version: string;
  name: string;
  description: string;
  weight: number;
  expected_results?: string;
}

interface Category {
  category_name: string;
  category_description?: string;
  variants: Variant[];
  total_variants: number;
}

interface VariantsData {
  status: string;
  categories: Record<string, Category>;
  total_categories: number;
  timestamp: string;
}

interface VariantsSelectorProps {
  strategyType: string;
  onVariantsChange: (selectedVariants: Record<string, string>) => void;
  disabled?: boolean;
  isDataLoading?: boolean; // Separate prop for data loading - doesn't disable variants
}

const VariantsSelector: React.FC<VariantsSelectorProps> = ({
  strategyType,
  onVariantsChange,
  disabled = false,
  isDataLoading = false
}) => {
  const [open, setOpen] = useState(false);
  const [variantsData, setVariantsData] = useState<VariantsData | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundRefresh, setBackgroundRefresh] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Fetch variants from API with non-blocking approach
  const fetchVariants = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      
      const response = await fetch(`/api/strategy/variants?strategy_type=${strategyType}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch variants: ${response.statusText}`);
      }
      
      const data: VariantsData = await response.json();
      setVariantsData(data);
      
      // Set default variants only if not already set
      if (Object.keys(selectedVariants).length === 0) {
        const defaultVariants: Record<string, string> = {};
        Object.keys(data.categories).forEach(categoryKey => {
          const category = data.categories[categoryKey];
          if (category.variants.length > 0) {
            defaultVariants[categoryKey] = category.variants[0].version;
          }
        });
        setSelectedVariants(defaultVariants);
        onVariantsChange(defaultVariants);
      }
      
    } catch (err: any) {
      console.error('Error fetching variants:', err);
      setError(err.message);
      
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [strategyType, selectedVariants, onVariantsChange]);

  // Background refresh function
  const backgroundRefreshVariants = useCallback(async () => {
    setBackgroundRefresh(true);
    try {
      await fetchVariants(false);
      setSnackbarMessage('Variants refreshed successfully');
      setSnackbarOpen(true);
    } finally {
      setBackgroundRefresh(false);
    }
  }, [fetchVariants]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  const handleVariantChange = (categoryKey: string, variantVersion: string) => {
    const newSelectedVariants = {
      ...selectedVariants,
      [categoryKey]: variantVersion
    };
    setSelectedVariants(newSelectedVariants);
  };

  const handleApply = () => {
    onVariantsChange(selectedVariants);
    setOpen(false);
    // Show success message
    setSnackbarMessage('Variants applied successfully');
    setSnackbarOpen(true);
  };

  const handleReset = () => {
    if (variantsData) {
      const defaultVariants: Record<string, string> = {};
      Object.keys(variantsData.categories).forEach(categoryKey => {
        const category = variantsData.categories[categoryKey];
        if (category.variants.length > 0) {
          defaultVariants[categoryKey] = category.variants[0].version;
        }
      });
      setSelectedVariants(defaultVariants);
    }
  };

  const getStrategyDisplayName = (strategyType: string) => {
    const strategyNames: Record<string, string> = {
      'swing-buy': 'Swing Buy',
      'swing-buy-ai': 'Swing Buy AI',
      'intraday-buy': 'Intraday Buy',
      'intraday-sell': 'Intraday Sell',
      'short-buy': 'Short Buy',
      'long-buy': 'Long Buy',
      'long-term': 'Long Term Trading'
    };
    return strategyNames[strategyType] || strategyType.replace('-', ' ').toUpperCase();
  };

  return (
    <>
      {/* Variants Button */}
      <Button
        variant="outlined"
        startIcon={<Science />}
        onClick={() => setOpen(true)}
        disabled={disabled || false} // Never disable during API calls
        sx={{ minWidth: '120px' }}
      >
        Variants
        {Object.keys(selectedVariants).length > 0 && (
          <Chip
            label={Object.keys(selectedVariants).length}
            size="small"
            color="primary"
            sx={{ ml: 1, height: '20px' }}
          />
        )}
      </Button>

      {/* Variants Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Science />
              <Typography variant="h6">
                Algorithm Variants - {getStrategyDisplayName(strategyType)}
              </Typography>
            </Box>
            <Button
              size="small"
              startIcon={<Refresh />}
              onClick={backgroundRefreshVariants}
              disabled={backgroundRefresh}
              variant="outlined"
            >
              {backgroundRefresh ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {loading && (
            <Box sx={{ width: '100%', mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                Loading algorithm variants...
              </Typography>
            </Box>
          )}

          {error && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>API Unavailable:</strong> The system will work normally with default configurations.
              </Typography>
            </Alert>
          )}

          {variantsData && !loading && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Select different algorithm variants for each category to customize your {getStrategyDisplayName(strategyType)} strategy. 
                  Each variant represents a different approach to analyzing the market.
                  {error && ' Currently using fallback variants due to API unavailability.'}
                </Typography>
              </Alert>

              <Grid container spacing={2}>
                {Object.entries(variantsData.categories).map(([categoryKey, category]) => (
                  <Grid item xs={12} key={categoryKey}>
                    <Accordion defaultExpanded>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                          <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            {category.category_name}
                          </Typography>
                          <Chip
                            label={`${category.total_variants} variants`}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      </AccordionSummary>
                      
                      <AccordionDetails>
                        <Box sx={{ mb: 2 }}>
                          {category.category_description && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {category.category_description}
                            </Typography>
                          )}
                          
                          <FormControl fullWidth>
                            <InputLabel>Select Variant</InputLabel>
                            <Select
                              value={selectedVariants[categoryKey] || ''}
                              onChange={(e) => handleVariantChange(categoryKey, e.target.value)}
                              label="Select Variant"
                            >
                              {category.variants.map((variant) => (
                                <MenuItem key={variant.version} value={variant.version}>
                                  <Box sx={{ width: '100%' }}>
                                    <Typography variant="body1" fontWeight="bold">
                                      {variant.name} ({variant.version})
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {variant.description}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                      <Chip
                                        label={`Weight: ${variant.weight}`}
                                        size="small"
                                        variant="outlined"
                                      />
                                      {variant.expected_results && (
                                        <Chip
                                          label={`Expected: ${variant.expected_results}`}
                                          size="small"
                                          variant="outlined"
                                        />
                                      )}
                                    </Box>
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  </Grid>
                ))}
              </Grid>

              {/* Current Selection Summary */}
              <Card sx={{ mt: 2, bgcolor: 'background.paper' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Current Selection
                  </Typography>
                  <Grid container spacing={1}>
                    {Object.entries(selectedVariants).map(([categoryKey, variantVersion]) => {
                      const category = variantsData.categories[categoryKey];
                      const variant = category?.variants.find(v => v.version === variantVersion);
                      return (
                        <Grid item xs={12} sm={6} key={categoryKey}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircle color="success" fontSize="small" />
                            <Typography variant="body2">
                              <strong>{category?.category_name}:</strong> {variant?.name}
                            </Typography>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleReset} disabled={loading}>
            Reset to Defaults
          </Button>
          <Button onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            variant="contained"
            disabled={loading || Object.keys(selectedVariants).length === 0}
            startIcon={<CheckCircle />}
          >
            Apply Variants
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </>
  );
};

export default VariantsSelector; 