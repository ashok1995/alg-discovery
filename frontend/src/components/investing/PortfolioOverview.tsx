import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Avatar,
} from '@mui/material';
import type { PortfolioAllocation } from './types';

interface PortfolioOverviewProps {
  portfolioAllocation: PortfolioAllocation[];
}

const PortfolioOverview: React.FC<PortfolioOverviewProps> = ({ portfolioAllocation }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 3 }}>
      Current Portfolio Allocation
    </Typography>
    <Grid container spacing={3}>
      {portfolioAllocation.map((allocation, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
          <Card sx={{ border: `3px solid ${allocation.color}` }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Avatar sx={{ bgcolor: allocation.color, mr: 2 }}>
                  {allocation.percentage}%
                </Avatar>
                <Box>
                  <Typography variant="h6">{allocation.category}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {allocation.description}
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: allocation.color }}>
                ₹{(allocation.percentage * 1250 / 100).toFixed(1)}K
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  </Box>
);

export default PortfolioOverview;
