"""
Intraday Service - Main application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .health.router import router as health_router
from .settings.router import router as settings_router
from .risk.router import router as risk_router
from .market.router import router as market_router

app = FastAPI(
    title="Intraday Service",
    description="Service for managing intraday-specific operations",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router, prefix="/health", tags=["health"])
app.include_router(settings_router, prefix="/settings", tags=["settings"])
app.include_router(risk_router, prefix="/risk", tags=["risk"])
app.include_router(market_router, prefix="/market", tags=["market"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8014) 