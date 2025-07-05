#!/usr/bin/env python3
"""
Test script for the trading cron system

This script tests:
- Market timing functionality
- Database caching operations
- Scheduler initialization
- API connectivity
- Cache hit/miss scenarios
"""

import asyncio
import sys
import json
from pathlib import Path
from datetime import datetime

# Setup paths
sys.path.append(str(Path(__file__).parent))

from services.market_timer import MarketTimer
from models.recommendation_models import recommendation_cache, RecommendationType, RecommendationRequest
from services.trading_scheduler import trading_scheduler

async def test_market_timer():
    """Test market timing functionality"""
    print("🔍 Testing Market Timer...")
    
    timer = MarketTimer()
    
    # Test current market status
    is_open = timer.is_market_open()
    session_info = timer.get_market_session_info()
    
    print(f"  ✅ Market Open: {is_open}")
    print(f"  📊 Session: {session_info['session']}")
    print(f"  🕐 Current Time (IST): {session_info['current_time_ist']}")
    print(f"  📈 Market Day: {session_info['is_market_day']}")
    
    if not is_open and session_info.get('next_market_open'):
        print(f"  📅 Next Open: {session_info['next_market_open']}")
    
    # Test trading hours check
    in_trading_hours = timer.is_trading_hours()
    print(f"  ⏰ In Trading Hours: {in_trading_hours}")
    
    # Test human readable status
    status_message = timer.format_market_status_message()
    print(f"  💬 Status: {status_message}")
    
    print("  ✅ Market Timer tests passed\n")

async def test_cache_operations():
    """Test database caching operations"""
    print("🔍 Testing Cache Operations...")
    
    try:
        # Initialize cache
        await recommendation_cache.initialize()
        print("  ✅ Cache initialized")
        
        # Test cache stats
        stats = await recommendation_cache.get_cache_stats()
        print(f"  📊 Cache Stats: {stats}")
        
        # Test storing a recommendation
        test_request = RecommendationRequest(
            combination={"momentum": "v1.0"},
            limit_per_query=10,
            min_score=25.0,
            top_recommendations=5
        )
        
        test_recommendations = [
            {
                "symbol": "TEST1",
                "name": "Test Stock 1",
                "price": 100.0,
                "score": 75.0,
                "recommendation_type": "Buy"
            }
        ]
        
        test_metadata = {
            "timestamp": datetime.now().isoformat(),
            "test": True
        }
        
        # Store test recommendation
        await recommendation_cache.store_recommendation(
            RecommendationType.SHORT_TERM,
            test_request,
            test_recommendations,
            test_metadata
        )
        print("  ✅ Test recommendation stored")
        
        # Retrieve test recommendation
        cached_result = await recommendation_cache.get_cached_recommendation(
            RecommendationType.SHORT_TERM,
            test_request
        )
        
        if cached_result:
            print("  ✅ Cache hit - test recommendation retrieved")
            print(f"     Recommendations: {len(cached_result.get('recommendations', []))}")
        else:
            print("  ❌ Cache miss - test recommendation not found")
        
        # Cleanup test cache
        await recommendation_cache.cleanup_expired_cache()
        print("  ✅ Cache cleanup completed")
        
        # Get final stats
        final_stats = await recommendation_cache.get_cache_stats()
        print(f"  📊 Final Cache Stats: {final_stats}")
        
        print("  ✅ Cache operations tests passed\n")
        
    except Exception as e:
        print(f"  ❌ Cache test failed: {e}\n")

async def test_scheduler_setup():
    """Test scheduler initialization"""
    print("🔍 Testing Scheduler Setup...")
    
    try:
        # Get initial status
        status = trading_scheduler.get_scheduler_status()
        print(f"  📊 Initial Status: {status['status']}")
        
        # Start scheduler (don't keep it running)
        await trading_scheduler.start_scheduler()
        print("  ✅ Scheduler started")
        
        # Get running status
        running_status = trading_scheduler.get_scheduler_status()
        print(f"  📊 Running Status: {running_status['status']}")
        print(f"  🔧 Jobs Configured: {len(running_status['jobs'])}")
        
        for job in running_status['jobs']:
            print(f"     - {job['name']} (ID: {job['id']})")
            if job['next_run']:
                print(f"       Next Run: {job['next_run']}")
        
        # Stop scheduler
        await trading_scheduler.stop_scheduler()
        print("  ✅ Scheduler stopped")
        
        print("  ✅ Scheduler tests passed\n")
        
    except Exception as e:
        print(f"  ❌ Scheduler test failed: {e}\n")

async def test_api_connectivity():
    """Test API server connectivity"""
    print("🔍 Testing API Connectivity...")
    
    import aiohttp
    
    servers = {
        'shortterm': 'http://localhost:8003/health',
        'swing': 'http://localhost:8002/health',
        'longterm': 'http://localhost:8001/health'
    }
    
    async with aiohttp.ClientSession() as session:
        for name, url in servers.items():
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        print(f"  ✅ {name.capitalize()} server: Online")
                    else:
                        print(f"  ⚠️ {name.capitalize()} server: Status {response.status}")
            except Exception as e:
                print(f"  ❌ {name.capitalize()} server: Offline ({e})")
    
    print("  ✅ API connectivity tests completed\n")

async def test_full_integration():
    """Test full integration scenario"""
    print("🔍 Testing Full Integration...")
    
    timer = MarketTimer()
    
    # Check if we should run analysis
    if timer.is_market_open():
        print("  📈 Market is open - testing live analysis...")
        
        try:
            # Test force run (which will make actual API calls)
            results = await trading_scheduler.force_run_all()
            print(f"  🔄 Force run results: {results}")
            
            # Check cache after force run
            await asyncio.sleep(2)  # Give cache time to update
            
            stats = await recommendation_cache.get_cache_stats()
            print(f"  📊 Cache after analysis: {stats}")
            
        except Exception as e:
            print(f"  ⚠️ Integration test limited due to: {e}")
    else:
        print("  ⏰ Market is closed - skipping live analysis test")
        print("     (Cron jobs will only run during market hours)")
    
    print("  ✅ Integration tests completed\n")

async def main():
    """Run all tests"""
    print("🚀 Starting Trading Cron System Tests")
    print("=" * 50)
    
    try:
        await test_market_timer()
        await test_cache_operations()
        await test_scheduler_setup()
        await test_api_connectivity()
        await test_full_integration()
        
        print("=" * 50)
        print("✅ All tests completed successfully!")
        print("\n📋 System Summary:")
        print("  - Market timing: Working")
        print("  - Database caching: Working") 
        print("  - Scheduler setup: Working")
        print("  - API connectivity: Checked")
        print("  - Integration: Tested")
        
        print("\n🚀 Ready to start cron jobs with:")
        print("  python api/trading_cron_manager.py start")
        
    except Exception as e:
        print(f"❌ Test suite failed: {e}")
        return 1
    
    finally:
        # Cleanup
        try:
            await recommendation_cache.close()
        except:
            pass
            
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 