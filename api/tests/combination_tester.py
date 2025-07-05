#!/usr/bin/env python3
"""
Combination Tester - Test different combinations of query variants
Learn which combinations work best over time
Usage: python combination_tester.py
"""

import sys
import os
import json
from collections import defaultdict
from datetime import datetime
from itertools import product

# Add the project root to the path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Import the test function
from test_queries import test_query_silent

def load_config():
    """Load the long term config with all query variants"""
    config_path = os.path.join(os.path.dirname(__file__), 'config', 'long_term_config.json')
    with open(config_path, 'r') as f:
        return json.load(f)

def load_combination_history():
    """Load historical combination test results"""
    history_path = os.path.join(os.path.dirname(__file__), 'results', 'combination_history.json')
    
    if os.path.exists(history_path):
        with open(history_path, 'r') as f:
            return json.load(f)
    else:
        return {"combinations": [], "metadata": {"created": datetime.now().isoformat()}}

def save_combination_history(history):
    """Save combination test results"""
    history_path = os.path.join(os.path.dirname(__file__), 'results', 'combination_history.json')
    
    # Create results directory if it doesn't exist
    os.makedirs(os.path.dirname(history_path), exist_ok=True)
    
    history["metadata"]["last_updated"] = datetime.now().isoformat()
    
    with open(history_path, 'w') as f:
        json.dump(history, f, indent=2)

def show_available_variants(config):
    """Show all available query variants by category"""
    print("\n📚 Available Query Variants:")
    print("=" * 50)
    
    variants_by_category = {}
    
    for category, variants in config['sub_algorithm_variants'].items():
        print(f"\n🎯 {category.upper()} variants:")
        variants_by_category[category] = {}
        
        for version, variant_data in variants.items():
            name = variant_data['name']
            weight = variant_data['weight']
            print(f"  {version}: {name} (weight: {weight})")
            variants_by_category[category][version] = variant_data
    
    return variants_by_category

