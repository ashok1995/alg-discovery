# AlgoDiscovery Frontend

React frontend for AlgoDiscovery trading system.

## Quick Start

```bash
npm install
npm run start:dev   # Dev on port 3000
```

## Environments

| Command        | Env   | Port |
|----------------|-------|------|
| `npm run start:dev`   | dev   | 3000 |
| `npm run start:stage`  | stage | 3001 |
| `npm run build:prod`   | prod  | 80/443 |

Env files: `frontend/envs/env.dev`, `env.stage`, `env.prod`

## Documentation

**All docs**: `frontend/docs/` (no loose `.md` in root)

- [docs/README.md](./docs/README.md) – Index
- [docs/environment.md](./docs/environment.md) – Env setup
- [docs/deployment.md](./docs/deployment.md) – Build, deploy

## Scripts

```bash
npm run start:dev    # Dev server
npm run start:stage  # Stage dev
npm run build:dev    # Dev build
npm run build:stage  # Stage build
npm run build:prod   # Prod build
npm run test         # Tests
```
