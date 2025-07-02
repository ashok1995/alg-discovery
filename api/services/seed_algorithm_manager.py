"""
Seed Algorithm Manager with Version Control
==========================================

Manages versioned seed algorithms for long-term investment filtering.
Uses Chartink query language for stock screening with iterative improvements.
"""

import json
import logging
import requests
from bs4 import BeautifulSoup as bs
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from collections import deque, Counter
import time
import hashlib
import os

logger = logging.getLogger(__name__)

class SeedAlgorithmManager:
    """
    Manages versioned seed algorithms with Chartink integration for iterative improvement
    """
    
    def __init__(self, config_path: str = "config/seed_algorithms_v2.json"):
        """Initialize the Seed Algorithm Manager"""
        self.config_path = config_path
        self.algorithms = {}
        self.performance_history = {}
        self.current_version = "1.0.0"
        
        # Chartink session for queries
        self.session = requests.Session()
        self.csrf_token = None
        
        # Performance tracking
        self.ranking_history = deque(maxlen=50)  # Keep last 50 rankings
        
        # Load existing algorithms or create defaults
        self.load_algorithms()
        
        logger.info(f"✅ Seed Algorithm Manager initialized with version {self.current_version}")

    def load_algorithms(self):
        """Load algorithm configurations from file"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    data = json.load(f)
                    self.algorithms = data.get('algorithms', {})
                    self.performance_history = data.get('performance_history', {})
                    self.current_version = data.get('current_version', '1.0.0')
                    self.sub_algorithm_variants = data.get('sub_algorithm_variants', {})
                logger.info(f"📁 Loaded algorithms from {self.config_path}")
            else:
                self.create_default_algorithms()
                self.save_algorithms()
        except Exception as e:
            logger.error(f"❌ Error loading algorithms: {e}")
            self.create_default_algorithms()

    def save_algorithms(self):
        """Save current algorithms to file"""
        try:
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            data = {
                'current_version': self.current_version,
                'algorithms': self.algorithms,
                'sub_algorithm_variants': getattr(self, 'sub_algorithm_variants', {}),
                'performance_history': self.performance_history,
                'last_updated': datetime.now().isoformat(),
                'total_versions': len(self.algorithms)
            }
            with open(self.config_path, 'w') as f:
                json.dump(data, f, indent=2)
            logger.info(f"💾 Saved algorithms to {self.config_path}")
        except Exception as e:
            logger.error(f"❌ Error saving algorithms: {e}")

    def create_default_algorithms(self):
        """Create default versioned seed algorithms using Chartink queries"""
        self.algorithms = {
            "v1.0.0": {
                "version": "v1.0.0",
                "name": "Basic Long-term Value",
                "description": "Basic value investing criteria with momentum",
                "created_date": datetime.now().isoformat(),
                "status": "active",
                "chartink_queries": {
                    "fundamental_growth": {
                        "query": "( {cash} ( latest close > latest sma(close,50) and latest close > latest sma(close,200) and latest rsi(14) > 30 and latest rsi(14) < 70 and latest volume > latest sma(volume,20) and latest \"close * volume\" > 10000000 and latest \"market cap\" > 1000 ) )",
                        "description": "Growth stocks with good fundamentals and momentum",
                        "weight": 0.4,
                        "expected_results": 50
                    },
                    "value_momentum": {
                        "query": "( {cash} ( latest close > latest ema(close,21) and latest ema(close,21) > latest ema(close,50) and latest volume > latest sma(volume,10) and latest rsi(14) > 40 and latest rsi(14) < 80 and [0] 1 day ago close < [0] 1 day ago high * 0.98 ) )",
                        "description": "Value stocks showing momentum signals", 
                        "weight": 0.3,
                        "expected_results": 30
                    },
                    "quality_filter": {
                        "query": "( {cash} ( latest close > latest sma(close,20) and latest volume > 100000 and latest \"market cap\" > 5000 and latest close > [0] 1 week ago close and latest macd line(26,12,9) > latest macd signal(26,12,9) ) )",
                        "description": "Quality stocks with recent performance",
                        "weight": 0.3,
                        "expected_results": 40
                    }
                },
                "performance_metrics": {
                    "accuracy": 0.0,
                    "total_stocks_found": 0,
                    "successful_picks": 0,
                    "avg_return": 0.0,
                    "test_runs": 0
                }
            },
            
            "v1.1.0": {
                "version": "v1.1.0", 
                "name": "Enhanced Value with Sector Rotation",
                "description": "Improved algorithm with sector rotation and better volume filters",
                "created_date": datetime.now().isoformat(),
                "status": "testing",
                "chartink_queries": {
                    "enhanced_fundamental": {
                        "query": "( {cash} ( latest close > latest sma(close,50) and latest close > latest sma(close,200) and latest rsi(14) > 35 and latest rsi(14) < 65 and latest volume > latest ema(volume,20) * 1.2 and latest \"close * volume\" > 20000000 and latest \"market cap\" > 2000 and [0] 1 week ago close > [0] 1 week ago low * 1.05 ) )",
                        "description": "Enhanced fundamental screening with better volume criteria",
                        "weight": 0.35,
                        "expected_results": 45
                    },
                    "momentum_breakout": {
                        "query": "( {cash} ( latest close > latest highest(close,20) * 0.95 and latest volume > latest ema(volume,20) * 1.5 and latest rsi(14) > 50 and latest macd line(26,12,9) > latest macd signal(26,12,9) and latest ema(close,8) > latest ema(close,21) and latest close > latest bollinger band upper(close,20,2) * 0.98 ) )",
                        "description": "Momentum breakout with volume confirmation",
                        "weight": 0.25,
                        "expected_results": 25
                    },
                    "sector_leaders": {
                        "query": "( {cash} ( latest close > latest sma(close,20) and latest volume > latest sma(volume,20) * 1.1 and latest \"market cap\" > 10000 and latest close > [0] 1 month ago close and latest rsi(14) > 45 and latest rsi(14) < 75 ) )",
                        "description": "Sector leading stocks with consistent performance",
                        "weight": 0.25,
                        "expected_results": 35
                    },
                    "dividend_quality": {
                        "query": "( {cash} ( latest close > latest sma(close,50) and latest volume > 50000 and latest \"market cap\" > 5000 and latest close > [0] 3 month ago close and latest rsi(14) > 40 and latest macd line(26,12,9) > latest macd signal(26,12,9) ) )",
                        "description": "Quality dividend-paying stocks",
                        "weight": 0.15,
                        "expected_results": 30
                    }
                },
                "performance_metrics": {
                    "accuracy": 0.0,
                    "total_stocks_found": 0,
                    "successful_picks": 0,
                    "avg_return": 0.0,
                    "test_runs": 0
                }
            }
        }

    def get_chartink_session(self) -> bool:
        """Initialize Chartink session with CSRF token"""
        try:
            r = self.session.get('https://chartink.com/screener/alg-test-1')
            soup = bs(r.content, 'html.parser')
            csrf_element = soup.select_one('[name=csrf-token]')
            
            if csrf_element:
                self.csrf_token = csrf_element['content']
                self.session.headers['X-CSRF-TOKEN'] = self.csrf_token
                logger.info("✅ Chartink session initialized with CSRF token")
                return True
            else:
                logger.warning("⚠️ CSRF token not found")
                return False
        except Exception as e:
            logger.error(f"❌ Error initializing Chartink session: {e}")
            return False

    def execute_chartink_query(self, query: str) -> pd.DataFrame:
        """Execute a Chartink query and return results"""
        try:
            if not self.csrf_token:
                if not self.get_chartink_session():
                    return pd.DataFrame()
            
            data = {'scan_clause': query}
            response = self.session.post('https://chartink.com/screener/process', data=data)
            
            if response.status_code == 200:
                result = response.json()
                if 'data' in result and result['data']:
                    df = pd.DataFrame(result['data'])
                    # Sort by percentage change descending
                    if 'per_chg' in df.columns:
                        df = df.sort_values(by=['per_chg'], ascending=False)
                    logger.info(f"📊 Chartink query returned {len(df)} stocks")
                    return df
                else:
                    logger.warning("⚠️ No data returned from Chartink query")
                    return pd.DataFrame()
            else:
                logger.error(f"❌ Chartink API error: {response.status_code}")
                return pd.DataFrame()
                
        except Exception as e:
            logger.error(f"❌ Error executing Chartink query: {e}")
            return pd.DataFrame()

    def resolve_algorithm_queries(self, algorithm_version: str) -> Dict[str, Any]:
        """
        Resolve algorithm queries by combining sub-algorithm variants
        
        Args:
            algorithm_version: Version of the main algorithm
            
        Returns:
            Dictionary of resolved queries for the algorithm
        """
        if algorithm_version not in self.algorithms:
            logger.error(f"❌ Algorithm version {algorithm_version} not found")
            return {}
        
        algorithm = self.algorithms[algorithm_version]
        
        # Handle legacy algorithms that still use direct queries
        if 'queries' in algorithm:
            legacy_queries = {}
            for query_data in algorithm['queries']:
                legacy_queries[query_data['name']] = query_data
            return legacy_queries
        
        # Handle new sub-algorithm structure
        if 'sub_algorithm_config' not in algorithm:
            logger.error(f"❌ No sub-algorithm config found for {algorithm_version}")
            return {}
        
        resolved_queries = {}
        sub_config = algorithm['sub_algorithm_config']
        
        for category, variant_version in sub_config.items():
            if category in getattr(self, 'sub_algorithm_variants', {}):
                variants = self.sub_algorithm_variants[category]
                if variant_version in variants:
                    variant = variants[variant_version]
                    query_name = f"{category}_{variant_version.replace('.', '_')}"
                    resolved_queries[query_name] = {
                        'query': variant['query'],
                        'description': f"{variant['name']}: {variant['description']}",
                        'weight': variant['weight'],
                        'expected_results': variant['expected_results'],
                        'category': category,
                        'variant_version': variant_version
                    }
                else:
                    logger.warning(f"⚠️ Variant {variant_version} not found in {category}")
            else:
                logger.warning(f"⚠️ Category {category} not found in sub-algorithm variants")
        
        return resolved_queries

    def test_algorithm_version(self, version: str) -> Dict[str, Any]:
        """Test a specific algorithm version and return performance metrics"""
        if version not in self.algorithms:
            logger.error(f"❌ Algorithm version {version} not found")
            return {}
        
        algorithm = self.algorithms[version]
        logger.info(f"🧪 Testing algorithm {version}: {algorithm['name']}")
        
        all_stocks = []
        query_results = {}
        
        # Resolve queries based on sub-algorithm configuration
        resolved_queries = self.resolve_algorithm_queries(version)
        
        if not resolved_queries:
            logger.error(f"❌ No queries resolved for algorithm {version}")
            return {}
        
        # Execute each resolved query
        for query_name, query_config in resolved_queries.items():
            logger.info(f"🔍 Executing query: {query_name} ({query_config.get('category', 'unknown')} {query_config.get('variant_version', 'unknown')})")
            
            df = self.execute_chartink_query(query_config['query'])
            
            if not df.empty:
                # Add weight and query info to results
                df['query_name'] = query_name
                df['weight'] = query_config['weight']
                df['expected_results'] = query_config['expected_results']
                df['category'] = query_config.get('category', 'unknown')
                df['variant_version'] = query_config.get('variant_version', 'unknown')
                
                query_results[query_name] = {
                    'stocks_found': len(df),
                    'expected': query_config['expected_results'],
                    'category': query_config.get('category', 'unknown'),
                    'variant_version': query_config.get('variant_version', 'unknown'),
                    'top_stocks': df.head(10).to_dict('records') if len(df) >= 10 else df.to_dict('records')
                }
                
                all_stocks.extend(df.to_dict('records'))
            else:
                query_results[query_name] = {
                    'stocks_found': 0,
                    'expected': query_config['expected_results'],
                    'category': query_config.get('category', 'unknown'),
                    'variant_version': query_config.get('variant_version', 'unknown'),
                    'top_stocks': []
                }
            
            time.sleep(1)  # Rate limiting
        
        # Rank stocks using frequency and recency
        ranked_stocks = self.rank_algorithm_results(all_stocks)
        
        # Calculate performance metrics
        total_found = len(set([stock['nsecode'] for stock in all_stocks]))
        expected_total = sum([q['expected_results'] for q in resolved_queries.values()])
        
        performance = {
            'version': version,
            'test_date': datetime.now().isoformat(),
            'total_stocks_found': total_found,
            'expected_total': expected_total,
            'efficiency_ratio': total_found / expected_total if expected_total > 0 else 0,
            'query_results': query_results,
            'top_ranked_stocks': ranked_stocks[:20],
            'algorithm_health': self.calculate_algorithm_health(query_results, expected_total, total_found),
            'sub_algorithm_breakdown': self._analyze_sub_algorithm_performance(query_results)
        }
        
        # Update algorithm performance
        algorithm['performance_metrics']['test_runs'] += 1
        algorithm['performance_metrics']['total_stocks_found'] = total_found
        algorithm['performance_metrics']['last_test'] = datetime.now().isoformat()
        
        # Store in performance history
        if version not in self.performance_history:
            self.performance_history[version] = []
        self.performance_history[version].append(performance)
        
        logger.info(f"✅ Algorithm {version} test completed. Found {total_found} stocks (expected ~{expected_total})")
        return performance

    def _analyze_sub_algorithm_performance(self, query_results: Dict) -> Dict[str, Any]:
        """Analyze performance of individual sub-algorithms"""
        category_performance = {}
        
        for query_name, result in query_results.items():
            category = result.get('category', 'unknown')
            variant = result.get('variant_version', 'unknown')
            
            if category not in category_performance:
                category_performance[category] = {}
            
            efficiency = result['stocks_found'] / result['expected'] if result['expected'] > 0 else 0
            category_performance[category][variant] = {
                'efficiency': efficiency,
                'stocks_found': result['stocks_found'],
                'expected': result['expected'],
                'status': 'good' if efficiency >= 0.7 else 'fair' if efficiency >= 0.4 else 'poor'
            }
        
        return category_performance

    def rank_algorithm_results(self, all_stocks: List[Dict]) -> List[Dict]:
        """Rank stocks from algorithm results using frequency and weights"""
        if not all_stocks:
            return []
        
        # Group by stock symbol
        stock_scores = {}
        
        for stock in all_stocks:
            symbol = stock.get('nsecode', '')
            if not symbol:
                continue
                
            if symbol not in stock_scores:
                stock_scores[symbol] = {
                    'symbol': symbol,
                    'total_score': 0.0,
                    'query_count': 0,
                    'queries_appeared': [],
                    'stock_data': stock
                }
            
            # Add weighted score
            weight = stock.get('weight', 0.1)
            per_chg = stock.get('per_chg', 0)
            
            stock_scores[symbol]['total_score'] += weight * (1 + per_chg / 100)  # Weight by performance
            stock_scores[symbol]['query_count'] += 1
            stock_scores[symbol]['queries_appeared'].append(stock.get('query_name', 'unknown'))
        
        # Convert to list and sort by total score
        ranked_stocks = list(stock_scores.values())
        ranked_stocks.sort(key=lambda x: x['total_score'], reverse=True)
        
        # Add ranking information
        for i, stock in enumerate(ranked_stocks):
            stock['rank'] = i + 1
            stock['frequency_bonus'] = stock['query_count']
            
        return ranked_stocks

    def calculate_algorithm_health(self, query_results: Dict, expected_total: int, actual_total: int) -> str:
        """Calculate overall health of the algorithm"""
        if expected_total == 0:
            return "Unknown"
        
        efficiency = actual_total / expected_total
        
        # Check if all queries returned some results
        successful_queries = sum(1 for result in query_results.values() if result['stocks_found'] > 0)
        total_queries = len(query_results)
        query_success_rate = successful_queries / total_queries
        
        if efficiency >= 0.8 and query_success_rate >= 0.8:
            return "Excellent"
        elif efficiency >= 0.6 and query_success_rate >= 0.6:
            return "Good"
        elif efficiency >= 0.4 and query_success_rate >= 0.4:
            return "Fair"
        else:
            return "Poor"

    def create_new_version(self, base_version: str, improvements: Dict[str, Any]) -> str:
        """Create a new algorithm version based on improvements"""
        if base_version not in self.algorithms:
            logger.error(f"❌ Base version {base_version} not found")
            return ""
        
        # Generate new version number
        base_algo = self.algorithms[base_version]
        version_parts = base_version.replace('v', '').split('.')
        
        # Increment minor version
        new_minor = int(version_parts[1]) + 1
        new_version = f"v{version_parts[0]}.{new_minor}.0"
        
        # Create new algorithm based on the base
        new_algorithm = {
            "version": new_version,
            "name": improvements.get('name', f"{base_algo['name']} - Enhanced"),
            "description": improvements.get('description', f"Enhanced version of {base_version}"),
            "created_date": datetime.now().isoformat(),
            "base_version": base_version,
            "status": "testing",
            "chartink_queries": base_algo['chartink_queries'].copy(),
            "performance_metrics": {
                "accuracy": 0.0,
                "total_stocks_found": 0,
                "successful_picks": 0,
                "avg_return": 0.0,
                "test_runs": 0
            }
        }
        
        # Apply improvements
        if 'query_modifications' in improvements:
            for query_name, modifications in improvements['query_modifications'].items():
                if query_name in new_algorithm['chartink_queries']:
                    # Update query
                    if 'query' in modifications:
                        new_algorithm['chartink_queries'][query_name]['query'] = modifications['query']
                    if 'weight' in modifications:
                        new_algorithm['chartink_queries'][query_name]['weight'] = modifications['weight']
                    if 'expected_results' in modifications:
                        new_algorithm['chartink_queries'][query_name]['expected_results'] = modifications['expected_results']
        
        # Add new queries if specified
        if 'new_queries' in improvements:
            new_algorithm['chartink_queries'].update(improvements['new_queries'])
        
        # Save new version
        self.algorithms[new_version] = new_algorithm
        self.current_version = new_version
        self.save_algorithms()
        
        logger.info(f"✅ Created new algorithm version: {new_version}")
        return new_version

    def get_best_performing_version(self) -> str:
        """Get the best performing algorithm version based on historical data"""
        best_version = self.current_version
        best_score = 0.0
        
        for version, history in self.performance_history.items():
            if history:
                # Calculate average efficiency from recent tests
                recent_tests = history[-5:]  # Last 5 tests
                avg_efficiency = sum(test.get('efficiency_ratio', 0) for test in recent_tests) / len(recent_tests)
                
                if avg_efficiency > best_score:
                    best_score = avg_efficiency
                    best_version = version
        
        return best_version

    def get_algorithm_comparison(self) -> Dict[str, Any]:
        """Compare all algorithm versions"""
        comparison = {
            'comparison_date': datetime.now().isoformat(),
            'versions': {},
            'best_version': self.get_best_performing_version(),
            'recommendations': []
        }
        
        for version, algorithm in self.algorithms.items():
            version_data = {
                'name': algorithm['name'],
                'status': algorithm['status'],
                'created_date': algorithm['created_date'],
                'performance': algorithm['performance_metrics'],
                'query_count': len(algorithm['chartink_queries'])
            }
            
            # Add recent performance if available
            if version in self.performance_history:
                recent_tests = self.performance_history[version][-3:]
                if recent_tests:
                    avg_efficiency = sum(test.get('efficiency_ratio', 0) for test in recent_tests) / len(recent_tests)
                    version_data['recent_efficiency'] = avg_efficiency
                    version_data['recent_health'] = recent_tests[-1].get('algorithm_health', 'Unknown')
            
            comparison['versions'][version] = version_data
        
        # Generate recommendations
        comparison['recommendations'] = self.generate_improvement_recommendations()
        
        return comparison

    def generate_improvement_recommendations(self) -> List[str]:
        """Generate recommendations for algorithm improvements"""
        recommendations = []
        
        # Analyze recent performance
        if self.current_version in self.performance_history:
            recent_tests = self.performance_history[self.current_version][-3:]
            if recent_tests:
                avg_efficiency = sum(test.get('efficiency_ratio', 0) for test in recent_tests) / len(recent_tests)
                
                if avg_efficiency < 0.5:
                    recommendations.append("Consider tightening query criteria - efficiency is low")
                elif avg_efficiency > 1.5:
                    recommendations.append("Consider expanding query criteria - might be too restrictive")
                
                # Check query performance
                latest_test = recent_tests[-1]
                query_results = latest_test.get('query_results', {})
                
                for query_name, result in query_results.items():
                    if result['stocks_found'] == 0:
                        recommendations.append(f"Query '{query_name}' returned no results - review criteria")
                    elif result['stocks_found'] < result['expected'] * 0.3:
                        recommendations.append(f"Query '{query_name}' underperforming - consider loosening filters")
        
        if not recommendations:
            recommendations.append("Algorithm performing well - continue monitoring")
        
        return recommendations

    def get_active_algorithm(self) -> Dict[str, Any]:
        """Get the currently active algorithm for production use"""
        # Find the best performing active algorithm
        best_version = None
        best_score = 0.0
        
        for version, algorithm in self.algorithms.items():
            if algorithm['status'] == 'active':
                if version in self.performance_history:
                    recent_tests = self.performance_history[version][-3:]
                    if recent_tests:
                        avg_efficiency = sum(test.get('efficiency_ratio', 0) for test in recent_tests) / len(recent_tests)
                        if avg_efficiency > best_score:
                            best_score = avg_efficiency
                            best_version = version
        
        if best_version:
            return self.algorithms[best_version]
        else:
            # Fallback to current version
            return self.algorithms.get(self.current_version, {})

    def create_new_version_with_sub_algorithms(self, 
                                               base_version: str, 
                                               name: str,
                                               description: str,
                                               sub_algorithm_config: Dict[str, str]) -> str:
        """
        Create a new algorithm version with specific sub-algorithm combinations
        
        Args:
            base_version: Base version to copy settings from
            name: Name for the new algorithm
            description: Description of the new algorithm
            sub_algorithm_config: Dictionary mapping categories to variant versions
            
        Returns:
            New algorithm version string
        """
        if base_version not in self.algorithms:
            logger.error(f"❌ Base version {base_version} not found")
            return ""
        
        # Validate sub-algorithm configuration
        for category, variant_version in sub_algorithm_config.items():
            if category not in getattr(self, 'sub_algorithm_variants', {}):
                logger.error(f"❌ Unknown sub-algorithm category: {category}")
                return ""
            if variant_version not in self.sub_algorithm_variants[category]:
                logger.error(f"❌ Unknown variant {variant_version} in category {category}")
                return ""
        
        # Generate new version number
        base_algo = self.algorithms[base_version]
        version_parts = base_version.replace('v', '').split('.')
        
        # Increment minor version
        new_minor = int(version_parts[1]) + 1
        new_version = f"v{version_parts[0]}.{new_minor}.0"
        
        # Create new algorithm
        new_algorithm = {
            "version": new_version,
            "name": name,
            "description": description,
            "created_date": datetime.now().isoformat(),
            "base_version": base_version,
            "status": "testing",
            "sub_algorithm_config": sub_algorithm_config.copy(),
            "performance_metrics": {
                "accuracy": 0.0,
                "total_stocks_found": 0,
                "successful_picks": 0,
                "avg_return": 0.0,
                "test_runs": 0
            }
        }
        
        # Save new version
        self.algorithms[new_version] = new_algorithm
        self.current_version = new_version
        self.save_algorithms()
        
        logger.info(f"✅ Created new algorithm version: {new_version}")
        logger.info(f"📋 Sub-algorithm config: {sub_algorithm_config}")
        
        return new_version

    def get_available_sub_algorithm_variants(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all available sub-algorithm variants organized by category"""
        variants_info = {}
        
        for category, variants in getattr(self, 'sub_algorithm_variants', {}).items():
            variants_info[category] = []
            for version, variant_data in variants.items():
                variants_info[category].append({
                    'version': version,
                    'name': variant_data['name'],
                    'description': variant_data['description'],
                    'weight': variant_data['weight'],
                    'expected_results': variant_data['expected_results']
                })
        
        return variants_info

    def compare_sub_algorithm_variants(self, category: str) -> Dict[str, Any]:
        """
        Compare different variants within a sub-algorithm category
        
        Args:
            category: Sub-algorithm category to compare (momentum, fundamental, etc.)
            
        Returns:
            Comparison data for the variants
        """
        if category not in getattr(self, 'sub_algorithm_variants', {}):
            return {'error': f'Category {category} not found'}
        
        variants = self.sub_algorithm_variants[category]
        comparison_results = {}
        
        for version, variant_data in variants.items():
            # Create a temporary algorithm to test just this variant
            temp_config = {category: version}
            
            # Test this specific variant
            logger.info(f"🔬 Testing {category} variant {version}")
            df = self.execute_chartink_query(variant_data['query'])
            
            efficiency = len(df) / variant_data['expected_results'] if variant_data['expected_results'] > 0 else 0
            
            comparison_results[version] = {
                'name': variant_data['name'],
                'description': variant_data['description'],
                'stocks_found': len(df) if not df.empty else 0,
                'expected_results': variant_data['expected_results'],
                'efficiency': efficiency,
                'top_stocks': df.head(5).to_dict('records') if not df.empty else [],
                'performance_rating': 'excellent' if efficiency >= 0.8 else 'good' if efficiency >= 0.6 else 'fair' if efficiency >= 0.4 else 'poor'
            }
            
            time.sleep(1)  # Rate limiting
        
        return {
            'category': category,
            'variants_tested': len(comparison_results),
            'comparison_date': datetime.now().isoformat(),
            'results': comparison_results,
            'best_variant': max(comparison_results.items(), key=lambda x: x[1]['efficiency'])[0] if comparison_results else None
        }

    def get_algorithm_with_sub_algorithms(self, version: str) -> Dict[str, Any]:
        """Get detailed algorithm information including resolved sub-algorithms"""
        if version not in self.algorithms:
            return {}
        
        algorithm = self.algorithms[version].copy()
        algorithm['resolved_queries'] = self.resolve_algorithm_queries(version)
        
        # Add sub-algorithm details
        if 'sub_algorithm_config' in algorithm:
            algorithm['sub_algorithm_details'] = {}
            for category, variant_version in algorithm['sub_algorithm_config'].items():
                if category in getattr(self, 'sub_algorithm_variants', {}):
                    variants = self.sub_algorithm_variants[category]
                    if variant_version in variants:
                        algorithm['sub_algorithm_details'][category] = variants[variant_version]
        
        return algorithm 