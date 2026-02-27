import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { DataUsage, Wifi, Speed, Storage, Security } from '@mui/icons-material';
import SimpleKiteTokenManagement from '../SimpleKiteTokenManagement';
import ChartinkAuthManager from '../ChartinkAuthManager';

const ApiSecuritySettingsTab: React.FC = () => (
  <Grid container spacing={3}>
    <Grid item xs={12} md={4}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <DataUsage sx={{ mr: 1 }} />
            <Typography variant="h6">System Status</Typography>
          </Box>
          <List dense>
            <ListItem>
              <ListItemIcon><Wifi color="success" /></ListItemIcon>
              <ListItemText primary="API Connection" secondary="Connected" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Speed color="success" /></ListItemIcon>
              <ListItemText primary="Market Status" secondary="Open" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Storage color="success" /></ListItemIcon>
              <ListItemText primary="Cache Status" secondary="Active" />
            </ListItem>
            <ListItem>
              <ListItemIcon><Security color="success" /></ListItemIcon>
              <ListItemText primary="Security" secondary="Authenticated" />
            </ListItem>
          </List>
        </CardContent>
      </Card>
    </Grid>
    <Grid item xs={12} md={8}>
      <SimpleKiteTokenManagement onTokenUpdate={() => {}} />
    </Grid>
    <Grid item xs={12} md={6}>
      <ChartinkAuthManager />
    </Grid>
  </Grid>
);

export default ApiSecuritySettingsTab;
