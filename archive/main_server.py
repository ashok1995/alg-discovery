#!/usr/bin/env python3
"""
Main Orchestrator Server - Standalone
=====================================

Standalone main orchestrator for the Long-Term Investment Platform.
This server provides a simplified version of the main API with mock services
when full dependencies are not available.

Features:
- Health check endpoints
- Service status monitoring
- Basic API endpoints
- Mock data services
- Fallback functionality

Endpoints:
- GET /health - Health check
- GET /status - Service status
- GET /api/version - API version
- GET /docs - API documentation
"""

import sys
import os
import logging
from datetime import datetime
from typing import Optional, Any, Dict, List
import json
import asyncio

# Add the project root to Python path
project_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, project_root)

try:
    from fastapi import FastAPI, HTTPException, Query
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse
    import uvicorn
    FULL_SERVICES_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Full services not available: {e}")
    FULL_SERVICES_AVAILABLE = False

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Global service variables
app_instance: Optional[Any] = None

def create_mock_app():
    """Create a mock FastAPI app with basic functionality."""
    
    class MockFastAPI:
        def __init__(self):
            self.title = "AlgoDiscovery Trading API (Mock Mode)"
            self.description = "Simplified main orchestrator with mock services"
            self.version = "2.0.0"
            self.routes = []
            self.middleware = []
            
        def add_middleware(self, *args, **kwargs):
            logger.info("Mock: Adding middleware")
            
        def get(self, path, **kwargs):
            def decorator(func):
                logger.info(f"Mock: Registered GET {path}")
                return func
            return decorator
            
        def post(self, path, **kwargs):
            def decorator(func):
                logger.info(f"Mock: Registered POST {path}")
                return func
            return decorator
            
        def include_router(self, *args, **kwargs):
            logger.info("Mock: Including router")
    
    return MockFastAPI()

if FULL_SERVICES_AVAILABLE:
    # Create real FastAPI app
    app = FastAPI(
        title="AlgoDiscovery Trading API",
        description="Advanced Trading Platform - Main Orchestrator",
        version="2.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:8501", 
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8501",
            "http://localhost:8000",
            "http://127.0.0.1:8000"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    @app.get("/health")
    async def health_check():
        """Health check endpoint."""
        return {
            "status": "healthy",
            "service": "Main Orchestrator",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "2.0.0",
            "mode": "full_services",
            "services": {
                "long_term_service": "http://localhost:8001",
                "analytics_service": "http://localhost:8002", 
                "order_service": "http://localhost:8003"
            }
        }
    
    @app.get("/status")
    async def service_status():
        """Get status of all services."""
        import aiohttp
        
        services = {
            "long_term_service": "http://localhost:8001/health",
            "analytics_service": "http://localhost:8002/health",
            "order_service": "http://localhost:8003/health"
        }
        
        status = {}
        
        async with aiohttp.ClientSession() as session:
            for service_name, url in services.items():
                try:
                    async with session.get(url, timeout=5) as response:
                        if response.status == 200:
                            status[service_name] = "healthy"
                        else:
                            status[service_name] = "unhealthy"
                except Exception:
                    status[service_name] = "unavailable"
        
        return {
            "orchestrator": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "services": status
        }
    
    @app.get("/api/version")
    async def get_version():
        """Get API version information."""
        return {
            "api_version": "2.0.0",
            "service": "Main Orchestrator",
            "build_date": "2024-01-01",
            "features": [
                "Service Orchestration",
                "Health Monitoring", 
                "API Gateway",
                "Cross-Service Communication"
            ]
        }
    
    @app.get("/api/services")
    async def list_services():
        """List all available services."""
        return {
            "services": [
                {
                    "name": "Long-Term Investment Service",
                    "url": "http://localhost:8001",
                    "description": "Long-term investment analysis and recommendations"
                },
                {
                    "name": "Analytics & Backtesting Service", 
                    "url": "http://localhost:8002",
                    "description": "Portfolio analytics and strategy backtesting"
                },
                {
                    "name": "Order Management Service",
                    "url": "http://localhost:8003", 
                    "description": "Order placement and portfolio management"
                }
            ]
        }
    
    @app.get("/")
    async def root():
        """Root endpoint with service information."""
        return {
            "message": "AlgoDiscovery Trading Platform - Main Orchestrator",
            "version": "2.0.0",
            "status": "online",
            "documentation": "/docs",
            "health_check": "/health",
            "services": "/api/services"
        }

else:
    # Create mock app for fallback
    app = create_mock_app()
    logger.warning("Running in mock mode - limited functionality available")

def check_service_health(service: str) -> Dict[str, Any]:
    """Check health of individual services."""
    service_urls = {
        "longterm": "http://localhost:8001/health",
        "analytics": "http://localhost:8002/health", 
        "order": "http://localhost:8003/health"
    }
    
    import requests
    
    try:
        if service in service_urls:
            response = requests.get(service_urls[service], timeout=5)
            if response.status_code == 200:
                return {"status": "healthy", "response": response.json()}
            else:
                return {"status": "unhealthy", "code": response.status_code}
    except Exception as e:
        return {"status": "unavailable", "error": str(e)}
    
    return {"status": "unknown", "error": "Service not found"}

def main():
    """Main function to start the server."""
    try:
        logger.info("🚀 Starting Main Orchestrator Server...")
        logger.info(f"📊 Service Mode: {'Full Services' if FULL_SERVICES_AVAILABLE else 'Mock Mode'}")
        
        if FULL_SERVICES_AVAILABLE:
            # Start with uvicorn
            uvicorn.run(
                app,
                host="0.0.0.0",
                port=8000,
                log_level="info",
                access_log=True
            )
        else:
            # Mock server mode
            logger.info("🔧 Running in mock mode - creating basic HTTP server...")
            from http.server import HTTPServer, BaseHTTPRequestHandler
            import json
            
            class MockHandler(BaseHTTPRequestHandler):
                def do_GET(self):
                    if self.path == "/health":
                        response = {
                            "status": "healthy",
                            "service": "Main Orchestrator (Mock)",
                            "timestamp": datetime.utcnow().isoformat(),
                            "mode": "mock"
                        }
                    elif self.path == "/":
                        response = {
                            "message": "AlgoDiscovery Trading Platform - Main Orchestrator (Mock Mode)",
                            "status": "online",
                            "note": "Limited functionality - install full dependencies for complete features"
                        }
                    else:
                        response = {"error": "Not found", "path": self.path}
                    
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps(response, indent=2).encode())
                
                def log_message(self, format, *args):
                    logger.info(f"Mock server: {format % args}")
            
            server = HTTPServer(("0.0.0.0", 8000), MockHandler)
            logger.info("🌐 Mock server running on http://0.0.0.0:8000")
            logger.info("📖 Health check: http://0.0.0.0:8000/health")
            server.serve_forever()
            
    except KeyboardInterrupt:
        logger.info("🛑 Shutting down gracefully...")
    except Exception as e:
        logger.error(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 