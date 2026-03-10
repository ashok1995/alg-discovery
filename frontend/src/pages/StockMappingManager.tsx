import React, { useState } from 'react';
import { Box, Card, Tabs, Tab } from '@mui/material';
import { Dashboard, TableChart, Assessment, Settings } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import TabPanel from '../components/ui/TabPanel';
import stockMappingService, { StockMapping } from '../services/stockMappingService';
import StockMappingHeader from '../components/stockmapping/StockMappingHeader';
import StockMappingErrorAlerts from '../components/stockmapping/StockMappingErrorAlerts';
import MappingsStatsCards from '../components/stockmapping/MappingsStatsCards';
import MappingsOverviewTab from '../components/stockmapping/MappingsOverviewTab';
import MappingsTableTab, { type MappingsFilters } from '../components/stockmapping/MappingsTableTab';
import MappingsSettingsTab from '../components/stockmapping/MappingsSettingsTab';
import StockMappingDialogs from '../components/stockmapping/StockMappingDialogs';

const initialFilters: MappingsFilters = {
  sector: '',
  marketCap: '',
  instrumentType: '',
  exchange: '',
  isActive: 'all',
  isIndex: 'all',
  isPopular: 'all'
};

const StockMappingManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<MappingsFilters>(initialFilters);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<StockMapping | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  const queryClient = useQueryClient();

  const {
    data: statistics,
    isLoading: statsLoading,
    error: statsError
  } = useQuery('stockMappingStats', stockMappingService.getStatistics, {
    refetchInterval: 30000,
    staleTime: 10000
  });

  const {
    data: stockMappings = [],
    isLoading: mappingsLoading,
    error: mappingsError
  } = useQuery(
    ['stockMappings', searchQuery, filters],
    async () => {
      if (searchQuery.trim()) {
        return await stockMappingService.searchStockMappings({
          query: searchQuery,
          limit: 100,
          include_indexes: true
        });
      }
      return await stockMappingService.getPopularStocks(100);
    },
    {
      enabled: !!searchQuery.trim() || tabValue === 1,
      refetchInterval: 60000,
      staleTime: 30000
    }
  );

  const syncMutation = useMutation(stockMappingService.syncWithZerodhaFiles, {
    onSuccess: (data) => {
      setSnackbar({
        open: true,
        message: data.message || 'Sync completed successfully',
        severity: 'success'
      });
      queryClient.invalidateQueries('stockMappingStats');
      queryClient.invalidateQueries('stockMappings');
    },
    onError: (error: unknown) => {
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Sync failed',
        severity: 'error'
      });
    }
  });

  const handleSync = () => {
    syncMutation.mutate();
    setSyncDialogOpen(false);
  };

  const handleEditMapping = (mapping: StockMapping) => {
    setSelectedMapping(mapping);
    setEditDialogOpen(true);
  };

  return (
    <div style={{ padding: '24px' }}>
      <StockMappingHeader
        onSyncClick={() => setSyncDialogOpen(true)}
        onAddClick={() => {
          setSelectedMapping(null);
          setEditDialogOpen(true);
        }}
        syncDisabled={syncMutation.isLoading}
      />

      <StockMappingErrorAlerts statsError={statsError} mappingsError={mappingsError} />

      <MappingsStatsCards statistics={statistics} isLoading={statsLoading} />

      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} aria-label="stock mapping tabs">
            <Tab label="Overview" icon={<Dashboard />} iconPosition="start" />
            <Tab label="Mappings" icon={<TableChart />} iconPosition="start" />
            <Tab label="Statistics" icon={<Assessment />} iconPosition="start" />
            <Tab label="Settings" icon={<Settings />} iconPosition="start" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <MappingsOverviewTab statistics={statistics} isLoading={statsLoading} />
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <MappingsTableTab
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            mappings={stockMappings}
            isLoading={mappingsLoading}
            onEditMapping={handleEditMapping}
          />
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <MappingsOverviewTab statistics={statistics} isLoading={statsLoading} />
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <MappingsSettingsTab />
        </TabPanel>
      </Card>

      <StockMappingDialogs
        syncDialogOpen={syncDialogOpen}
        onSyncDialogClose={() => setSyncDialogOpen(false)}
        onSync={handleSync}
        syncLoading={syncMutation.isLoading}
        editDialogOpen={editDialogOpen}
        onEditDialogClose={() => {
          setEditDialogOpen(false);
          setSelectedMapping(null);
        }}
        selectedMapping={selectedMapping}
        snackbar={snackbar}
        onSnackbarClose={() => setSnackbar((p) => ({ ...p, open: false }))}
      />
    </div>
  );
};

export default StockMappingManager;
