/**
 * Nested MUI form for Record<string, unknown> settings (Seed trading / system).
 * Renders only the fields passed as `value` — callers control which section to show.
 * Falls back to a JSON snippet for branches that are too dynamic.
 */

import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  Grid,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { PathSegment, StructuredPatchHandler } from '../../types/structuredData';
import {
  humanizeKey,
  isPlainObject,
  isScoreTierTuples,
  isFlatNumberRecord,
  setPathImmutable,
} from '../../utils/structuredDataUtils';

const MAX_FORM_DEPTH = 12;

export interface EditableStructuredSettingsProps {
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  expandAll?: boolean;
}

function usePatchHandler(
  root: Record<string, unknown>,
  onChange: (next: Record<string, unknown>) => void
): StructuredPatchHandler {
  return useCallback(
    (path: PathSegment[], newValue: unknown) => {
      const next = setPathImmutable(root, path, newValue) as Record<string, unknown>;
      onChange(next);
    },
    [root, onChange]
  );
}

const NumberMapEditor: React.FC<{
  label: string;
  map: Record<string, number>;
  path: PathSegment[];
  onPatch: StructuredPatchHandler;
}> = ({ label, map, path, onPatch }) => {
  const keys = useMemo(() => Object.keys(map).sort((a, b) => a.localeCompare(b)), [map]);
  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {humanizeKey(label)}
      </Typography>
      <Grid container spacing={1}>
        {keys.map((k) => (
          <Grid item xs={12} sm={6} md={4} key={k}>
            <TextField
              size="small"
              fullWidth
              label={humanizeKey(k)}
              type="number"
              inputProps={{ step: 'any' }}
              value={Number.isFinite(map[k]) ? map[k] : ''}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                onPatch([...path, k], Number.isFinite(n) ? n : 0);
              }}
            />
          </Grid>
        ))}
      </Grid>
    </Paper>
  );
};

const ScoreTiersEditor: React.FC<{
  path: PathSegment[];
  rows: [number, number][];
  onPatch: StructuredPatchHandler;
}> = ({ path, rows, onPatch }) => {
  const updateRow = (index: number, col: 0 | 1, num: number): void => {
    const next = rows.map((r, i) => (i === index ? (col === 0 ? [num, r[1]] : [r[0], num]) : r)) as [number, number][];
    onPatch(path, next);
  };
  const addRow = (): void => {
    const last = rows.length > 0 ? rows[rows.length - 1] : [0, 0];
    onPatch(path, [...rows, [last[0], last[1]]]);
  };
  const removeRow = (index: number): void => {
    onPatch(
      path,
      rows.filter((_, i) => i !== index)
    );
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Score tiers (min score → capital ₹)
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={addRow}>
          Add tier
        </Button>
      </Stack>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Min score</TableCell>
            <TableCell>Capital (₹)</TableCell>
            <TableCell width={56} />
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3}>
                <Typography variant="body2" color="text.secondary">
                  No tiers — add one or use JSON mode for bulk edit.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: 'any' }}
                    value={row[0]}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      updateRow(i, 0, Number.isFinite(n) ? n : 0);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    size="small"
                    type="number"
                    inputProps={{ step: 'any' }}
                    value={row[1]}
                    onChange={(e) => {
                      const n = parseFloat(e.target.value);
                      updateRow(i, 1, Number.isFinite(n) ? n : 0);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" aria-label="Remove tier" onClick={() => removeRow(i)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Paper>
  );
};

