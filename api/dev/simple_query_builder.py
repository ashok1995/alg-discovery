#!/usr/bin/env python3
"""
Simple Query Builder - Build ChartInk queries one condition at a time
Usage: python simple_query_builder.py
"""

import sys
import os

# Add the project root to the path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Import the test function
from test_queries import test_query, check_connectivity

class SimpleQueryBuilder:
    def __init__(self):
        self.conditions = []
        
    def add_condition(self, condition: str):
        """Add a condition to the query"""
        self.conditions.append(condition)
        
    def remove_condition(self, index: int):
        """Remove a condition by index"""
        if 0 <= index < len(self.conditions):
            removed = self.conditions.pop(index)
            print(f"✅ Removed: {removed}")
        else:
            print("❌ Invalid index")
            
    def build_query(self) -> str:
        """Build the complete ChartInk query"""
        if not self.conditions:
            return "( {cash} ( market cap > 0 ) )"
        
        combined_conditions = " and ".join(self.conditions)
        return f"( {{cash}} ( {combined_conditions} ) )"
    
    def show_current_query(self):
        """Show the current query being built"""
        print(f"\n🔧 Current Query Builder:")
        print("-" * 50)
        if not self.conditions:
            print("📝 No conditions added yet")
        else:
            for i, condition in enumerate(self.conditions):
                print(f"{i+1:2d}. {condition}")
        
        print(f"\n📊 Full Query:")
        print(self.build_query())
        print(f"📏 Query Length: {len(self.build_query())} characters")
    
    def test_current_query(self, limit: int = 10):
        """Test the current query"""
        query = self.build_query()
        test_query(query, "Current Builder Query", limit=limit)

def suggest_basic_conditions():
    """Suggest some basic conditions to start with"""
    suggestions = [
        # Market Cap filters
        "market cap > 1000",
        "market cap > 5000", 
        "market cap > 10000",
        
        # Price filters
        "latest close > 50",
        "latest close > 100",
        "latest close > 200",
        
        # Volume filters
        "latest volume > 10000",
        "latest volume > 50000",
        "latest volume > 100000",
        
        # Basic fundamental filters
        'latest "p/e" < 20',
        'latest "p/e" > 5',
        'latest "return on equity" > 15',
        'latest "debt to equity" < 1',
        'latest "current ratio" > 1',
        
        # Technical filters
        "latest close > latest sma(close,20)",
        "latest close > latest sma(close,50)",
        "latest volume > latest sma(volume,20) * 1.2",
    ]
    
    print("\n💡 Suggested Basic Conditions:")
    print("-" * 50)
    for i, suggestion in enumerate(suggestions):
        print(f"{i+1:2d}. {suggestion}")
    
    return suggestions

def quick_test_single_condition():
    """Quickly test a single condition"""
    print("\n⚡ Quick Single Condition Test")
    print("-" * 40)
    
    condition = input("Enter a single condition to test: ").strip()
    if not condition:
        print("❌ No condition entered")
        return
    
    # Build a simple query with just this condition
    query = f"( {{cash}} ( {condition} ) )"
    test_query(query, f"Single: {condition}", limit=10)

def main():
    """Main function"""
    print("🛠️ Simple ChartInk Query Builder")
    print("=" * 50)
    
    # Check connectivity first
    if not check_connectivity():
        print("\n⚠️ Cannot proceed without ChartInk connectivity")
        return
    
    builder = SimpleQueryBuilder()
    
    while True:
        print("\n📋 Query Builder Options:")
        print("1. Add condition")
        print("2. Remove condition") 
        print("3. Show current query")
        print("4. Test current query")
        print("5. Clear all conditions")
        print("6. Show suggested conditions")
        print("7. Quick test single condition")
        print("8. Exit")
        
        choice = input("\nSelect option (1-8): ").strip()
        
        if choice == '1':
            print("\nEnter a condition (e.g., 'market cap > 1000'):")
            condition = input("> ").strip()
            if condition:
                builder.add_condition(condition)
                print(f"✅ Added: {condition}")
                builder.show_current_query()
            else:
                print("❌ No condition entered")
                
        elif choice == '2':
            builder.show_current_query()
            if builder.conditions:
                try:
                    index = int(input("Enter condition number to remove: ")) - 1
                    builder.remove_condition(index)
                except ValueError:
                    print("❌ Invalid number")
            else:
                print("❌ No conditions to remove")
                
        elif choice == '3':
            builder.show_current_query()
            
        elif choice == '4':
            if builder.conditions:
                try:
                    limit = int(input("Enter limit (default 10): ") or "10")
                    builder.test_current_query(limit)
                except ValueError:
                    builder.test_current_query(10)
            else:
                print("❌ No conditions to test. Add some conditions first.")
                
        elif choice == '5':
            builder.conditions.clear()
            print("✅ Cleared all conditions")
            
        elif choice == '6':
            suggestions = suggest_basic_conditions()
            try:
                choice_num = int(input("\nEnter suggestion number to add (or 0 to skip): "))
                if 1 <= choice_num <= len(suggestions):
                    condition = suggestions[choice_num - 1]
                    builder.add_condition(condition)
                    print(f"✅ Added: {condition}")
                    builder.show_current_query()
            except ValueError:
                print("❌ Invalid choice")
                
        elif choice == '7':
            quick_test_single_condition()
            
        elif choice == '8':
            print("👋 Happy querying!")
            break
            
        else:
            print("❌ Invalid choice. Please select 1-8.")

if __name__ == "__main__":
    main() 