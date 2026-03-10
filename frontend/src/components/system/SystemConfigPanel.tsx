import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField
} from '@mui/material';
import { Edit, Save } from '@mui/icons-material';
import type { SystemConfig } from './types';

interface SystemConfigPanelProps {
  config: SystemConfig | null;
  editingConfig: boolean;
  onConfigChange: (config: SystemConfig) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const SystemConfigPanel: React.FC<SystemConfigPanelProps> = ({
  config,
  editingConfig,
  onConfigChange,
  onEdit,
  onSave,
  onCancel
}) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">System Configuration</Typography>
        <Box>
          {editingConfig ? (
            <>
              <Button variant="outlined" startIcon={<Save />} onClick={onSave} sx={{ mr: 1 }}>
                Save
              </Button>
              <Button variant="text" onClick={onCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="outlined" startIcon={<Edit />} onClick={onEdit}>
              Edit
            </Button>
          )}
        </Box>
      </Box>

      {config && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Redis Configuration
            </Typography>
            <TextField
              fullWidth
              label="Host"
              value={config.redis.host}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  redis: { ...config.redis, host: e.target.value }
                })
              }
              disabled={!editingConfig}
              margin="normal"
              size="small"
            />
            <TextField
              fullWidth
              label="Port"
              type="number"
              value={config.redis.port}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  redis: { ...config.redis, port: Number(e.target.value) }
                })
              }
              disabled={!editingConfig}
              margin="normal"
              size="small"
            />
            <TextField
              fullWidth
              label="Database"
              type="number"
              value={config.redis.db}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  redis: { ...config.redis, db: Number(e.target.value) }
                })
              }
              disabled={!editingConfig}
              margin="normal"
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Database Configuration
            </Typography>
            <TextField
              fullWidth
              label="Type"
              value={config.database.type}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  database: { ...config.database, type: e.target.value }
                })
              }
              disabled={!editingConfig}
              margin="normal"
              size="small"
            />
            <TextField
              fullWidth
              label="Host"
              value={config.database.host}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  database: { ...config.database, host: e.target.value }
                })
              }
              disabled={!editingConfig}
              margin="normal"
              size="small"
            />
            <TextField
              fullWidth
              label="Port"
              type="number"
              value={config.database.port}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  database: { ...config.database, port: Number(e.target.value) }
                })
              }
              disabled={!editingConfig}
              margin="normal"
              size="small"
            />
            <TextField
              fullWidth
              label="Database Name"
              value={config.database.name}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  database: { ...config.database, name: e.target.value }
                })
              }
              disabled={!editingConfig}
              margin="normal"
              size="small"
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Typography variant="subtitle1" gutterBottom>
              Trading Configuration
            </Typography>
            <TextField
              fullWidth
              label="Max Positions"
              type="number"
              value={config.trading.max_positions}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  trading: { ...config.trading, max_positions: Number(e.target.value) }
                })
              }
              disabled={!editingConfig}
              margin="normal"
              size="small"
            />
            <TextField
              fullWidth
              label="Risk Per Trade (%)"
              type="number"
              value={config.trading.risk_per_trade}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  trading: { ...config.trading, risk_per_trade: Number(e.target.value) }
                })
              }
              disabled={!editingConfig}
              margin="normal"
              size="small"
            />
            <TextField
              fullWidth
              label="Max Capital Per Trade"
              type="number"
              value={config.trading.max_capital_per_trade}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  trading: { ...config.trading, max_capital_per_trade: Number(e.target.value) }
                })
              }
              disabled={!editingConfig}
              margin="normal"
              size="small"
            />
          </Grid>
        </Grid>
      )}
    </CardContent>
  </Card>
);

export default SystemConfigPanel;
