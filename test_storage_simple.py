#!/usr/bin/env python3
"""
Simple Storage System Test Script
=================================

This script tests basic cache and database storage capabilities without complex dependencies.
"""

import asyncio
import json
import sys
import os
import redis
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List

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

def test_redis_connection():
    """Test basic Redis connection"""
    print_header("Testing Redis Connection")
    
    try:
        # Try to connect to Redis
        redis_client = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        
        # Test connection
        redis_client.ping()
        print_success("Redis connection established")
        
        # Test basic operations
        test_key = "test_storage_check"
        test_data = {
            "timestamp": datetime.now().isoformat(),
            "test": True,
            "message": "Redis cache test successful"
        }
        
        # Set data
        result = redis_client.setex(test_key, 60, json.dumps(test_data))
        if result:
            print_success("Redis SET operation successful")
        else:
            print_error("Redis SET operation failed")
            return False
        
        # Get data
        retrieved_data = redis_client.get(test_key)
        if retrieved_data:
            data = json.loads(retrieved_data)
            if data.get("test"):
                print_success("Redis GET operation successful")
                print_info(f"Retrieved data: {data}")
            else:
                print_error("Redis GET operation failed")
                return False
        else:
            print_error("Redis GET operation failed - no data")
            return False
        
        # Test TTL
        ttl = redis_client.ttl(test_key)
        if ttl > 0:
            print_success(f"Redis TTL working: {ttl} seconds remaining")
        else:
            print_warning("Redis TTL not working as expected")
        
        # Cleanup
        redis_client.delete(test_key)
        print_success("Redis cleanup completed")
        
        return True
        
    except redis.ConnectionError as e:
        print_error(f"Redis connection failed: {e}")
        print_info("Make sure Redis is running: brew services start redis")
        return False
    except Exception as e:
        print_error(f"Redis test failed: {e}")
        return False

def test_file_cache():
    """Test file-based cache functionality"""
    print_header("Testing File-Based Cache")
    
    try:
        # Create cache directory
        cache_dir = Path("api/cache")
        cache_dir.mkdir(parents=True, exist_ok=True)
        print_success(f"Cache directory ready: {cache_dir}")
        
        # Test data
        test_data = {
            "timestamp": datetime.now().isoformat(),
            "test": True,
            "cache_type": "file",
            "recommendations": [
                {
                    "symbol": "TEST1",
                    "name": "Test Stock 1",
                    "price": 100.0,
                    "score": 75.0
                }
            ]
        }
        
        # Create cache file
        cache_file = cache_dir / "test_storage.json"
        with open(cache_file, 'w') as f:
            json.dump(test_data, f, indent=2)
        
        if cache_file.exists():
            print_success("File cache write operation successful")
        else:
            print_error("File cache write operation failed")
            return False
        
        # Read cache file
        with open(cache_file, 'r') as f:
            retrieved_data = json.load(f)
        
        if retrieved_data.get("test"):
            print_success("File cache read operation successful")
            print_info(f"Retrieved data: {retrieved_data}")
        else:
            print_error("File cache read operation failed")
            return False
        
        # Check file size
        file_size = cache_file.stat().st_size
        print_info(f"Cache file size: {file_size} bytes")
        
        # Cleanup
        cache_file.unlink()
        print_success("File cache cleanup completed")
        
        return True
        
    except Exception as e:
        print_error(f"File cache test failed: {e}")
        return False

def test_database_connections():
    """Test database connections"""
    print_header("Testing Database Connections")
    
    results = {}
    
    # Test PostgreSQL
    try:
        import psycopg2
        print_success("PostgreSQL driver (psycopg2) available")
        
        # Try to connect
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            database="postgres",
            user="postgres",
            password="postgres"
        )
        conn.close()
        print_success("PostgreSQL connection successful")
        results["postgresql"] = True
        
    except ImportError:
        print_warning("PostgreSQL driver (psycopg2) not installed")
        print_info("Install with: pip install psycopg2-binary")
        results["postgresql"] = False
    except Exception as e:
        print_error(f"PostgreSQL connection failed: {e}")
        results["postgresql"] = False
    
    # Test MongoDB
    try:
        import pymongo
        print_success("MongoDB driver (pymongo) available")
        
        # Try to connect
        client = pymongo.MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        client.close()
        print_success("MongoDB connection successful")
        results["mongodb"] = True
        
    except ImportError:
        print_warning("MongoDB driver (pymongo) not installed")
        print_info("Install with: pip install pymongo")
        results["mongodb"] = False
    except Exception as e:
        print_error(f"MongoDB connection failed: {e}")
        results["mongodb"] = False
    
    return results

