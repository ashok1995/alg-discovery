import React from 'react';
import { Alert } from '@mui/material';

interface StockMappingErrorAlertsProps {
  statsError: unknown;
  mappingsError: unknown;
}

const StockMappingErrorAlerts: React.FC<StockMappingErrorAlertsProps> = ({
  statsError,
  mappingsError
}) => {
  const statsMsg = statsError instanceof Error ? statsError.message : 'Unknown error';
  const mappingsMsg =
    mappingsError instanceof Error ? mappingsError.message : 'Unknown error';
  return (
    <>
      {statsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load statistics: {statsMsg}
        </Alert>
      )}
      {mappingsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load mappings: {mappingsMsg}
        </Alert>
      )}
    </>
  );
};

export default StockMappingErrorAlerts;
