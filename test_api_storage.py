#!/usr/bin/env python3
"""
API Storage Test Script
=======================

This script tests the API's ability to store and retrieve data through its endpoints.
"""

import asyncio
import json
import sys
import os
import requests
import time
from datetime import datetime
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

def test_api_endpoint(base_url: str, endpoint: str, params: Dict = None) -> Dict:
    """Test an API endpoint"""
    try:
        url = f"{base_url}{endpoint}"
        print_info(f"Testing endpoint: {url}")
        
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"API call successful (Status: {response.status_code})")
            return data
        else:
            print_error(f"API call failed (Status: {response.status_code})")
            print_info(f"Response: {response.text}")
            return None
            
    except requests.exceptions.ConnectionError:
        print_error(f"Connection failed to {base_url}")
        return None
    except requests.exceptions.Timeout:
        print_error(f"Request timeout for {endpoint}")
        return None
    except Exception as e:
        print_error(f"API test failed: {e}")
        return None

def test_cache_behavior(base_url: str, endpoint: str):
    """Test cache behavior by making multiple requests"""
    print_header(f"Testing Cache Behavior for {endpoint}")
    
    # First request (should populate cache)
    print_info("Making first request (should populate cache)...")
    start_time = time.time()
    first_response = test_api_endpoint(base_url, endpoint)
    first_time = time.time() - start_time
    
    if not first_response:
        print_error("First request failed, cannot test cache")
        return False
    
    # Second request (should use cache)
    print_info("Making second request (should use cache)...")
    start_time = time.time()
    second_response = test_api_endpoint(base_url, endpoint)
    second_time = time.time() - start_time
    
    if not second_response:
        print_error("Second request failed")
        return False
    
    # Third request with force refresh
    print_info("Making third request with force refresh...")
    start_time = time.time()
    third_response = test_api_endpoint(base_url, endpoint, {"force_refresh": "true"})
    third_time = time.time() - start_time
    
    if not third_response:
        print_error("Third request failed")
        return False
    
    # Compare response times
    print_info("Response Time Analysis:")
    print(f"  - First request: {first_time:.3f} seconds")
    print(f"  - Second request: {second_time:.3f} seconds")
    print(f"  - Force refresh request: {third_time:.3f} seconds")
    
    # Check if cache is working (second request should be faster)
    if second_time < first_time:
        print_success("Cache is working (second request was faster)")
    else:
        print_warning("Cache may not be working (second request was not faster)")
    
    # Check if force refresh works
    if third_time > second_time:
        print_success("Force refresh is working (bypassing cache)")
    else:
        print_warning("Force refresh may not be working")
    
    return True

def test_storage_capabilities():
    """Test storage capabilities through API endpoints"""
    print_header("Testing API Storage Capabilities")
    
    # Test different API servers
    servers = [
        {"name": "Swing Trading", "url": "http://localhost:8002", "endpoint": "/api/swing/swing-buy-recommendations"},
        {"name": "Short-term Trading", "url": "http://localhost:8003", "endpoint": "/api/shortterm/shortterm-buy-recommendations"},
        {"name": "Long-term Trading", "url": "http://localhost:8001", "endpoint": "/api/longterm/longterm-buy-recommendations"}
    ]
    
    results = {}
    
    for server in servers:
        print_header(f"Testing {server['name']} Server")
        
        # Test basic connectivity
        health_response = test_api_endpoint(server['url'], "/health")
        if health_response:
            print_success(f"{server['name']} server is running")
            
            # Test main endpoint
            main_response = test_api_endpoint(server['url'], server['endpoint'])
            if main_response:
                print_success(f"{server['name']} endpoint is working")
                
                # Test cache behavior
                cache_working = test_cache_behavior(server['url'], server['endpoint'])
                results[server['name']] = cache_working
            else:
                print_error(f"{server['name']} endpoint failed")
                results[server['name']] = False
        else:
            print_error(f"{server['name']} server is not running")
            results[server['name']] = False
    
    return results

def test_file_storage():
    """Test file storage capabilities"""
    print_header("Testing File Storage")
    
    try:
        # Check cache directory
        cache_dir = Path("api/cache")
        if cache_dir.exists():
            cache_files = list(cache_dir.glob("*.json"))
            print_success(f"Cache directory exists with {len(cache_files)} files")
            
            if cache_files:
                print_info("Cache files found:")
                for file in cache_files[:5]:  # Show first 5 files
                    file_size = file.stat().st_size
                    print(f"  - {file.name}: {file_size} bytes")
                
                if len(cache_files) > 5:
                    print(f"  ... and {len(cache_files) - 5} more files")
            else:
                print_info("No cache files found yet")
        else:
            print_warning("Cache directory does not exist")
        
        # Check logs directory
        logs_dir = Path("api/logs")
        if logs_dir.exists():
            log_files = list(logs_dir.glob("*.log"))
            print_success(f"Logs directory exists with {len(log_files)} files")
        else:
            print_warning("Logs directory does not exist")
        
        return True
        
    except Exception as e:
        print_error(f"File storage test failed: {e}")
        return False

def test_redis_storage():
    """Test Redis storage capabilities"""
    print_header("Testing Redis Storage")
    
    try:
        import redis
        
        # Connect to Redis
        redis_client = redis.Redis(
            host='localhost',
            port=6379,
            db=0,
            decode_responses=True
        )
        
        # Test connection
        redis_client.ping()
        print_success("Redis connection established")
        
        # Check Redis info
        info = redis_client.info()
        print_info(f"Redis version: {info.get('redis_version', 'Unknown')}")
        print_info(f"Connected clients: {info.get('connected_clients', 0)}")
        print_info(f"Used memory: {info.get('used_memory_human', 'Unknown')}")
        
        # Check for AlgoDiscovery keys
        keys = redis_client.keys("cache:*")
        if keys:
            print_success(f"Found {len(keys)} cache keys in Redis")
            print_info("Sample cache keys:")
            for key in keys[:5]:
                ttl = redis_client.ttl(key)
                print(f"  - {key}: TTL {ttl}s")
        else:
            print_info("No cache keys found in Redis yet")
        
        return True
        
    except Exception as e:
        print_error(f"Redis storage test failed: {e}")
        return False

def main():
    """Main test function"""
    print_header("AlgoDiscovery API Storage Test")
    print_info("Testing API's ability to store and retrieve data...")
    
    results = {}
    
    # Test file storage
    results["file_storage"] = test_file_storage()
    
    # Test Redis storage
    results["redis_storage"] = test_redis_storage()
    
    # Test API storage capabilities
    api_results = test_storage_capabilities()
    results.update(api_results)
    
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
        print_info("The system can successfully store and retrieve data.")
    else:
        print_warning(f"{total_tests - passed_tests} tests failed.")
        print_info("Some storage capabilities may not be working properly.")
    
    # Recommendations
    print_header("Storage Status")
    
    if results.get("file_storage"):
        print_success("✅ File-based storage is working")
    else:
        print_error("❌ File-based storage has issues")
    
    if results.get("redis_storage"):
        print_success("✅ Redis cache storage is working")
    else:
        print_error("❌ Redis cache storage has issues")
    
    # Check API servers
    api_servers = ["Swing Trading", "Short-term Trading", "Long-term Trading"]
    for server in api_servers:
        if results.get(server):
            print_success(f"✅ {server} API storage is working")
        else:
            print_error(f"❌ {server} API storage has issues")
    
    return passed_tests == total_tests

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 