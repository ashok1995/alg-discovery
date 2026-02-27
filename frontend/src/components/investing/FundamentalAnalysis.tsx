import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { InvestmentOpportunity } from './types';

interface FundamentalAnalysisProps {
  opportunities: InvestmentOpportunity[];
}

const FundamentalAnalysis: React.FC<FundamentalAnalysisProps> = ({ opportunities }) => (
  <Box>
    <Typography variant="h6" sx={{ mb: 3 }}>
      Fundamental Analysis Dashboard
    </Typography>
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Valuation Metrics
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>P/E</TableCell>
                    <TableCell>P/B</TableCell>
                    <TableCell>ROE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {opportunities.slice(0, 8).map((opp, index) => (
                    <TableRow key={`val-${opp.symbol}-${index}`}>
                      <TableCell>{opp.symbol}</TableCell>
                      <TableCell>{opp.peRatio.toFixed(1)}</TableCell>
                      <TableCell>{opp.pbRatio.toFixed(1)}</TableCell>
                      <TableCell>{opp.roe.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Financial Health
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>Debt/Equity</TableCell>
                    <TableCell>Current Ratio</TableCell>
                    <TableCell>Rating</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {opportunities.slice(0, 8).map((opp, index) => (
                    <TableRow key={`fin-${opp.symbol}-${index}`}>
                      <TableCell>{opp.symbol}</TableCell>
                      <TableCell>{opp.debt_to_equity.toFixed(2)}</TableCell>
                      <TableCell>{opp.currentRatio.toFixed(1)}</TableCell>
                      <TableCell>
                        <Chip label={opp.analystRating} size="small" color="primary" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  </Box>
);

export default FundamentalAnalysis;
