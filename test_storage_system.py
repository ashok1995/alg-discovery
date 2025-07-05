#!/usr/bin/env python3
"""
Storage System Test Script
==========================

This script tests the cache and database storage capabilities of the AlgoDiscovery system.
It checks Redis cache, MongoDB, and PostgreSQL connections and functionality.
"""

import asyncio
import json
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List

# Add the project root to Python path
sys.path.insert(0, str(Path(__file__).parent))

def print_header(title: str):
    """Print a formatted header"""
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print(f"{'='*60}")

def print_success(message: str):
    """Print a success message"""
    print(f"✅ {message}")

def print_error(message: str):
    """Print an error message"""
    print(f"❌ {message}")

def print_warning(message: str):
    """Print a warning message"""
    print(f"⚠️ {message}")

def print_info(message: str):
    """Print an info message"""
    print(f"ℹ️ {message}")

async def test_redis_cache():
    """Test Redis cache functionality"""
    print_header("Testing Redis Cache")
    
    try:
        # Try to import Redis manager
        from core.database.cache.redis_manager import cache_manager, cache_set, cache_get, cache_delete
        
        # Test basic connection
        redis_client = cache_manager.redis_client
        redis_client.ping()
        print_success("Redis connection established")
        
        # Test basic operations
        test_key = "test_storage_check"
        test_data = {
            "timestamp": datetime.now().isoformat(),
            "test": True,
            "message": "Redis cache test successful"
        }
        
        # Set cache
        result = cache_set(test_key, test_data, ttl=60)
        if result:
            print_success("Cache SET operation successful")
        else:
            print_error("Cache SET operation failed")
            return False
        
        # Get cache
        retrieved_data = cache_get(test_key)
        if retrieved_data and retrieved_data.get("test"):
            print_success("Cache GET operation successful")
            print_info(f"Retrieved data: {retrieved_data}")
        else:
            print_error("Cache GET operation failed")
            return False
        
        # Test cache with fallback
        def fallback_function():
            return {"fallback": True, "timestamp": datetime.now().isoformat()}
        
        fallback_data = cache_manager.get_with_fallback(
            "test_fallback", 
            fallback_function, 
            ttl=30
        )
        
        if fallback_data and fallback_data.get("fallback"):
            print_success("Cache fallback mechanism working")
        else:
            print_error("Cache fallback mechanism failed")
        
        # Cleanup
        cache_delete(test_key)
        cache_delete("test_fallback")
        print_success("Cache cleanup completed")
        
        return True
        
    except ImportError as e:
        print_error(f"Redis manager not available: {e}")
        return False
    except Exception as e:
        print_error(f"Redis cache test failed: {e}")
        return False

async def test_mongodb_storage():
    """Test MongoDB storage functionality"""
    print_header("Testing MongoDB Storage")
    
    try:
        # Try to import MongoDB components
        from api.models.recommendation_models import RecommendationCache, RecommendationType, RecommendationRequest
        
        # Initialize cache
        cache = RecommendationCache(use_mongodb=True)
        await cache.initialize()
        
        # Check connection status
        stats = await cache.get_cache_stats()
        print_info(f"MongoDB Stats: {stats}")
        
        if not stats.get("connected"):
            print_error("MongoDB connection failed")
            return False
        
        print_success("MongoDB connection established")
        
        # Test storing recommendation
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
            },
            {
                "symbol": "TEST2",
                "name": "Test Stock 2",
                "price": 150.0,
                "score": 85.0,
                "recommendation_type": "Strong Buy"
            }
        ]
        
        test_metadata = {
            "timestamp": datetime.now().isoformat(),
            "test": True,
            "source": "storage_test"
        }
        
        # Store recommendation
        store_result = await cache.store_recommendation(
            RecommendationType.SHORT_TERM,
            test_request,
            test_recommendations,
            test_metadata
        )
        
        if store_result:
            print_success("MongoDB storage operation successful")
        else:
            print_error("MongoDB storage operation failed")
            return False
        
        # Retrieve recommendation
        cached_result = await cache.get_cached_recommendation(
            RecommendationType.SHORT_TERM,
            test_request
        )
        
        if cached_result:
            print_success("MongoDB retrieval operation successful")
            recommendations = cached_result.get("recommendations", [])
            print_info(f"Retrieved {len(recommendations)} recommendations")
        else:
            print_error("MongoDB retrieval operation failed")
            return False
        
        # Cleanup test data
        await cache.cleanup_expired_cache()
        print_success("MongoDB cleanup completed")
        
        return True
        
    except ImportError as e:
        print_error(f"MongoDB components not available: {e}")
        return False
    except Exception as e:
        print_error(f"MongoDB storage test failed: {e}")
        return False

async def test_postgresql_storage():
    """Test PostgreSQL storage functionality"""
    print_header("Testing PostgreSQL Storage")
    
    try:
        # Try to import PostgreSQL components
        from core.database.config import db_manager, DatabaseConfig
        
        # Test connection
        engine = db_manager.get_postgres_engine()
        
        # Test basic connection
        with engine.connect() as conn:
            result = conn.execute("SELECT 1 as test")
            if result.fetchone()[0] == 1:
                print_success("PostgreSQL connection established")
            else:
                print_error("PostgreSQL connection test failed")
                return False
        
        # Test session creation
        Session = db_manager.get_postgres_session()
        session = Session()
        
        try:
            # Test basic query
            result = session.execute("SELECT version()")
            version = result.fetchone()[0]
            print_success("PostgreSQL session working")
            print_info(f"PostgreSQL version: {version.split(',')[0]}")
        finally:
            session.close()
        
        return True
        
    except ImportError as e:
        print_error(f"PostgreSQL components not available: {e}")
        return False
    except Exception as e:
        print_error(f"PostgreSQL storage test failed: {e}")
        return False

