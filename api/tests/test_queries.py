#!/usr/bin/env python3
"""
Simple test script for finalizing ChartInk queries
Usage: python test_queries.py
"""

import sys
import os
import json
import asyncio
from typing import Dict, List, Any

# Add the project root to the path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)
patterns_path = os.path.join(project_root, 'patterns')
sys.path.insert(0, patterns_path)

try:
    from data.chartink import get_chartink_scans, check_chartink_connectivity
    CHARTINK_AVAILABLE = True
    print("✅ ChartInk module loaded successfully")
except ImportError as e:
    print(f"❌ ChartInk module not available: {e}")
    CHARTINK_AVAILABLE = False

def test_query(query: str, query_name: str = "Test Query", limit: int = 10, return_count: bool = False) -> Dict[str, Any]:
    """
    Test a single ChartInk query and return results
    
    Args:
        query: ChartInk query string
        query_name: Name for the query (for display purposes)
        limit: Maximum number of results to show
        return_count: If True, return only the count of results
        
    Returns:
        Dictionary with test results, or int count if return_count=True
    """
    if return_count:
        # Silent mode for count-only operation
        if not CHARTINK_AVAILABLE:
            return 0
        
        try:
            df = get_chartink_scans(query, debug=False, use_cache=False)
            if df is not None and not df.empty:
                return len(df)
            else:
                return 0
        except Exception:
            return 0
    
    # Normal verbose mode
    print(f"\n{'='*60}")
    print(f"🔍 Testing Query: {query_name}")
    print(f"{'='*60}")
    print(f"📊 Query: {query}")
    print(f"📏 Query Length: {len(query)} characters")
    print(f"🎯 Limit: {limit} stocks")
    
    if not CHARTINK_AVAILABLE:
        return {
            "success": False,
            "error": "ChartInk module not available",
            "query": query,
            "query_name": query_name
        }
    
    try:
        # Test the query
        print("⏳ Executing query...")
        df = get_chartink_scans(query, debug=False, use_cache=False)
        
        if df is not None and not df.empty:
            results_count = len(df)
            print(f"✅ SUCCESS: Found {results_count} stocks")
            
            # Show top results
            display_limit = min(limit, results_count)
            print(f"\n📈 Top {display_limit} Results:")
            print("-" * 80)
            
            for i, (_, row) in enumerate(df.head(display_limit).iterrows()):
                symbol = row.get('nsecode', row.get('symbol', 'N/A'))
                close = row.get('close', 0)
                volume = row.get('volume', 0)
                per_chg = row.get('per_chg', row.get('per_change', 0))
                
                print(f"{i+1:2d}. {symbol:12s} | Price: ₹{close:8.2f} | Volume: {volume:10,} | Change: {per_chg:6.2f}%")
            
            # Show column info
            print(f"\n📊 Available Columns: {list(df.columns)}")
            
            return {
                "success": True,
                "results_count": results_count,
                "query": query,
                "query_name": query_name,
                "top_stocks": df.head(display_limit).to_dict('records'),
                "columns": list(df.columns)
            }
        else:
            print("⚠️ EMPTY: Query returned no results")
            return {
                "success": True,
                "results_count": 0,
                "query": query,
                "query_name": query_name,
                "message": "No stocks found"
            }
            
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "query": query,
            "query_name": query_name
        }

def test_query_silent(query: str, limit: int = 50) -> Dict[str, Any]:
    """
    Test a ChartInk query silently and return results without printing
    
    Args:
        query: ChartInk query string
        limit: Maximum number of results to return
        
    Returns:
        Dictionary with test results including 'data' key with stock list
    """
    if not CHARTINK_AVAILABLE:
        return {
            "success": False,
            "error": "ChartInk module not available",
            "query": query
        }
    
    try:
        # Test the query
        df = get_chartink_scans(query, debug=False, use_cache=False)
        
        if df is not None and not df.empty:
            results_count = len(df)
            
            # Convert to list format expected by recommendation engine
            stocks_data = []
            for _, row in df.head(limit).iterrows():
                stock_dict = row.to_dict()
                stocks_data.append(stock_dict)
            
            return {
                "success": True,
                "results_count": results_count,
                "query": query,
                "data": stocks_data
            }
        else:
            return {
                "success": True,
                "results_count": 0,
                "query": query,
                "data": []
            }
            
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "query": query,
            "data": []
        }

def load_config_queries() -> Dict[str, Any]:
    """Load queries from the long_term_config.json file"""
    config_path = os.path.join(os.path.dirname(__file__), 'config', 'long_term_config.json')
    
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        print(f"✅ Loaded config from: {config_path}")
        return config
    except Exception as e:
        print(f"❌ Error loading config: {e}")
        return {}

