import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from '@mui/material';
import { Refresh, ExpandMore } from '@mui/icons-material';
import type { BacktestRunEntry } from './types';

interface BacktestResultsProps {
  results: BacktestRunEntry[];
  onRefresh: () => void;
}

const BacktestResults: React.FC<BacktestResultsProps> = ({ results, onRefresh }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Backtest results (Seed API)</Typography>
        <Button variant="outlined" startIcon={<Refresh />} onClick={onRefresh}>
          Clear list
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        Responses are shown as JSON from Seed <code>/api/v2/backtesting/*</code>. Legacy{' '}
        <code>/api/backtesting/*</code> is no longer used.
      </Alert>

      {results.map((entry) => (
        <Accordion key={entry.id} sx={{ mb: 1 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" pr={1}>
              <Typography variant="subtitle1" fontWeight={600}>
                {entry.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(entry.createdAt).toLocaleString()}
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              component="pre"
              sx={{
                fontSize: 12,
                overflow: 'auto',
                maxHeight: 480,
                p: 1.5,
                bgcolor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                m: 0,
              }}
            >
              {JSON.stringify(entry.data, null, 2)}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}

      {results.length === 0 && (
        <Box textAlign="center" p={3}>
          <Typography color="textSecondary">Run a backtest to see results here</Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

export default BacktestResults;
