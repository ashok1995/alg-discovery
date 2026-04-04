import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import { DataUsage, Speed, Storage, Security, Wifi } from '@mui/icons-material';
import SimpleKiteTokenManagement from '../SimpleKiteTokenManagement';
import QueryExecutionAuthManager from '../QueryExecutionAuthManager';
import type { SystemStatusState } from './types';

interface SettingsApiSecurityTabProps {
  systemStatus: SystemStatusState;
  onTokenUpdate?: () => void;
}

const SettingsApiSecurityTab: React.FC<SettingsApiSecurityTabProps> = ({
  systemStatus,
  onTokenUpdate,
}) => {
  return (
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
                <ListItemIcon>
                  <Wifi color={systemStatus.apiConnected ? 'success' : 'error'} />
                </ListItemIcon>
                <ListItemText
                  primary="API Connection"
                  secondary={systemStatus.apiConnected ? 'Connected' : 'Disconnected'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Speed color={systemStatus.marketOpen ? 'success' : 'disabled'} />
                </ListItemIcon>
                <ListItemText
                  primary="Market Status"
                  secondary={systemStatus.marketOpen ? 'Open' : 'Closed'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Storage color={systemStatus.cacheActive ? 'success' : 'disabled'} />
                </ListItemIcon>
                <ListItemText
                  primary="Cache Status"
                  secondary={systemStatus.cacheActive ? 'Active' : 'Inactive'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <Security color={systemStatus.securityAuthenticated ? 'success' : 'error'} />
                </ListItemIcon>
                <ListItemText
                  primary="Security"
                  secondary={systemStatus.securityAuthenticated ? 'Authenticated' : 'Not authenticated'}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={8}>
        <SimpleKiteTokenManagement onTokenUpdate={onTokenUpdate ?? (() => {})} />
      </Grid>
      <Grid item xs={12} md={6}>
        <QueryExecutionAuthManager />
      </Grid>
    </Grid>
  );
};

export default SettingsApiSecurityTab;
