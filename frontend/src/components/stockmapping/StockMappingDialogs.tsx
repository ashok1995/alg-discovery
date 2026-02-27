import React from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { Sync } from '@mui/icons-material';
import type { StockMapping } from '../../services/stockMappingService';

interface StockMappingDialogsProps {
  syncDialogOpen: boolean;
  onSyncDialogClose: () => void;
  onSync: () => void;
  syncLoading: boolean;
  editDialogOpen: boolean;
  onEditDialogClose: () => void;
  selectedMapping: StockMapping | null;
  snackbar: { open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning' };
  onSnackbarClose: () => void;
}

const StockMappingDialogs: React.FC<StockMappingDialogsProps> = ({
  syncDialogOpen,
  onSyncDialogClose,
  onSync,
  syncLoading,
  editDialogOpen,
  onEditDialogClose,
  selectedMapping,
  snackbar,
  onSnackbarClose
}) => (
  <>
    <Dialog open={syncDialogOpen} onClose={onSyncDialogClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sync with Zerodha Files</DialogTitle>
      <DialogContent>
        <Typography>
          This will synchronize the database with the latest Zerodha instrument
          files. This process may take a few minutes.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onSyncDialogClose}>Cancel</Button>
        <Button
          onClick={onSync}
          variant="contained"
          disabled={syncLoading}
          startIcon={syncLoading ? <CircularProgress size={20} /> : <Sync />}
        >
          {syncLoading ? 'Syncing...' : 'Start Sync'}
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog open={editDialogOpen} onClose={onEditDialogClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {selectedMapping ? 'Edit Stock Mapping' : 'Add New Stock Mapping'}
      </DialogTitle>
      <DialogContent>
        <Typography color="textSecondary">
          {selectedMapping
            ? 'Edit the stock mapping details below.'
            : 'Add a new stock mapping to the system.'}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onEditDialogClose}>Cancel</Button>
        <Button variant="contained">{selectedMapping ? 'Update' : 'Add'}</Button>
      </DialogActions>
    </Dialog>

    <Snackbar
      open={snackbar.open}
      autoHideDuration={6000}
      onClose={onSnackbarClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={onSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
        {snackbar.message}
      </Alert>
    </Snackbar>
  </>
);

export default StockMappingDialogs;
