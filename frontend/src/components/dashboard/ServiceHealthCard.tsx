import React from 'react';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';
import { getStatusColor, getStatusIcon } from '../../utils/statusHelpers';
import type { ServiceInfoConfig } from '../../config/serviceHealthConfig';

export interface ServiceStatusDetail {
  responseTime?: number;
}

export interface ServiceHealthCardProps {
  service: ServiceInfoConfig & { status: 'healthy' | 'unhealthy' | 'error' | 'unknown' };
  statusDetail?: ServiceStatusDetail;
  onClick?: () => void;
}

const ServiceHealthCard: React.FC<ServiceHealthCardProps> = ({
  service,
  statusDetail,
  onClick
}) => (
  <Card
    sx={{
      cursor: onClick ? 'pointer' : 'default',
      '&:hover': onClick
        ? {
            backgroundColor: 'action.hover',
            transform: 'translateY(-2px)',
            transition: 'all 0.2s ease'
          }
        : undefined
    }}
    onClick={onClick}
  >
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          {service.icon}
          <Typography variant="h6" fontWeight="bold">
            {service.displayName}
          </Typography>
        </Box>
        <Chip
          icon={getStatusIcon(service.status)}
          label={service.status}
          color={getStatusColor(service.status)}
          size="small"
        />
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        {service.description}
      </Typography>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="caption" color="text.secondary">
          Port {service.port}
        </Typography>
        {statusDetail?.responseTime != null && (
          <Typography variant="caption" color="text.secondary">
            {statusDetail.responseTime}ms
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

export default ServiceHealthCard;
