import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Code as CodeIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { candidateQueryRegistryService, type QueryDetail } from '../services/CandidateQueryRegistryService';

interface SeedAlgorithmManagerProps {
  onQueryCreated?: (query: QueryDetail) => void;
}

const SeedAlgorithmManager: React.FC<SeedAlgorithmManagerProps> = ({ onQueryCreated }) => {
  // ==================== STATE ====================
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAlgorithm, setEditingAlgorithm] = useState<any | null>(null);

  // Sample seed algorithms
  const [seedAlgorithms, setSeedAlgorithms] = useState<any[]>([
    {
      name: 'Swing Momentum Breakout',
      query: 'close > sma(close, 20) and close > sma(close, 50) and volume > sma(volume, 20) * 1.5 and rsi(close, 14) > 50',
      description: 'Identifies stocks with strong momentum breaking out above moving averages with high volume',
      category: 'swing',
      type: 'momentum',
      version: 'v1.0.0',
      expected_results: 30,
      expected_success_rate: 0.7,
      weight: 0.8,
      tags: ['momentum', 'breakout', 'volume'],
      entry_time: '09:15',
      exit_time: '15:30',
      target_return: 0.05,
      stop_loss: 0.03,
      parameters: {
        rsi_period: 14,
        sma_short: 20,
        sma_long: 50,
        volume_multiplier: 1.5,
      },
      trading_parameters: {
        position_size: 0.1,
        max_positions: 5,
        holding_period: '2-5 days',
      },
    },
    {
      name: 'Intraday Volume Spike',
      query: 'volume > sma(volume, 10) * 2 and close > open and (high - low) / close > 0.02 and rsi(close, 14) < 80',
      description: 'Detects intraday stocks with unusual volume spikes and price movement',
      category: 'intraday',
      type: 'volume',
      version: 'v1.0.0',
      expected_results: 15,
      expected_success_rate: 0.65,
      weight: 0.6,
      tags: ['intraday', 'volume', 'volatility'],
      entry_time: '09:15',
      exit_time: '15:15',
      target_return: 0.03,
      stop_loss: 0.015,
      parameters: {
        volume_multiplier: 2,
        price_change_threshold: 0.02,
        rsi_max: 80,
      },
      trading_parameters: {
        position_size: 0.05,
        max_positions: 3,
        holding_period: 'same day',
      },
    },
    {
      name: 'Long Term Value Screener',
      query: 'pe < 15 and pbv < 2 and debt_to_equity < 0.5 and roe > 15 and current_ratio > 1.5',
      description: 'Screens for fundamentally strong stocks with good value metrics',
      category: 'long',
      type: 'fundamental',
      version: 'v1.0.0',
      expected_results: 50,
      expected_success_rate: 0.75,
      weight: 0.9,
      tags: ['fundamental', 'value', 'long-term'],
      entry_time: '09:15',
      exit_time: '15:30',
      target_return: 0.15,
      stop_loss: 0.08,
      parameters: {
        max_pe: 15,
        max_pbv: 2,
        max_debt_equity: 0.5,
        min_roe: 15,
        min_current_ratio: 1.5,
      },
      trading_parameters: {
        position_size: 0.15,
        max_positions: 8,
        holding_period: '3-12 months',
      },
    },
    {
      name: 'RSI Oversold Bounce',
      query: 'rsi(close, 14) < 30 and close > sma(close, 20) and volume > sma(volume, 10) and close > open',
      description: 'Identifies oversold stocks that are showing signs of recovery',
      category: 'swing',
      type: 'technical',
      version: 'v1.0.0',
      expected_results: 25,
      expected_success_rate: 0.6,
      weight: 0.5,
      tags: ['technical', 'oversold', 'bounce'],
      entry_time: '09:15',
      exit_time: '15:30',
      target_return: 0.04,
      stop_loss: 0.025,
      parameters: {
        rsi_oversold: 30,
        sma_period: 20,
        volume_period: 10,
      },
      trading_parameters: {
        position_size: 0.08,
        max_positions: 4,
        holding_period: '1-3 days',
      },
    },
  ]);

  // Form state
  const [algorithmForm, setAlgorithmForm] = useState<any>({
    name: '',
    query: '',
    description: '',
    category: 'swing',
    type: 'momentum',
    version: 'v1.0.0',
    expected_results: 50,
    expected_success_rate: 0.65,
    weight: 0.5,
    tags: [],
    entry_time: '09:15',
    exit_time: '15:30',
    target_return: 0.05,
    stop_loss: 0.03,
    parameters: {},
    trading_parameters: {},
  });

  // ==================== HANDLERS ====================

  const handleAddAlgorithm = () => {
    setEditingAlgorithm(null);
    resetForm();
    setOpenDialog(true);
  };

  const handleEditAlgorithm = (algorithm: any) => {
    setEditingAlgorithm(algorithm);
    setAlgorithmForm(algorithm);
    setOpenDialog(true);
  };

  const handleDeleteAlgorithm = (index: number) => {
    if (!window.confirm('Are you sure you want to delete this seed algorithm?')) return;
    
    const updatedAlgorithms = seedAlgorithms.filter((_, i) => i !== index);
    setSeedAlgorithms(updatedAlgorithms);
    setSuccess('Seed algorithm deleted successfully');
  };

  const handleConvertToQuery = async (algorithm: any) => {
    setLoading(true);
    try {
      const result = await candidateQueryRegistryService.storeQuery({
        query_name: algorithm.name,
        query_string: algorithm.query,
        query_type: 'custom',
        description: algorithm.description,
        tags: JSON.stringify(algorithm.tags),
        parameters: JSON.stringify(algorithm.parameters || {}),
        version: algorithm.version,
      });
      setSuccess(`Seed algorithm "${algorithm.name}" converted to query successfully!`);
      if (onQueryCreated) {
        // Fetch the created query to pass to parent
        const query = await candidateQueryRegistryService.getQuery(result.query_id);
        onQueryCreated(query);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert seed algorithm to query');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!algorithmForm.name || !algorithmForm.query) {
      setError('Name and query are required');
      return;
    }

    if (editingAlgorithm) {
      // Update existing algorithm
      const updatedAlgorithms = seedAlgorithms.map((alg, index) => 
        alg === editingAlgorithm ? { ...algorithmForm } as any : alg
      );
      setSeedAlgorithms(updatedAlgorithms);
      setSuccess('Seed algorithm updated successfully');
    } else {
      // Add new algorithm
      const newAlgorithm = { ...algorithmForm } as any;
      setSeedAlgorithms([...seedAlgorithms, newAlgorithm]);
      setSuccess('Seed algorithm added successfully');
    }

    setOpenDialog(false);
    setEditingAlgorithm(null);
    resetForm();
  };

  const resetForm = () => {
    setAlgorithmForm({
      name: '',
      query: '',
      description: '',
      category: 'swing',
      type: 'momentum',
      version: 'v1.0.0',
      expected_results: 50,
      expected_success_rate: 0.65,
      weight: 0.5,
      tags: [],
      entry_time: '09:15',
      exit_time: '15:30',
      target_return: 0.05,
      stop_loss: 0.03,
      parameters: {},
      trading_parameters: {},
    });
  };

  // ==================== RENDER HELPERS ====================

  const renderAlgorithmCard = (algorithm: any, index: number) => (
    <Card key={index} sx={{ mb: 2 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="h6" gutterBottom>
              {algorithm.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {algorithm.description}
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
              <Chip label={algorithm.category} size="small" color="primary" />
              <Chip label={algorithm.type} size="small" color="secondary" />
              <Chip label={`v${algorithm.version}`} size="small" />
              {algorithm.tags.map((tag: string, tagIndex: number) => (
                <Chip key={tagIndex} label={tag} size="small" variant="outlined" />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Expected Results: {algorithm.expected_results} | Success Rate: {(algorithm.expected_success_rate * 100).toFixed(1)}% | Weight: {algorithm.weight}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Entry: {algorithm.entry_time} | Exit: {algorithm.exit_time} | Target: {(algorithm.target_return! * 100).toFixed(1)}% | Stop Loss: {(algorithm.stop_loss! * 100).toFixed(1)}%
            </Typography>
          </Box>
          <Box display="flex" flexDirection="column" gap={1}>
            <Tooltip title="Convert to Query">
              <IconButton
                size="small"
                onClick={() => handleConvertToQuery(algorithm)}
                disabled={loading}
                color="primary"
              >
                <CodeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit Algorithm">
              <IconButton
                size="small"
                onClick={() => handleEditAlgorithm(algorithm)}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Algorithm">
              <IconButton
                size="small"
                onClick={() => handleDeleteAlgorithm(index)}
                color="error"
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  // ==================== RENDER ====================

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Seed Algorithm Manager
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddAlgorithm}
        >
          Add Seed Algorithm
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Seed Algorithms List */}
      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : seedAlgorithms.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No seed algorithms found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Start by adding your first seed algorithm
          </Typography>
        </Paper>
      ) : (
        <Box>
          {seedAlgorithms.map((algorithm, index) => renderAlgorithmCard(algorithm, index))}
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingAlgorithm ? 'Edit Seed Algorithm' : 'Add New Seed Algorithm'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Algorithm Name"
                value={algorithmForm.name}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Version"
                value={algorithmForm.version}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, version: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={algorithmForm.category}
                  onChange={(e) => setAlgorithmForm({ ...algorithmForm, category: e.target.value })}
                  label="Category"
                >
                  <MenuItem value="swing">Swing</MenuItem>
                  <MenuItem value="intraday">Intraday</MenuItem>
                  <MenuItem value="long">Long Term</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={algorithmForm.type}
                  onChange={(e) => setAlgorithmForm({ ...algorithmForm, type: e.target.value })}
                  label="Type"
                >
                  <MenuItem value="momentum">Momentum</MenuItem>
                  <MenuItem value="volume">Volume</MenuItem>
                  <MenuItem value="fundamental">Fundamental</MenuItem>
                  <MenuItem value="technical">Technical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={algorithmForm.description}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Query String"
                value={algorithmForm.query}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, query: e.target.value })}
                multiline
                rows={4}
                required
                helperText="Enter the Chartink query string"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Expected Results"
                type="number"
                value={algorithmForm.expected_results}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, expected_results: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Expected Success Rate"
                type="number"
                value={algorithmForm.expected_success_rate}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, expected_success_rate: parseFloat(e.target.value) })}
                inputProps={{ step: 0.01, min: 0, max: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Weight"
                type="number"
                value={algorithmForm.weight}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, weight: parseFloat(e.target.value) })}
                inputProps={{ step: 0.01, min: 0, max: 1 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Entry Time"
                value={algorithmForm.entry_time}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, entry_time: e.target.value })}
                placeholder="09:15"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Exit Time"
                value={algorithmForm.exit_time}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, exit_time: e.target.value })}
                placeholder="15:30"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Target Return (%)"
                type="number"
                value={algorithmForm.target_return ? algorithmForm.target_return * 100 : ''}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, target_return: parseFloat(e.target.value) / 100 })}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Stop Loss (%)"
                type="number"
                value={algorithmForm.stop_loss ? algorithmForm.stop_loss * 100 : ''}
                onChange={(e) => setAlgorithmForm({ ...algorithmForm, stop_loss: parseFloat(e.target.value) / 100 })}
                inputProps={{ step: 0.1, min: 0 }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
          >
            {editingAlgorithm ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SeedAlgorithmManager; 