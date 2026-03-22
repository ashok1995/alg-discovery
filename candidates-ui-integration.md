# Candidates UI — API integration guide

This document is for **frontend / UI** engineers wiring screens to the **candidate stocks** surface. Candidates live in `stock_metadata` rows that have **`candidate_status`** set (`active`, `watchlist`, or `blacklisted`), populated from ARM **`stock_universe`** discovery and Yahoo fundamentals sync.

**OpenAPI:** Swagger `/docs` → tags **Candidates** and **Observability** (coverage, kite-gap, sync).

**Related:** Market movers chart URLs use the same metadata — see `GET /api/v2/dashboard/market-movers` in [api-consumer-guide.md](../api-consumer-guide.md). Kite chart links require **`instrument_token`** (or use **Kite match** below).

---

## Base URL

| Environment | Typical base |
|-------------|----------------|
| Dev | `http://<host>:8082` |
| Stage | `http://<host>:8282` |
| Prod | `http://<host>:8182` |

All paths below are relative to the base (no trailing slash on base).

**Auth:** None for this service today; treat as internal network only.

**Content-Type:** `application/json` for `PUT` / `POST` bodies.

---

## Endpoint map (all candidate-related)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v2/candidates` | Paginated list with filters |
| GET | `/api/v2/candidates/observability/coverage` | Dashboard KPIs: counts, stale %, sectors |
| GET | `/api/v2/candidates/observability/kite-gap` | Candidates missing Kite `instrument_token` |
| GET | `/api/v2/candidates/{symbol}` | Single candidate + weekly fundamentals history |
| POST | `/api/v2/candidates/sync` | Force full candidate sync (ops; can be slow) |
| PUT | `/api/v2/candidates/{symbol}/status` | Set `active` / `watchlist` / `blacklisted` |
| PUT | `/api/v2/candidates/{symbol}/match` | Set Kite linkage: `instrument_token`, optional aliases |

**Routing note:** Static paths `observability/coverage` and `observability/kite-gap` are registered before `/{symbol}`; use literal `symbol` in the path for detail (e.g. `RELIANCE`, `HDFCBANK`). Encode symbols if you ever allow special characters.

---

## 1. List candidates

**GET** `/api/v2/candidates`

### Query parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `status` | string | — | `active` \| `watchlist` \| `blacklisted` |
| `sector` | string | — | Exact match (case-sensitive) |
| `market_cap_category` | string | — | `large` \| `mid` \| `small` |
| `limit` | int | `200` | `1`–`500` |

### Response

JSON **array** of objects (shape matches `CandidateOut`):

| Field | Type | UI use |
|-------|------|--------|
| `symbol` | string | Primary key for navigation |
| `instrument_token` | int \| null | If set, Kite charts possible |
| `kite_symbol` | string \| null | Kite tradingsymbol if different from `symbol` |
| `chartink_symbol` | string \| null | Chartink code if different |
| `name`, `exchange`, `sector`, `industry` | strings | Table columns, filters |
| `market_cap_cr`, `market_cap_category` | number, string | Screener badges |
| `candidate_status` | string | Status pill |
| `scan_count` | int | Sort / “heat” column |
| `last_seen_in_scan_at`, `first_seen_in_scan_at` | ISO string \| null | Recency |
| `fundamentals` | object | Nested PE, PB, ROE, margins, `updated_at` |
| `chart_url` | string \| null | Open in new tab (Kite preferred when token known) |
| `updated_at` | string \| null | Row freshness |

### Example

```http
GET /api/v2/candidates?status=active&limit=50
```

---

## 2. Observability — coverage

**GET** `/api/v2/candidates/observability/coverage`

No query params.

### Response (`CoverageOut`)

| Field | Type | UI suggestion |
|-------|------|----------------|
| `total_candidates` | int | Big number tile |
| `by_status` | object | Stacked bar or legend (`active`, `watchlist`, `blacklisted`) |
| `stale_fundamentals_count` | int | Alert if high |
| `stale_fundamentals_pct` | float | Progress ring (stale vs total) |
| `sectors_covered` | int | Diversity metric |
| `field_explanations` | object | Tooltip copy keyed by field name |

Use on a **“Candidates health”** or **settings/observability** subpage.

---

## 3. Observability — Kite gap (Chartink-only charts)

**GET** `/api/v2/candidates/observability/kite-gap`

### Query parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | int | `100` | `1`–`500`; sample size for the list |

### Response (`KiteGapOut`)

| Field | Type | Description |
|-------|------|-------------|
| `missing_instrument_token_count` | int | Total candidates without token (not truncated by `limit`) |
| `limit` | int | Echo of request |
| `items` | array | Subset, **sorted by `scan_count` desc** |
| `field_explanations` | object | Tooltips |

Each **item**:

| Field | Type |
|-------|------|
| `symbol` | string |
| `chartink_symbol` | string \| null |
| `kite_symbol` | string \| null |
| `scan_count` | int |
| `last_seen_in_scan_at` | ISO string \| null |

**UI flow:** Show table → row action **“Link to Kite”** opens modal → calls **PUT …/match** (section 7).

---

## 4. Candidate detail

**GET** `/api/v2/candidates/{symbol}`

### Query parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `history_weeks` | int | `26` | `1`–`104` weeks of fundamentals history |

### Response (`CandidateDetailOut`)

Same fields as list item, plus:

