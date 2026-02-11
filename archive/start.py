#!/usr/bin/env python3
"""
AlgoDiscovery Trading System Startup Script
==========================================

Main startup script for the automated trading backend API.
This script handles environment setup and starts the FastAPI server.
"""

import os
import sys
import logging
from pathlib import Path

def setup_paths():
    """Setup Python paths and working directory."""
    # Add api directory to Python path
    project_root = Path(__file__).parent
    api_dir = project_root / "api"
    sys.path.insert(0, str(api_dir))
    
    # Change to api directory for proper imports
    os.chdir(api_dir)
    
    return project_root, api_dir

def setup_environment(project_root, api_dir):
    """Setup environment and directories."""
    # Import settings after path setup
    from config import app_settings, server_config
    
    # Setup directories
    app_settings.setup_directories()
    
    # Create data and logs directories
    os.makedirs(project_root / "data", exist_ok=True)
    os.makedirs(project_root / "logs", exist_ok=True)
    os.makedirs(api_dir / "data", exist_ok=True)
    os.makedirs(api_dir / "logs", exist_ok=True)
    
    # Setup basic logging
    logging.basicConfig(
        level=getattr(logging, app_settings.log_level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    logger = logging.getLogger(__name__)
    logger.info(f"🚀 Starting {app_settings.app_name} v{app_settings.version}")
    logger.info(f"📁 Project root: {project_root}")
    logger.info(f"📁 API directory: {api_dir}")
    logger.info(f"🌍 Environment: {app_settings.environment}")
    logger.info(f"🔧 Debug mode: {app_settings.debug}")
    logger.info(f"🌐 Server: {server_config.host}:{server_config.port}")
    
    return app_settings, server_config

def main():
    """Main function to start the API server."""
    try:
        # Setup paths and environment
        project_root, api_dir = setup_paths()
        app_settings, server_config = setup_environment(project_root, api_dir)
        
        # Import uvicorn after path setup
        import uvicorn
        
        # Configure uvicorn to run the main app
        config = {
            "app": "main:app",  # This will import main.py from api directory
            "host": server_config.host,
            "port": server_config.port,
            "reload": server_config.reload and app_settings.debug,
            "workers": server_config.workers if not app_settings.debug else 1,
            "log_level": "info",
            "access_log": True,
            "use_colors": True,
        }
        
        # Add SSL if configured
        ssl_keyfile = os.getenv("SSL_KEYFILE")
        ssl_certfile = os.getenv("SSL_CERTFILE")
        if ssl_keyfile and ssl_certfile:
            config.update({
                "ssl_keyfile": ssl_keyfile,
                "ssl_certfile": ssl_certfile
            })
        
        # Start the server
        print(f"\n🎯 AlgoDiscovery Trading API")
        print(f"📊 Advanced Intraday Stock Discovery & Trading Backend")
        print(f"🌐 Server starting at: http://{server_config.host}:{server_config.port}")
        print(f"📖 API Documentation: http://{server_config.host}:{server_config.port}/docs")
        print(f"🔄 WebSocket Endpoint: ws://{server_config.host}:{server_config.port}/ws/live-data")
        print(f"✨ Yahoo Finance API: http://{server_config.host}:{server_config.port}/api/yahoo/")
        print("─" * 60)
        
        uvicorn.run(**config)
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down gracefully...")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        logging.error(f"Server startup failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 