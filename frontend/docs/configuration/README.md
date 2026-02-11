# Configuration

Environment and deployment setup.

## Environment

Three envs in `frontend/envs/`:

| Env   | Port     | Usage       |
|-------|----------|-------------|
| dev   | 3000     | Local dev   |
| stage | 3001/8080| Staging     |
| prod  | 80/443   | Production  |

```bash
npm run start:dev    # Dev
npm run start:stage  # Stage
npm run build:prod   # Prod build
```

See `frontend/envs/README.md` for env file details.

## Config Files

- **Env**: `frontend/envs/` only (env.dev, env.stage, env.prod, env.example). No env.* at root.
- **Nginx**: `frontend/nginx.conf` only. Single source of truth.

## Deployment

- **Local**: `npm run build:prod && npm run serve:prod`
- **Docker**: `docker build -f Dockerfile.production -t algodiscovery-frontend .`
- **GCP**: [Repo docs/DEPLOYMENT.md](../../../docs/DEPLOYMENT.md) – `./scripts/deploy-from-git.sh [stage|prod]`
