# Learning & scorer observability — UI integration guide

This guide is for **frontend / dashboard** teams wiring a **Learning** or **System health** screen so operators can see **when** scorers ran, **how long** each step took, **whether** Thompson weights and adaptive caches updated, and **that** the pipeline is healthy.

For a field-by-field reference of the same API, see **[learner-observability.md](./learner-observability.md)**. For data-driven learning behaviour (bins, signals, paper trade), see **[learning-pipeline-improvements-integration.md](./learning-pipeline-improvements-integration.md)** and **[learning-scorer-paper-flow.md](../../development/learning-scorer-paper-flow.md)**.

---

## Primary endpoint

| Item | Value |
|------|--------|
| **Method** | `GET` |
| **Path** | `/api/v2/monitor/learning-insights` |
| **Tags (OpenAPI)** | Observability |
| **Auth** | Same as your other `/api/v2/monitor/*` routes (follow existing dashboard client). |

**Base URL examples**

- Local dev (default): `http://localhost:8082`
- Staging: your stage host + port **8282** (per deployment docs)

```http
GET /api/v2/monitor/learning-insights HTTP/1.1
Host: localhost:8082
```

```bash
curl -s "http://localhost:8082/api/v2/monitor/learning-insights" | jq '.learning_health, .scorer_weights_timing.summary_by_process, .learned_insights.cache_age_seconds'
```

---

## Recommended polling

| UI surface | Interval | Rationale |
|------------|----------|-----------|
| Dedicated **Learning / Pipeline** page | **30–60 s** | `scorer_weights_timing.recent_runs` and `learner_observability.processes` change during market hours; operators need fresh lag/status. |
| **Overview** dashboard tile (single KPI) | **2–5 min** | Use root-level `learning_health`, `generated_at`, and maybe `scorer_weights_timing.summary_by_process`. |
| Heavy tables (ARM list, convergence) | Same as page | One request returns everything; avoid parallel duplicate calls. |

The broad API consumer guide suggests **30–60 minutes** for a *low-frequency* pull; that is **too slow** for a live “did the scorer run?” view. Use the shorter intervals above for operational UI.

---

## What “learned” means in the UI

Use **multiple signals** so the user trusts the system:

1. **Scorer + weight cycle just ran**  
   - Latest row in `scorer_weights_timing.recent_runs` with `process === "scorer_pipeline"` and recent `finished_at` in `extra` (or `started_at` on the row).  
   - Pair with `learning_update_after_scoring` rows for the same wall-clock window: `extra.update_learning_weights_ms`, `extra.thompson_arms_touched`.

2. **Adaptive cache refreshed**  
   - Row with `process === "adaptive_insights_refresh"` and `status === "ok"`.  
   - **`learned_insights.cache_age_seconds`** — small value means fresh cache (signal learning, paper-trade bins, band multipliers, etc.).

3. **Tracked positions fed Thompson**  
   - `process === "position_learner_weights"` with `extra.arms_thompson_updated` > 0 when closes happened.

4. **Thompson state advancing**  
   - **`learning_iterations`** (length of internal weight history) and **`top_arms`** / **`total_arms`** — show as read-only transparency, not as a user control.

---

## Response layout for UI sections

Map JSON to panels/tabs as follows.

### 1. Header / status strip

| Display | Source field |
|---------|----------------|
| Overall learning | `learning_health` → `active` \| `inactive` \| `error` |
| ARM universe | `total_arms` |
| Payload freshness | `generated_at` (IST in logs; JSON ISO from server) |
| Learned-params age | `learned_insights.cache_age_seconds` (seconds since adaptive cache refresh; `null` if never refreshed) |

**Badge colours (suggestion)**

- `learning_health === "error"` → red (show `error` if present on payload).
- `cache_age_seconds` > 3600 → amber (“learned params may be stale”).
- Otherwise green.

### 2. Scorer & weights timing (new)

**Object:** `scorer_weights_timing`

| Widget | Data |
|--------|------|
| **Sparkline or table** (last N events) | `recent_runs[]` — columns: `process`, `scenario`, `status`, `duration_ms`, time from `started_at` or `finished_at`, expand row for `extra`. |
| **Summary cards** | `summary_by_process` — e.g. “`scorer_pipeline` avg 4.2s (n=8)”. |
| **Per-scenario last run** | `orchestrator_last_scenario_timing` — key = trade type (`intraday_buy`, …), values include `score_all_ms`, `eviction_ms`, `learning_hook_ms`, `pipeline_total_ms`, `scored`, `ranked`, `mode`, `finished_at`. |

**`recent_runs` row shape (typical)**

```json
{
  "process": "scorer_pipeline",
  "scenario": "intraday_buy",
  "status": "ok",
  "duration_ms": 8420.5,
  "started_at": "2026-03-21T15:22:01.123456",
  "finished_at": "2026-03-21T15:22:01.123456",
  "rows_scanned": 120,
  "rows_updated": 25,
  "metric_used": "return_pct_per_hour",
  "extra": {
    "score_all_ms": 6100.0,
    "eviction_ms": 800.0,
    "learning_hook_ms": 1520.0,
    "pipeline_total_ms": 8420.5,
    "evaluated": 120,
    "scored": 80,
    "ranked": 25,
    "rejected": 40,
    "mode": "indicators",
    "finished_at": "2026-03-21T15:22:01.120000+05:30"
  }
}
```

**Field glossary for tooltips** — use server-provided `scorer_weights_timing.fields` so labels stay in sync with backend.

### 3. Learner cadence (schedule / lag)

**Object:** `learner_observability`

| Widget | Data |
|--------|------|
| Process list | `processes[]` — `name`, `scenario`, `schedule_status`, `lag_seconds`, `expected_interval_seconds`, `last_run`, `error` |
| Roll-up | `summary.by_status`, `summary.by_bucket` |

