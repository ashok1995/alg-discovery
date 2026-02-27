import React from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { CandidateDetail } from '../../services/stockCandidatePopulatorService';

interface CandidateTableProps {
  candidates: CandidateDetail[];
  formatCurrency: (amount: number) => string;
}

const CandidateTable: React.FC<CandidateTableProps> = ({
  candidates,
  formatCurrency,
}) => {
  if (candidates.length === 0) return null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Generated Candidates ({candidates.length})
      </Typography>
      <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell align="right">Market Cap</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell>Exchange</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {candidates.map((candidate, index) => (
              <TableRow key={`${candidate.symbol}-${index}`} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {candidate.symbol}
                  </Typography>
                </TableCell>
                <TableCell>{candidate.name}</TableCell>
                <TableCell>{candidate.sector}</TableCell>
                <TableCell align="right">
                  {candidate.market_cap > 0
                    ? formatCurrency(candidate.market_cap * 10000000)
                    : 'N/A'}
                </TableCell>
                <TableCell align="right">
                  {candidate.current_price > 0
                    ? formatCurrency(candidate.current_price)
                    : 'N/A'}
                </TableCell>
                <TableCell>{candidate.exchange}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default CandidateTable;
