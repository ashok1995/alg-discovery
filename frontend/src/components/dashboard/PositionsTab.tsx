import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import type { TrackedPositionItem } from '../../types/apiModels';
import { TRADE_TYPE_LABELS, returnColor } from './types';

interface PositionsTabProps {
  positions: TrackedPositionItem[];
}

const PositionsTab: React.FC<PositionsTabProps> = ({ positions }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Tracked Positions ({positions.length})</Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 500 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Symbol</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Entry</TableCell>
                <TableCell align="right">SL</TableCell>
                <TableCell align="right">T1</TableCell>
                <TableCell align="right">T2</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Return</TableCell>
                <TableCell>ARM</TableCell>
                <TableCell>Opened</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{p.symbol}</TableCell>
                  <TableCell>
                    <Chip
                      label={TRADE_TYPE_LABELS[p.trade_type] || p.trade_type}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{p.entry_price?.toFixed(2)}</TableCell>
                  <TableCell align="right">{p.stop_loss?.toFixed(2) ?? '-'}</TableCell>
                  <TableCell align="right">{p.target_1?.toFixed(2) ?? '-'}</TableCell>
                  <TableCell align="right">{p.target_2?.toFixed(2) ?? '-'}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.status}
                      size="small"
                      color={
                        p.status === 'open' ? 'info' :
                        p.return_pct != null && p.return_pct > 0 ? 'success' : 'error'
                      }
                    />
                  </TableCell>
                  <TableCell align="right">
                    {p.return_pct !== null ? (
                      <Typography variant="body2" color={returnColor(p.return_pct)}>
                        {p.return_pct > 0 ? '+' : ''}{p.return_pct.toFixed(2)}%
                      </Typography>
                    ) : '-'}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11 }}>{p.source_arm || '-'}</TableCell>
                  <TableCell sx={{ fontSize: 11 }}>
                    {p.opened_at
                      ? new Date(p.opened_at).toLocaleString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {positions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} align="center">
                    No positions in this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default PositionsTab;