async def test_file_cache():
    """Test file-based cache functionality"""
    print_header("Testing File-Based Cache")
    
    try:
        # Try to import file cache components
        from api.models.recommendation_models import RecommendationCache, RecommendationType, RecommendationRequest
        
        # Initialize file cache
        cache = RecommendationCache(use_mongodb=False)
        await cache.initialize()
        
        # Check cache directory
        cache_dir = Path("api/cache")
        if cache_dir.exists():
            print_success(f"Cache directory exists: {cache_dir}")
        else:
            print_warning("Cache directory does not exist, will be created")
        
        # Test storing recommendation
        test_request = RecommendationRequest(
            combination={"file_test": "v1.0"},
            limit_per_query=5,
            min_score=30.0,
            top_recommendations=3
        )
        
        test_recommendations = [
            {
                "symbol": "FILE1",
                "name": "File Test Stock 1",
                "price": 200.0,
                "score": 90.0,
                "recommendation_type": "Buy"
            }
        ]
        
        test_metadata = {
            "timestamp": datetime.now().isoformat(),
            "test": True,
            "cache_type": "file"
        }
        
        # Store recommendation
        store_result = await cache.store_recommendation(
            RecommendationType.LONG_TERM,
            test_request,
            test_recommendations,
            test_metadata
        )
        
        if store_result:
            print_success("File cache storage operation successful")
        else:
            print_error("File cache storage operation failed")
            return False
        
        # Check if file was created
        cache_files = list(cache_dir.glob("*.json"))
        if cache_files:
            print_success(f"Cache file created: {len(cache_files)} files found")
        else:
            print_error("No cache files found")
            return False
        
        # Retrieve recommendation
        cached_result = await cache.get_cached_recommendation(
            RecommendationType.LONG_TERM,
            test_request
        )
        
        if cached_result:
            print_success("File cache retrieval operation successful")
            recommendations = cached_result.get("recommendations", [])
            print_info(f"Retrieved {len(recommendations)} recommendations")
        else:
            print_error("File cache retrieval operation failed")
            return False
        
        # Cleanup test files
        for cache_file in cache_files:
            if "file_test" in cache_file.name:
                cache_file.unlink()
        print_success("File cache cleanup completed")
        
        return True
        
    except ImportError as e:
        print_error(f"File cache components not available: {e}")
        return False
    except Exception as e:
        print_error(f"File cache test failed: {e}")
        return False

async def test_cache_configuration():
    """Test cache configuration"""
    print_header("Testing Cache Configuration")
    
    try:
        # Test cache config
        from shared.config.data.cache import CacheConfig
        
        cache_config = CacheConfig()
        
        print_info("Cache Configuration:")
        print(f"  - Enabled: {cache_config.is_cache_enabled()}")
        print(f"  - Backend: {cache_config.cache_backend}")
        print(f"  - Compression: {cache_config.cache_compression}")
        print(f"  - Serialization: {cache_config.cache_serialization}")
        
        # Test TTL settings
        ttl_settings = {
            "stock_data": cache_config.get_cache_ttl("stock_data"),
            "technical_indicators": cache_config.get_cache_ttl("technical_indicators"),
            "signals": cache_config.get_cache_ttl("signals")
        }
        
        print_info("Cache TTL Settings:")
        for key, value in ttl_settings.items():
            print(f"  - {key}: {value} seconds")
        
        # Test limits
        limit_settings = {
            "max_total_size": cache_config.get_cache_limit("max_total_size"),
            "max_stock_entries": cache_config.get_cache_limit("max_stock_entries")
        }
        
        print_info("Cache Limits:")
        for key, value in limit_settings.items():
            print(f"  - {key}: {value}")
        
        print_success("Cache configuration test completed")
        return True
        
    except ImportError as e:
        print_error(f"Cache configuration not available: {e}")
        return False
    except Exception as e:
        print_error(f"Cache configuration test failed: {e}")
        return False

async def main():
    """Main test function"""
    print_header("AlgoDiscovery Storage System Test")
    print_info("Testing cache and database storage capabilities...")
    
    results = {}
    
    # Test cache configuration
    results["cache_config"] = await test_cache_configuration()
    
    # Test Redis cache
    results["redis_cache"] = await test_redis_cache()
    
    # Test file cache
    results["file_cache"] = await test_file_cache()
    
    # Test MongoDB storage
    results["mongodb_storage"] = await test_mongodb_storage()
    
    # Test PostgreSQL storage
    results["postgresql_storage"] = await test_postgresql_storage()
    
    # Summary
    print_header("Test Results Summary")
    
    total_tests = len(results)
    passed_tests = sum(results.values())
    
    print_info(f"Total tests: {total_tests}")
    print_info(f"Passed: {passed_tests}")
    print_info(f"Failed: {total_tests - passed_tests}")
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {test_name}: {status}")
    
    if passed_tests == total_tests:
        print_success("All storage tests passed! 🎉")
    else:
        print_warning(f"{total_tests - passed_tests} tests failed. Check the errors above.")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1) 