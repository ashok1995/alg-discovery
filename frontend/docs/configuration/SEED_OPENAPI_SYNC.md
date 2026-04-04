# Seed OpenAPI sync

## Canonical spec

- **Repo copy:** `frontend/docs/configuration/seed-openapi.json`
- **Live:** `{SEED_BASE}/openapi.json` (same host as `REACT_APP_SEED_API_BASE_URL`)

## Refresh (after Seed deploy)

```bash
# From repo root — uses prod default or pass your base
./scripts/seed-prod-curl.sh "http://YOUR_SEED_HOST:PORT"

# OpenAPI only
curl -sf "http://YOUR_SEED_HOST:PORT/openapi.json" -o frontend/docs/configuration/seed-openapi.json
```

The curl script writes sample JSON under `logs/seed-prod-responses/` and fetches `openapi.json`.

## OpenAPI groups (Seed 2.x)

Per deployed spec: **Settings (UI)** = editable config; **Observability** = metrics and learning transparency.

- **Configure values:** [System settings](/settings) → Workspace + Seed trading/platform.
- **Read-only telemetry:** [Observability](/observability) → pulse, pipeline, service map, arms/candidates.

## Frontend integration

- **HTTP client:** `frontend/src/services/SeedDashboardService.ts`
- **Coverage checklist:** `frontend/docs/configuration/SEED_UI_ENDPOINT_COVERAGE.md` (update when adding routes)
