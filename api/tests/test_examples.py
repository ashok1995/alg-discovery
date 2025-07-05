#!/usr/bin/env python3
"""
Example queries for testing ChartInk functionality
Run this to test basic queries before finalizing your config
"""

import sys
import os

# Add the project root to the path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Import the test function
from test_queries import test_query, check_connectivity

def test_basic_queries():
    """Test some basic queries that should work"""
    
    print("🧪 Testing Basic Queries")
    print("=" * 50)
    
    # Test 1: Simple market cap filter
    simple_query = "( {cash} ( market cap > 1000 and latest close > 50 and latest volume > 10000 ) )"
    test_query(simple_query, "Simple Filter - Large Cap", limit=10)
    
    # Test 2: P/E ratio filter
    pe_query = "( {cash} ( latest \"p/e\" < 20 and latest \"p/e\" > 5 and market cap > 500 ) )"
    test_query(pe_query, "P/E Filter", limit=10)
    
    # Test 3: ROE filter
    roe_query = "( {cash} ( latest \"return on equity\" > 15 and market cap > 1000 ) )"
    test_query(roe_query, "ROE Filter", limit=10)
    
    # Test 4: Moving average filter
    sma_query = "( {cash} ( latest close > latest sma(close,20) and latest close > latest sma(close,50) ) )"
    test_query(sma_query, "SMA Filter", limit=10)
    
    # Test 5: Volume filter
    volume_query = "( {cash} ( latest volume > latest sma(volume,20) * 1.5 and latest close > 100 ) )"
    test_query(volume_query, "Volume Spike", limit=10)

def test_current_config_query():
    """Test the query from line 42 of your config file"""
    
    print("🔍 Testing Current Config Query (Line 42)")
    print("=" * 50)
    
    # This is the query from line 42 of your config
    config_query = "( {cash} ( market cap > 1000 and quarterly close * latest total number / 10000000 / latest sum ( latest net profit/reported profit after tax , 4 ) < 16 and quarterly close * latest total number / 10000000 / latest sum ( latest net profit/reported profit after tax , 4 ) > 8 and yearly return on net worth percentage > 20 and yearly debt equity ratio < 0.3 and yearly current ratio > 1.5 and yearly interest cover > 5 ) )"
    
    test_query(config_query, "Current Config Query (Line 42)", limit=10)

def test_simplified_queries():
    """Test simplified versions of complex queries"""
    
    print("🔧 Testing Simplified Queries")
    print("=" * 50)
    
    # Simplified P/E calculation
    simple_pe = "( {cash} ( market cap > 1000 and latest \"p/e\" < 16 and latest \"p/e\" > 8 ) )"
    test_query(simple_pe, "Simplified P/E", limit=10)
    
    # Simplified ROE filter
    simple_roe = "( {cash} ( latest \"return on equity\" > 20 and market cap > 1000 ) )"
    test_query(simple_roe, "Simplified ROE", limit=10)
    
    # Simplified debt filter
    simple_debt = "( {cash} ( latest \"debt to equity\" < 0.3 and market cap > 1000 ) )"
    test_query(simple_debt, "Simplified Debt Filter", limit=10)
    
    # Combined simple filter
    combined_simple = "( {cash} ( market cap > 1000 and latest \"p/e\" < 20 and latest \"return on equity\" > 15 and latest \"debt to equity\" < 0.5 ) )"
    test_query(combined_simple, "Combined Simple Filter", limit=10)

def main():
    """Main function"""
    print("🚀 ChartInk Query Examples & Testing")
    print("=" * 50)
    
    # Check connectivity first
    if not check_connectivity():
        print("\n⚠️ Cannot proceed without ChartInk connectivity")
        return
    
    while True:
        print("\n📋 Test Options:")
        print("1. Test basic queries")
        print("2. Test current config query (line 42)")
        print("3. Test simplified queries")
        print("4. Exit")
        
        choice = input("\nSelect option (1-4): ").strip()
        
        if choice == '1':
            test_basic_queries()
        elif choice == '2':
            test_current_config_query()
        elif choice == '3':
            test_simplified_queries()
        elif choice == '4':
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please select 1-4.")

if __name__ == "__main__":
    main() 