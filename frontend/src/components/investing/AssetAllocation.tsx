import React from 'react';
import {
  Box,
  Alert,
  Card,
  CardContent,
  Divider,
  Grid,
  LinearProgress,
  Typography,
} from '@mui/material';
import type { PortfolioAllocation } from './types';

interface AssetAllocationProps {
  portfolioAllocation: PortfolioAllocation[];
}

const AssetAllocation: React.FC<AssetAllocationProps> = ({ portfolioAllocation }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 3 }}>
      Strategic Asset Allocation
    </Typography>
    <Alert severity="info" sx={{ mb: 3 }}>
      <Typography variant="body2">
        <strong>Recommended Allocation:</strong> Based on your moderate risk profile and 3-5 year
        investment horizon.
        <br />
        <strong>Next Rebalancing:</strong> March 2025 or when any category deviates by &gt;5% from
        target.
      </Typography>
    </Alert>

    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Current vs Target Allocation
            </Typography>
            {portfolioAllocation.map((allocation, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{allocation.category}</Typography>
                  <Typography variant="body2">{allocation.percentage}%</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={allocation.percentage}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: allocation.color,
                    },
                  }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Diversification Metrics
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Portfolio Beta
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                1.15
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Sharpe Ratio
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                1.8
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Correlation to Index
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                0.85
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="success.main">
              ✓ Well diversified across sectors and market caps
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

export default AssetAllocation;