def test_cache_configuration():
    """Test cache configuration from environment"""
    print_header("Testing Cache Configuration")
    
    try:
        # Check environment variables
        cache_enabled = os.getenv("ENABLE_CACHE", "true").lower() == "true"
        cache_ttl = int(os.getenv("CACHE_TTL_MINUTES", "15"))
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        
        print_info("Cache Configuration:")
        print(f"  - Enabled: {cache_enabled}")
        print(f"  - TTL: {cache_ttl} minutes")
        print(f"  - Redis URL: {redis_url}")
        
        # Check if cache directory exists
        cache_dir = Path("api/cache")
        if cache_dir.exists():
            print_success("Cache directory exists")
        else:
            print_warning("Cache directory does not exist")
        
        # Check if logs directory exists
        logs_dir = Path("api/logs")
        if logs_dir.exists():
            print_success("Logs directory exists")
        else:
            print_warning("Logs directory does not exist")
        
        print_success("Cache configuration test completed")
        return True
        
    except Exception as e:
        print_error(f"Cache configuration test failed: {e}")
        return False

def test_storage_performance():
    """Test storage performance"""
    print_header("Testing Storage Performance")
    
    try:
        # Test Redis performance
        redis_client = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            decode_responses=True
        )
        
        # Performance test data
        test_data = {
            "symbol": "PERF1",
            "price": 100.0,
            "volume": 1000000,
            "timestamp": datetime.now().isoformat(),
            "indicators": {
                "rsi": 65.5,
                "macd": 0.25,
                "bollinger": {"upper": 105.0, "lower": 95.0}
            }
        }
        
        # Test Redis write performance
        start_time = datetime.now()
        for i in range(100):
            key = f"perf_test_{i}"
            redis_client.setex(key, 60, json.dumps(test_data))
        end_time = datetime.now()
        
        write_time = (end_time - start_time).total_seconds()
        write_rate = 100 / write_time
        print_success(f"Redis write performance: {write_rate:.2f} ops/sec")
        
        # Test Redis read performance
        start_time = datetime.now()
        for i in range(100):
            key = f"perf_test_{i}"
            data = redis_client.get(key)
        end_time = datetime.now()
        
        read_time = (end_time - start_time).total_seconds()
        read_rate = 100 / read_time
        print_success(f"Redis read performance: {read_rate:.2f} ops/sec")
        
        # Cleanup
        for i in range(100):
            key = f"perf_test_{i}"
            redis_client.delete(key)
        
        print_success("Storage performance test completed")
        return True
        
    except Exception as e:
        print_error(f"Storage performance test failed: {e}")
        return False

def main():
    """Main test function"""
    print_header("AlgoDiscovery Storage System Test")
    print_info("Testing basic cache and database storage capabilities...")
    
    results = {}
    
    # Test cache configuration
    results["cache_config"] = test_cache_configuration()
    
    # Test Redis connection
    results["redis_cache"] = test_redis_connection()
    
    # Test file cache
    results["file_cache"] = test_file_cache()
    
    # Test database connections
    db_results = test_database_connections()
    results.update(db_results)
    
    # Test storage performance
    results["storage_performance"] = test_storage_performance()
    
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
    
    # Recommendations
    print_header("Recommendations")
    
    if not results.get("redis_cache"):
        print_info("1. Start Redis: brew services start redis")
    
    if not results.get("postgresql"):
        print_info("2. Install PostgreSQL driver: pip install psycopg2-binary")
    
    if not results.get("mongodb"):
        print_info("3. Install MongoDB driver: pip install pymongo")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 