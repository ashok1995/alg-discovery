/**
 * Read-only nested tree for API payloads (replaces raw JSON.stringify blocks).
 */

import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  humanizeKey,
  isPlainObject,
  truncateForDisplay,
} from '../../utils/structuredDataUtils';

const DEFAULT_MAX_DEPTH = 14;

export interface StructuredDataViewProps {
  data: unknown;
  /** Root section title (optional). */
  title?: string;
  maxDepth?: number;
  dense?: boolean;
}

function PrimitiveReadOnly({ value }: { value: string | number | boolean | null }): React.ReactElement {
  if (value === null) {
    return (
      <Typography component="span" variant="body2" color="text.secondary" fontFamily="ui-monospace, monospace">
        null
      </Typography>
    );
  }
  if (typeof value === 'boolean') {
    return <Chip size="small" label={value ? 'Yes' : 'No'} color={value ? 'success' : 'default'} variant="outlined" />;
  }
  return (
    <Typography component="span" variant="body2" fontFamily="ui-monospace, monospace" sx={{ wordBreak: 'break-word' }}>
      {typeof value === 'number' ? String(value) : truncateForDisplay(value)}
    </Typography>
  );
}

const StructuredDataViewInner: React.FC<{
  label: string;
  value: unknown;
  depth: number;
  maxDepth: number;
  dense: boolean;
}> = ({ label, value, depth, maxDepth, dense }) => {
  if (value === undefined) {
    return (
      <Stack direction="row" spacing={1} alignItems="baseline" sx={{ py: dense ? 0.25 : 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120, flexShrink: 0 }}>
          {humanizeKey(label)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      </Stack>
    );
  }

  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: dense ? 0.25 : 0.5, flexWrap: 'wrap' }}>
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 120, flexShrink: 0 }}>
          {humanizeKey(label)}
        </Typography>
        <PrimitiveReadOnly value={value as string | number | boolean | null} />
      </Stack>
    );
  }

  if (depth >= maxDepth) {
    return (
      <Typography variant="caption" color="warning.main">
        {humanizeKey(label)}: max depth — raw{' '}
        <Box component="span" sx={{ fontFamily: 'monospace' }}>
          {truncateForDisplay(JSON.stringify(value), 200)}
        </Box>
      </Typography>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
          {humanizeKey(label)}: (empty list)
        </Typography>
      );
    }
    const allPrimitive = value.every(
      (v) => v === null || ['string', 'number', 'boolean'].includes(typeof v)
    );
    if (allPrimitive) {
      return (
        <Box sx={{ py: dense ? 0.25 : 0.5 }}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            {humanizeKey(label)}
          </Typography>
          <Stack direction="row" gap={0.5} flexWrap="wrap" useFlexGap>
            {value.map((v, i) => (
              <Chip key={i} size="small" variant="outlined" label={v === null ? 'null' : String(v)} />
            ))}
          </Stack>
        </Box>
      );
    }
    return (
      <Accordion
        disableGutters
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          mb: 0.5,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
          <Typography variant="subtitle2" fontWeight={700}>
            {humanizeKey(label)}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {value.length} items
            </Typography>
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Stack divider={<Divider flexItem />} spacing={0}>
            {value.map((item, index) => (
              <StructuredDataViewInner
                key={index}
                label={`#${index + 1}`}
                value={item}
                depth={depth + 1}
                maxDepth={maxDepth}
                dense={dense}
              />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    if (entries.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 0.5 }}>
          {humanizeKey(label)}: {'{ }'}
        </Typography>
      );
    }
    return (
      <Accordion
        defaultExpanded={depth < 2}
        disableGutters
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          mb: 0.5,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
          <Typography variant="subtitle2" fontWeight={700}>
            {humanizeKey(label)}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {entries.length} fields
            </Typography>
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Stack spacing={0.25}>
            {entries.map(([k, v]) => (
              <StructuredDataViewInner
                key={k}
                label={k}
                value={v}
                depth={depth + 1}
                maxDepth={maxDepth}
                dense={dense}
              />
            ))}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Typography variant="body2" color="text.secondary">
      {humanizeKey(label)}: {String(value)}
    </Typography>
  );
};

const StructuredDataView: React.FC<StructuredDataViewProps> = ({
  data,
  title,
  maxDepth = DEFAULT_MAX_DEPTH,
  dense = true,
}) => {
  return (
    <Box
      sx={{
        maxHeight: 440,
        overflow: 'auto',
        pr: 0.5,
        bgcolor: 'action.hover',
        borderRadius: 1,
        p: 1,
      }}
    >
      {title && (
        <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          {title}
        </Typography>
      )}
      {isPlainObject(data) ? (
        <Stack spacing={0.25}>
          {Object.entries(data).map(([k, v]) => (
            <StructuredDataViewInner
              key={k}
              label={k}
              value={v}
              depth={0}
              maxDepth={maxDepth}
              dense={dense}
            />
          ))}
        </Stack>
      ) : (
        <StructuredDataViewInner label="value" value={data} depth={0} maxDepth={maxDepth} dense={dense} />
      )}
    </Box>
  );
};

export default StructuredDataView;
