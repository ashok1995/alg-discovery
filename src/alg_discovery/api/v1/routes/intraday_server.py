#!/usr/bin/env python3
"""
Intraday Trading Server for AlgoDiscovery Trading System
======================================================

This lightweight server provides intraday BUY and SELL recommendations using
`IntradayService`. It is designed to mirror the structure of the existing
`swing`, `shortterm`, and `longterm` servers while remaining much simpler.

Endpoints
---------
1.  GET  /health                                    – Basic health-check
2.  POST /api/intraday/intraday-buy-recommendations – Intraday buy scans
3.  POST /api/intraday/intraday-sell-recommendations – Intraday sell scans

The server listens on the port declared in the environment variable `PORT`
(or `8004` by default) so it can run alongside the other strategy servers on
its own port.
"""

import logging
import time
from dataclasses import asdict
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Local imports – reuse existing infrastructure
from env_loader import load_server_environment, setup_logging
from api.services.data_service import RealTimeDataService
from api.services.intraday_service import IntradayService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment / configuration
# ---------------------------------------------------------------------------

# Load intraday-specific (or fallback) environment configuration
app_config = load_server_environment("intraday") or {
    "server_type": "intraday",
    "port": 8004,
    "host": "0.0.0.0",
    "cors_origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
    ],
}

# Configure logging to file / stdout (uses env_loader helpers)
setup_logging("intraday")

# ---------------------------------------------------------------------------
# FastAPI initialisation
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Intraday Trading Server",
    description="Intraday BUY & SELL recommendations (AlgoDiscovery)",
    version="1.0.0",
)

# CORS – allow configured origins (fallback to *)
app.add_middleware(
    CORSMiddleware,
    allow_origins=app_config.get("cors_origins", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global service instances – initialised on application startup
# ---------------------------------------------------------------------------

data_service: Optional[RealTimeDataService] = None
intraday_service: Optional[IntradayService] = None


# ---------------------------------------------------------------------------
# Pydantic request models
# ---------------------------------------------------------------------------

class IntradayRequest(BaseModel):
    """Common request body for intraday recommendation endpoints."""

    limit: int = Field(10, ge=1, le=100, description="Maximum recommendations")
    chartink_theme: str = Field(
        "intraday_buy", description="ChartInk theme / screener identifier"
    )
    force_refresh: bool = Field(
        False,
        description="Reserved for future use – not cached yet, but kept for compat.",
    )


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _serialise_signals(signals: List):
    """Convert list[IntradaySignal] dataclass instances to plain dicts."""

    return [asdict(sig) for sig in signals]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@app.get("/")
async def root():
    """Root – show metadata & available endpoints."""

    return {
        "service": "Intraday Trading Server",
        "description": "Real-time intraday BUY & SELL stock recommendations",
        "version": "1.0.0",
        "endpoints": {
            "buy": "/api/intraday/intraday-buy-recommendations",
            "sell": "/api/intraday/intraday-sell-recommendations",
            "health": "/health",
        },
    }


@app.get("/health")
async def health_check():
    """Lightweight health-check – verifies core services are initialised."""

    return {
        "status": "healthy" if intraday_service else "initialising",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/intraday/intraday-buy-recommendations")
async def get_intraday_buy_recommendations(
    req: IntradayRequest, raw_request: Request
):
    """Return intraday BUY recommendations (bullish momentum)."""

    if not intraday_service:
        raise HTTPException(status_code=503, detail="Intraday service not ready")

    start = time.time()

    # Log raw request body for parity with other servers (debugging only)
    try:
        body_bytes = await raw_request.body()
        logger.debug("RAW REQUEST BODY: %s", body_bytes.decode())
    except Exception:
        pass

    try:
        signals = await intraday_service.get_intraday_buy_recommendations(
            limit=req.limit, chartink_theme=req.chartink_theme
        )
    except Exception as exc:
        logger.exception("Failed to generate BUY recommendations")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    duration = time.time() - start

    return {
        "status": "success",
        "recommendations": _serialise_signals(signals),
        "total": len(signals),
        "processing_time_seconds": round(duration, 2),
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/intraday/intraday-sell-recommendations")
async def get_intraday_sell_recommendations(
    req: IntradayRequest, raw_request: Request
):
    """Return intraday SELL recommendations (bearish / overbought)."""

    if not intraday_service:
        raise HTTPException(status_code=503, detail="Intraday service not ready")

    start = time.time()

    try:
        body_bytes = await raw_request.body()
        logger.debug("RAW REQUEST BODY: %s", body_bytes.decode())
    except Exception:
        pass

    # Default theme for sell if caller did not specify
    sell_theme = (
        req.chartink_theme if req.chartink_theme != "intraday_buy" else "intraday_sell"
    )

    try:
        signals = await intraday_service.get_intraday_sell_recommendations(
            limit=req.limit, chartink_theme=sell_theme
        )
    except Exception as exc:
        logger.exception("Failed to generate SELL recommendations")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    duration = time.time() - start

    return {
        "status": "success",
        "recommendations": _serialise_signals(signals),
        "total": len(signals),
        "processing_time_seconds": round(duration, 2),
        "timestamp": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# Startup / shutdown events – create & cleanup service instances
# ---------------------------------------------------------------------------


@app.on_event("startup")
async def startup_event():
    """Initialise core services on application startup."""

    global data_service, intraday_service

    logger.info("🚀 Starting Intraday Trading Server…")

    try:
        data_service = RealTimeDataService()
        intraday_service = IntradayService(data_service)
        logger.info("✅ Intraday service initialised")
    except Exception as exc:
        logger.exception("Failed to start services: %s", exc)
        raise


@app.on_event("shutdown")
async def shutdown_event():
    """Graceful shutdown – release resources."""

    logger.info("🛑 Shutting down Intraday Trading Server…")
    # No explicit teardown required yet – placeholder for future cleanup


# ---------------------------------------------------------------------------
# Uvicorn entry point helper (optional)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from warnings import warn

    warn(
        "Running 'intraday_server' directly is deprecated. Use the central FastAPI app.",
        DeprecationWarning,
    ) 