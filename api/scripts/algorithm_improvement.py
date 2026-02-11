#!/usr/bin/env python3
"""
Algorithm Improvement Script
============================

Interactive script for iteratively improving seed algorithms.
Provides testing, comparison, and version creation capabilities.
"""

import sys
import os
import asyncio
import json
from typing import Dict, Any

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.seed_algorithm_manager import SeedAlgorithmManager
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class AlgorithmImprovementTool:
    """Interactive tool for improving seed algorithms"""
    
    def __init__(self):
        self.manager = SeedAlgorithmManager()
        self.current_test_results = {}
        
    def show_menu(self):
        """Display the main menu"""
        print("\n" + "="*60)
        print("🚀 SEED ALGORITHM IMPROVEMENT TOOL")
        print("="*60)
        print("1. 📊 Test Current Algorithm")
        print("2. 📈 Test Specific Version")
        print("3. 🔍 Compare All Versions")
        print("4. ➕ Create New Version")
        print("5. 📋 View Algorithm Details")
        print("6. 🏆 Get Best Performing Version")
        print("7. 💡 Get Improvement Recommendations")
        print("8. 🔧 Modify Query Interactively")
        print("9. 📦 Export Algorithm Data")
        print("10. 📥 Import Algorithm Data")
        print("11. 🧩 View Sub-Algorithm Variants")
        print("12. ⚖️ Compare Sub-Algorithm Variants")
        print("13. 🎯 Create Algorithm with Custom Sub-Algorithms")
        print("14. 🔬 Test Individual Sub-Algorithm")
        print("0. 🚪 Exit")
        print("="*60)
        
    def test_current_algorithm(self):
        """Test the current algorithm version"""
        print(f"\n🧪 Testing current algorithm version: {self.manager.current_version}")
        
        try:
            results = self.manager.test_algorithm_version(self.manager.current_version)
            self.current_test_results = results
            
            if results:
                print(f"\n✅ Test Results for {results['version']}:")
                print(f"📊 Total stocks found: {results['total_stocks_found']}")
                print(f"🎯 Expected total: {results['expected_total']}")
                print(f"⚡ Efficiency ratio: {results['efficiency_ratio']:.2%}")
                print(f"🏥 Algorithm health: {results['algorithm_health']}")
                
                print(f"\n📈 Query Performance:")
                for query_name, query_result in results['query_results'].items():
                    print(f"  • {query_name}: {query_result['stocks_found']}/{query_result['expected']} stocks")
                
                print(f"\n🏆 Top 5 Ranked Stocks:")
                for i, stock in enumerate(results['top_ranked_stocks'][:5]):
                    print(f"  {i+1}. {stock['symbol']} (Score: {stock['total_score']:.2f}, Frequency: {stock['frequency_bonus']})")
                    
            else:
                print("❌ Test failed - no results returned")
                
        except Exception as e:
            print(f"❌ Error testing algorithm: {e}")
            logger.error(f"Error testing algorithm: {e}")
    
    def test_specific_version(self):
        """Test a specific algorithm version"""
        versions = list(self.manager.algorithms.keys())
        print(f"\n📋 Available versions: {', '.join(versions)}")
        
        version = input("Enter version to test: ").strip()
        
        if version not in versions:
            print(f"❌ Version {version} not found")
            return
            
        print(f"\n🧪 Testing algorithm version: {version}")
        
        try:
            results = self.manager.test_algorithm_version(version)
            
            if results:
                print(f"\n✅ Test Results for {results['version']}:")
                print(f"📊 Total stocks found: {results['total_stocks_found']}")
                print(f"🎯 Expected total: {results['expected_total']}")
                print(f"⚡ Efficiency ratio: {results['efficiency_ratio']:.2%}")
                print(f"🏥 Algorithm health: {results['algorithm_health']}")
                
                print(f"\n🏆 Top 10 Ranked Stocks:")
                for i, stock in enumerate(results['top_ranked_stocks'][:10]):
                    print(f"  {i+1}. {stock['symbol']} (Score: {stock['total_score']:.2f})")
                    
        except Exception as e:
            print(f"❌ Error testing version {version}: {e}")
    
    def compare_versions(self):
        """Compare all algorithm versions"""
        print("\n📈 Comparing all algorithm versions...")
        
        comparison = self.manager.get_algorithm_comparison()
        
        print(f"\n🏆 Best performing version: {comparison['best_version']}")
        print(f"\n📊 Version Comparison:")
        
        for version, data in comparison['versions'].items():
            status_emoji = "🟢" if data['status'] == 'active' else "🟡" if data['status'] == 'testing' else "🔴"
            print(f"\n{status_emoji} {version}: {data['name']}")
            print(f"   Status: {data['status']}")
            print(f"   Queries: {data['query_count']}")
            print(f"   Test runs: {data['performance']['test_runs']}")
            
            if 'recent_efficiency' in data:
                print(f"   Recent efficiency: {data['recent_efficiency']:.2%}")
                print(f"   Health: {data['recent_health']}")
        
        print(f"\n💡 Recommendations:")
        for rec in comparison['recommendations']:
            print(f"   • {rec}")
    
    def create_new_version(self):
        """Create a new algorithm version with improvements"""
        versions = list(self.manager.algorithms.keys())
        print(f"\n📋 Available base versions: {', '.join(versions)}")
        
        base_version = input("Enter base version for new algorithm: ").strip()
        
        if base_version not in versions:
            print(f"❌ Base version {base_version} not found")
            return
        
        print(f"\n🛠️ Creating new version based on {base_version}")
        
        # Get improvement details
        name = input("Enter name for new algorithm: ").strip()
        description = input("Enter description: ").strip()
        
        improvements = {
            'name': name if name else f"Enhanced {base_version}",
            'description': description if description else f"Enhanced version of {base_version}"
        }
        
        # Option to modify queries
        modify_queries = input("Do you want to modify queries? (y/n): ").strip().lower() == 'y'
        
        if modify_queries:
            base_algo = self.manager.algorithms[base_version]
            query_modifications = {}
            
            print(f"\n📝 Current queries in {base_version}:")
            for query_name, query_config in base_algo['chartink_queries'].items():
                print(f"\n{query_name}:")
                print(f"  Description: {query_config['description']}")
                print(f"  Weight: {query_config['weight']}")
                print(f"  Expected results: {query_config['expected_results']}")
                print(f"  Query: {query_config['query'][:100]}...")
                
                modify_this = input(f"Modify {query_name}? (y/n): ").strip().lower() == 'y'
                
                if modify_this:
                    modifications = {}
                    
                    new_query = input("Enter new query (or press Enter to keep current): ").strip()
                    if new_query:
                        modifications['query'] = new_query
                    
                    new_weight = input("Enter new weight (or press Enter to keep current): ").strip()
                    if new_weight:
                        try:
                            modifications['weight'] = float(new_weight)
                        except ValueError:
                            print("⚠️ Invalid weight, keeping current")
                    
                    new_expected = input("Enter new expected results (or press Enter to keep current): ").strip()
                    if new_expected:
                        try:
                            modifications['expected_results'] = int(new_expected)
                        except ValueError:
                            print("⚠️ Invalid expected results, keeping current")
                    
                    if modifications:
                        query_modifications[query_name] = modifications
            
            if query_modifications:
                improvements['query_modifications'] = query_modifications
        
        # Create new version
        try:
            new_version = self.manager.create_new_version(base_version, improvements)
            if new_version:
                print(f"\n✅ Successfully created new version: {new_version}")
                
                # Offer to test the new version
                test_new = input("Test the new version now? (y/n): ").strip().lower() == 'y'
                if test_new:
                    self.manager.test_algorithm_version(new_version)
            else:
                print("❌ Failed to create new version")
                
        except Exception as e:
            print(f"❌ Error creating new version: {e}")
    
    def view_algorithm_details(self):
        """View detailed information about an algorithm"""
        versions = list(self.manager.algorithms.keys())
        print(f"\n📋 Available versions: {', '.join(versions)}")
        
        version = input("Enter version to view: ").strip()
        
        if version not in versions:
            print(f"❌ Version {version} not found")
            return
        
        # Get detailed algorithm information including sub-algorithms
        algorithm = self.manager.get_algorithm_with_sub_algorithms(version)
        
        print(f"\n📊 Algorithm Details: {version}")
        print(f"Name: {algorithm['name']}")
        print(f"Description: {algorithm['description']}")
        print(f"Status: {algorithm['status']}")
        print(f"Created: {algorithm['created_date']}")
        
        if 'base_version' in algorithm:
            print(f"Based on: {algorithm['base_version']}")
        
        print(f"\n📈 Performance Metrics:")
        metrics = algorithm['performance_metrics']
        for key, value in metrics.items():
            print(f"  {key}: {value}")
        
        # Show sub-algorithm configuration
        if 'sub_algorithm_config' in algorithm:
            print(f"\n🧩 Sub-Algorithm Configuration:")
            for category, variant_version in algorithm['sub_algorithm_config'].items():
                print(f"  {category}: {variant_version}")
                
                # Show details if available
                if 'sub_algorithm_details' in algorithm and category in algorithm['sub_algorithm_details']:
                    details = algorithm['sub_algorithm_details'][category]
                    print(f"    └─ {details['name']}: {details['description']}")
        
        # Show resolved queries
        if 'resolved_queries' in algorithm:
            print(f"\n🔍 Resolved Queries:")
            for query_name, query_config in algorithm['resolved_queries'].items():
                print(f"\n  📝 {query_name}:")
                print(f"    Category: {query_config.get('category', 'unknown')} v{query_config.get('variant_version', 'unknown')}")
                print(f"    Description: {query_config['description']}")
                print(f"    Weight: {query_config['weight']}")
                print(f"    Expected: {query_config['expected_results']} stocks")
                print(f"    Query: {query_config['query'][:100]}...")
    
    def get_best_version(self):
        """Display the best performing version"""
        best_version = self.manager.get_best_performing_version()
        print(f"\n🏆 Best performing version: {best_version}")
        
        if best_version in self.manager.performance_history:
            history = self.manager.performance_history[best_version]
            if history:
                recent_tests = history[-3:]
                avg_efficiency = sum(test.get('efficiency_ratio', 0) for test in recent_tests) / len(recent_tests)
                print(f"📊 Recent average efficiency: {avg_efficiency:.2%}")
                print(f"🏥 Latest health: {recent_tests[-1].get('algorithm_health', 'Unknown')}")
    
    def get_recommendations(self):
        """Get improvement recommendations"""
        print("\n💡 Algorithm Improvement Recommendations:")
        
        recommendations = self.manager.generate_improvement_recommendations()
        
        for i, rec in enumerate(recommendations, 1):
            print(f"  {i}. {rec}")
    
    def modify_query_interactive(self):
        """Interactively modify a specific query"""
        versions = list(self.manager.algorithms.keys())
        print(f"\n📋 Available versions: {', '.join(versions)}")
        
        version = input("Enter version to modify: ").strip()
        
        if version not in versions:
            print(f"❌ Version {version} not found")
            return
        
        algorithm = self.manager.algorithms[version]
        queries = list(algorithm['chartink_queries'].keys())
        
        print(f"\n📝 Available queries: {', '.join(queries)}")
        query_name = input("Enter query name to modify: ").strip()
        
        if query_name not in queries:
            print(f"❌ Query {query_name} not found")
            return
        
        current_query = algorithm['chartink_queries'][query_name]['query']
        
        print(f"\n🔍 Current query for {query_name}:")
        print(current_query)
        
        print(f"\n🛠️ Query Modification Helper:")
        print("Chartink Query Language Examples:")
        print("• latest close > latest sma(close,20) - Price above 20-day SMA")
        print("• latest rsi(14) > 30 and latest rsi(14) < 70 - RSI between 30-70")
        print("• latest volume > latest sma(volume,20) - Volume above average")
        print("• latest \"market cap\" > 1000 - Market cap above 1000 Cr")
        print("• [0] 1 week ago close > [0] 1 week ago low * 1.05 - Weekly performance")
        
        new_query = input("\nEnter new query: ").strip()
        
        if new_query:
            # Test the new query
            print("\n🧪 Testing new query...")
            
            try:
                test_df = self.manager.execute_chartink_query(new_query)
                
                if not test_df.empty:
                    print(f"✅ Query successful! Found {len(test_df)} stocks")
                    print("Top 5 results:")
                    for i, row in test_df.head().iterrows():
                        print(f"  {row.get('nsecode', 'N/A')} - {row.get('per_chg', 0):.2f}%")
                    
                    # Update the query
                    apply_change = input("Apply this change? (y/n): ").strip().lower() == 'y'
                    
                    if apply_change:
                        algorithm['chartink_queries'][query_name]['query'] = new_query
                        self.manager.save_algorithms()
                        print("✅ Query updated successfully!")
                else:
                    print("⚠️ Query returned no results")
                    
            except Exception as e:
                print(f"❌ Error testing query: {e}")
    
    def export_data(self):
        """Export algorithm data"""
        filename = input("Enter export filename (default: algorithm_export.json): ").strip()
        if not filename:
            filename = "algorithm_export.json"
        
        try:
            export_data = {
                'algorithms': self.manager.algorithms,
                'performance_history': self.manager.performance_history,
                'current_version': self.manager.current_version,
                'export_date': self.manager.datetime.now().isoformat()
            }
            
            with open(filename, 'w') as f:
                json.dump(export_data, f, indent=2)
            
            print(f"✅ Data exported to {filename}")
            
        except Exception as e:
            print(f"❌ Error exporting data: {e}")
    
    def import_data(self):
        """Import algorithm data"""
        filename = input("Enter import filename: ").strip()
        
        if not os.path.exists(filename):
            print(f"❌ File {filename} not found")
            return
        
        try:
            with open(filename, 'r') as f:
                import_data = json.load(f)
            
            # Merge with existing data
            if 'algorithms' in import_data:
                self.manager.algorithms.update(import_data['algorithms'])
            
            if 'performance_history' in import_data:
                for version, history in import_data['performance_history'].items():
                    if version not in self.manager.performance_history:
                        self.manager.performance_history[version] = []
                    self.manager.performance_history[version].extend(history)
            
            self.manager.save_algorithms()
            print(f"✅ Data imported from {filename}")
            
        except Exception as e:
            print(f"❌ Error importing data: {e}")
    
    def view_sub_algorithm_variants(self):
        """View all available sub-algorithm variants"""
        print("\n🧩 Available Sub-Algorithm Variants:")
        
        variants = self.manager.get_available_sub_algorithm_variants()
        
        if not variants:
            print("❌ No sub-algorithm variants found")
            return
        
        for category, variant_list in variants.items():
            print(f"\n📁 {category.upper()} Variants:")
            for variant in variant_list:
                print(f"  🔸 {variant['version']}: {variant['name']}")
                print(f"     Description: {variant['description']}")
                print(f"     Weight: {variant['weight']}, Expected: {variant['expected_results']} stocks")

    def compare_sub_algorithm_variants(self):
        """Compare variants within a specific sub-algorithm category"""
        variants = self.manager.get_available_sub_algorithm_variants()
        
        if not variants:
            print("❌ No sub-algorithm variants found")
            return
        
        print(f"\n📋 Available categories: {', '.join(variants.keys())}")
        category = input("Enter category to compare: ").strip().lower()
        
        if category not in variants:
            print(f"❌ Category {category} not found")
            return
        
        print(f"\n🔬 Comparing {category} variants...")
        
        try:
            comparison = self.manager.compare_sub_algorithm_variants(category)
            
            if 'error' in comparison:
                print(f"❌ Error: {comparison['error']}")
                return
            
            print(f"\n📊 Comparison Results for {category.upper()}:")
            print(f"Best variant: {comparison.get('best_variant', 'Unknown')}")
            print(f"Variants tested: {comparison['variants_tested']}")
            
            for version, result in comparison['results'].items():
                status_emoji = "🟢" if result['performance_rating'] == 'excellent' else "🟡" if result['performance_rating'] == 'good' else "🟠" if result['performance_rating'] == 'fair' else "🔴"
                print(f"\n{status_emoji} {version}: {result['name']} ({result['performance_rating'].upper()})")
                print(f"   Stocks found: {result['stocks_found']}/{result['expected_results']} (Efficiency: {result['efficiency']:.2%})")
                print(f"   Description: {result['description']}")
                
                if result['top_stocks']:
                    print(f"   Top stocks: {', '.join([stock.get('nsecode', 'N/A') for stock in result['top_stocks'][:3]])}")
                
        except Exception as e:
            print(f"❌ Error comparing variants: {e}")

    def create_algorithm_with_custom_sub_algorithms(self):
        """Create a new algorithm with custom sub-algorithm combinations"""
        versions = list(self.manager.algorithms.keys())
        print(f"\n📋 Available base versions: {', '.join(versions)}")
        
        base_version = input("Enter base version: ").strip()
        
        if base_version not in versions:
            print(f"❌ Base version {base_version} not found")
            return
        
        name = input("Enter name for new algorithm: ").strip()
        if not name:
            print("❌ Name is required")
            return
        
        description = input("Enter description: ").strip()
        if not description:
            description = f"Custom algorithm based on {base_version}"
        
        # Get available sub-algorithm variants
        variants = self.manager.get_available_sub_algorithm_variants()
        
        if not variants:
            print("❌ No sub-algorithm variants available")
            return
        
        print(f"\n🎯 Configure Sub-Algorithms:")
        sub_algorithm_config = {}
        
        for category, variant_list in variants.items():
            print(f"\n📁 {category.upper()} options:")
            for variant in variant_list:
                print(f"  {variant['version']}: {variant['name']} - {variant['description']}")
            
            while True:
                choice = input(f"Select {category} variant version: ").strip()
                if any(v['version'] == choice for v in variant_list):
                    sub_algorithm_config[category] = choice
                    print(f"✅ Selected {category}: {choice}")
                    break
                else:
                    print(f"❌ Invalid choice. Available options: {', '.join([v['version'] for v in variant_list])}")
        
        print(f"\n📋 Creating algorithm with configuration:")
        for category, version in sub_algorithm_config.items():
            print(f"  {category}: {version}")
        
        confirm = input("Proceed with creation? (y/n): ").strip().lower() == 'y'
        
        if confirm:
            try:
                new_version = self.manager.create_new_version_with_sub_algorithms(
                    base_version, name, description, sub_algorithm_config
                )
                
                if new_version:
                    print(f"✅ Created new algorithm: {new_version}")
                    
                    # Offer to test the new algorithm
                    test_new = input("Test the new algorithm now? (y/n): ").strip().lower() == 'y'
                    if test_new:
                        results = self.manager.test_algorithm_version(new_version)
                        if results:
                            print(f"\n📊 Test Results:")
                            print(f"Total stocks found: {results['total_stocks_found']}")
                            print(f"Algorithm health: {results['algorithm_health']}")
                            
                            if 'sub_algorithm_breakdown' in results:
                                print(f"\n🧩 Sub-Algorithm Performance:")
                                for category, variants in results['sub_algorithm_breakdown'].items():
                                    for variant, perf in variants.items():
                                        print(f"  {category} {variant}: {perf['stocks_found']}/{perf['expected']} ({perf['status']})")
                else:
                    print("❌ Failed to create new algorithm")
                    
            except Exception as e:
                print(f"❌ Error creating algorithm: {e}")

    def test_individual_sub_algorithm(self):
        """Test a specific sub-algorithm variant individually"""
        variants = self.manager.get_available_sub_algorithm_variants()
        
        if not variants:
            print("❌ No sub-algorithm variants found")
            return
        
        print(f"\n📋 Available categories: {', '.join(variants.keys())}")
        category = input("Enter category: ").strip().lower()
        
        if category not in variants:
            print(f"❌ Category {category} not found")
            return
        
        variant_list = variants[category]
        print(f"\n📋 Available {category} variants:")
        for variant in variant_list:
            print(f"  {variant['version']}: {variant['name']}")
        
        version = input("Enter variant version to test: ").strip()
        
        variant_data = None
        for variant in variant_list:
            if variant['version'] == version:
                variant_data = variant
                break
        
        if not variant_data:
            print(f"❌ Variant {version} not found in {category}")
            return
        
        print(f"\n🧪 Testing {category} variant {version}: {variant_data['name']}")
        print(f"Description: {variant_data['description']}")
        
        try:
            # Get the actual query from sub_algorithm_variants
            sub_variants = getattr(self.manager, 'sub_algorithm_variants', {})
            if category in sub_variants and version in sub_variants[category]:
                query = sub_variants[category][version]['query']
                
                print(f"🔍 Executing query...")
                df = self.manager.execute_chartink_query(query)
                
                if not df.empty:
                    stocks_found = len(df)
                    expected = variant_data['expected_results']
                    efficiency = stocks_found / expected if expected > 0 else 0
                    
                    print(f"\n✅ Test Results:")
                    print(f"Stocks found: {stocks_found}/{expected} (Efficiency: {efficiency:.2%})")
                    print(f"Performance rating: {'Excellent' if efficiency >= 0.8 else 'Good' if efficiency >= 0.6 else 'Fair' if efficiency >= 0.4 else 'Poor'}")
                    
                    print(f"\n🏆 Top 10 stocks:")
                    for i, row in df.head(10).iterrows():
                        print(f"  {i+1}. {row.get('nsecode', 'N/A')} - {row.get('per_chg', 0):.2f}%")
                else:
                    print("❌ No stocks found with this variant")
            else:
                print(f"❌ Variant data not found")
                
        except Exception as e:
            print(f"❌ Error testing variant: {e}")

    def run(self):
        """Run the interactive improvement tool"""
        print("🚀 Starting Algorithm Improvement Tool...")
        
        while True:
            try:
                self.show_menu()
                choice = input("\n👉 Enter your choice: ").strip()
                
                if choice == '0':
                    print("👋 Goodbye!")
                    break
                elif choice == '1':
                    self.test_current_algorithm()
                elif choice == '2':
                    self.test_specific_version()
                elif choice == '3':
                    self.compare_versions()
                elif choice == '4':
                    self.create_new_version()
                elif choice == '5':
                    self.view_algorithm_details()
                elif choice == '6':
                    self.get_best_version()
                elif choice == '7':
                    self.get_recommendations()
                elif choice == '8':
                    self.modify_query_interactive()
                elif choice == '9':
                    self.export_data()
                elif choice == '10':
                    self.import_data()
                elif choice == '11':
                    self.view_sub_algorithm_variants()
                elif choice == '12':
                    self.compare_sub_algorithm_variants()
                elif choice == '13':
                    self.create_algorithm_with_custom_sub_algorithms()
                elif choice == '14':
                    self.test_individual_sub_algorithm()
                else:
                    print("❌ Invalid choice. Please try again.")
                
                input("\n⏸️ Press Enter to continue...")
                
            except KeyboardInterrupt:
                print("\n\n👋 Interrupted by user. Goodbye!")
                break
            except Exception as e:
                print(f"❌ Unexpected error: {e}")
                logger.error(f"Unexpected error in main loop: {e}")

if __name__ == "__main__":
    tool = AlgorithmImprovementTool()
    tool.run() 