Use this to answer: “Is **outcome_recorder** late?” “When did **learning_update_after_scoring** last run for **swing_buy**?”

### 4. Learned parameters snapshot

**Object:** `learned_insights`

Show read-only JSON or key tables:

- `signal_weights` — per trade type, per TA signal multiplier.
- `paper_trade_eligible_bins` — per trade type, list of bins eligible for paper trading.
- `score_band_weights`, `min_score_adj`, `dynamic_expectations`, `profit_protection`, `high_score_perf`, `context_correlations`, `regime_horizon_weights`.

Collapsible “advanced” section is enough for v1.

### 5. Convergence / health of posteriors

**Object:** `convergence`

From `get_full_learning_health()`: use for power users (stuck ARMs, reward distribution). Optional second tab **“Diagnostics”**.

### 6. Timeline / audit

**Array:** `learning_runs` — older generic history (may overlap conceptually with `scorer_weights_timing.recent_runs`). Prefer **`scorer_weights_timing`** for timing detail; use **`learning_runs`** if you need longer history in one list.

### 7. Top ARMs

**Arrays:** `top_arms`, `regime_contexts` — leaderboard-style table for transparency.

---

## Important: orchestrator timing map

`scorer_weights_timing.orchestrator_last_scenario_timing` is filled only when:

- The HTTP request’s `Request.app.state.pipeline_orchestrator` exists (typical **in-process** API server with the pipeline started).

If the UI calls a **stateless** deployment or the orchestrator is not attached, this object may be **{}**. The UI should:

- Still show `scorer_weights_timing.recent_runs` (in-memory history on that API instance).
- Show a note: “Per-scenario last timing unavailable (orchestrator not bound).”

Do not treat empty `orchestrator_last_scenario_timing` as a hard failure.

---

## Empty / cold-start states

| Condition | UI copy suggestion |
|-----------|---------------------|
| `recent_runs.length === 0` | “No scorer/weight timing recorded yet (service just started or no market-hours cycles).” |
| `learning_health === "inactive"` | “No ARM weights loaded yet.” |
| `learned_insights` mostly empty, `cache_age_seconds` null | “Adaptive insights not refreshed yet; wait for first post-scoring cycle or 30 min refresh.” |

---

## Related endpoints (optional)

| Endpoint | Use |
|----------|-----|
| `GET /api/v2/monitor/arm-leaderboard` | ARM-centric leaderboard (complements `top_arms`). |
| `GET /api/v2/monitor/quick-stats` | Header strip with positions; not learning-specific. |
| `GET /api/v2/settings/trading` | Show tunables (`signal_learning_blend`, `paper_trade.*`, etc.) read-only or linked to settings UI. |

---

## TypeScript-style types (reference)

```typescript
type LearningInsightsResponse = {
  learning_health: "active" | "inactive" | "error";
  total_arms: number;
  learning_iterations: number;
  generated_at: string;
  top_arms: Array<{ arm: string; weight: number; confidence: number; observations: number }>;
  learner_observability: {
    generated_at: string;
    processes: Array<Record<string, unknown>>;
    summary?: Record<string, unknown>;
    error?: string;
  };
  learning_runs: Array<Record<string, unknown>>;
  scorer_weights_timing: {
    recent_runs: Array<{
      process: string;
      scenario?: string | null;
      status: string;
      duration_ms?: number;
      extra?: Record<string, unknown>;
      started_at?: string;
      error?: string | null;
    }>;
    summary_by_process: Record<
      string,
      { n: number; avg_duration_ms: number; max_duration_ms: number }
    >;
    orchestrator_last_scenario_timing: Record<string, Record<string, unknown>>;
    fields: Record<string, string>;
  };
  learned_insights: Record<string, unknown> & { cache_age_seconds?: number | null };
  convergence: Record<string, unknown>;
  adaptive_insights: Record<string, unknown>;
  table_growth?: Record<string, unknown>;
  error?: string;
};
```

---

## Frontend (AlgoDiscovery)

- **Observability → Learning & arms** is a single **hub**: horizontal sections (**Overview**, **Scorer & weights timing**, **Learner cadence**, **Learned & diagnostics**, **ARMs & related APIs**, **Full JSON**) plus a **status strip** (`generated_at`, `learner_observability.generated_at`, `learned_insights.cache_age_seconds`, `learning_iterations`).
- **Times**: tables show **absolute** (locale) + **relative** (“Xm ago”) for `started_at` / `finished_at`, learner `last_run`, orchestrator `finished_at`, and learning run previews.
- **Polling**: the hub refetches all learning-related endpoints every **60 s** while the tab is mounted (`ObservabilityPage` + `LearningObservabilityHub`).
- Code: `frontend/src/components/observability/LearningObservabilityHub.tsx`, `LearningScorerTimingPanel.tsx`, `LearningLearnerCadencePanel.tsx`, `frontend/src/utils/formatObservabilityTime.ts`, types in `frontend/src/types/dashboard.ts` (`ScorerWeightsTiming`, `LearnerObservability`, extended `LearningInsightsResponse`).

## Checklist before shipping UI

- [ ] Poll `learning-insights` on the Learning page every 30–60 s during market hours.
- [ ] Render `scorer_weights_timing.recent_runs` with `status !== "ok"` highlighted.
- [ ] Show `learned_insights.cache_age_seconds` with humanized “updated X min ago”.
- [ ] Handle empty `orchestrator_last_scenario_timing` gracefully.
- [ ] Link or embed settings from `GET /api/v2/settings/trading` for learning-related keys (optional).

---

## Changelog

Backend changes to this payload are recorded in the repo root **`CHANGELOG.md`** under observability / learning-insights sections.
