# Trader Workspace Restructure

Proposed frontend restructuring based on the current app, live Seed API capabilities, and the requested trader workflow.

## 1. Main product intent

The app should feel like a trader workstation, not a collection of disconnected admin pages.

Core flows:

- See market context and current trading posture quickly
- Review paper-trading vs learner outcomes separately
- Drill into detailed positions and outcomes
- Inspect ML / learning health and ARM performance
- Manage query/ARM inputs
- Manage system/auth/config in one place
- Manage stock universe and candidate pipelines in one place

## 2. Current gaps

- `ML / Learning` sidebar item points to `/seed-dashboard?tab=ml`, but the dashboard does not read query params, so this does not reliably open the ML tab.
- `Backtesting` is still a first-class page even though it is not a current priority.
- `Recommendation Service Test` is still exposed even though it is not needed as a user-facing tool.
- `Settings` and `System Control` overlap.
- `Stock Mapping Manager` and `Stock Candidate Populator` overlap.
- `Home` and `Dashboard` both show trading overview content, but with different controls and incomplete filter alignment.

## 3. Recommended top-level navigation

Keep:

- `Home`
- `Trader Dashboard`
- `Detailed Positions`
- `ML / Learning`
- `Query / ARM Manager`
- `Universe Manager`
- `System Settings`
- `Stock Recommendations`
- `Investing`

Remove from primary navigation:

- `Backtesting`
- `Recommendation Service Test`

## 4. Recommended page responsibilities

### Home

Purpose:

- Quick trader snapshot
- Market context
- One global filter bar: `Scenario` + `Days`
- Compact trade-type summary
- Market movers

### Trader Dashboard

Purpose:

- Rich operational dashboard
- Live positions
- Capital and P&L
- Performance trends
- Universe health
- Market trends

Notes:

- Keep one top-level period selector
- Add scenario selector aligned with Home and Detailed Positions

### Detailed Positions

Purpose:

- Primary page for position investigation
- Two main tabs:
  - `Paper Trading`
  - `Learning`
- Secondary filters:
  - `Trade Type`
  - `ARM`
  - `Status`
  - `Outcome`
  - `Date Range / Days`

Expected content:

- Aggregated summary strip
- Positions table
- ARM breakdown
- Outcome breakdown
- P&L / charges / deployed capital
- Position drilldown drawer or detail panel

### ML / Learning

Purpose:

- Dedicated learning-analysis workspace
- Arm leaderboard
- Learning health
- Score-bin performance
- Time-to-exit and outcome analysis
- Performance by trade type and ARM

Notes:

- This should be a real route/page, not only a dashboard tab

### Query / ARM Manager

Purpose:

- Merge raw query registry with ARM-centric view
- Show which ARM is driven by which query
- Track enablement, last run, hit rate, win rate, and scenario

### Universe Manager

Purpose:

- Merge stock mapping and candidate population
- Unified stock universe view
- Valid trading universe
- Candidate pipeline
- Fundamental and analytics details

### System Settings

Purpose:

- Merge settings and system control
- Authentication
- Runtime variables
- Service/config toggles
- Health/connection info only where operationally useful

## 5. Immediate frontend work

- Make `ML / Learning` a standalone route/page
- Add `Detailed Positions` page
- Remove `Backtesting` and `Recommendation Service Test` from sidebar
- Merge `Settings` + `System Control`
- Merge `Stock Mapping Manager` + `Stock Candidate Populator`
- Standardize global filters across Home, Dashboard, and Detailed Positions

## 6. Seed API dependencies

Needed from Seed to support the target structure:

- First-class `scenario` filter across all position-related endpoints
- Consistent `trade_type` vocabulary
- Aggregate summary for full filtered result sets
- ARM-to-query provenance
- Learning endpoints with common filter contract
- Position detail fields rich enough for drilldown

See `frontend/docs/configuration/SEED_BACKEND_REQUIREMENTS.md` for the backend contract requirements.
