import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  FormControlLabel,
  Switch
} from '@mui/material';

const MappingsSettingsTab: React.FC = () => {
  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sync Configuration
            </Typography>
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Auto-sync with Zerodha files"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Background sync enabled"
              />
              <FormControlLabel
                control={<Switch />}
                label="Audit trail enabled"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cache Configuration
            </Typography>
            <Box sx={{ mt: 2 }}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="In-memory cache enabled"
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Redis cache enabled"
              />
              <FormControlLabel
                control={<Switch />}
                label="Persistent cache"
              />
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default MappingsSettingsTab;
