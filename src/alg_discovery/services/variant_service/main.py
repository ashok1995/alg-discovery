"""
Variant Service - Handles algorithm variant retrieval.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from api.services.variant_service.health.router import router as health_router
from api.services.variant_service.variants.router import router as variants_router

app = FastAPI(
    title="Algorithm Variants Service",
    description="Service for retrieving algorithm variants",
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
app.include_router(variants_router, prefix="/variants", tags=["variants"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8011) 