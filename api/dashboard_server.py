#!/usr/bin/env python3
"""
Dashboard Server
===============

Dedicated server for the AlgoDiscovery Dashboard API.
This server provides comprehensive analytics and monitoring endpoints.
"""

import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load environment configuration
env_file = project_root / "api" / "env" / "dashboard.env"
if env_file.exists():
    load_dotenv(env_file)
else:
    # Fallback to default env file
    default_env = project_root / "env.example"
    if default_env.exists():
        load_dotenv(default_env)

# Configure logging
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.getenv("LOG_FILE", "./logs/dashboard_server.log")),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Import dashboard components
from dashboard.routes import dashboard_router
from dashboard.analytics import analytics_service

# Create FastAPI app
app = FastAPI(
    title="AlgoDiscovery Dashboard API",
    description="Comprehensive analytics and monitoring dashboard for AlgoDiscovery Trading System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include dashboard routes
app.include_router(dashboard_router)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    try:
        logger.info("🚀 Starting AlgoDiscovery Dashboard Server...")
        
        # Initialize analytics service
        await analytics_service.initialize()
        
        logger.info("✅ Dashboard server initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize dashboard server: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    try:
        logger.info("🛑 Shutting down Dashboard Server...")
        # Add any cleanup logic here
        logger.info("✅ Dashboard server shutdown complete")
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "AlgoDiscovery Dashboard API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "health": "/api/dashboard/health"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Check if analytics service is ready
        if analytics_service.redis_client:
            status = "healthy"
            message = "Dashboard server is running"
        else:
            status = "initializing"
            message = "Dashboard server is initializing"
        
        return {
            "status": status,
            "message": message,
            "timestamp": analytics_service.last_collection.isoformat() if analytics_service.last_collection else None,
            "services": {
                "redis": "connected" if analytics_service.redis_client else "disconnected",
                "mongodb": "connected" if analytics_service.mongo_client else "disconnected",
                "analytics": "ready" if analytics_service.redis_client else "initializing"
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "message": f"Health check failed: {str(e)}",
            "error": str(e)
        }

@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Handle 404 errors"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": "The requested resource was not found",
            "available_endpoints": [
                "/",
                "/health",
                "/docs",
                "/api/dashboard/",
                "/api/dashboard/metrics",
                "/api/dashboard/graph",
                "/api/dashboard/database",
                "/api/dashboard/cache",
                "/api/dashboard/api-stats",
                "/api/dashboard/cron",
                "/api/dashboard/system",
                "/api/dashboard/alerts",
                "/api/dashboard/config"
            ]
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An internal server error occurred",
            "timestamp": analytics_service.last_collection.isoformat() if analytics_service.last_collection else None
        }
    )

def main():
    """Main entry point for the dashboard server"""
    try:
        logger.info("🚀 Starting AlgoDiscovery Dashboard API...")
        
        # Get configuration from environment
        host = os.getenv("DASHBOARD_HOST", "0.0.0.0")
        port = int(os.getenv("DASHBOARD_PORT", "8005"))
        reload = os.getenv("DASHBOARD_RELOAD", "true").lower() == "true"
        workers = int(os.getenv("DASHBOARD_WORKERS", "1"))
        
        logger.info(f"📡 Starting dashboard server on {host}:{port}")
        logger.info(f"🔄 Reload enabled: {reload}")
        logger.info(f"👥 Workers: {workers}")
        
        # Start the server
        uvicorn.run(
            "dashboard_server:app",
            host=host,
            port=port,
            reload=reload,
            workers=workers if not reload else 1,
            log_level=os.getenv("LOG_LEVEL", "info").lower()
        )
        
    except KeyboardInterrupt:
        logger.info("🛑 Dashboard server stopped by user")
    except Exception as e:
        logger.error(f"❌ Failed to start dashboard server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 