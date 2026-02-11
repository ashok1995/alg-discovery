#!/usr/bin/env python3
"""
Intraday SELL Server
====================

Independent FastAPI server that serves ONLY intraday SELL recommendations.
Runs on its own port so BUY & SELL traffic can be balanced separately.

Default port: 8005 (override via env).
"""

import logging
import time
from dataclasses import asdict
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
import asyncio

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from api.env_loader import load_server_environment, setup_logging
from shared.config import load_config
from api.services.data_service import RealTimeDataService
from api.services.intraday_service import IntradayService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

config = load_server_environment("intraday_sell") or {
    "server_type": "intraday_sell",
    "port": 8005,
    "host": "0.0.0.0",
    "cors_origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
    ],
}
setup_logging("intraday_sell")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Intraday SELL Server",
    description="Intraday SELL recommendations (AlgoDiscovery)",
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

class SellRequest(BaseModel):
    limit: int = Field(10, ge=1, le=100)
    chartink_theme: str = Field("intraday_sell")


class IntradayCombinationRequest(BaseModel):
    """Request model for intraday SELL recommendations using variant combinations."""
    combination: Dict[str, str]
    limit_per_query: int = Field(50, ge=10, le=200)
    min_score: float = Field(25.0, ge=0.0, le=100.0)
    top_recommendations: int = Field(20, ge=5, le=50)
    force_refresh: bool = Field(False)


def _validate_combination_request(combination: Dict[str, str], available_variants: Dict) -> None:
    """Reuse buy-side validation logic"""
    if "categories" in available_variants and available_variants["categories"]:
        valid_categories = {c.replace("_sell", "") for c in available_variants["categories"].keys()}
    elif "variants" in available_variants and available_variants["variants"]:
        valid_categories = {c.replace("_sell", "") for c in available_variants["variants"].keys()}
    else:
        valid_categories = {"momentum", "reversal", "technical", "volume"}

    for category, version in combination.items():
        if category not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid category '{category}'. Available categories: {sorted(valid_categories)}")
        if not version.startswith("v") or "." not in version:
            raise HTTPException(status_code=400, detail=f"Invalid version format '{version}'.")


def _serialise(signals: List):
    return [asdict(s) for s in signals]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "service": "Intraday SELL Server",
        "endpoint": "/api/intraday/intraday-sell-recommendations",
        "health": "/health",
        "variants": "/api/intraday/available-variants",
        "combination": "/api/intraday/combination-sell-recommendations",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy" if intraday_service else "initialising",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/intraday/intraday-sell-recommendations")
async def get_sell_recommendations(req: SellRequest, raw_request: Request):
    if not intraday_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    start = time.time()
    try:
        signals = await intraday_service.get_intraday_sell_recommendations(
            limit=req.limit, chartink_theme=req.chartink_theme
        )
    except Exception as exc:
        logger.exception("SELL recommendation generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "success",
        "recommendations": _serialise(signals),
        "total": len(signals),
        "processing_time_seconds": round(time.time() - start, 2),
        "timestamp": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# New Endpoint: Available Sub-Algorithm Variants (SELL)
# ---------------------------------------------------------------------------


@app.get("/api/intraday/available-variants")
async def get_available_variants():
    try:
        config_data = load_config("intraday_sell")
        variants_summary = {
            cat: {ver: {"name": info.get("name"), "weight": info.get("weight")}
                   for ver, info in variants.items()}
            for cat, variants in config_data.get("sub_algorithm_variants", {}).items()
        }
        return {
            "status": "success",
            "variants": variants_summary,
            "total_categories": len(variants_summary),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logger.exception("Error fetching SELL variants")
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Combination SELL Recommendations
# ---------------------------------------------------------------------------


@app.post("/api/intraday/combination-sell-recommendations")
async def get_combination_sell_recommendations(request: IntradayCombinationRequest) -> Dict[str, Any]:
    try:
        available_variants = await intraday_service.get_available_variants()
        _validate_combination_request(request.combination, available_variants)

        chartink_queries_map = {
            "momentum": {
                "v1.0": ("gap_momentum", "Gap Down Momentum"),
                "v1.1": ("volume_breakout", "Volume Breakdown")
            },
            "reversal": {
                "v1.0": ("morning_momentum", "Morning Reversal"),
                "v1.1": ("gap_momentum", "Opening Range Breakdown")
            },
            "technical": {
                "v1.0": ("volume_breakout", "VWAP Resistance"),
                "v1.1": ("morning_momentum", "Previous Day Low Breakdown")
            },
            "volume": {
                "v1.0": ("volume_breakout", "High Volume Breakdown"),
                "v1.1": ("gap_momentum", "Afternoon Volume Breakdown")
            },
        }

        all_recs = []
        for cat, ver in request.combination.items():
            query_key, _ = chartink_queries_map.get(cat, {}).get(ver, ("gap_momentum", ""))
            recs = await intraday_service.get_intraday_sell_recommendations(limit=request.limit_per_query, chartink_theme=query_key)
            all_recs.extend(recs)

        # Simple strength sort & slice
        all_recs.sort(key=lambda x: x.strength, reverse=True)
        final_recs = all_recs[:request.top_recommendations]

        return {
            "status": "success",
            "recommendations": [asdict(r) for r in final_recs],
            "total": len(final_recs),
            "timestamp": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except asyncio.CancelledError:
        logger.warning("Combination SELL request cancelled")
        raise
    except Exception as exc:
        logger.exception("Combination SELL analysis error")
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    global data_service, intraday_service
    logger.info("🚀 Starting Intraday SELL server …")
    data_service = RealTimeDataService()
    intraday_service = IntradayService(data_service)
    logger.info("✅ Services initialised")


@app.on_event("shutdown")
async def shutdown():
    logger.info("🛑 Shutting down Intraday SELL server …")


# ---------------------------------------------------------------------------
# Entrypoint helper
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from warnings import warn

    warn(
        "Running 'intraday_sell_server' directly is deprecated. Use the central FastAPI app.",
        DeprecationWarning,
    ) 