def test_single_combination(config, fundamental_v, momentum_v, value_v, quality_v, limit=30):
    """Test a single combination of queries"""
    
    categories = ['fundamental', 'momentum', 'value', 'quality']
    versions = [fundamental_v, momentum_v, value_v, quality_v]
    
    print(f"\n🔬 Testing Combination:")
    print(f"   Fundamental: {fundamental_v}")
    print(f"   Momentum: {momentum_v}")
    print(f"   Value: {value_v}")
    print(f"   Quality: {quality_v}")
    print("-" * 50)
    
    all_stocks = defaultdict(float)  # symbol -> total_score
    stock_appearances = defaultdict(int)
    stock_categories = defaultdict(set)
    category_results = {}
    
    total_weight = 0
    total_stocks_found = 0
    
    # Test each category
    for category, version in zip(categories, versions):
        variant_data = config['sub_algorithm_variants'][category][version]
        query = variant_data['query']
        weight = variant_data['weight']
        name = variant_data['name']
        
        print(f"  🔍 {category}: {name[:40]}...")
        
        # Run the query
        results = test_query_silent(query, limit=limit)
        
        if results and 'data' in results:
            stocks = results['data']
            stocks_found = len(stocks)
            print(f"     ✅ {stocks_found} stocks")
            
            category_results[category] = {
                'stocks_found': stocks_found,
                'weight': weight,
                'stocks': stocks
            }
            
            total_stocks_found += stocks_found
            total_weight += weight
            
            # Score stocks from this category
            for stock in stocks:
                symbol = stock.get('nsecode', 'UNKNOWN')
                all_stocks[symbol] += weight
                stock_appearances[symbol] += 1
                stock_categories[symbol].add(category)
        else:
            print(f"     ❌ No results")
            category_results[category] = {
                'stocks_found': 0,
                'weight': weight,
                'stocks': []
            }
    
    # Calculate combination metrics
    unique_stocks = len(all_stocks)
    multi_category_stocks = sum(1 for s in stock_categories.values() if len(s) > 1)
    
    # Get top stocks from this combination
    sorted_stocks = sorted(all_stocks.items(), key=lambda x: x[1], reverse=True)
    top_stocks = []
    
    for symbol, score in sorted_stocks[:10]:
        # Get stock details
        stock_details = None
        for cat_data in category_results.values():
            for stock in cat_data['stocks']:
                if stock.get('nsecode') == symbol:
                    stock_details = stock
                    break
            if stock_details:
                break
        
        if stock_details:
            top_stocks.append({
                'symbol': symbol,
                'name': stock_details.get('name', 'N/A'),
                'price': stock_details.get('close', 'N/A'),
                'score': round(score, 2),
                'appearances': stock_appearances[symbol],
                'categories': list(stock_categories[symbol])
            })
    
    # Calculate performance score
    diversity_score = multi_category_stocks / max(unique_stocks, 1) * 100
    coverage_score = unique_stocks / max(total_stocks_found, 1) * 100
    weight_efficiency = total_weight / 4  # Average weight
    
    performance_score = (diversity_score * 0.4 + coverage_score * 0.3 + weight_efficiency * 100 * 0.3)
    
    combination_result = {
        'combination': {
            'fundamental': fundamental_v,
            'momentum': momentum_v,
            'value': value_v,
            'quality': quality_v
        },
        'metrics': {
            'unique_stocks': unique_stocks,
            'total_stocks_found': total_stocks_found,
            'multi_category_stocks': multi_category_stocks,
            'diversity_score': round(diversity_score, 2),
            'coverage_score': round(coverage_score, 2),
            'performance_score': round(performance_score, 2),
            'total_weight': total_weight
        },
        'top_stocks': top_stocks,
        'category_results': category_results,
        'tested_at': datetime.now().isoformat()
    }
    
    # Display results
    print(f"\n📊 Combination Results:")
    print(f"   Unique stocks: {unique_stocks}")
    print(f"   Multi-category stocks: {multi_category_stocks}")
    print(f"   Diversity score: {diversity_score:.1f}%")
    print(f"   Performance score: {performance_score:.1f}")
    
    if top_stocks:
        print(f"\n🏆 Top 5 stocks from this combination:")
        for i, stock in enumerate(top_stocks[:5]):
            cats = ', '.join(stock['categories'])
            print(f"   {i+1}. {stock['symbol']:10s} - Score: {stock['score']:4.1f} - Categories: {cats}")
    
    return combination_result

def interactive_combination_test(config):
    """Interactive testing of specific combinations"""
    variants_by_category = show_available_variants(config)
    
    while True:
        print(f"\n🎯 Create a Custom Combination")
        print("-" * 40)
        
        combination = {}
        
        # Select from each category
        for category in ['fundamental', 'momentum', 'value', 'quality']:
            available = list(variants_by_category[category].keys())
            print(f"\n{category.upper()} variants: {', '.join(available)}")
            
            while True:
                version = input(f"Select {category} version: ").strip()
                if version in available:
                    combination[category] = version
                    break
                else:
                    print(f"❌ Invalid. Choose from: {', '.join(available)}")
        
        # Test the combination
        result = test_single_combination(
            config, 
            combination['fundamental'],
            combination['momentum'], 
            combination['value'],
            combination['quality']
        )
        
        # Save result
        history = load_combination_history()
        history['combinations'].append(result)
        save_combination_history(history)
        
        # Continue?
        continue_test = input(f"\n🔄 Test another combination? (y/N): ").strip().lower()
        if continue_test != 'y':
            break

