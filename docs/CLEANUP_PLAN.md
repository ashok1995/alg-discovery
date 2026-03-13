# AlgoDiscovery Cleanup Plan

## Goal

Focus this repo on the **React web app** and remove/archive root-level scripts and backend artifacts that are not needed for the frontend to build, run, or deploy.

## Current State

The repo mixes:
1. **Frontend (React)** — `frontend/` — the web app
2. **Python backend** — `api/`, `src/`, `cron/`, etc. — trading APIs and cron
3. **Root scripts/configs** — Python scripts, shell scripts, docs, logs

**Frontend dependencies:** The React app calls **external APIs** in prod (Seed 8182, Kite 8179, Chartink 8181, Yahoo 8185). For local dev, setupProxy can proxy to external or local backends. The frontend does **not** import Python modules.

---

## Classification

### A. Essential (DO NOT REMOVE)

| Path | Purpose |
|------|---------|
| `frontend/` | React app — core of the repo |
| `scripts/deploy-*.sh` | Deploy scripts (from-git, from-ghcr, stage, prod) |
| `scripts/deploy.sh quick-test` | Quick test on port 3002 |
| `.github/workflows/build.yml` | CI — build and push Docker image |
| `docs/DEPLOYMENT.md` | Deployment guide |
| `.cursor/rules/project-master.mdc` | Project rules |
| `.gitignore` | Git ignore rules |
| `README.md` | Project overview (update to focus on frontend) |

### B. Backend / Not Used by Frontend (CANDIDATE FOR ARCHIVE)

| Path | Purpose | Risk |
|------|---------|------|
| `api/` | Python API servers (8002, 8003, etc.) | Low — frontend uses external APIs in prod |
| `src/` | Python alg_discovery, domains | Low |
| `cron/` | Cron job system | Low |
| `algorithms/`, `core/`, `order/`, `patterns/` | Trading logic | Low |
| `services/`, `shared/`, `config/` | Backend services | Low |
| `recommendation_engine/`, `backtesting/` | Backend modules | Low |
| `infrastructure/` | Infra configs | Low |
| `examples/`, `data/` | Backend data | Low |

### C. Root Scripts — Not Needed for Frontend

| File | Purpose | Action |
|------|---------|--------|
| `check_crons.py` | Cron health check | Archive |
| `check_services.py` | Service health | Archive |
| `cron_manager_starter.py` | Cron manager | Archive |
| `cron_status_dashboard.py` | Cron dashboard | Archive |
| `cron_status_simple.py` | Cron status | Archive |
| `cache_refresh_service.py` | Cache refresh | Archive |
| `internet_monitor.py` | Internet monitor | Archive |
| `start_all_services.py` | Start Python servers | Archive |
| `start_test_server.py` | Test server | Archive |
| `demo_service_manager.sh` | Demo services | Archive |
| `setup_auto_start.sh` | Auto-start setup | Archive |
| `test_*.py` | Backend tests | Archive |
| `view_*.py` | View/analytics scripts | Archive |

### D. Root Configs — Backend-Related

| File | Purpose | Action |
|------|---------|--------|
| `supervisord.conf` | Supervisord config | Archive |
| `com.trading.services.plist` | macOS launchd | Archive |
| `requirements.txt` | Python deps | Archive (if backend removed) |
| `pytest.ini` | Python test config | Archive |
| `env.example` | Root env (vs frontend/envs/) | Remove if duplicate |

### E. Root Docs — Consolidate or Archive

| File | Purpose | Action |
|------|---------|--------|
| `ALGODISCOVERY_SYSTEM_GUIDE.md` | Full system guide | Archive or move to docs/ |
| `API_CLEANUP_SUMMARY.md` | Old cleanup notes | Archive |
| `API_INTEGRATION_GUIDE.md` | API guide | Archive or merge into frontend/docs |
| `CLEANUP_SUMMARY.md` | Old cleanup | Archive |
| `CRON_ENVIRONMENT_SETUP.md` | Cron setup | Archive |
| `README_AUTO_START.md` | Auto-start | Archive |
| `distributed_architecture_plan.md` | Arch plan | Archive |
| `V2_API_INTEGRATION_SUMMARY.md` | V2 API | Move to frontend/docs/integration/ |
| `V2_INTEGRATION_CHECKLIST.md` | V2 checklist | Move to frontend/docs/ |

### F. Root JSON / Logs — Safe to Remove

