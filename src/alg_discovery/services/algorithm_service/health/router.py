"""
Health check router for Algorithm Service.
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "algorithm-service",
        "timestamp": datetime.now().isoformat()
    } 