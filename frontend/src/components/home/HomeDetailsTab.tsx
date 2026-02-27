import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { Speed, Storage, Wifi, Memory } from '@mui/icons-material';
import StatCard from '../ui/StatCard';
import { getStatusColor } from '../../utils/statusHelpers';

interface RecentActivity {
  time: string;
  action: string;
  stock: string;
  price: string;
  status: string;
}

interface SystemMetric {
  name: string;
  value: string;
  status: string;
  icon: React.ReactNode;
}

const SYSTEM_METRICS: SystemMetric[] = [
  { name: 'API Response Time', value: '45ms', status: 'good', icon: <Speed /> },
  { name: 'Database Health', value: '99.9%', status: 'good', icon: <Storage /> },
  { name: 'Network Latency', value: '12ms', status: 'good', icon: <Wifi /> },
  { name: 'Memory Usage', value: '67%', status: 'warning', icon: <Memory /> },
];

interface HomeDetailsTabProps {
  recentActivities: RecentActivity[];
}

const HomeDetailsTab: React.FC<HomeDetailsTabProps> = ({ recentActivities }) => {
  return (
    <>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Recent Trading Activities
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {recentActivities.map((activity, index) => (
                  <TableRow key={index}>
                    <TableCell>{activity.time}</TableCell>
                    <TableCell>{activity.action}</TableCell>
                    <TableCell>{activity.stock}</TableCell>
                    <TableCell>{activity.price}</TableCell>
                    <TableCell>
                      <Chip
                        label={activity.status}
                        color={
                          activity.status === 'closed'
                            ? 'success'
                            : activity.status === 'open'
                              ? 'info'
                              : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
        System Health
      </Typography>
      <Grid container spacing={3}>
        {SYSTEM_METRICS.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard
              title={metric.name}
              value={metric.value}
              icon={metric.icon}
              color={`${getStatusColor(metric.status)}.main`}
            />
          </Grid>
        ))}
      </Grid>
    </>
  );
};

export default HomeDetailsTab;
