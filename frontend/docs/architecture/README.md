# Architecture

System design and folder structure.

## Folder Structure

```
frontend/src/
├── components/     # Reusable UI components
├── config/         # API config
├── hooks/          # Custom hooks
├── pages/          # Route pages
├── services/       # API clients, business logic
└── types/          # TS types, models
```

## Principles

- One concern per service file
- Config over code (env, no hardcoding)
- Reuse; scan before adding similar logic
