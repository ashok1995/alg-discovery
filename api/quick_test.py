#!/usr/bin/env python3
"""
Quick Query Tester - Test a single ChartInk query repeatedly
Usage: python quick_test.py
"""

import sys
import os

# Add the project root to the path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Import the test function
from test_queries import test_query, check_connectivity

# =============================================================================
# ADD YOUR TEST QUERIES HERE
# =============================================================================
TEST_QUERIES = [
    #long term
    # Volume Momentum query
    "( {cash} ( latest close > latest sma ( latest close , 20 ) and latest close > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 1.2 and latest close > latest sma ( latest close , 20 ) and latest close > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 1.2 ) ) ",
    "( {cash} ( latest close > latest sma ( latest close , 20 ) and latest close > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 1.2 and latest close > latest sma ( latest close , 20 ) and latest close > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 1.2 and latest close > latest sma ( latest close , 20 ) and latest sma ( latest close , 20 ) > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 1.5 and latest close > 1 week ago close ) ) ",
    "( {cash} ( latest close > latest sma ( latest close , 20 ) and latest close > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 1.2 and latest close > latest sma ( latest close , 20 ) and latest close > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 1.2 and latest close > latest sma ( latest close , 20 ) and latest sma ( latest close , 20 ) > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 1.5 and latest close > 1 week ago close and latest close > latest sma ( latest close , 20 ) and latest sma ( latest close , 20 ) > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 1.3 and latest close > latest ema ( latest close , 21 ) and ( latest close - 1 week ago close ) / 1 week ago close * 100 > 2 ) ) ",
    # Basic test queries
    #Value
    "( {cash} ( market cap / quarterly sum ( quarterly net profit/reported profit after tax , 4 ) < 15 and yearly book value / latest close < 2 and yearly dividend per share rupees / latest close * 100 > 1 and market cap > 1000 ) ) ",
    "( {cash} ( yearly debt equity ratio < 1.5 and market cap / quarterly sum ( quarterly net profit/reported profit after tax , 4 ) < 20 and yearly book value / latest close < 3 and yearly net profit/reported profit after tax / yearly book value * 100 > 10 and market cap > 800 ) ) ",
    "( {cash} ( market cap / quarterly sum ( quarterly net profit/reported profit after tax , 4 ) < 18 and yearly net profit/reported profit after tax / yearly book value * 100 > 20 and yearly debt equity ratio < 0.5 and latest close > latest sma ( latest close , 100 ) and market cap > 1000 and yearly net profit/reported profit after tax - 1 year ago net profit/reported profit after tax / 1 year ago net profit/reported profit after tax * 100 > 10 ) ) ",
    
    #"Quality"
    "( {cash} ( yearly net profit/reported profit after tax / yearly book value * 100 > 15 and yearly debt equity ratio < 1 and yearly interest cover > 5 and market cap > 3000 and yearly dividend per share rupees / latest close * 100 > 0.5 ) ) ",
    "( {cash} ( yearly net profit/reported profit after tax / yearly book value * 100 > 20 and yearly return on capital employed percentage > 18 and yearly debt equity ratio < 0.5 and yearly current ratio > 1.5 and yearly interest cover > 5 and market cap > 500 ) ) ",
    "( {cash} ( yearly debt equity ratio < 1 and yearly current ratio > 1 and market cap > 1000 and yearly net profit/reported profit after tax / yearly book value * 100 > 15 ) ) ",
    # Example queries from your config:
    # "( {cash} ( market cap > 500 and latest close > 50 and latest volume > 10000 and market cap > 1000 and quarterly close * latest total number / 10000000 / latest sum ( latest net profit/reported profit after tax , 4 ) < 25 and quarterly close * latest total number / 10000000 / latest sum ( latest net profit/reported profit after tax , 4 ) > 5 and yearly return on capital employed percentage > 15 and yearly debt equity ratio < 1 ) )",
    # swing trade
    "( {cash} ( latest close > latest sma( latest close , 20 ) and latest rsi( 14 ) > 50 and latest rsi( 14 ) < 70 and 3 days ago rsi( 14 ) < 45 and latest volume > latest sma( latest volume , 20 ) * 1.3 ) )",
    "( {cash} ( latest close > latest sma ( latest close , 20 ) and latest volume > latest sma ( latest volume , 20 ) * 1.5 and latest close > 1 day ago high and latest close > 50 ) )",
    "( {cash} ( latest close > latest sma ( latest close , 20 ) and  latest volume > latest sma ( latest volume , 20 ) * 1.8 and latest close > 5 days ago max( 5 , latest high ) and latest sma ( latest close , 20 ) > latest sma ( latest close , 50 ) and latest rsi( 14 ) > 45 ) ) ",
    "( {cash} ( latest close > latest sma ( latest close , 20 ) and latest close > latest sma ( latest close , 50 ) and latest volume > latest sma ( latest volume , 20 ) * 2.0 and latest close / 10 days ago close > 1.05 and latest rsi( 14 ) > 50 and latest rsi( 14 ) < 75 and market cap > 500 ) ) ",
    "( {cash} ( latest close > latest sma ( latest close , 10 ) and latest sma ( latest close , 10 ) > latest sma ( latest close , 20 ) and latest volume > latest sma ( latest volume , 10 ) * 1.2 and latest close > 50 ) ) ",
    # Add more queries here...
]

