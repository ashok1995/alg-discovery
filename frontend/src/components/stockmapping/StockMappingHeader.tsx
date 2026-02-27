import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Sync, Add, Storage } from '@mui/icons-material';

interface StockMappingHeaderProps {
  onSyncClick: () => void;
  onAddClick: () => void;
  syncDisabled: boolean;
}

const StockMappingHeader: React.FC<StockMappingHeaderProps> = ({
  onSyncClick,
  onAddClick,
  syncDisabled
}) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 3
    }}
  >
    <Typography
      variant="h4"
      component="h1"
      sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
    >
      <Storage />
      Stock Mapping Manager
    </Typography>
    <Box sx={{ display: 'flex', gap: 2 }}>
      <Button
        variant="outlined"
        startIcon={<Sync />}
        onClick={onSyncClick}
        disabled={syncDisabled}
      >
        Sync Data
      </Button>
      <Button variant="contained" startIcon={<Add />} onClick={onAddClick}>
        Add Mapping
      </Button>
    </Box>
  </Box>
);

export default StockMappingHeader;
