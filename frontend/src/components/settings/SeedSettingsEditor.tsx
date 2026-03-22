/**
 * Seed settings editor — section-panel navigation.
 * Left: list of top-level config groups.  Right: form for the selected group only.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  Divider,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Refresh,
  Save,
  FormatAlignLeft,
  ViewList,
  DataObject,
  EditNote,
  CheckCircleOutline,
} from '@mui/icons-material';
import { seedDashboardService } from '../../services/SeedDashboardService';
import type { TradingSettingsResponse } from '../../types/apiModels';
import EditableStructuredSettings from './EditableStructuredSettings';
import StructuredDataView from '../ui/StructuredDataView';
import { humanizeKey } from '../../utils/structuredDataUtils';

export type SeedSettingsEditorVariant = 'trading' | 'system';

interface SeedSettingsEditorProps {
  variant: SeedSettingsEditorVariant;
}

type EditSurface = 'form' | 'json';

function asRecord(data: unknown): Record<string, unknown> {
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return {};
}

function sortedKeys(data: Record<string, unknown>): string[] {
  return Object.keys(data).sort((a, b) => a.localeCompare(b));
}

/** One-line description for well-known Seed config sections. */
const SECTION_HINTS: Record<string, string> = {
  capital: 'Per-stock budget, score-tier allocations, fallback fraction.',
  charges: 'Brokerage, STT, GST, stamp duty, exchange fees.',
  opener: 'Entry rules: sector limits, slippage, cooldown, VIX gates.',
  tracker: 'Position tracking and stop/target watcher parameters.',
  learning: 'Thompson-sampling hyperparameters and learning-block toggles.',
  observability: 'Internal metrics, log verbosity, health-check cadence.',
  alerts: 'Threshold values that trigger system alerts.',
  api: 'Rate limits and timeout budgets per external API.',
};

