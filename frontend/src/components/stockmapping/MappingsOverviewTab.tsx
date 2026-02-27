import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import type { StatisticsResponse } from '../../services/stockMappingService';
import { getInstrumentTypeColor, getMarketCapColor } from './helpers';

interface MappingsOverviewTabProps {
  statistics: StatisticsResponse | undefined;
  isLoading: boolean;
}

const MappingsOverviewTab: React.FC<MappingsOverviewTabProps> = ({
  statistics,
  isLoading
}) => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Instrument Type Distribution
            </Typography>
            <Box sx={{ mt: 2 }}>
              {statistics?.instrument_type_distribution &&
                Object.entries(statistics.instrument_type_distribution).map(
                  ([type, count]) => (
                    <Box
                      key={type}
                      sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                    >
                      <Typography>{type}</Typography>
                      <Chip
                        label={count}
                        color={getInstrumentTypeColor(type)}
                        size="small"
                      />
                    </Box>
                  )
                )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sector Distribution
            </Typography>
            <Box sx={{ mt: 2 }}>
              {statistics?.sector_distribution &&
                Object.entries(statistics.sector_distribution)
                  .slice(0, 5)
                  .map(([sector, count]) => (
                    <Box
                      key={sector}
                      sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                    >
                      <Typography sx={{ textTransform: 'capitalize' }}>
                        {sector.replace('_', ' ')}
                      </Typography>
                      <Chip label={count} size="small" />
                    </Box>
                  ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography color="textSecondary">
              Last sync:{' '}
              {statistics?.last_updated
                ? new Date(statistics.last_updated).toLocaleString()
                : 'Never'}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Market Cap Distribution
            </Typography>
            <Box sx={{ mt: 2 }}>
              {statistics?.market_cap_distribution &&
                Object.entries(statistics.market_cap_distribution).map(
                  ([category, count]) => (
                    <Box
                      key={category}
                      sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}
                    >
                      <Typography sx={{ textTransform: 'capitalize' }}>
                        {category.replace('_', ' ')}
                      </Typography>
                      <Chip
                        label={count}
                        color={getMarketCapColor(category)}
                        size="small"
                      />
                    </Box>
                  )
                )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              System Health
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Database Connection"
                  secondary="Connected and healthy"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Cache Status"
                  secondary="Redis cache operational"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircle color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Sync Status"
                  secondary="Last sync: 2 hours ago"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default MappingsOverviewTab;
