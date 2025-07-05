#!/usr/bin/env python3
"""
Cache Refresh Service
====================

Automatically refreshes API caches every hour when:
- Internet connectivity is available
- Market conditions are appropriate (optional market-aware refresh)

This service ensures that cached recommendations stay fresh and APIs
always have recent data available for fast responses.

Author: AI Assistant
Date: 2025-07-03
"""

import asyncio
import logging
import sys
import time
import requests
from datetime import datetime, timedelta
from pathlib import Path

# Add project paths
sys.path.append(str(Path(__file__).parent))
sys.path.append(str(Path(__file__).parent / "api"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(Path(__file__).parent / "logs" / "cache-refresh.log")
    ]
)
logger = logging.getLogger(__name__)

class InternetConnectivityChecker:
    """Check internet connectivity."""
    
    @staticmethod
    def is_connected() -> bool:
        """Check if internet connection is available."""
        try:
            # Test multiple endpoints for reliability
            test_urls = [
                "https://www.google.com",
                "https://1.1.1.1",
                "https://8.8.8.8"
            ]
            
            for url in test_urls:
                try:
                    response = requests.get(url, timeout=5)
                    if response.status_code == 200:
                        return True
                except:
                    continue
            
            return False
        except Exception:
            return False

class CacheRefreshService:
    """Service to refresh API caches periodically."""
    
    def __init__(self):
        self.refresh_interval = 3600  # 1 hour in seconds
        self.api_endpoints = {
            "longterm": "http://localhost:8001",
            "swing": "http://localhost:8002", 
            "shortterm": "http://localhost:8003"
        }
        self.connectivity_checker = InternetConnectivityChecker()
        self.last_refresh_times = {}
        
    async def check_api_health(self, service_name: str, base_url: str) -> bool:
        """Check if an API service is healthy."""
        try:
            response = requests.get(f"{base_url}/health", timeout=10)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"❌ {service_name} API health check failed: {e}")
            return False
    
    async def refresh_api_cache(self, service_name: str, base_url: str) -> bool:
        """Refresh cache for a specific API service."""
        try:
            # Determine the appropriate endpoint for cache refresh
            refresh_endpoints = {
                "longterm": "/api/longterm/long-buy-recommendations",
                "swing": "/api/swing/swing-buy-recommendations",
                "shortterm": "/api/shortterm/shortterm-buy-recommendations"
            }
            
            endpoint = refresh_endpoints.get(service_name)
            if not endpoint:
                logger.error(f"❌ Unknown service: {service_name}")
                return False
            
            # Force refresh request
            refresh_data = {
                "force_refresh": True,
                "top_recommendations": 10,  # Smaller number for cache refresh
                "min_score": 25.0
            }
            
            logger.info(f"🔄 Refreshing {service_name} cache...")
            
            response = requests.post(
                f"{base_url}{endpoint}",
                json=refresh_data,
                timeout=120  # 2 minutes timeout for analysis
            )
            
            if response.status_code == 200:
                data = response.json()
                recommendations_count = len(data.get("recommendations", []))
                logger.info(f"✅ {service_name} cache refreshed: {recommendations_count} recommendations")
                self.last_refresh_times[service_name] = datetime.now()
                return True
            else:
                logger.error(f"❌ {service_name} cache refresh failed: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error refreshing {service_name} cache: {e}")
            return False
    
    async def refresh_all_caches(self):
        """Refresh all API caches."""
        logger.info("🔄 Starting cache refresh cycle...")
        
        # Check internet connectivity
        if not self.connectivity_checker.is_connected():
            logger.warning("❌ No internet connectivity - skipping cache refresh")
            return
        
        logger.info("✅ Internet connectivity confirmed")
        
        # Refresh each API cache
        results = {}
        for service_name, base_url in self.api_endpoints.items():
            # Check if API is healthy
            if not await self.check_api_health(service_name, base_url):
                logger.warning(f"❌ {service_name} API is not healthy - skipping")
                results[service_name] = False
                continue
            
            # Refresh cache
            success = await self.refresh_api_cache(service_name, base_url)
            results[service_name] = success
            
            # Small delay between requests
            await asyncio.sleep(5)
        
        # Log summary
        successful = sum(1 for success in results.values() if success)
        total = len(results)
        logger.info(f"📊 Cache refresh summary: {successful}/{total} services refreshed successfully")
        
        return results
    
    def should_refresh(self, service_name: str) -> bool:
        """Check if a service cache should be refreshed based on time."""
        last_refresh = self.last_refresh_times.get(service_name)
        if not last_refresh:
            return True
        
        time_since_refresh = datetime.now() - last_refresh
        return time_since_refresh.total_seconds() >= self.refresh_interval
    
    async def run_continuous(self):
        """Run the cache refresh service continuously."""
        logger.info("🚀 Starting Cache Refresh Service")
        logger.info(f"⏱️  Refresh interval: {self.refresh_interval} seconds ({self.refresh_interval//60} minutes)")
        logger.info(f"🎯 Monitoring {len(self.api_endpoints)} API services")
        
        while True:
            try:
                # Check if any service needs refresh
                services_needing_refresh = [
                    service for service in self.api_endpoints.keys()
                    if self.should_refresh(service)
                ]
                
                if services_needing_refresh:
                    logger.info(f"🔄 Services needing refresh: {', '.join(services_needing_refresh)}")
                    await self.refresh_all_caches()
                else:
                    next_refresh_times = {}
                    for service_name in self.api_endpoints.keys():
                        last_refresh = self.last_refresh_times.get(service_name)
                        if last_refresh:
                            next_refresh = last_refresh + timedelta(seconds=self.refresh_interval)
                            next_refresh_times[service_name] = next_refresh.strftime("%H:%M:%S")
                    
                    logger.info(f"💤 All caches are fresh. Next refresh times: {next_refresh_times}")
                
                # Wait before next check (check every 10 minutes)
                await asyncio.sleep(600)  # 10 minutes
                
            except KeyboardInterrupt:
                logger.info("🛑 Cache refresh service stopped by user")
                break
            except Exception as e:
                logger.error(f"❌ Error in cache refresh service: {e}")
                logger.info("⏳ Waiting 1 minute before retry...")
                await asyncio.sleep(60)

async def main():
    """Main entry point."""
    # Ensure logs directory exists
    logs_dir = Path(__file__).parent / "logs"
    logs_dir.mkdir(exist_ok=True)
    
    logger.info("=" * 60)
    logger.info("🔄 CACHE REFRESH SERVICE STARTING")
    logger.info("=" * 60)
    
    try:
        service = CacheRefreshService()
        await service.run_continuous()
    except KeyboardInterrupt:
        logger.info("🛑 Service stopped by user")
    except Exception as e:
        logger.error(f"❌ Service failed: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main()) 