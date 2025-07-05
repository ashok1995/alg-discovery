#!/usr/bin/env python3
"""
AlgoDiscovery Trading Cron - Main Entry Point
============================================

This is the main entry point for the AlgoDiscovery Trading Cron jobs.
It loads environment configuration and starts the cron job manager.
"""

import os
import sys
import logging
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Add the project root to the Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load environment configuration
env_file = project_root / "config" / "environments" / "cron" / "env.cron"
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
        logging.FileHandler(os.getenv("LOG_FILE", "./logs/cron.log")),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Main entry point for the cron job manager"""
    try:
        logger.info("🚀 Starting AlgoDiscovery Trading Cron Manager...")
        
        # Import and start the cron manager
        from cron.manager import TradingCronManager
        
        # Create and start the cron manager
        manager = TradingCronManager()
        
        # Run the manager
        asyncio.run(manager.start_all_services())
        
    except KeyboardInterrupt:
        logger.info("🛑 Cron manager stopped by user")
    except Exception as e:
        logger.error(f"❌ Failed to start cron manager: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 