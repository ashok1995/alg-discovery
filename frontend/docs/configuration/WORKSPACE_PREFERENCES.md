# Workspace preferences (browser)

Stored in **localStorage** under key `algdiscovery.workspace.v2` when you click **Save preferences** on **System settings → Workspace preferences**.

## Auto refresh

- **Scope today:** the **Recommendations** page (`/recommendations` and related routes using `UnifiedRecommendations`).
- **Behavior:** a timer runs only while that page is **mounted** and the browser tab is **visible** (`document.visibilityState === 'visible'`). Leaving the page or switching tabs stops polling for that screen.
- **Does not:** refresh other routes in the background while you are elsewhere.

## Recommendations & Seed API

Seed `GET /v2/recommendations` uses **`trade_type`**, **`limit`**, and **`min_score`** only (see `frontend/docs/configuration/seed-openapi.json`). **No `risk_level`** is sent.

Workspace controls **min score** and **max results (limit)** for the Recommendations UI.

## Position session windows

Local **UI hints** for when **Open** is enabled on the recommendations table (intraday vs swing/long/short). Server-side opener rules in Seed remain authoritative.

Defaults match common Indian cash session cutoffs (editable in settings):

- **Intraday:** session 09:30–15:25, entry cutoff 14:30, exit cutoff 15:22.
- **Other strategies:** session 09:15–15:29; optional entry/exit fields.

Clock uses the **browser’s local time** — use IST-aligned machine timezone for accurate gating.
