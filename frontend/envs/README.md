# Environment Configuration

Three environments with distinct ports:

| Env  | Port  | Usage                         |
|------|-------|-------------------------------|
| dev  | 3000  | Local development             |
| stage| 3001 / 8080 | Staging / pre-prod validation |
| prod | 80 / 443 | Production (GCP)          |

## Usage

```bash
# Dev (port 3000)
npm run start:dev

# Stage (port 3001 dev, 8080 served)
npm run start:stage
npm run build:stage && npm run serve:stage

# Prod (port 80/443)
npm run build:prod
```

## File Mapping

- `env.dev` → Development (local)
- `env.stage` → Staging (local or GCP stage)
- `env.prod` → Production (GCP main)
