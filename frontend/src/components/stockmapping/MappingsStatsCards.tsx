import React from 'react';
import { Grid } from '@mui/material';
import { Storage, CheckCircle, ShowChart, TrendingUp } from '@mui/icons-material';
import StatCard from '../ui/StatCard';
import type { StatisticsResponse } from '../../services/stockMappingService';

interface MappingsStatsCardsProps {
  statistics: StatisticsResponse | undefined;
  isLoading: boolean;
}

const MappingsStatsCards: React.FC<MappingsStatsCardsProps> = ({
  statistics,
  isLoading
}) => (
  <Grid container spacing={3} sx={{ mb: 3 }}>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard
        title="Total Mappings"
        value={isLoading ? '...' : statistics?.total_mappings ?? 0}
        icon={<Storage color="primary" sx={{ fontSize: 40 }} />}
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard
        title="Active Mappings"
        value={isLoading ? '...' : statistics?.active_mappings ?? 0}
        icon={<CheckCircle color="success" sx={{ fontSize: 40 }} />}
        color="success.main"
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard
        title="Indexes"
        value={isLoading ? '...' : statistics?.indexes_count ?? 0}
        icon={<ShowChart color="secondary" sx={{ fontSize: 40 }} />}
        color="secondary.main"
      />
    </Grid>
    <Grid item xs={12} sm={6} md={3}>
      <StatCard
        title="Popular Stocks"
        value={isLoading ? '...' : statistics?.popular_stocks_count ?? 0}
        icon={<TrendingUp color="warning" sx={{ fontSize: 40 }} />}
        color="warning.main"
      />
    </Grid>
  </Grid>
);

export default MappingsStatsCards;
