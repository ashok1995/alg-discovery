#!/usr/bin/env python3
"""
Simple Chartink Query Tester
============================

A quick and easy script to test any Chartink query and see if it returns stocks.
Usage: python test_chartink.py
"""

import sys
import os

# Add the project root to the path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Import the test function
from test_queries import test_query, check_connectivity

# Common test queries for quick testing
SAMPLE_QUERIES = {
    "1": {
        "name": "Simple Trend + Volume",
        "query": "( {cash} ( latest close > latest sma ( latest close , 20 ) and latest volume > latest sma ( latest volume , 20 ) * 1.2 ) )",
        "description": "Basic uptrend with volume confirmation"
    },
    "2": {
        "name": "Strong Momentum",
        "query": "( {cash} ( latest close > latest sma ( latest close , 20 ) and latest sma ( latest close , 20 ) > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 1.5 ) )",
        "description": "Strong momentum with dual MA filter"
    },
    "3": {
        "name": "High Volume Breakout",
        "query": "( {cash} ( latest close > 1 day ago high and latest volume > latest sma ( latest volume , 20 ) * 2 and latest close > 50 ) )",
        "description": "High volume breakout above previous day high"
    },
    "4": {
        "name": "RSI Momentum",
        "query": "( {cash} ( latest close > latest sma ( latest close , 20 ) and latest rsi ( 14 ) > 50 and latest rsi ( 14 ) < 70 and latest volume > latest sma ( latest volume , 20 ) * 1.2 ) )",
        "description": "RSI-based momentum filter"
    },
    "5": {
        "name": "Value + Growth",
        "query": "( {cash} ( market cap / quarterly sum ( quarterly net profit/reported profit after tax , 4 ) < 20 and latest close > latest sma ( latest close , 50 ) and market cap > 1000 ) )",
        "description": "Value stocks with uptrend"
    }
}

def show_sample_queries():
    """Display sample queries."""
    print("\n📚 Sample Queries:")
    print("-" * 60)
    for key, info in SAMPLE_QUERIES.items():
        print(f"{key}. {info['name']}")
        print(f"   {info['description']}")
        print()

def test_custom_query():
    """Test a custom query entered by user."""
    print("\n📝 Enter your custom Chartink query:")
    print("(Tip: Make sure to include {cash} at the beginning)")
    print("Example: ( {cash} ( latest close > latest sma ( latest close , 20 ) ) )")
    print()
    
    query = input("Query: ").strip()
    if not query:
        print("❌ Empty query!")
        return
    
    # Ask for limit
    limit_input = input("Results limit (default 20): ").strip()
    try:
        limit = int(limit_input) if limit_input else 20
    except ValueError:
        limit = 20
    
    # Ask for name
    name = input("Query name (optional): ").strip() or "Custom Query"
    
    print(f"\n🔍 Testing: {name}")
    test_query(query, name, limit=limit)

def main():
    """Main function."""
    print("🧪 Simple Chartink Query Tester")
    print("=" * 50)
    
    # Check connectivity first
    if not check_connectivity():
        print("\n⚠️ Cannot proceed without Chartink connectivity")
        return
    
    print("\n💡 Options:")
    print("- Enter a number (1-5) to test a sample query")
    print("- Enter 'custom' to test your own query")
    print("- Enter 'samples' to see all sample queries")
    print("- Enter 'q' to quit")
    
    while True:
        print("\n" + "-" * 50)
        choice = input("Your choice: ").strip().lower()
        
        if choice in ['q', 'quit', 'exit']:
            print("👋 Happy testing!")
            break
        
        elif choice == 'samples':
            show_sample_queries()
            
        elif choice == 'custom':
            test_custom_query()
            
        elif choice in SAMPLE_QUERIES:
            info = SAMPLE_QUERIES[choice]
            print(f"\n🔍 Testing: {info['name']}")
            print(f"📝 Description: {info['description']}")
            
            # Ask for limit
            limit_input = input("Results limit (default 20): ").strip()
            try:
                limit = int(limit_input) if limit_input else 20
            except ValueError:
                limit = 20
            
            test_query(info['query'], info['name'], limit=limit)
            
        else:
            print("❌ Invalid choice. Try again.")
            print("Valid options: 1-5, 'custom', 'samples', 'q'")

if __name__ == "__main__":
    main() 