const SeedSettingsEditor: React.FC<SeedSettingsEditorProps> = ({ variant }) => {
  const theme = useTheme();

  const [configText, setConfigText] = useState('');
  const [configData, setConfigData] = useState<Record<string, unknown>>({});
  const [schemaPayload, setSchemaPayload] = useState<unknown>(null);
  const [formLayoutPayload, setFormLayoutPayload] = useState<unknown>(null);
  const [surface, setSurface] = useState<EditSurface>('form');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState<{ severity: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setBanner(null);
    try {
      if (variant === 'trading') {
        const [data, schema] = await Promise.all([
          seedDashboardService.getTradingSettings(),
          seedDashboardService.getTradingSettingsSchema(),
        ]);
        const rec = asRecord(data);
        setConfigData(rec);
        setConfigText(JSON.stringify(data, null, 2));
        setSchemaPayload(schema);
        setFormLayoutPayload(null);
        const tradingKeys = sortedKeys(rec).filter((k) => k !== 'charges');
        setSelectedSection((prev) => {
          const keys = tradingKeys.length > 0 ? tradingKeys : sortedKeys(rec);
          if (prev && keys.includes(prev)) return prev;
          return keys[0] ?? null;
        });
      } else {
        const [data, schema, form] = await Promise.all([
          seedDashboardService.getSystemSettings(),
          seedDashboardService.getSystemSettingsSchema(),
          seedDashboardService.getSystemForm(),
        ]);
        const rec = asRecord(data);
        setConfigData(rec);
        setConfigText(JSON.stringify(data, null, 2));
        setSchemaPayload(schema);
        setFormLayoutPayload(form);
        setSelectedSection((prev) => prev ?? sortedKeys(rec)[0] ?? null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load settings';
      setBanner({ severity: 'error', text: msg });
    } finally {
      setLoading(false);
    }
  }, [variant]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleSurfaceChange = (_: React.MouseEvent<HTMLElement>, next: EditSurface | null): void => {
    if (next === null) return;
    if (next === 'json' && surface === 'form') {
      setConfigText(JSON.stringify(configData, null, 2));
    }
    if (next === 'form' && surface === 'json') {
      try {
        setConfigData(asRecord(JSON.parse(configText)));
        setBanner(null);
      } catch {
        setBanner({ severity: 'error', text: 'Invalid JSON — fix before switching to Form view.' });
        return;
      }
    }
    setSurface(next);
  };

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    setBanner(null);
    try {
      const payload = surface === 'json' ? asRecord(JSON.parse(configText)) : configData;
      if (variant === 'trading') {
        await seedDashboardService.updateTradingSettings(payload as Partial<TradingSettingsResponse>);
      } else {
        await seedDashboardService.updateSystemSettings(payload);
      }
      setBanner({ severity: 'success', text: 'Saved to Seed service.' });
      await loadAll();
    } catch (e: unknown) {
      setBanner({ severity: 'error', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  /** Patch a single section's value back into the full configData. */
  const patchSection = useCallback(
    (sectionKey: string, nextSection: Record<string, unknown>) => {
      setConfigData((prev) => ({ ...prev, [sectionKey]: nextSection }));
    },
    [],
  );

  const sections = useMemo(() => {
    const keys = sortedKeys(configData);
    if (variant === 'trading') return keys.filter((k) => k !== 'charges');
    return keys;
  }, [configData, variant]);

  const variantMeta = variant === 'trading'
    ? {
        title: 'Seed trading rules',
        subtitle: 'Capital, opener, learning — PUT /api/v2/settings/trading (charges: Observability → Trading economics)',
        color: '#1565c0',
      }
    : {
        title: 'Seed platform limits',
        subtitle: 'API limits, observability, alerts — PUT /api/v2/settings/system',
        color: '#00695c',
      };

  return (
    <Box sx={{ py: 0.5 }}>
      {/* ── Page header ── */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 2.5,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: alpha(variantMeta.color, 0.18),
          background: `linear-gradient(135deg,
            ${alpha(variantMeta.color, 0.07)} 0%,
            ${alpha(variantMeta.color, 0.02)} 60%,
            ${alpha(theme.palette.background.paper, 1)} 100%)`,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'flex-start' }}>
          <Box>
            <Typography
              variant="overline"
              fontWeight={800}
              letterSpacing={0.08}
              sx={{ color: variantMeta.color }}
            >
              Seed · advanced
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ letterSpacing: '-0.02em', mt: 0.25 }}>
              {variantMeta.title}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {variantMeta.subtitle}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0, alignItems: 'flex-start' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={loading ? <CircularProgress size={14} /> : <Refresh />}
              onClick={() => void loadAll()}
              disabled={loading}
            >
              Reload
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <Save />}
              onClick={() => void handleSave()}
              disabled={saving || loading}
              color="primary"
            >
              {saving ? 'Saving…' : 'Save all'}
            </Button>
            <ToggleButtonGroup size="small" value={surface} exclusive onChange={handleSurfaceChange}>
              <ToggleButton value="form">
                <ViewList sx={{ mr: 0.5, fontSize: 16 }} />
                Form
              </ToggleButton>
              <ToggleButton value="json">
                <DataObject sx={{ mr: 0.5, fontSize: 16 }} />
                JSON
              </ToggleButton>
            </ToggleButtonGroup>
            {surface === 'json' && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<FormatAlignLeft />}
                onClick={() => {
                  try {
                    setConfigText(JSON.stringify(JSON.parse(configText), null, 2));
                    setBanner({ severity: 'info', text: 'JSON formatted.' });
                  } catch {
                    setBanner({ severity: 'error', text: 'Invalid JSON.' });
                  }
                }}
              >
                Format
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {banner && (
        <Alert severity={banner.severity} sx={{ mb: 2 }} onClose={() => setBanner(null)}>
          {banner.text}
        </Alert>
      )}

      {variant === 'trading' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Charges</strong> and the full <strong>per–trade-type</strong> opener view (slippage, cooldowns, intraday cutoffs) are{' '}
            <strong>read-only</strong> on{' '}
            <Box component={RouterLink} to="/observability" sx={{ fontWeight: 700 }}>Observability → Trading economics</Box>.
            To edit charges or timing, use <strong>JSON</strong> mode here (full payload) or extend the Seed API; the <em>opener</em> form still edits slippage/cooldown/cutoffs when those fields are in schema.
          </Typography>
        </Alert>
      )}

      {loading && sections.length === 0 && (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {/* ── Main layout: left section list + right content ── */}
      {sections.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexDirection: { xs: 'column', md: 'row' } }}>

          {/* Left: section list */}
          <Paper
            variant="outlined"
            sx={{
              width: { xs: '100%', md: 220 },
              flexShrink: 0,
              borderRadius: 2.5,
              overflow: 'hidden',
              position: { md: 'sticky' },
              top: { md: 88 },
              maxHeight: { md: 'calc(100vh - 120px)' },
              overflowY: { md: 'auto' },
            }}
          >
            <Box sx={{ px: 1.5, pt: 1.5, pb: 0.5 }}>
              <Typography
                variant="overline"
                fontWeight={800}
                fontSize="0.65rem"
                letterSpacing={0.08}
                color="text.secondary"
              >
                Sections ({sections.length})
              </Typography>
            </Box>
            <List dense disablePadding sx={{ px: 0.75, pb: 1 }}>
              {sections.map((key) => {
                const active = selectedSection === key;
                return (
                  <ListItemButton
                    key={key}
                    selected={active}
                    onClick={() => setSelectedSection(key)}
                    sx={{
                      borderRadius: 1.5,
                      mb: 0.25,
                      py: 0.9,
                      px: 1.25,
                      transition: 'all 0.12s',
                      '&.Mui-selected': {
                        bgcolor: alpha(variantMeta.color, 0.12),
                        '&:hover': { bgcolor: alpha(variantMeta.color, 0.16) },
                      },
                      '&:hover': { bgcolor: alpha(variantMeta.color, 0.06) },
                    }}
                  >
                    {active && (
                      <CheckCircleOutline
                        sx={{ fontSize: 14, mr: 0.75, color: variantMeta.color, flexShrink: 0 }}
                      />
                    )}
                    <ListItemText
                      primary={humanizeKey(key)}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: active ? 700 : 500,
                        color: active ? variantMeta.color : 'text.primary',
                        lineHeight: 1.35,
                      }}
                    />
                  </ListItemButton>
                );
              })}
            </List>
          </Paper>

          {/* Right: selected section content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {selectedSection ? (
              <>
                {/* Section title card */}
                <Paper
                  elevation={0}
                  sx={{
                    px: 2.5,
                    py: 1.75,
                    mb: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: alpha(variantMeta.color, 0.18),
                    bgcolor: alpha(variantMeta.color, 0.04),
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  <Box>
                    <Typography variant="h6" fontWeight={800} sx={{ color: variantMeta.color }}>
                      {humanizeKey(selectedSection)}
                    </Typography>
                    {SECTION_HINTS[selectedSection] && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {SECTION_HINTS[selectedSection]}
                      </Typography>
                    )}
                  </Box>
                  <Chip
                    size="small"
                    label={`${Object.keys(asRecord(configData[selectedSection])).length} fields`}
                    variant="outlined"
                    sx={{ fontWeight: 700, color: variantMeta.color, borderColor: alpha(variantMeta.color, 0.3) }}
                  />
                </Paper>

                {/* Content */}
                <Paper
                  variant="outlined"
                  sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
                >
                  {surface === 'form' ? (
                    <EditableStructuredSettings
                      key={selectedSection}
                      value={asRecord(configData[selectedSection])}
                      onChange={(next) => patchSection(selectedSection, next)}
                      expandAll
                    />
                  ) : (
                    <>
                      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 1 }}>
                        JSON for <strong>{humanizeKey(selectedSection)}</strong> only — changes are merged into the full payload on Save.
                      </Typography>
                      <TextField
                        fullWidth
                        multiline
                        minRows={10}
                        maxRows={40}
                        value={JSON.stringify(configData[selectedSection], null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value) as unknown;
                            patchSection(selectedSection, asRecord(parsed));
                          } catch {
                            // keep typing — invalid mid-edit
                          }
                        }}
                        InputProps={{ sx: { fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' } }}
                      />
                    </>
                  )}
                </Paper>

                {/* Full JSON (advanced) in JSON mode */}
                {surface === 'json' && (
                  <Paper variant="outlined" sx={{ p: { xs: 1.5, sm: 2 }, borderRadius: 2, mt: 2 }}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Full config JSON (all sections) — edit here for bulk changes.
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      minRows={14}
                      maxRows={48}
                      value={configText}
                      onChange={(e) => {
                        setConfigText(e.target.value);
                        try {
                          setConfigData(asRecord(JSON.parse(e.target.value)));
                        } catch {
                          // typing — ignore parse errors mid-edit
                        }
                      }}
                      InputProps={{ sx: { fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem' } }}
                      placeholder="{}"
                    />
                  </Paper>
                )}
              </>
            ) : (
              <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                <Typography color="text.secondary">Select a section on the left to start editing.</Typography>
              </Paper>
            )}

            {/* Reference accordions */}
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">Reference (read-only)</Typography>
              </Divider>
              <Accordion
                defaultExpanded={false}
                disableGutters
                elevation={0}
                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' }, mb: 1 }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <EditNote fontSize="small" color="action" />
                    <Typography variant="body2" fontWeight={700}>Schema reference</Typography>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ px: 2, pb: 2 }}>
                  {schemaPayload != null ? (
                    <StructuredDataView data={schemaPayload} dense />
                  ) : (
                    <Typography variant="body2" color="text.secondary">—</Typography>
                  )}
                </AccordionDetails>
              </Accordion>

              {variant === 'system' && formLayoutPayload != null && (
                <Accordion
                  defaultExpanded={false}
                  disableGutters
                  elevation={0}
                  sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                    <Typography variant="body2" fontWeight={700}>Server form layout</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 2, pb: 2 }}>
                    <StructuredDataView data={formLayoutPayload} dense />
                  </AccordionDetails>
                </Accordion>
              )}
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default SeedSettingsEditor;
