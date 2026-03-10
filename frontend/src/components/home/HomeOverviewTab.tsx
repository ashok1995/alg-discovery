import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ShowChart,
  Psychology,
  AccountBalance,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import type { DashboardDailySummary } from '../../types/apiModels';

interface StrategyItem {
  title: string;
  description: string;
  count: number;
  color: string;
  path: string;
  icon: React.ReactNode;
}

interface CategoryConfig {
  category: string;
  strategies: StrategyItem[];
}

const TRADING_STRATEGIES: CategoryConfig[] = [
  {
    category: 'Swing Trading',
    strategies: [
      {
        title: 'Swing Buy AI',
        description: 'AI-powered swing signals',
        count: 8,
        color: 'primary',
        path: '/swing-buy-ai',
        icon: <Psychology />,
      },
      {
        title: 'Swing Recommendations',
        description: 'Real-time swing alerts',
        count: 12,
        color: 'success',
        path: '/recommendations',
        icon: <TrendingUp />,
      },
    ],
  },
  {
    category: 'Intraday Trading',
    strategies: [
      {
        title: 'Intraday Buy',
        description: 'Morning momentum plays',
        count: 15,
        color: 'info',
        path: '/intraday-buy',
        icon: <ShowChart />,
      },
      {
        title: 'Intraday Sell',
        description: 'Exit strategies',
        count: 6,
        color: 'warning',
        path: '/intraday-sell',
        icon: <TrendingDown />,
      },
    ],
  },
  {
    category: 'Positional Trading',
    strategies: [
      {
        title: 'Long Buy',
        description: 'Long-term investments',
        count: 4,
        color: 'success',
        path: '/long-buy',
        icon: <AccountBalance />,
      },
      {
        title: 'Long Term Trading',
        description: 'Extended positions',
        count: 7,
        color: 'info',
        path: '/investing',
        icon: <TimelineIcon />,
      },
    ],
  },
];

interface HomeOverviewTabProps {
  liveSummary: DashboardDailySummary | null;
  loadingSeed: boolean;
  onStrategyClick: (path: string) => void;
}

const HomeOverviewTab: React.FC<HomeOverviewTabProps> = ({
  liveSummary,
  loadingSeed,
  onStrategyClick,
}) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Active Trading Strategies
            </Typography>
            <Grid container spacing={2}>
              {TRADING_STRATEGIES.map((category, categoryIndex) => (
                <Grid item xs={12} key={categoryIndex}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ mb: 1, fontWeight: 'bold' }}
                  >
                    {category.category}
                  </Typography>
                  <Grid container spacing={1}>
                    {category.strategies.map((strategy, strategyIndex) => (
                      <Grid item xs={12} sm={6} key={strategyIndex}>
                        <Card
                          variant="outlined"
                          sx={{
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            '&:hover': {
                              backgroundColor: 'action.hover',
                              transform: 'translateY(-1px)',
                            },
                          }}
                          onClick={() => onStrategyClick(strategy.path)}
                        >
                          <CardContent sx={{ py: 2, px: 2 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {strategy.icon}
                                <Box>
                                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    {strategy.title}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {strategy.description}
                                  </Typography>
                                </Box>
                              </Box>
                              <Chip
                                label={strategy.count}
                                color={strategy.color as 'primary' | 'success' | 'info' | 'warning'}
                                size="small"
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
              Quick Stats (Live)
            </Typography>
            {loadingSeed ? (
              <CircularProgress size={24} />
            ) : (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Open Positions</Typography>
                  <Chip
                    label={liveSummary?.positions.open ?? 0}
                    color="primary"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Closed Today</Typography>
                  <Chip
                    label={liveSummary?.positions.closed ?? 0}
                    color="info"
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Win Rate</Typography>
                  <Chip
                    label={`${liveSummary?.positions.win_rate ?? 0}%`}
                    color={
                      (liveSummary?.positions.win_rate ?? 0) >= 50 ? 'success' : 'warning'
                    }
                    size="small"
                  />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Avg Return</Typography>
                  <Chip
                    label={`${
                      (liveSummary?.positions.avg_return_pct ?? 0) > 0 ? '+' : ''
                    }${liveSummary?.positions.avg_return_pct ?? 0}%`}
                    color={
                      (liveSummary?.positions.avg_return_pct ?? 0) >= 0 ? 'success' : 'error'
                    }
                    size="small"
                  />
                </Box>
                {liveSummary?.universe && (
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Typography variant="body2">Universe Size</Typography>
                    <Chip
                      label={Object.values(liveSummary.universe).reduce((a, b) => a + b, 0)}
                      color="default"
                      size="small"
                    />
                  </Box>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default HomeOverviewTab;
