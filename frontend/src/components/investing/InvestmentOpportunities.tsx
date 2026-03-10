import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Analytics, ShowChart } from '@mui/icons-material';
import type { InvestmentOpportunity } from './types';

interface InvestmentOpportunitiesProps {
  opportunities: InvestmentOpportunity[];
}

const getInvestmentGrade = (score: number) => {
  if (score >= 90) return { grade: 'A+', color: 'success' as const };
  if (score >= 80) return { grade: 'A', color: 'success' as const };
  if (score >= 70) return { grade: 'B+', color: 'info' as const };
  if (score >= 60) return { grade: 'B', color: 'warning' as const };
  return { grade: 'C', color: 'error' as const };
};

const InvestmentOpportunities: React.FC<InvestmentOpportunitiesProps> = ({ opportunities }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 2 }}>
      Investment Opportunities ({opportunities.length})
    </Typography>

    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell><strong>Company</strong></TableCell>
            <TableCell><strong>Sector</strong></TableCell>
            <TableCell><strong>Investment Grade</strong></TableCell>
            <TableCell><strong>Market Cap</strong></TableCell>
            <TableCell><strong>P/E Ratio</strong></TableCell>
            <TableCell><strong>Dividend Yield</strong></TableCell>
            <TableCell><strong>Target Price</strong></TableCell>
            <TableCell><strong>Allocation</strong></TableCell>
            <TableCell><strong>Actions</strong></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {opportunities.slice(0, 15).map((opportunity, index) => {
            const grade = getInvestmentGrade(opportunity.investmentScore);
            return (
              <TableRow key={`${opportunity.symbol}-${index}`} hover>
                <TableCell>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {opportunity.symbol}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {opportunity.companyName}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip label={opportunity.sector} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <Chip label={grade.grade} color={grade.color} size="small" />
                </TableCell>
                <TableCell>₹{opportunity.marketCap.toFixed(0)}Cr</TableCell>
                <TableCell>{opportunity.peRatio.toFixed(1)}</TableCell>
                <TableCell>{opportunity.dividendYield.toFixed(2)}%</TableCell>
                <TableCell>
                  <Typography variant="body2" color="success.main">
                    ₹{opportunity.targetPrice.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>{opportunity.allocation_percentage.toFixed(1)}%</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Detailed Analysis">
                      <IconButton size="small" color="primary">
                        <Analytics />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Add to Watchlist">
                      <IconButton size="small" color="secondary">
                        <ShowChart />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  </Box>
);

export default InvestmentOpportunities;
