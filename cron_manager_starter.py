#!/usr/bin/env python3
"""
Cron Manager Starter
===================

Starter script for the Trading Cron Manager with enhanced features:
- Internet connectivity awareness
- Proper error handling and recovery
- Integration with supervisor for automatic restart
- Comprehensive logging

Author: AI Assistant
Date: 2025-07-03
"""

import asyncio
import logging
import sys
import signal
from pathlib import Path
from datetime import datetime

# Add project paths
sys.path.append(str(Path(__file__).parent))
sys.path.append(str(Path(__file__).parent / "cron"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(name)s | %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path(__file__).parent / "logs" / "trading-cron.log")
    ]
)
logger = logging.getLogger(__name__)

class CronManagerService:
    """Enhanced cron manager service with supervision capabilities."""
    
    def __init__(self):
        self.cron_manager = None
        self.running = False
        self.shutdown_event = asyncio.Event()
        
    async def initialize_cron_manager(self):
        """Initialize the cron manager."""
        try:
            logger.info("🔄 Initializing Trading Cron Manager...")
            
            # Import the cron manager
            from cron.manager import TradingCronManager
            
            # Create and initialize the cron manager
            self.cron_manager = TradingCronManager()
            await self.cron_manager.initialize()
            
            logger.info("✅ Trading Cron Manager initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize cron manager: {e}")
            return False
    
    async def start_cron_manager(self):
        """Start the cron manager."""
        try:
            if not self.cron_manager:
                logger.error("❌ Cron manager not initialized")
                return False
            
            logger.info("🚀 Starting Trading Cron Manager...")
            
            # Start the cron manager
            await self.cron_manager.start()
            
            logger.info("✅ Trading Cron Manager started successfully")
            self.running = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to start cron manager: {e}")
            return False
    
    async def stop_cron_manager(self):
        """Stop the cron manager gracefully."""
        try:
            if self.cron_manager and self.running:
                logger.info("🛑 Stopping Trading Cron Manager...")
                await self.cron_manager.stop()
                logger.info("✅ Trading Cron Manager stopped")
            
            self.running = False
            
        except Exception as e:
            logger.error(f"❌ Error stopping cron manager: {e}")
    
    def check_internet_connectivity(self) -> bool:
        """Check internet connectivity using the monitor status file."""
        try:
            status_file = Path(__file__).parent / "logs" / "connection_status.txt"
            
            if status_file.exists():
                with open(status_file, 'r') as f:
                    lines = f.read().strip().split('\n')
                    if len(lines) >= 1:
                        return lines[0].lower() == 'true'
            
            # If no status file, assume disconnected for safety
            return False
            
        except Exception:
            return False
    
    async def monitor_and_restart(self):
        """Monitor the cron manager and restart if needed."""
        logger.info("🔍 Starting cron manager monitoring...")
        
        while not self.shutdown_event.is_set():
            try:
                # Check if cron manager is still running
                if self.running and self.cron_manager:
                    # Get status
                    try:
                        status = self.cron_manager.get_status()
                        if status.get('status') != 'running':
                            logger.warning("⚠️ Cron manager not running, attempting restart...")
                            await self.restart_cron_manager()
                    except Exception as e:
                        logger.warning(f"⚠️ Could not get cron manager status: {e}")
                        await self.restart_cron_manager()
                
                # Wait before next check
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                logger.error(f"❌ Error in monitoring loop: {e}")
                await asyncio.sleep(30)
    
    async def restart_cron_manager(self):
        """Restart the cron manager."""
        logger.info("🔄 Restarting Trading Cron Manager...")
        
        try:
            # Stop current manager
            await self.stop_cron_manager()
            
            # Wait a bit
            await asyncio.sleep(5)
            
            # Reinitialize and start
            if await self.initialize_cron_manager():
                await self.start_cron_manager()
                logger.info("✅ Trading Cron Manager restarted successfully")
            else:
                logger.error("❌ Failed to restart cron manager")
                
        except Exception as e:
            logger.error(f"❌ Error during restart: {e}")
    
    async def run_service(self):
        """Run the complete cron manager service."""
        logger.info("🚀 Starting Trading Cron Manager Service")
        
        # Initialize and start cron manager
        if not await self.initialize_cron_manager():
            logger.error("❌ Failed to initialize, exiting")
            return
        
        if not await self.start_cron_manager():
            logger.error("❌ Failed to start, exiting")
            return
        
        # Start monitoring in background
        monitor_task = asyncio.create_task(self.monitor_and_restart())
        
        try:
            # Wait for shutdown signal
            await self.shutdown_event.wait()
        except KeyboardInterrupt:
            logger.info("🛑 Received shutdown signal")
        finally:
            # Cleanup
            monitor_task.cancel()
            await self.stop_cron_manager()
            logger.info("🏁 Trading Cron Manager Service stopped")
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals."""
        logger.info(f"📡 Received signal {signum}")
        self.shutdown_event.set()

async def main():
    """Main entry point."""
    # Ensure logs directory exists
    logs_dir = Path(__file__).parent / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("⏰ TRADING CRON MANAGER SERVICE STARTING")
    logger.info("=" * 60)
    logger.info(f"📅 Start time: {datetime.now().isoformat()}")
    logger.info(f"📁 Working directory: {Path(__file__).parent}")
    logger.info(f"🐍 Python version: {sys.version.split()[0]}")
    
    try:
        # Create service
        service = CronManagerService()
        
        # Setup signal handlers
        for sig in [signal.SIGTERM, signal.SIGINT]:
            signal.signal(sig, service.signal_handler)
        
        # Run service
        await service.run_service()
        
    except KeyboardInterrupt:
        logger.info("🛑 Service stopped by user")
    except Exception as e:
        logger.error(f"❌ Service failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main()) 