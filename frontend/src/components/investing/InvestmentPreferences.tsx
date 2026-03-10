import React from 'react';
import {
  Card, CardContent, Typography, Grid,
  FormControl, InputLabel, Select, MenuItem, Slider, Switch, FormControlLabel,
} from '@mui/material';
import { FilterList } from '@mui/icons-material';

interface InvestmentPreferencesProps {
  investmentHorizon: string;
  riskTolerance: string;
  minMarketCap: number;
  autoRebalance: boolean;
  onHorizonChange: (value: string) => void;
  onRiskChange: (value: string) => void;
  onMarketCapChange: (value: number) => void;
  onAutoRebalanceChange: (value: boolean) => void;
}

const InvestmentPreferences: React.FC<InvestmentPreferencesProps> = ({
  investmentHorizon, riskTolerance, minMarketCap, autoRebalance,
  onHorizonChange, onRiskChange, onMarketCapChange, onAutoRebalanceChange,
}) => (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <FilterList /> Investment Preferences
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Investment Horizon</InputLabel>
            <Select value={investmentHorizon} label="Investment Horizon" onChange={(e) => onHorizonChange(e.target.value)}>
              <MenuItem value="short">Short Term (1-2 years)</MenuItem>
              <MenuItem value="medium">Medium Term (3-5 years)</MenuItem>
              <MenuItem value="long">Long Term (5+ years)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={3}>
          <FormControl fullWidth>
            <InputLabel>Risk Tolerance</InputLabel>
            <Select value={riskTolerance} label="Risk Tolerance" onChange={(e) => onRiskChange(e.target.value)}>
              <MenuItem value="conservative">Conservative</MenuItem>
              <MenuItem value="moderate">Moderate</MenuItem>
              <MenuItem value="aggressive">Aggressive</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <Typography gutterBottom>Minimum Market Cap (₹Cr)</Typography>
          <Slider
            value={minMarketCap}
            onChange={(_, value) => onMarketCapChange(value as number)}
            min={100} max={10000} step={100}
            valueLabelDisplay="auto"
            marks={[
              { value: 100, label: '₹100Cr' },
              { value: 5000, label: '₹5000Cr' },
              { value: 10000, label: '₹10000Cr' },
            ]}
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <FormControlLabel
            control={<Switch checked={autoRebalance} onChange={(e) => onAutoRebalanceChange(e.target.checked)} />}
            label="Auto Rebalance"
          />
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

export default InvestmentPreferences;
