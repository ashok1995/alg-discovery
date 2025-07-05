from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import (
    shortterm_server,
    swing_server,
    longterm_server,
    intraday_server,
    intraday_buy_server,
    intraday_sell_server,
    dashboard_server,
)

# List of route-providing modules whose `.app.router` will be included.
_router_modules = [
    shortterm_server,
    swing_server,
    longterm_server,
    intraday_server,
    intraday_buy_server,
    intraday_sell_server,
    dashboard_server,
]

app = FastAPI(title="Algo Discovery API", version="1.0.0")

# Generic CORS setup (allow all origins for now; tighten in prod).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in _router_modules:
    # Each legacy server file still builds a FastAPI instance named `app`.
    # We reuse its underlying router to avoid refactoring every endpoint.
    app.include_router(module.app.router)


@app.get("/health", tags=["system"])
async def health_check() -> dict[str, str]:
    """Simple liveness probe for Kubernetes / Docker health checks."""
    return {"status": "ok"}


# Expose `app` at package level for uvicorn entrypoint: `uvicorn alg_discovery.api.v1.main:app`.
__all__ = ["app"] 