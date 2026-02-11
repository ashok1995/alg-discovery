# Environment Configuration

Three environments in `frontend/envs/`:

| Env   | Port     | Usage           |
|-------|----------|-----------------|
| dev   | 3000     | Local development |
| stage | 3001/8080| Staging         |
| prod  | 80/443   | Production (GCP)|

## Usage

```bash
npm run start:dev    # Dev, port 3000
npm run start:stage  # Stage dev, port 3001
npm run build:stage && npm run serve:stage  # Stage served, port 8080
npm run build:prod   # Prod build
```

See `frontend/envs/README.md` for env file details.
