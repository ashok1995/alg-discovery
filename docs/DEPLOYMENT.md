# AlgoDiscovery GCP Deployment Guide

## Overview

Three environments with distinct ports and env files in `frontend/envs/`:

| Env   | Port       | Location   | Env File      |
|-------|------------|------------|---------------|
| dev   | 3000       | Local      | envs/env.dev  |
| stage | 3001 / 8080| Local/GCP  | envs/env.stage|
| prod  | 80 / 443   | GCP        | envs/env.prod |

- **Dev**: Local machine (any branch), port 3000.
- **Stage**: Local or GCP stage instance, port 3001 (dev) or 8080 (served).
- **Prod**: GCP instance (main branch only), Git-only deployment, no file transfer.

---

## GCP Context Required (Re-collect if Lost)

To redeploy or troubleshoot, gather:

1. **GCP Instance**
   - Instance name / ID
   - External IP or domain (e.g. `api.algodiscovery.com`)
   - SSH access: `gcloud compute ssh <instance>`

2. **Repo on GCP**
   - Clone path (default: `$HOME/alg-discovery`)
   - Remote URL (GitHub/GitLab/Bitbucket)
   - SSH key or token for `git fetch`

3. **Services / Ports**
   - Dev frontend: 3000
   - Stage frontend: 3001 (dev) / 8080 (served)
   - Prod frontend: 80/443 (Nginx)
   - Backend: 8002, 8013, 8079, 8081, 8082, 8182, 8183, 8020, 8030 (see `.cursor/rules/project-master.mdc`)

4. **Environment**
   - `frontend/envs/env.prod` for prod, `envs/env.stage` for stage
   - SSL certs for HTTPS (if used)
   - Firewall rules: 80/443 (prod), 8080 (stage)

5. **Docker**
   - Docker installed on GCP instance
   - `docker` and `docker run` available to deploy user

---

## One-Time GCP Setup

```bash
# SSH to GCP
gcloud compute ssh <instance-name> --zone=<zone>

# Clone repo (one-time)
git clone <repo-url> ~/alg-discovery
cd ~/alg-discovery

# Optional: set custom repo path
export ALGODISCOVERY_REPO_DIR=~/alg-discovery
```

---

## Deploy (Git-Only)

**From your local machine** (merge to main first for prod):

```bash
git checkout main
git pull origin main
git merge feature/next-improvement
git push origin main
```

**On GCP instance**:

```bash
cd ~/alg-discovery

# Deploy prod (port 80/443)
./scripts/deploy-from-git.sh prod

# Deploy stage (port 8080)
./scripts/deploy-from-git.sh stage
```

Custom repo path:
```bash
ALGODISCOVERY_REPO_DIR=/opt/alg-discovery ./scripts/deploy-from-git.sh prod
```

## Local Run (No GCP)

```bash
cd frontend
npm run start:dev    # Dev, port 3000
npm run start:stage  # Stage dev, port 3001
npm run build:stage && npm run serve:stage  # Stage served, port 8080
npm run build:prod   # Prod build only
```

---

## Port Reference (Quick)

| Port | Service | Env |
|------|---------|-----|
| 3000 | React dev | dev |
| 3001 | React dev | stage |
| 8080 | Served build | stage |
| 80/443 | Frontend (Nginx) | prod |
| 8002 | Swing/Unified API |
| 8013 | Algorithm/Zerodha |
| 8079 | Kite Services |
| 8081 | Chartink Auth |
| 8082 | Seed API |
| 8182 | Seed (prod) |
| 8183 | Recommendation proxy |

---

## Verification

- Health: `curl http://<gcp-ip>/health`
- App: `https://api.algodiscovery.com` (or your domain)