def show_saved_queries():
    """Show all saved queries"""
    print("\n📚 Saved Test Queries:")
    print("-" * 40)
    if not TEST_QUERIES:
        print("No queries saved yet. Add them in the script!")
        return
    
    for i, query in enumerate(TEST_QUERIES):
        # Show first 80 characters of query
        preview = query[:80] + "..." if len(query) > 80 else query
        print(f"{i+1:2d}. {preview}")

def main():
    """Main function for quick testing"""
    print("⚡ Quick Query Tester")
    print("=" * 30)
    
    # Check connectivity first
    if not check_connectivity():
        print("\n⚠️ Cannot proceed without ChartInk connectivity")
        return
    
    print("\n💡 Tips:")
    print("- Enter query number (e.g., '1') to test saved query")
    print("- Enter 'list' to see all saved queries")
    print("- Enter 'last' to rerun the last query")
    print("- Enter 'q' or 'quit' to exit")
    print("- Or type a full query to test it")
    
    last_query = ""
    
    while True:
        print("\n" + "-" * 50)
        query_input = input("Enter query/number/command: ").strip()
        
        if query_input.lower() in ['q', 'quit', 'exit']:
            print("👋 Happy testing!")
            break
            
        if query_input.lower() == 'list':
            show_saved_queries()
            continue
            
        if query_input.lower() == 'last':
            if last_query:
                query_input = last_query
                print(f"🔄 Rerunning: {query_input[:100]}...")
            else:
                print("❌ No previous query to rerun")
                continue
        
        # Check if it's a query number
        if query_input.isdigit():
            query_num = int(query_input) - 1
            if 0 <= query_num < len(TEST_QUERIES):
                query_input = TEST_QUERIES[query_num]
                print(f"🔄 Testing query #{query_num + 1}: {query_input[:100]}...")
            else:
                print(f"❌ Invalid query number. Use 1-{len(TEST_QUERIES)}")
                continue
        
        if not query_input:
            print("❌ Please enter a query or query number")
            continue
            
        # Ask for limit
        limit_input = input("Results limit (default 10): ").strip()
        try:
            limit = int(limit_input) if limit_input else 10
        except ValueError:
            limit = 10
            
        # Test the query
        print(f"\n🔍 Testing query...")
        test_query(query_input, "Quick Test", limit=limit)
        
        # Save as last query
        last_query = query_input

if __name__ == "__main__":
    main() 