| Field | Type | UI suggestion |
|-------|------|---------------|
| `fundamentals_history` | array | Line charts: PE, ROE, margins vs `snapshot_date` (newest first) |

**404** if the symbol is not a candidate (no matching `stock_metadata` row for that path).

---

## 5. Force sync (admin / ops)

**POST** `/api/v2/candidates/sync`

Empty body.

### Response (`SyncResultOut`)

| Field | Type |
|-------|------|
| `discovered_candidates` | int |
| `fundamentals_refreshed` | int |
| `history_snapshots_inserted` | int |
| `snapshot_date` | string |
| `ran_at` | string |

**UI:** Confirm dialog (“May take a minute”), disable double-submit, toast on success. **500** on server error with `detail` message.

---

## 6. Update candidate status

**PUT** `/api/v2/candidates/{symbol}/status`

### Request body (`StatusUpdateIn`)

```json
{ "status": "watchlist" }
```

Allowed: `active`, `watchlist`, `blacklisted`.

### Response

```json
{ "symbol": "RELIANCE", "status": "watchlist", "updated": true }
```

**404** if candidate row not found.

---

## 7. Kite / Chartink match (instrument token & aliases)

**PUT** `/api/v2/candidates/{symbol}/match`

`{symbol}` is the **canonical** symbol stored in the app (usually the same as Chartink / universe symbol).

### Request body (`KiteMatchIn`)

At least **one** of the following must be non-empty / non-null:

| Field | Type | Notes |
|-------|------|--------|
| `instrument_token` | int | `>= 1`; from Kite instruments API / CSV |
| `kite_symbol` | string | Max 50; use when Kite tradingsymbol ≠ canonical `symbol` |
| `chartink_symbol` | string | Max 100 |
| `exchange` | string | Max 20; e.g. `NSE`, `BSE` |

Example (typical):

```json
{
  "instrument_token": 738561,
  "kite_symbol": "RELIANCE"
}
```

**422** if validation fails (e.g. empty body, invalid token).

### Response (`KiteMatchOut`)

| Field | Type |
|-------|------|
| `symbol` | string |
| `instrument_token` | int \| null |
| `kite_symbol` | string \| null |
| `chartink_symbol` | string \| null |
| `exchange` | string \| null |
| `chart_url` | string | Resolved URL (Kite `tvc/...` when token allows) |

**UI:** After success, refresh list/detail or market-movers row; open `chart_url` in a new tab to verify.

---

## Suggested UI modules

1. **Candidates table** — `GET /candidates` with filters; columns: symbol, status, sector, cap, scan_count, token present (boolean), chart link.
2. **Candidate detail** — `GET /candidates/{symbol}` + sparklines from `fundamentals_history`.
3. **Health strip** — `GET …/observability/coverage` on the same page or global observability.
4. **Kite linking queue** — `GET …/observability/kite-gap` + inline **Match** modal → `PUT …/match`.
5. **Admin** — `POST …/sync` behind role-gate; status changes via `PUT …/status`.

---

## TypeScript-style types (reference)

```typescript
type CandidateStatus = "active" | "watchlist" | "blacklisted";

interface FundamentalsOut {
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe: number | null;
  debt_to_equity: number | null;
  operating_margin: number | null;
  profit_margin: number | null;
  updated_at: string | null;
}

interface CandidateOut {
  symbol: string;
  instrument_token: number | null;
  kite_symbol: string | null;
  chartink_symbol: string | null;
  name: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  market_cap_cr: number | null;
  market_cap_category: string | null;
  candidate_status: CandidateStatus | null;
  scan_count: number;
  last_seen_in_scan_at: string | null;
  first_seen_in_scan_at: string | null;
  fundamentals: FundamentalsOut;
  chart_url: string | null;
  updated_at: string | null;
}

interface CandidateDetailOut extends CandidateOut {
  fundamentals_history: FundamentalsHistoryEntry[];
}

interface FundamentalsHistoryEntry {
  snapshot_date: string;
  pe_ratio: number | null;
  pb_ratio: number | null;
  roe: number | null;
  roce: number | null;
  debt_to_equity: number | null;
  operating_margin: number | null;
  profit_margin: number | null;
  market_cap_cr: number | null;
  last_price: number | null;
  data_source: string;
}

interface CoverageOut {
  total_candidates: number;
  by_status: Record<string, number>;
  stale_fundamentals_count: number;
  stale_fundamentals_pct: number;
  sectors_covered: number;
  field_explanations: Record<string, string>;
}

interface KiteGapOut {
  missing_instrument_token_count: number;
  limit: number;
  items: KiteGapItemOut[];
  field_explanations: Record<string, string>;
}

interface KiteGapItemOut {
  symbol: string;
  chartink_symbol: string | null;
  kite_symbol: string | null;
  scan_count: number;
  last_seen_in_scan_at: string | null;
}

interface KiteMatchIn {
  instrument_token?: number;
  kite_symbol?: string;
  chartink_symbol?: string;
  exchange?: string;
}

interface KiteMatchOut {
  symbol: string;
  instrument_token: number | null;
  kite_symbol: string | null;
  chartink_symbol: string | null;
  exchange: string | null;
  chart_url: string;
}

interface SyncResultOut {
  discovered_candidates: number;
  fundamentals_refreshed: number;
  history_snapshots_inserted: number;
  snapshot_date: string;
  ran_at: string;
}
```

---

## Changelog

Update this file when candidate request/response models or routes change; keep in sync with `docs/reference/api.md` and OpenAPI.
