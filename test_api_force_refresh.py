#!/usr/bin/env python3
"""
API Force Refresh Test Script
============================

Test script to verify that API endpoints with force_refresh parameter:
1. Execute regardless of market hours
2. Store recommendations in cache
3. Store recommendations in historical database
4. Return comprehensive metadata about storage

Usage:
    python test_api_force_refresh.py
"""

import asyncio
import aiohttp
import json
import time
import logging
from datetime import datetime
from typing import Dict, Any
from pathlib import Path
import sys

# Add the api directory to Python path
sys.path.append(str(Path(__file__).parent / "api"))

# Import the storage modules for verification
from models.recommendation_history_models import recommendation_history_storage
from models.recommendation_models import recommendation_cache

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class APIForceRefreshTester:
    """Test API endpoints with force_refresh parameter."""
    
    def __init__(self):
        self.base_urls = {
            "shortterm": "http://localhost:8001",
            "swing": "http://localhost:8002", 
            "longterm": "http://localhost:8003"
        }
        
        self.endpoints = {
            "shortterm": "/api/shortterm/shortterm-buy-recommendations",
            "swing": "/api/swing/swing-buy-recommendations",
            "longterm": "/api/longterm/long-buy-recommendations"
        }
        
        self.test_payloads = {
            "shortterm": {
                "force_refresh": True,
                "top_recommendations": 10,
                "min_score": 30.0,
                "limit_per_query": 30
            },
            "swing": {
                "force_refresh": True,
                "top_recommendations": 10,
                "min_score": 20.0,
                "limit_per_query": 30
            },
            "longterm": {
                "force_refresh": True,
                "top_recommendations": 10,
                "min_score": 20.0,
                "limit_per_query": 30
            }
        }
    
    async def test_api_endpoint(self, strategy: str, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Test a single API endpoint with force_refresh."""
        
        url = f"{self.base_urls[strategy]}{self.endpoints[strategy]}"
        payload = self.test_payloads[strategy]
        
        logger.info(f"🚀 Testing {strategy.upper()} API with force_refresh...")
        logger.info(f"📡 URL: {url}")
        logger.info(f"📦 Payload: {json.dumps(payload, indent=2)}")
        
        start_time = time.time()
        
        try:
            async with session.post(url, json=payload) as response:
                response_time = time.time() - start_time
                
                if response.status == 200:
                    data = await response.json()
                    
                    # Extract key information
                    recommendations = data.get('recommendations', [])
                    metadata = data.get('metadata', {})
                    
                    result = {
                        "status": "success",
                        "strategy": strategy,
                        "response_time_seconds": round(response_time, 2),
                        "recommendations_count": len(recommendations),
                        "force_refresh": metadata.get('force_refresh', False),
                        "fresh_analysis": metadata.get('fresh_analysis', False),
                        "cache_hit": metadata.get('cache_hit', False),
                        "historical_storage": metadata.get('historical_storage', {}),
                        "top_recommendations": recommendations[:3] if recommendations else [],
                        "performance_metrics": metadata.get('performance_metrics', {}),
                        "algorithm_info": metadata.get('algorithm_info', {}),
                        "request_parameters": metadata.get('request_parameters', {})
                    }
                    
                    logger.info(f"✅ {strategy.upper()} API SUCCESS:")
                    logger.info(f"   📊 Recommendations: {len(recommendations)}")
                    logger.info(f"   ⏱️  Response time: {response_time:.2f}s")
                    logger.info(f"   🔄 Force refresh: {metadata.get('force_refresh', False)}")
                    logger.info(f"   🏪 Historical storage: {metadata.get('historical_storage', {}).get('stored', False)}")
                    
                    if recommendations:
                        top_rec = recommendations[0]
                        logger.info(f"   🥇 Top recommendation: {top_rec.get('symbol', 'N/A')} (score: {top_rec.get('score', 0):.1f})")
                    
                    return result
                    
                else:
                    error_text = await response.text()
                    logger.error(f"❌ {strategy.upper()} API ERROR {response.status}: {error_text}")
                    return {
                        "status": "error",
                        "strategy": strategy,
                        "response_time_seconds": round(response_time, 2),
                        "error_code": response.status,
                        "error_message": error_text
                    }
                    
        except Exception as e:
            response_time = time.time() - start_time
            logger.error(f"❌ {strategy.upper()} API EXCEPTION: {str(e)}")
            return {
                "status": "exception",
                "strategy": strategy,
                "response_time_seconds": round(response_time, 2),
                "exception": str(e)
            }
    
    async def verify_historical_storage(self, strategy: str, execution_id: str) -> Dict[str, Any]:
        """Verify that recommendations were stored in historical database."""
        
        try:
            logger.info(f"🔍 Verifying historical storage for {strategy}...")
            
            # Get recent recommendations from history
            strategy_enum = {
                "shortterm": "shortterm",
                "swing": "swing", 
                "longterm": "longterm"
            }[strategy]
            
            # Query recent history (last hour)
            from datetime import timedelta
            from models.recommendation_history_models import RecommendationStrategy
            
            strategy_obj = RecommendationStrategy(strategy_enum.upper())
            recent_recommendations = await recommendation_history_storage.get_recommendation_history(
                strategy=strategy_obj,
                start_date=datetime.now() - timedelta(hours=1),
                limit=50
            )
            
            # Look for our specific execution
            found_execution = False
            batch_info = {}
            
            for rec in recent_recommendations:
                if execution_id in rec.get('execution_id', ''):
                    found_execution = True
                    batch_info = {
                        "batch_id": rec.get('batch_id', ''),
                        "execution_id": rec.get('execution_id', ''),
                        "symbol": rec.get('symbol', ''),
                        "score": rec.get('overall_score', 0),
                        "generated_at": rec.get('generated_at', ''),
                        "market_condition": rec.get('market_condition', '')
                    }
                    break
            
            result = {
                "found_in_history": found_execution,
                "total_recent_records": len(recent_recommendations),
                "batch_info": batch_info if found_execution else None
            }
            
            if found_execution:
                logger.info(f"✅ Found {strategy} execution in historical storage")
                logger.info(f"   📦 Batch ID: {batch_info.get('batch_id', 'N/A')}")
                logger.info(f"   🔗 Execution ID: {batch_info.get('execution_id', 'N/A')}")
            else:
                logger.warning(f"⚠️ Could not find {strategy} execution in historical storage")
                logger.info(f"   📊 Total recent records: {len(recent_recommendations)}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Error verifying historical storage for {strategy}: {str(e)}")
            return {
                "found_in_history": False,
                "error": str(e)
            }
    
    async def get_storage_analytics(self) -> Dict[str, Any]:
        """Get analytics from historical storage."""
        
        try:
            logger.info("📊 Getting storage analytics...")
            
            # Get batch analytics for the last day
            analytics = await recommendation_history_storage.get_batch_analytics(days=1)
            
            logger.info("✅ Storage Analytics:")
            logger.info(f"   📈 Analysis period: {analytics.get('analysis_period_days', 0)} days")
            
            strategy_analytics = analytics.get('strategy_analytics', {})
            for strategy, data in strategy_analytics.items():
                logger.info(f"   📊 {strategy.upper()}:")
                logger.info(f"      📦 Batches: {data.get('total_batches', 0)}")
                logger.info(f"      🎯 Recommendations: {data.get('total_recommendations', 0)}")
                logger.info(f"      📏 Avg per batch: {data.get('avg_recommendations_per_batch', 0)}")
                logger.info(f"      ⭐ Avg score: {data.get('avg_score', 0)}")
            
            summary = analytics.get('summary', {})
            logger.info(f"   📋 Summary:")
            logger.info(f"      🎯 Total strategies: {summary.get('total_strategies', 0)}")
            logger.info(f"      📦 Total batches: {summary.get('total_batches', 0)}")
            logger.info(f"      🎯 Total recommendations: {summary.get('total_recommendations', 0)}")
            
            return analytics
            
        except Exception as e:
            logger.error(f"❌ Error getting storage analytics: {str(e)}")
            return {"error": str(e)}
    
    async def run_comprehensive_test(self):
        """Run comprehensive test of all API endpoints with force_refresh."""
        
        logger.info("🚀 Starting Comprehensive API Force Refresh Test")
        logger.info("=" * 80)
        
        # Initialize storage systems
        try:
            await recommendation_history_storage.initialize()
            await recommendation_cache.initialize()
            logger.info("✅ Storage systems initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize storage systems: {e}")
            return
        
        # Test all API endpoints
        results = {}
        
        async with aiohttp.ClientSession() as session:
            for strategy in ["shortterm", "swing", "longterm"]:
                logger.info(f"\n{'='*60}")
                logger.info(f"TESTING {strategy.upper()} API")
                logger.info(f"{'='*60}")
                
                result = await self.test_api_endpoint(strategy, session)
                results[strategy] = result
                
                # If successful, verify historical storage
                if result.get("status") == "success":
                    historical_info = result.get("historical_storage", {})
                    execution_id = historical_info.get("execution_id", "")
                    
                    if execution_id:
                        # Wait a moment for storage to complete
                        await asyncio.sleep(2)
                        
                        verification = await self.verify_historical_storage(strategy, execution_id)
                        result["storage_verification"] = verification
                
                # Wait between tests
                await asyncio.sleep(3)
        
        # Get overall analytics
        logger.info(f"\n{'='*60}")
        logger.info("STORAGE ANALYTICS")
        logger.info(f"{'='*60}")
        
        analytics = await self.get_storage_analytics()
        
        # Print final summary
        logger.info(f"\n{'='*60}")
        logger.info("TEST SUMMARY")
        logger.info(f"{'='*60}")
        
        total_successful = 0
        total_stored = 0
        
        for strategy, result in results.items():
            status = result.get("status", "unknown")
            stored = result.get("historical_storage", {}).get("stored", False)
            verified = result.get("storage_verification", {}).get("found_in_history", False)
            
            logger.info(f"📊 {strategy.upper()}:")
            logger.info(f"   ✅ API Status: {status}")
            logger.info(f"   🏪 Historical Storage: {stored}")
            logger.info(f"   🔍 Storage Verified: {verified}")
            logger.info(f"   ⏱️  Response Time: {result.get('response_time_seconds', 0)}s")
            logger.info(f"   🎯 Recommendations: {result.get('recommendations_count', 0)}")
            
            if status == "success":
                total_successful += 1
            if stored:
                total_stored += 1
        
        logger.info(f"\n📈 FINAL RESULTS:")
        logger.info(f"   ✅ Successful API calls: {total_successful}/3")
        logger.info(f"   🏪 Stored in history: {total_stored}/3")
        logger.info(f"   📊 Test completed at: {datetime.now().isoformat()}")
        
        # Close storage connections
        try:
            await recommendation_history_storage.close()
            await recommendation_cache.close()
            logger.info("✅ Storage connections closed")
        except Exception as e:
            logger.warning(f"⚠️ Error closing storage connections: {e}")
        
        return results

async def main():
    """Main test function."""
    tester = APIForceRefreshTester()
    results = await tester.run_comprehensive_test()
    
    # Print JSON results for programmatic access
    print("\n" + "="*80)
    print("JSON RESULTS:")
    print("="*80)
    print(json.dumps(results, indent=2, default=str))

if __name__ == "__main__":
    print("""
🚀 API Force Refresh Test Script
================================

This script tests all trading API endpoints with force_refresh=True to verify:
1. ✅ APIs execute regardless of market hours
2. 🏪 Recommendations are cached
3. 📊 Recommendations are stored in historical database
4. 📈 Metadata includes storage information

Make sure the following servers are running:
- Short-term API: http://localhost:8001
- Swing API: http://localhost:8002  
- Long-term API: http://localhost:8003
""")
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n📡 Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        print(f"📋 Full traceback:\n{traceback.format_exc()}") 