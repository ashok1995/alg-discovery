#!/usr/bin/env python3
"""
Generate Top Recommendations - Use tested query variants to find best stocks
Usage: python generate_recommendations.py
"""

import sys
import os
import json
from collections import defaultdict, Counter
from datetime import datetime

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

def run_all_variants(config, limit_per_query=50):
    """Run all query variants and collect results"""
    print("🔍 Running all query variants...")
    print("=" * 50)
    
    all_results = {}
    stock_scores = defaultdict(float)
    stock_appearances = defaultdict(int)
    stock_categories = defaultdict(set)
    
    # Run each category of variants
    for category, variants in config['sub_algorithm_variants'].items():
        print(f"\n📊 Testing {category.upper()} variants:")
        
        for version, variant_data in variants.items():
            query = variant_data['query']
            weight = variant_data['weight']
            name = variant_data['name']
            
            print(f"  {version}: {name[:50]}...")
            
            # Run the query silently
            results = test_query_silent(query, limit=limit_per_query)
            
            if results and 'data' in results:
                stocks = results['data']
                print(f"    ✅ Found {len(stocks)} stocks")
                
                # Store results
                all_results[f"{category}_{version}"] = {
                    'name': name,
                    'stocks': stocks,
                    'weight': weight,
                    'category': category
                }
                
                # Score each stock
                for stock in stocks:
                    symbol = stock.get('nsecode', 'UNKNOWN')
                    stock_scores[symbol] += weight
                    stock_appearances[symbol] += 1
                    stock_categories[symbol].add(category)
                    
            else:
                print(f"    ❌ No results or error")
    
    return all_results, stock_scores, stock_appearances, stock_categories

def generate_top_recommendations(stock_scores, stock_appearances, stock_categories, all_results, top_n=20):
    """Generate top recommendations based on scores and appearances"""
    
    # Calculate final scores (score * appearances for diversity bonus)
    final_scores = {}
    for symbol in stock_scores:
        base_score = stock_scores[symbol]
        appearance_bonus = stock_appearances[symbol] * 0.1  # Bonus for appearing in multiple queries
        diversity_bonus = len(stock_categories[symbol]) * 0.2  # Bonus for appearing in multiple categories
        final_scores[symbol] = base_score + appearance_bonus + diversity_bonus
    
    # Sort by final score
    sorted_stocks = sorted(final_scores.items(), key=lambda x: x[1], reverse=True)
    
    print(f"\n🏆 TOP {top_n} STOCK RECOMMENDATIONS")
    print("=" * 60)
    
    recommendations = []
    
    for i, (symbol, score) in enumerate(sorted_stocks[:top_n]):
        appearances = stock_appearances[symbol]
        categories = list(stock_categories[symbol])
        base_score = stock_scores[symbol]
        
        # Get stock details from any result that contains it
        stock_details = None
        for result_data in all_results.values():
            for stock in result_data['stocks']:
                if stock.get('nsecode') == symbol:
                    stock_details = stock
                    break
            if stock_details:
                break
        
        if stock_details:
            price = stock_details.get('close', 'N/A')
            name = stock_details.get('name', 'N/A')
            
            # Format price properly
            if isinstance(price, (int, float)):
                price_str = f"{price:.2f}"
            else:
                price_str = str(price)
            
            recommendation = {
                'rank': i + 1,
                'symbol': symbol,
                'name': name,
                'price': price,
                'final_score': round(score, 2),
                'base_score': round(base_score, 2),
                'appearances': appearances,
                'categories': categories
            }
            recommendations.append(recommendation)
            
            print(f"{i+1:2d}. {symbol:12s} | {name[:25]:25s} | ₹{price_str:>8s}")
            print(f"    Score: {score:5.2f} | Appears: {appearances}x | Categories: {', '.join(categories)}")
            print()
    
    return recommendations

def save_recommendations(recommendations, filename=None):
    """Save recommendations to JSON file"""
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"recommendations_{timestamp}.json"
    
    filepath = os.path.join(os.path.dirname(__file__), 'results', filename)
    
    # Create results directory if it doesn't exist
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    output_data = {
        'generated_at': datetime.now().isoformat(),
        'total_recommendations': len(recommendations),
        'recommendations': recommendations
    }
    
    with open(filepath, 'w') as f:
        json.dump(output_data, f, indent=2)
    
    print(f"💾 Recommendations saved to: {filepath}")
    return filepath

def show_category_analysis(stock_categories, stock_scores):
    """Show analysis by category"""
    print("\n📈 CATEGORY ANALYSIS")
    print("=" * 40)
    
    category_counts = defaultdict(int)
    for symbol, categories in stock_categories.items():
        for category in categories:
            category_counts[category] += 1
    
    for category, count in sorted(category_counts.items()):
        print(f"{category:15s}: {count:3d} unique stocks")
    
    # Show stocks appearing in multiple categories
    multi_category_stocks = {symbol: categories for symbol, categories in stock_categories.items() 
                           if len(categories) > 1}
    
    if multi_category_stocks:
        print(f"\n🎯 DIVERSIFIED STOCKS (appearing in multiple categories):")
        for symbol, categories in sorted(multi_category_stocks.items(), 
                                       key=lambda x: len(x[1]), reverse=True):
            score = stock_scores[symbol]
            print(f"  {symbol:12s}: {', '.join(sorted(categories))} (Score: {score:.2f})")

def main():
    """Main function"""
    print("🚀 Generating Stock Recommendations")
    print("Using tested query variants from config")
    print("=" * 50)
    
    # Load config
    config = load_config()
    
    # Run all variants
    all_results, stock_scores, stock_appearances, stock_categories = run_all_variants(config)
    
    if not stock_scores:
        print("❌ No stocks found from any queries!")
        return
    
    print(f"\n📊 SUMMARY:")
    print(f"Total unique stocks found: {len(stock_scores)}")
    print(f"Total query variants run: {len(all_results)}")
    
    # Show category analysis
    show_category_analysis(stock_categories, stock_scores)
    
    # Generate top recommendations
    recommendations = generate_top_recommendations(
        stock_scores, stock_appearances, stock_categories, all_results, top_n=25
    )
    
    # Save results
    save_recommendations(recommendations)
    
    print(f"\n✅ Recommendation generation complete!")
    print(f"Top {len(recommendations)} stocks identified using your tested query variants.")

if __name__ == "__main__":
    main() 