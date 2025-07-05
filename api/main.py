#!/usr/bin/env python3
"""
AlgoDiscovery Trading API - Main Entry Point
============================================

This is the main entry point for the AlgoDiscovery Trading API.
It loads environment configuration and starts the FastAPI server.
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
env_file = project_root / "config" / "environments" / "api" / "env.api"
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
        logging.FileHandler(os.getenv("LOG_FILE", "./logs/api.log")),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Main entry point for the API server"""
    try:
        logger.info("🚀 Starting AlgoDiscovery Trading API...")
        
        # Import and start the FastAPI app
        from api.app import app
        import uvicorn
        
        # Get configuration from environment
        host = os.getenv("HOST", "0.0.0.0")
        port = int(os.getenv("PORT", "8888"))
        reload = os.getenv("RELOAD", "true").lower() == "true"
        workers = int(os.getenv("WORKERS", "1"))
        
        logger.info(f"📡 Starting server on {host}:{port}")
        logger.info(f"🔄 Reload enabled: {reload}")
        logger.info(f"👥 Workers: {workers}")
        
        # Start the server
        uvicorn.run(
            "api.app:app",
            host=host,
            port=port,
            reload=reload,
            workers=workers if not reload else 1,
            log_level=os.getenv("LOG_LEVEL", "info").lower()
        )
        
    except KeyboardInterrupt:
        logger.info("🛑 Server stopped by user")
    except Exception as e:
        logger.error(f"❌ Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 