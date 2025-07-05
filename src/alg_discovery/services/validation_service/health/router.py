"""
Health check router for Validation Service.
"""

from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "validation-service",
        "timestamp": datetime.now().isoformat()
    } 