const FallbackJsonBranch: React.FC<{
  label: string;
  value: unknown;
  path: PathSegment[];
  onPatch: StructuredPatchHandler;
}> = ({ label, value, path, onPatch }) => {
  const [text, setText] = React.useState(() => JSON.stringify(value, null, 2));
  React.useEffect(() => {
    setText(JSON.stringify(value, null, 2));
  }, [value]);
  return (
    <Accordion defaultExpanded={false} disableGutters elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1, '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" fontWeight={700}>
          {humanizeKey(label)} <Typography component="span" variant="caption" color="text.secondary">(JSON)</Typography>
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <TextField
          fullWidth
          multiline
          minRows={4}
          maxRows={16}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => {
            try {
              const parsed: unknown = JSON.parse(text);
              onPatch(path, parsed);
            } catch {
              /* keep text; user can fix */
            }
          }}
          InputProps={{ sx: { fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' } }}
        />
      </AccordionDetails>
    </Accordion>
  );
};

const FieldEditor: React.FC<{
  fieldKey: string;
  value: unknown;
  path: PathSegment[];
  depth: number;
  onPatch: StructuredPatchHandler;
  expandAll: boolean;
}> = ({ fieldKey, value, path, depth, onPatch, expandAll }) => {
  if (value === undefined) {
    return null;
  }

  if (depth >= MAX_FORM_DEPTH) {
    return <FallbackJsonBranch label={fieldKey} value={value} path={path} onPatch={onPatch} />;
  }

  if (value === null) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
        <Typography variant="caption" sx={{ minWidth: 160 }}>
          {humanizeKey(fieldKey)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          null
        </Typography>
      </Stack>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <FormControlLabel
        control={
          <Switch checked={value} onChange={(_, c) => onPatch(path, c)} size="small" />
        }
        label={humanizeKey(fieldKey)}
        sx={{ display: 'flex', ml: 0, mb: 0.5 }}
      />
    );
  }

  if (typeof value === 'number') {
    return (
      <TextField
        size="small"
        fullWidth
        sx={{ mb: 1 }}
        label={humanizeKey(fieldKey)}
        type="number"
        inputProps={{ step: 'any' }}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          onPatch(path, Number.isFinite(n) ? n : 0);
        }}
      />
    );
  }

  if (typeof value === 'string') {
    return (
      <TextField
        size="small"
        fullWidth
        sx={{ mb: 1 }}
        label={humanizeKey(fieldKey)}
        value={value}
        onChange={(e) => onPatch(path, e.target.value)}
      />
    );
  }

  if (fieldKey === 'score_tiers' && (isScoreTierTuples(value) || (Array.isArray(value) && value.length === 0))) {
    const rows = (value as [number, number][]) ?? [];
    return <ScoreTiersEditor path={path} rows={rows} onPatch={onPatch} />;
  }

  if (isFlatNumberRecord(value)) {
    return <NumberMapEditor label={fieldKey} map={value} path={path} onPatch={onPatch} />;
  }

  if (Array.isArray(value)) {
    const complex = value.some((v) => v !== null && typeof v === 'object');
    if (!complex && value.every((v) => typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')) {
      return (
        <TextField
          size="small"
          fullWidth
          sx={{ mb: 1 }}
          label={humanizeKey(fieldKey)}
          helperText="Comma-separated values"
          value={value.map((v) => String(v)).join(', ')}
          onChange={(e) => {
            const raw = e.target.value.trim();
            if (raw === '') {
              onPatch(path, []);
              return;
            }
            const parts = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
            const parsed: unknown[] = parts.map((p) => {
              if (p === 'true') return true;
              if (p === 'false') return false;
              const n = Number(p);
              if (Number.isFinite(n)) return n;
              return p;
            });
            onPatch(path, parsed);
          }}
        />
      );
    }
    return <FallbackJsonBranch label={fieldKey} value={value} path={path} onPatch={onPatch} />;
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    const capitalNested =
      fieldKey === 'capital' &&
      entries.some(([k]) => k === 'score_tiers') &&
      entries.some(([k]) => k === 'capital_per_stock');

    return (
      <Accordion
        defaultExpanded={expandAll || depth < 2}
        disableGutters
        elevation={0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          mb: 1,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2" fontWeight={700}>
            {humanizeKey(fieldKey)}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              {entries.length} fields
            </Typography>
          </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          {capitalNested ? (
            <>
              {entries.map(([k, v]) =>
                k === 'score_tiers' ? (
                  <FieldEditor key={k} fieldKey={k} value={v} path={[...path, k]} depth={depth + 1} onPatch={onPatch} expandAll={expandAll} />
                ) : null
              )}
              <Grid container spacing={1} sx={{ mb: 1 }}>
                {entries.map(([k, v]) =>
                  k !== 'score_tiers' ? (
                    <Grid item xs={12} sm={6} key={k}>
                      <FieldEditor fieldKey={k} value={v} path={[...path, k]} depth={depth + 1} onPatch={onPatch} expandAll={expandAll} />
                    </Grid>
                  ) : null
                )}
              </Grid>
            </>
          ) : (
            entries.map(([k, v]) => (
              <FieldEditor key={k} fieldKey={k} value={v} path={[...path, k]} depth={depth + 1} onPatch={onPatch} expandAll={expandAll} />
            ))
          )}
        </AccordionDetails>
      </Accordion>
    );
  }

  return <FallbackJsonBranch label={fieldKey} value={value} path={path} onPatch={onPatch} />;
};

const EditableStructuredSettings: React.FC<EditableStructuredSettingsProps> = ({
  value,
  onChange,
  expandAll = true,
}) => {
  const onPatch = usePatchHandler(value, onChange);
  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));

  return (
    <Box>
      <Stack spacing={0}>
        {entries.map(([k, v]) => (
          <FieldEditor key={k} fieldKey={k} value={v} path={[k]} depth={0} onPatch={onPatch} expandAll={expandAll} />
        ))}
      </Stack>
    </Box>
  );
};

export default EditableStructuredSettings;