| File | Action |
|------|--------|
| `longterm_api_example.json` | Archive or remove |
| `longterm_recommendation_example.json` | Archive or remove |
| `shortterm_api_example.json` | Archive or remove |
| `shortterm_recommendation_example.json` | Archive or remove |
| `swing_api_example.json` | Archive or remove |
| `swing_recommendation_example.json` | Archive or remove |
| `server.log`, `swing_server.log` | Add to .gitignore, remove from repo |
| `.service_pids.json` | Add to .gitignore |
| `folder_structure.txt` | Remove or archive |

### G. scripts/ Folder

| File | Purpose | Action |
|------|---------|--------|
| `scripts/deploy.sh`, `scripts/deploy/*.sh` | Frontend deploy | KEEP |
| `init_db.py` | DB init | Archive (backend) |
| `paper_trade_demo.py` | Demo | Archive (backend) |

### H. frontend/ Cleanup

| Item | Action |
|------|--------|
| `openai.json` (root) | Duplicate — keep `frontend/src/config/openai.json` only |
| `seed-service-diagnostics.js` | Move to scripts/ or archive |
| `env.development.local`, `.env`, `.env.local` | Ensure in .gitignore |
| `frontend.log`, `npm.log`, `rs.log` | Add to .gitignore |

---

## Phased Cleanup

### Phase 1 — Low Risk (No Code Impact)

1. Add to `.gitignore`: `*.log`, `.service_pids.json`, `frontend/.env`, `frontend/.env.local`
2. Remove `server.log`, `swing_server.log`, `.service_pids.json` from tracking
3. Consolidate docs: move V2 docs to `frontend/docs/integration/`
4. Archive `folder_structure.txt`, `distributed_architecture_plan.md`

### Phase 2 — Archive Backend

1. Create `archive/backend-YYYYMMDD/`
2. Move into archive:
   - Root: `*.py`, `*.sh` (except `scripts/`), `supervisord.conf`, `com.trading.services.plist`, `requirements.txt`, `pytest.ini`, root `env.example`
   - Dirs: `api/`, `src/`, `cron/`, `algorithms/`, `core/`, `order/`, `patterns/`, `services/`, `shared/`, `config/`, `recommendation_engine/`, `backtesting/`, `infrastructure/`, `examples/`, `data/`, `tests/`, `utils/`
3. Move root docs (ALGODISCOVERY_SYSTEM_GUIDE, API_*, CLEANUP_*, CRON_*, README_AUTO_START) to `archive/backend-docs/`
4. Move example JSONs to `archive/` or remove
5. In `scripts/`: move `init_db.py`, `paper_trade_demo.py` to archive

### Phase 3 — Simplify Root

1. Update root `README.md` to focus on frontend: quick start, npm run start:dev, deploy
2. Keep: `frontend/`, `scripts/`, `docs/`, `.github/`, `.cursor/`
3. Resulting root structure:
   ```
   alg-discovery/
   ├── .cursor/rules/
   ├── .github/workflows/
   ├── docs/
   ├── frontend/
   ├── scripts/
   ├── archive/          # Backend artifacts (optional: separate repo)
   ├── .gitignore
   └── README.md
   ```

### Phase 4 — Optional: Extract Backend

If the backend is still used elsewhere, extract it to a separate repo (e.g. `alg-discovery-backend`) and archive it. The frontend repo becomes React-only.

---

## Verification After Cleanup

1. **Build**: `cd frontend && npm run build:prod` — must succeed
2. **Dev**: `cd frontend && npm run start:dev` — must start on 3000
3. **Deploy**: `./scripts/deploy-from-git.sh prod` — must run
4. **CI**: GitHub Actions build workflow — must pass
5. **No broken imports** in frontend

---

## Risk Mitigation

- **Backup**: Create a `cleanup-backup-YYYYMMDD` branch before Phase 2
- **Archive**: Use `archive/` instead of delete; can restore if needed
- **Docs**: Update README to state repo is frontend-focused; backend moved to archive
- **Env**: Ensure `frontend/envs/` has all required env vars; no dependency on root env

---

## Summary

| Category | Count | Action |
|----------|-------|--------|
| Root Python scripts | ~15 | Archive |
| Root shell scripts | 2 | Archive |
| Root docs | ~10 | Archive or consolidate |
| Backend dirs | ~15 | Archive |
| Root configs | 5 | Archive |
| Essential | frontend, scripts, .github, docs | Keep |

Estimated cleanup: ~50+ files/dirs moved to archive. Frontend and deploy flow unchanged.
