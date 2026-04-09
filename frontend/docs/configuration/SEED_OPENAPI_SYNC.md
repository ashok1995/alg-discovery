# Seed OpenAPI sync

## Canonical specs (two services on prod VM)

| Service | Port (prod) | Repo copy | Env |
|--------|-------------|-----------|-----|
| **Seed Stocks** (recommendations, arms, candidates, market-movers) | **8182** | `frontend/docs/configuration/seed-openapi.json` | `REACT_APP_SEED_API_BASE_URL` |
| **Position tracker** (universal positions, batch, export, some monitor) | **8183** | `frontend/docs/configuration/position-tracker-openapi.json` | `REACT_APP_SEED_POSITIONS_API_BASE_URL` |

- **Live OpenAPI:** `{SEED_BASE}/openapi.json` and `{POSITIONS_BASE}/openapi.json`

## Refresh (after backend deploy)

```bash
SEED_HOST="${SEED_HOST:-203.57.85.201}"
curl -sf "http://${SEED_HOST}:8182/openapi.json" -o frontend/docs/configuration/seed-openapi.json
curl -sf "http://${SEED_HOST}:8183/openapi.json" -o frontend/docs/configuration/position-tracker-openapi.json

# Optional: samples + health (see script)
./scripts/seed-prod-curl.sh "http://${SEED_HOST}:8182"
```

The curl script writes sample JSON under `logs/seed-prod-responses/` and fetches `openapi.json`.

## OpenAPI groups (Seed 2.x)

Per deployed spec: **Settings (UI)** = editable config; **Observability** = metrics and learning transparency.

- **Configure values:** [System settings](/settings) → Workspace + Seed trading/platform.
- **Read-only telemetry:** [Observability](/observability) → pulse, pipeline, service map, arms/candidates.

## Frontend integration

- **HTTP client:** `frontend/src/services/SeedDashboardService.ts`
- **Coverage checklist:** `frontend/docs/configuration/SEED_UI_ENDPOINT_COVERAGE.md` (update when adding routes)
