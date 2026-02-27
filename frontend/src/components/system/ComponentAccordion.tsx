import React from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Grid
} from '@mui/material';
import { ExpandMore, PlayArrow, Stop } from '@mui/icons-material';
import { getStatusColor, getStatusIcon } from '../../utils/statusHelpers';
import type { SystemComponent } from './types';

interface ComponentAccordionProps {
  components: SystemComponent[];
  onToggle: (componentName: string, action: 'start' | 'stop') => void;
}

const ComponentAccordion: React.FC<ComponentAccordionProps> = ({
  components,
  onToggle
}) => (
  <>
    {components.map((component) => (
      <Accordion key={component.name} sx={{ mb: 1 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
            <Box display="flex" alignItems="center">
              {getStatusIcon(component.status)}
              <Typography variant="subtitle1" sx={{ ml: 1 }}>
                {component.name.replace(/_/g, ' ').toUpperCase()}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center">
              <Chip
                label={component.status.toUpperCase()}
                color={getStatusColor(component.status)}
                size="small"
                sx={{ mr: 1 }}
              />
              <Tooltip
                title={`${component.status === 'running' ? 'Stop' : 'Start'} ${component.name}`}
              >
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(
                      component.name,
                      component.status === 'running' ? 'stop' : 'start'
                    );
                  }}
                  color={component.status === 'running' ? 'error' : 'success'}
                >
                  {component.status === 'running' ? <Stop /> : <PlayArrow />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Last Start
              </Typography>
              <Typography variant="body2">
                {new Date(component.last_start).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">
                Uptime
              </Typography>
              <Typography variant="body2">{component.uptime}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Performance
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <Typography variant="caption">
                    CPU: {component.performance.cpu_usage}%
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption">
                    Memory: {component.performance.memory_usage}%
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="error">
                    Errors: {component.performance.error_count}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    ))}
  </>
);

export default ComponentAccordion;
