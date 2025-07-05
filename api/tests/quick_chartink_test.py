#!/usr/bin/env python3
"""
Quick Chartink Test - Test a single query quickly
Usage: python quick_chartink_test.py "your_query_here"
"""

import sys
import os

# Add the project root to the path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

from test_queries import test_query, check_connectivity

def quick_test(query, limit=20):
    """Quickly test a single query."""
    print("⚡ Quick Chartink Test")
    print("=" * 30)
    
    # Check connectivity
    if not check_connectivity():
        print("❌ Cannot connect to Chartink")
        return False
    
    print(f"\n🔍 Testing query (limit: {limit}):")
    print(f"📝 {query}")
    print()
    
    # Test the query
    test_query(query, "Quick Test", limit=limit)
    return True

def main():
    """Main function."""
    # Check if query is provided as argument
    if len(sys.argv) > 1:
        query = sys.argv[1]
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        quick_test(query, limit)
    else:
        # Interactive mode
        print("⚡ Quick Chartink Test")
        print("=" * 30)
        print("Usage: python quick_chartink_test.py \"your_query\"")
        print("Or run without arguments for interactive mode")
        
        # Check connectivity
        if not check_connectivity():
            print("❌ Cannot connect to Chartink")
            return
        
        print("\n📝 Enter your query:")
        query = input().strip()
        
        if query:
            limit_input = input("Limit (default 20): ").strip()
            limit = int(limit_input) if limit_input else 20
            quick_test(query, limit)
        else:
            print("❌ No query provided")

if __name__ == "__main__":
    main() 