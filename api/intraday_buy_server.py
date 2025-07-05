#!/usr/bin/env python3
"""
Intraday BUY Server
===================

A trimmed-down FastAPI server that offers ONLY intraday BUY recommendations.
It re-uses the existing `IntradayService` for the underlying logic but avoids
hosting the SELL path so it can be deployed independently on its own port.

Default port: 8004 (override with PORT environment variable or env file).
"""

import logging
import time
from dataclasses import asdict
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Local helpers
from env_loader import load_server_environment, setup_logging
from api.services.data_service import RealTimeDataService
from api.services.intraday_service import IntradayService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment & logging
# ---------------------------------------------------------------------------

config = load_server_environment("intraday_buy") or {
    "server_type": "intraday_buy",
    "port": 8004,
    "host": "0.0.0.0",
    "cors_origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
    ],
}
setup_logging("intraday_buy")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Intraday BUY Server",
    description="Intraday BUY recommendations (AlgoDiscovery)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.get("cors_origins", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------

data_service: Optional[RealTimeDataService] = None
intraday_service: Optional[IntradayService] = None


# ---------------------------------------------------------------------------
# Models & helpers
# ---------------------------------------------------------------------------

class BuyRequest(BaseModel):
    limit: int = Field(10, ge=1, le=100)
    chartink_theme: str = Field("intraday_buy")


def _serialise(signals: List):
    return [asdict(s) for s in signals]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "service": "Intraday BUY Server",
        "endpoint": "/api/intraday/intraday-buy-recommendations",
        "health": "/health",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy" if intraday_service else "initialising",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/intraday/intraday-buy-recommendations")
async def get_buy_recommendations(req: BuyRequest, raw_request: Request):
    if not intraday_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    start = time.time()
    try:
        signals = await intraday_service.get_intraday_buy_recommendations(
            limit=req.limit, chartink_theme=req.chartink_theme
        )
    except Exception as exc:
        logger.exception("BUY recommendation generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "success",
        "recommendations": _serialise(signals),
        "total": len(signals),
        "processing_time_seconds": round(time.time() - start, 2),
        "timestamp": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    global data_service, intraday_service
    logger.info("🚀 Starting Intraday BUY server …")
    data_service = RealTimeDataService()
    intraday_service = IntradayService(data_service)
    logger.info("✅ Services initialised")


@app.on_event("shutdown")
async def shutdown():
    logger.info("🛑 Shutting down Intraday BUY server …")


# ---------------------------------------------------------------------------
# Entrypoint helper
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "api.intraday_buy_server:app",
        host=config.get("host", "0.0.0.0"),
        port=config.get("port", 8004),
        reload=config.get("debug", True),
        log_level="info",
    ) 