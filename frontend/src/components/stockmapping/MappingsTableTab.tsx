import React from 'react';
import {
  Box,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Typography,
  CircularProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Search, Refresh, Edit } from '@mui/icons-material';
import type { StockMapping } from '../../services/stockMappingService';
import { getStatusColor } from '../../utils/statusHelpers';
import { getInstrumentTypeColor, getMarketCapColor } from './helpers';

export interface MappingsFilters {
  sector: string;
  marketCap: string;
  instrumentType: string;
  exchange: string;
  isActive: string;
  isIndex: string;
  isPopular: string;
}

interface MappingsTableTabProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: MappingsFilters;
  onFiltersChange: (filters: MappingsFilters) => void;
  mappings: StockMapping[];
  isLoading: boolean;
  onEditMapping: (mapping: StockMapping) => void;
}

function filterMappings(
  mappings: StockMapping[],
  filters: MappingsFilters
): StockMapping[] {
  return mappings.filter((mapping) => {
    const matchesSector = !filters.sector || mapping.sector === filters.sector;
    const matchesMarketCap =
      !filters.marketCap || mapping.market_cap_category === filters.marketCap;
    const matchesInstrumentType =
      !filters.instrumentType ||
      mapping.instrument_type === filters.instrumentType;
    const matchesExchange =
      !filters.exchange || mapping.exchange === filters.exchange;
    const matchesActive =
      filters.isActive === 'all' ||
      (filters.isActive === 'active' && mapping.is_active) ||
      (filters.isActive === 'inactive' && !mapping.is_active);
    const matchesIndex =
      filters.isIndex === 'all' ||
      (filters.isIndex === 'index' && mapping.is_index) ||
      (filters.isIndex === 'stock' && !mapping.is_index);
    const matchesPopular =
      filters.isPopular === 'all' ||
      (filters.isPopular === 'popular' && mapping.is_popular) ||
      (filters.isPopular === 'not_popular' && !mapping.is_popular);
    return (
      matchesSector &&
      matchesMarketCap &&
      matchesInstrumentType &&
      matchesExchange &&
      matchesActive &&
      matchesIndex &&
      matchesPopular
    );
  });
}

const MappingsTableTab: React.FC<MappingsTableTabProps> = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  mappings,
  isLoading,
  onEditMapping
}) => {
  const filteredMappings = filterMappings(mappings, filters);
  const handleClearFilters = () => {
    onFiltersChange({
      sector: '',
      marketCap: '',
      instrumentType: '',
      exchange: '',
      isActive: 'all',
      isIndex: 'all',
      isPopular: 'all'
    });
  };

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search symbols or company names..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Sector</InputLabel>
                <Select
                  value={filters.sector}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, sector: e.target.value })
                  }
                  label="Sector"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="banking">Banking</MenuItem>
                  <MenuItem value="it">IT</MenuItem>
                  <MenuItem value="oil_gas">Oil & Gas</MenuItem>
                  <MenuItem value="pharma">Pharma</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Market Cap</InputLabel>
                <Select
                  value={filters.marketCap}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, marketCap: e.target.value })
                  }
                  label="Market Cap"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="large_cap">Large Cap</MenuItem>
                  <MenuItem value="mid_cap">Mid Cap</MenuItem>
                  <MenuItem value="small_cap">Small Cap</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={filters.instrumentType}
                  onChange={(e) =>
                    onFiltersChange({ ...filters, instrumentType: e.target.value })
                  }
                  label="Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="EQ">Equity</MenuItem>
                  <MenuItem value="IND">Index</MenuItem>
                  <MenuItem value="FUT">Future</MenuItem>
                  <MenuItem value="OPT">Option</MenuItem>
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={handleClearFilters}
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Symbol</TableCell>
              <TableCell>Company Name</TableCell>
              <TableCell>Kite Token</TableCell>
              <TableCell>Exchange</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Sector</TableCell>
              <TableCell>Market Cap</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <CircularProgress />
                </TableCell>
              </TableRow>
            ) : filteredMappings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No mappings found
                </TableCell>
              </TableRow>
            ) : (
              filteredMappings.map((mapping) => (
                <TableRow key={mapping.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {mapping.symbol}
                      </Typography>
                      {mapping.is_popular && (
                        <Chip label="Popular" size="small" color="warning" />
                      )}
                      {mapping.is_index && (
                        <Chip label="Index" size="small" color="secondary" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>{mapping.company_name}</TableCell>
                  <TableCell>{mapping.kite_token}</TableCell>
                  <TableCell>{mapping.exchange}</TableCell>
                  <TableCell>
                    <Chip
                      label={mapping.instrument_type}
                      size="small"
                      color={getInstrumentTypeColor(mapping.instrument_type)}
                    />
                  </TableCell>
                  <TableCell>
                    {mapping.sector && (
                      <Chip
                        label={mapping.sector.replace('_', ' ')}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {mapping.market_cap_category && (
                      <Chip
                        label={mapping.market_cap_category.replace('_', ' ')}
                        size="small"
                        color={getMarketCapColor(mapping.market_cap_category)}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={mapping.is_active ? 'Active' : 'Inactive'}
                      size="small"
                      color={getStatusColor(
                        mapping.is_active ? 'active' : 'inactive'
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          onClick={() => onEditMapping(mapping)}
                        >
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default MappingsTableTab;
