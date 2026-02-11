"""
Health check router for Variant Service.
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "variant-service",
        "timestamp": datetime.now().isoformat()
    } 