def test_config_queries():
    """Test all queries from the config file"""
    config = load_config_queries()
    
    if not config:
        print("❌ No config loaded, cannot test config queries")
        return
    
    print(f"\n🚀 Testing Queries from Config File")
    print(f"📋 Config Version: {config.get('metadata', {}).get('file_version', 'Unknown')}")
    
    # Test sub-algorithm variants
    sub_algorithms = config.get('sub_algorithm_variants', {})
    all_results = []
    
    for algo_type, versions in sub_algorithms.items():
        print(f"\n🎯 Testing {algo_type.upper()} algorithms...")
        
        for version, version_config in versions.items():
            query_name = f"{algo_type}_{version}"
            query = version_config.get('query', '')
            description = version_config.get('description', '')
            
            print(f"\n📌 {query_name}: {description}")
            result = test_query(query, query_name, limit=5)
            all_results.append(result)
    
    # Test chartink_queries
    chartink_queries = config.get('chartink_queries', {})
    if chartink_queries:
        print(f"\n🎯 Testing CHARTINK_QUERIES...")
        
        for query_name, query_config in chartink_queries.items():
            query = query_config.get('query', '')
            description = query_config.get('description', '')
            
            print(f"\n📌 {query_name}: {description}")
            result = test_query(query, query_name, limit=5)
            all_results.append(result)
    
    # Test fallback queries
    fallback_queries = config.get('fallback_queries', [])
    if fallback_queries:
        print(f"\n🎯 Testing FALLBACK queries...")
        
        for i, query in enumerate(fallback_queries):
            query_name = f"fallback_{i+1}"
            result = test_query(query, query_name, limit=5)
            all_results.append(result)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"📊 SUMMARY")
    print(f"{'='*60}")
    
    successful = [r for r in all_results if r.get('success', False)]
    with_results = [r for r in successful if r.get('results_count', 0) > 0]
    empty_results = [r for r in successful if r.get('results_count', 0) == 0]
    failed = [r for r in all_results if not r.get('success', False)]
    
    print(f"✅ Successful queries: {len(successful)}/{len(all_results)}")
    print(f"📈 Queries with results: {len(with_results)}")
    print(f"⚠️ Empty queries: {len(empty_results)}")
    print(f"❌ Failed queries: {len(failed)}")
    
    if with_results:
        print(f"\n🏆 Best performing queries:")
        sorted_results = sorted(with_results, key=lambda x: x.get('results_count', 0), reverse=True)
        for result in sorted_results[:5]:
            print(f"  • {result['query_name']}: {result['results_count']} stocks")
    
    if failed:
        print(f"\n💥 Failed queries:")
        for result in failed:
            print(f"  • {result['query_name']}: {result.get('error', 'Unknown error')}")

def test_custom_query():
    """Test a custom query interactively"""
    print(f"\n🔧 Custom Query Testing")
    print("Enter your ChartInk query (or 'quit' to exit):")
    
    while True:
        query = input("\n> ").strip()
        
        if query.lower() in ['quit', 'exit', 'q']:
            break
            
        if not query:
            continue
            
        result = test_query(query, "Custom Query", limit=10)
        
        if result.get('success') and result.get('results_count', 0) > 0:
            save = input("\n💾 Save this query? (y/N): ").strip().lower()
            if save == 'y':
                name = input("Query name: ").strip()
                description = input("Description (optional): ").strip()
                
                # Save to a simple file
                saved_queries = {
                    "name": name,
                    "description": description,
                    "query": query,
                    "results_count": result['results_count'],
                    "tested_at": str(asyncio.get_event_loop().time())
                }
                
                with open('saved_queries.json', 'a') as f:
                    f.write(json.dumps(saved_queries) + '\n')
                
                print(f"✅ Saved query '{name}' to saved_queries.json")

def check_connectivity():
    """Check ChartInk connectivity"""
    print(f"\n🌐 Checking ChartInk Connectivity...")
    
    if not CHARTINK_AVAILABLE:
        print("❌ ChartInk module not available")
        return False
    
    try:
        connected = check_chartink_connectivity()
        if connected:
            print("✅ ChartInk is connected and accessible")
            return True
        else:
            print("❌ ChartInk connectivity failed")
            return False
    except Exception as e:
        print(f"❌ Error checking connectivity: {e}")
        return False

def main():
    """Main function"""
    print("🚀 ChartInk Query Testing Tool")
    print("=" * 40)
    
    # Check connectivity first
    if not check_connectivity():
        print("\n⚠️ Cannot proceed without ChartInk connectivity")
        return
    
    while True:
        print("\n📋 Options:")
        print("1. Test queries from config file")
        print("2. Test custom query")
        print("3. Check connectivity")
        print("4. Exit")
        
        choice = input("\nSelect option (1-4): ").strip()
        
        if choice == '1':
            test_config_queries()
        elif choice == '2':
            test_custom_query()
        elif choice == '3':
            check_connectivity()
        elif choice == '4':
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please select 1-4.")

if __name__ == "__main__":
    main() 