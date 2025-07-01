"""
Backend API Package
===================

Automated Trading System Backend API with FastAPI.
Provides REST endpoints, WebSocket communication, and real-time analysis.
"""

__version__ = "1.0.0"
__author__ = "AlgoDiscovery Team"

from .main import app

__all__ = ["app"] 