def auto_test_top_combinations(config, top_n=5):
    """Automatically test the most promising combinations"""
    print(f"\n🤖 Auto-Testing Top {top_n} Promising Combinations")
    print("=" * 50)
    
    # Get all possible combinations
    categories = ['fundamental', 'momentum', 'value', 'quality']
    all_versions = []
    
    for category in categories:
        versions = list(config['sub_algorithm_variants'][category].keys())
        all_versions.append(versions)
    
    all_combinations = list(product(*all_versions))
    print(f"Total possible combinations: {len(all_combinations)}")
    
    # Test a sample of combinations
    import random
    random.shuffle(all_combinations)
    
    test_combinations = all_combinations[:top_n]
    results = []
    
    for i, (fund_v, mom_v, val_v, qual_v) in enumerate(test_combinations):
        print(f"\n🔬 Testing combination {i+1}/{len(test_combinations)}")
        result = test_single_combination(config, fund_v, mom_v, val_v, qual_v)
        results.append(result)
    
    # Save all results
    history = load_combination_history()
    history['combinations'].extend(results)
    save_combination_history(history)
    
    # Show best performing
    print(f"\n🏆 Best Performing Combinations:")
    sorted_results = sorted(results, key=lambda x: x['metrics']['performance_score'], reverse=True)
    
    for i, result in enumerate(sorted_results):
        comb = result['combination']
        metrics = result['metrics']
        print(f"\n{i+1}. F:{comb['fundamental']} M:{comb['momentum']} V:{comb['value']} Q:{comb['quality']}")
        print(f"   Performance: {metrics['performance_score']:.1f} | Stocks: {metrics['unique_stocks']} | Diversity: {metrics['diversity_score']:.1f}%")

def show_combination_history():
    """Show historical combination test results"""
    history = load_combination_history()
    
    if not history['combinations']:
        print("📝 No combination history found. Test some combinations first!")
        return
    
    print(f"\n📈 Combination Test History")
    print("=" * 50)
    print(f"Total tests run: {len(history['combinations'])}")
    
    # Sort by performance score
    sorted_combos = sorted(history['combinations'], 
                          key=lambda x: x['metrics']['performance_score'], 
                          reverse=True)
    
    print(f"\n🏆 Top 10 Best Performing Combinations:")
    print("-" * 80)
    
    for i, combo in enumerate(sorted_combos[:10]):
        comb = combo['combination']
        metrics = combo['metrics']
        
        print(f"{i+1:2d}. F:{comb['fundamental']:4s} M:{comb['momentum']:4s} V:{comb['value']:4s} Q:{comb['quality']:4s} | "
              f"Score: {metrics['performance_score']:5.1f} | "
              f"Stocks: {metrics['unique_stocks']:3d} | "
              f"Diversity: {metrics['diversity_score']:4.1f}%")
    
    # Show trends
    if len(history['combinations']) > 1:
        avg_performance = sum(c['metrics']['performance_score'] for c in history['combinations']) / len(history['combinations'])
        best_performance = max(c['metrics']['performance_score'] for c in history['combinations'])
        
        print(f"\n📊 Performance Trends:")
        print(f"   Average performance: {avg_performance:.1f}")
        print(f"   Best performance: {best_performance:.1f}")

def main():
    """Main function"""
    print("🧪 Query Combination Tester")
    print("Learn which combinations work best over time")
    print("=" * 50)
    
    config = load_config()
    
    while True:
        print("\n📋 Options:")
        print("1. Show available variants")
        print("2. Test custom combination")
        print("3. Auto-test promising combinations")
        print("4. Show combination history")
        print("5. Exit")
        
        choice = input("\nSelect option (1-5): ").strip()
        
        if choice == '1':
            show_available_variants(config)
            
        elif choice == '2':
            interactive_combination_test(config)
            
        elif choice == '3':
            num_tests = input("How many combinations to test? (default 5): ").strip()
            try:
                num_tests = int(num_tests) if num_tests else 5
            except ValueError:
                num_tests = 5
            auto_test_top_combinations(config, num_tests)
            
        elif choice == '4':
            show_combination_history()
            
        elif choice == '5':
            print("👋 Happy combination testing!")
            break
            
        else:
            print("❌ Invalid choice. Please select 1-5.")

if __name__ == "__main__":
    main() 