#!/usr/bin/env python3
"""
Config Query Tester
===================

Test all queries from configuration files for different trading strategies.
Usage: 
  python test_config_queries.py swing
  python test_config_queries.py long_buy  
  python test_config_queries.py short_buy
  python test_config_queries.py all
"""

import sys
import os
import json
from datetime import datetime

# Add the project root to the path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

from test_queries import test_query, check_connectivity

# Configuration file mapping
CONFIG_FILES = {
    'swing': 'config/swing_config.json',
    'short_term': 'config/short_term_config.json', 
    'long_term': 'config/long_term_config.json'
}

def load_config(config_path):
    """Load configuration file."""
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"❌ Config file not found: {config_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in {config_path}: {e}")
        return None

def test_strategy_queries(strategy_name, limit=10):
    """Test all queries for a specific strategy."""
    config_file = CONFIG_FILES.get(strategy_name)
    if not config_file:
        print(f"❌ Unknown strategy: {strategy_name}")
        print(f"Available strategies: {', '.join(CONFIG_FILES.keys())}")
        return
    
    print(f"\n🔍 Testing {strategy_name.upper()} Strategy Queries")
    print("=" * 60)
    
    # Load config
    config = load_config(config_file)
    if not config:
        return
    
    # Track results
    total_queries = 0
    working_queries = 0
    failed_queries = 0
    results_summary = []
    
    # Test queries from sub_algorithm_variants (the actual queries)
    sub_algorithm_variants = config.get('sub_algorithm_variants', {})
    
    for category_name, versions in sub_algorithm_variants.items():
        print(f"\n📊 Testing {category_name.upper()} category:")
        print("-" * 40)
        
        # Test each version in this category
        for version_name, version_config in versions.items():
            query = version_config.get('query', '')
            if not query:
                continue
                
            total_queries += 1
            query_name = f"{category_name}_{version_name}"
            description = version_config.get('description', 'No description')
            
            print(f"\n🧪 Testing: {query_name}")
            print(f"📝 Description: {description}")
            print(f"🔍 Query: {query[:100]}...")
            
            # Test the query
            try:
                result = test_query(query, query_name, limit=limit, return_count=True)
                if result and result > 0:
                    working_queries += 1
                    status = "✅ WORKING"
                    print(f"✅ Found {result} stocks")
                else:
                    failed_queries += 1
                    status = "❌ NO RESULTS"
                    print("❌ No stocks found")
                
                results_summary.append({
                    'name': query_name,
                    'category': category_name,
                    'version': version_name,
                    'description': description,
                    'status': status,
                    'count': result if result else 0,
                    'query': query
                })
                
            except Exception as e:
                failed_queries += 1
                print(f"❌ Error: {str(e)}")
                results_summary.append({
                    'name': query_name,
                    'category': category_name,
                    'version': version_name,
                    'description': description,
                    'status': "❌ ERROR",
                    'count': 0,
                    'error': str(e),
                    'query': query
                })
    
    # Print summary
    print(f"\n📈 SUMMARY - {strategy_name.upper()} Strategy")
    print("=" * 60)
    print(f"Total queries tested: {total_queries}")
    print(f"Working queries: {working_queries}")
    print(f"Failed queries: {failed_queries}")
    print(f"Success rate: {(working_queries/total_queries*100):.1f}%" if total_queries > 0 else "N/A")
    
    # Show working queries
    working = [r for r in results_summary if r['status'] == "✅ WORKING"]
    if working:
        print(f"\n✅ WORKING QUERIES ({len(working)}):")
        for result in working:
            print(f"  • {result['name']}: {result['count']} stocks - {result['description']}")
    
    # Show failed queries
    failed = [r for r in results_summary if r['status'] in ["❌ NO RESULTS", "❌ ERROR"]]
    if failed:
        print(f"\n❌ FAILED QUERIES ({len(failed)}):")
        for result in failed:
            error_msg = f" - {result.get('error', 'No stocks found')}"
            print(f"  • {result['name']}{error_msg}")
    
    return results_summary

def test_all_strategies(limit=10):
    """Test queries for all available strategies."""
    print("🔍 Testing ALL Strategy Queries")
    print("=" * 60)
    
    all_results = {}
    
    for strategy in CONFIG_FILES.keys():
        if os.path.exists(CONFIG_FILES[strategy]):
            print(f"\n{'='*20} {strategy.upper()} {'='*20}")
            results = test_strategy_queries(strategy, limit)
            all_results[strategy] = results
        else:
            print(f"\n⚠️ Skipping {strategy} - config file not found")
    
    # Overall summary
    print(f"\n🎯 OVERALL SUMMARY")
    print("=" * 60)
    
    total_all = 0
    working_all = 0
    
    for strategy, results in all_results.items():
        if results:
            total = len(results)
            working = len([r for r in results if r['status'] == "✅ WORKING"])
            total_all += total
            working_all += working
            print(f"{strategy:12}: {working:2}/{total:2} working ({working/total*100:.0f}%)" if total > 0 else f"{strategy:12}: No queries")
    
    if total_all > 0:
        print(f"\nOverall: {working_all}/{total_all} working ({working_all/total_all*100:.1f}%)")

def main():
    """Main function."""
    if len(sys.argv) < 2:
        print("❌ Missing strategy parameter")
        print("\nUsage:")
        print("  python test_config_queries.py swing")
        print("  python test_config_queries.py long_buy")
        print("  python test_config_queries.py short_buy")
        print("  python test_config_queries.py all")
        return
    
    strategy = sys.argv[1].lower()
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    
    print(f"🧪 Config Query Tester - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Check connectivity
    if not check_connectivity():
        print("\n⚠️ Cannot proceed without Chartink connectivity")
        return
    
    if strategy == 'all':
        test_all_strategies(limit)
    elif strategy in CONFIG_FILES:
        test_strategy_queries(strategy, limit)
    else:
        print(f"❌ Unknown strategy: {strategy}")
        print(f"Available strategies: {', '.join(CONFIG_FILES.keys())}, all")

if __name__ == "__main__":
    main() 