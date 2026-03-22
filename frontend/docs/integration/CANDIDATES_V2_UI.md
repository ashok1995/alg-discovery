# Candidates API v2 — UI wiring

The **Universe Manager → Candidates** tab loads **`SeedCandidatesV2Panel`**, which calls Seed `REACT_APP_SEED_API_BASE_URL` (see `envs/env.*`).

## Endpoints (see repo root `candidates-ui-integration.md`)

| Client method | HTTP |
|---------------|------|
| `seedDashboardService.listCandidates` | `GET /api/v2/candidates` |
| `seedDashboardService.getCandidateDetail` | `GET /api/v2/candidates/{symbol}` |
| `seedDashboardService.getCandidatesObservabilityCoverage` | `GET /api/v2/candidates/observability/coverage` |
| `seedDashboardService.getCandidatesKiteGap` | `GET /api/v2/candidates/observability/kite-gap` |
| `seedDashboardService.updateCandidateStatus` | `PUT /api/v2/candidates/{symbol}/status` |
| `seedDashboardService.updateCandidateKiteMatch` | `PUT /api/v2/candidates/{symbol}/match` |
| `seedDashboardService.syncCandidates` | `POST /api/v2/candidates/sync` |

## curl (replace host/port)

```bash
BASE=http://localhost:8082
curl -sS "$BASE/api/v2/candidates?limit=5" | jq '.[0].symbol'
curl -sS "$BASE/api/v2/candidates/observability/coverage" | jq '.total_candidates'
curl -sS "$BASE/api/v2/candidates/observability/kite-gap?limit=10" | jq '.missing_instrument_token_count'
```

Types: `frontend/src/types/candidatesV2.ts` (also re-exported from `types/apiModels.ts`).
