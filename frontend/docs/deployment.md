# Frontend Deployment

## Local Build & Serve

```bash
npm run build:prod
npm run serve:prod   # Port 80
npm run serve:stage # Port 8080
```

## Docker

```bash
docker build -f Dockerfile.production -t algodiscovery-frontend .
docker run -d -p 80:80 --name algodiscovery-frontend algodiscovery-frontend
```

## GCP Deploy

Deployment is git-only. See repo-level guide:

- **[docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md)** – GCP setup, `./scripts/deploy-from-git.sh [stage|prod]`
