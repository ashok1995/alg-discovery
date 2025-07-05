"""
Recommendation Service - Handles all types of stock recommendations.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .health.router import router as health_router
from .recommendations.router import router as recommendations_router

app = FastAPI(
    title="Stock Recommendations Service",
    description="Service for retrieving stock recommendations across different strategies",
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
app.include_router(recommendations_router, prefix="/recommendations", tags=["recommendations"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8015) 