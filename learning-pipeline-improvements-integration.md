# Learning pipeline improvements — integration guide

For consumers (dashboard, ops, automation) after the data-driven learning rollout (Phases 1–4). See also `docs/development/learning-pipeline-improvements.md` for the full plan and file map.

## What changed (behaviour)

| Area | Before | After |
|------|--------|--------|
| Reward expectations | Fixed `_BASE_EXPECTATIONS` per trade type | Rolling P25/P75 from `recommendation_outcomes` when enough samples; else same defaults |
| Regime ARM adjustments | Hardcoded WR 20/35/60% | Same defaults, tunable via `LearningConfig` → `PUT /api/v2/settings/trading` |
| Profit protection | Static `TRAIL_CFG` | Learned `{activation, lock, max_drawdown}` from closed positions with `peak_unrealized_pct`; else `TRAIL_CFG` |
| Score dampening (>85) | Always dampen | Dampen only when outcomes show 85+ underperforms 70–84 |
| Regime favorability weights | Fixed short/med/long blend | Learned blend when enough closed positions with entry stances; else fixed weights |
| Thompson cold start | Beta(0.1,0.1) for new ARM | Optional transfer from same “family” (first two `_` tokens), fraction from config |
| Multi-ARM position learning | Full reward per ARM | Reward scaled by `1/n_arms` per ARM before aggregation |
| Observability | Top arms + processes | **Also** `convergence`, `reward_distribution`, `learned_insights` snapshot |

No new **write** APIs were added; behaviour is driven by DB data, `data/trading_config.json`, and `data/learned_arm_weights.json` (existing paths).

## Primary read API

**`GET /api/v2/monitor/learning-insights`**

Router prefix is **`/api/v2/monitor`** (not `.../monitoring/...`).

### New / extended JSON fields

- **`convergence`** — Object returned by `get_full_learning_health()` with three keys:
  - **`convergence.convergence`** — Thompson diagnostics: `weight_stability`, `evidence_summary`, `stuck_arms`, `top_confident`, `posteriors` (sample), `regime_coverage`, `total_arms`.
  - **`convergence.reward_distribution`** — `posterior_distribution`, `saturation_pct`, `is_saturated`, `avg_alpha`, `avg_beta`, `health`.
  - **`convergence.timestamp`** — ISO time when diagnostics were computed.

- **`learned_insights`** — Cached snapshot: `dynamic_expectations`, `profit_protection`, `high_score_perf`, `context_correlations`, `regime_horizon_weights`, `score_band_weights`, `min_score_adj`, `cache_age_seconds`.

### Settings (tuning)

**`GET/PUT /api/v2/settings/trading`**

New optional fields under **`learning`** (see OpenAPI / `LearningConfig`):

- `regime_wr_penalty_threshold`, `regime_wr_mild_penalty_threshold`, `regime_wr_boost_threshold`
- `regime_penalty_mult`, `regime_mild_penalty_mult`, `regime_boost_mult`
- `transfer_learning_fraction`

Partial PATCH is supported via existing trading config merge.

## Database & prod alignment

**Primary DB:** PostgreSQL (dev/stage/prod). All new outcome queries use **bound datetime cutoffs** (naive IST) — not SQLite-only `datetime('now', ...)`.

**Tables / columns used**

| Feature | Table | Columns |
|---------|--------|---------|
| Dynamic expectations | `recommendation_outcomes` | `trade_type`, `return_pct`, `horizon`, `recorded_at` |
| High-score dampening | `recommendation_outcomes` + `recommendation_log` | `recommendation_log_id` → `rl.id`, `rl.score`, `ro.return_pct`, `ro.recorded_at` |
| Profit protection learning | `tracked_positions` | `trade_type`, `peak_unrealized_pct`, `return_pct`, `closed_at`, `status` (closed) |
| Context correlations | `tracked_positions` | `entry_vix_india`, `entry_nifty_change_pct`, `entry_ad_ratio`, `entry_market_regime`, returns |
| Regime horizon weights | `tracked_positions` | `entry_global_stance`, `entry_market_regime`, `entry_indian_stance`, returns |

**Persistence:** `peak_unrealized_pct` and entry context columns must be populated at open/update for learning to activate; otherwise code **falls back** to static defaults (no crash).

**IST:** Cutoffs use `now_ist().replace(tzinfo=None)` to match naive `DateTime` columns documented in repo rules.

## Polling & cache

- Adaptive insights (including learned blocks) refresh on orchestrator schedule (~30 min stale); same as existing `adaptive_insights` cache.
- Learning-insights endpoint is suitable for **30–60 minute** dashboards (same as `learner-observability.md`).

## Redundant / not wired (intentional)

- **`context_correlations`** are **read-only** in the API; they do not yet adjust live `market_context_scoring` weights (future work).
- **`_BASE_EXPECTATIONS`** in `reward_calculator.py` remains the **fallback** when cache has no learned row for a trade type — not dead code.
- **`historical_analyzer._time_clause`** previously used SQLite-only syntax; it now uses the same bound-cutoff pattern as prod **for all `ro.recorded_at` filters**.

## Frontend (AlgoDiscovery)

- **Observability → Learning → Highlights** uses `LearningInsightsV2Panel` for **`convergence`** (Thompson + `reward_distribution`) and **`learned_insights`** when Seed returns them; otherwise an info alert points here.
- Types: `frontend/src/types/dashboard.ts` — `LearningConvergenceBlock`, `LearnedInsightsSnapshot`, extended `LearningInsightsResponse`.
- **Verify with curl** (replace host/port with `REACT_APP_SEED_API_BASE_URL` from `frontend/envs/env.dev`):

```bash
curl -sS "${SEED_BASE}/api/v2/monitor/learning-insights" | jq '.convergence, .learned_insights'
```

## Related docs

- `docs/integration/api-consumer-guides/learner-observability.md` — schedule, buckets, `metric_used`
- `docs/development/learning-pipeline-improvements.md` — plan, progress, file list
- `docs/architecture/learning-data-driven-audit.md` — data-driven vs heuristic map
