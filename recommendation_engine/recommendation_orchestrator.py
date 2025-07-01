#!/usr/bin/env python3
"""
Recommendation Engine Orchestrator

Main orchestrator for the modular trading recommendation engine.
Manages algorithm loading, A/B testing, and real-time recommendation generation.

Features:
- Dynamic algorithm loading and versioning
- A/B testing framework with performance tracking
- Real-time recommendation generation
- Performance analytics and monitoring
- Theme-based algorithm selection
- Self-learning capabilities with feedback loops

Usage:
    orchestrator = RecommendationOrchestrator()
    recommendations = orchestrator.get_recommendations(
        symbols=['SATIN', 'RTNPOWER', 'VINCOFE'],
        trading_theme='intraday_buy'
    )
"""

import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import importlib
import threading
import time
from pathlib import Path

from .config.algorithm_registry import AlgorithmRegistry, AlgorithmConfig
from .utils.base_algorithm import BaseSeedAlgorithm, BaseRankingAlgorithm


class RecommendationOrchestrator:
    """
    Main orchestrator for the trading recommendation engine.
    
    Manages algorithm lifecycle, A/B testing, and recommendation generation.
    """
    
    def __init__(self, config_path: str = "recommendation_engine/config/algorithms.json"):
        """
        Initialize the recommendation orchestrator.
        
        Args:
            config_path: Path to the algorithms configuration file
        """
        self.config_path = config_path
        self.registry = AlgorithmRegistry()
        self.loaded_algorithms = {}
        self.active_ab_tests = {}
        self.performance_tracker = {}
        
        # Initialize logging
        self.logger = logging.getLogger(__name__)
        self.logger.setLevel(logging.INFO)
        
        # Load configuration and algorithms
        self._load_configuration()
        self._initialize_algorithms()
        self._setup_ab_tests()
        
        # Start background monitoring
        self._start_background_monitor()
    
    def _load_configuration(self):
        """Load algorithms configuration from JSON file."""
        try:
            with open(self.config_path, 'r') as f:
                self.config = json.load(f)
            
            self.logger.info(f"✅ Loaded configuration with {len(self.config['algorithms'])} algorithms")
            
        except FileNotFoundError:
            self.logger.error(f"❌ Configuration file not found: {self.config_path}")
            self.config = {"algorithms": [], "ab_tests": []}
        except json.JSONDecodeError as e:
            self.logger.error(f"❌ Invalid JSON in configuration: {e}")
            self.config = {"algorithms": [], "ab_tests": []}
    
    def _initialize_algorithms(self):
        """Initialize and load all active algorithms."""
        self.logger.info("🔄 Initializing algorithms...")
        
        for alg_config in self.config['algorithms']:
            if alg_config.get('is_active', True):
                try:
                    # Create AlgorithmConfig object for registry
                    config_obj = AlgorithmConfig(
                        alg_id=alg_config['alg_id'],
                        name=alg_config['name'],
                        version=alg_config['version'],
                        description=alg_config.get('description', f"Algorithm {alg_config['name']}"),
                        algorithm_type=alg_config['algorithm_type'],
                        module_path=alg_config['module_path'],
                        class_name=alg_config['class_name'],
                        parameters=alg_config.get('parameters', {}),
                        trading_theme=alg_config.get('trading_theme', 'all'),
                        is_active=alg_config.get('is_active', True),
                        created_at=datetime.now().isoformat(),
                        performance_metrics={}
                    )
                    
                    # Register algorithm with registry
                    self.registry.register_algorithm(config_obj)
                    
                    # Load algorithm class
                    algorithm_instance = self._load_algorithm_instance(alg_config)
                    if algorithm_instance:
                        self.loaded_algorithms[alg_config['alg_id']] = algorithm_instance
                        self.logger.info(f"✅ Loaded {alg_config['name']}")
                    
                except Exception as e:
                    self.logger.error(f"❌ Failed to load {alg_config['alg_id']}: {e}")
        
        self.logger.info(f"✅ Initialized {len(self.loaded_algorithms)} algorithms")
    
    def _load_algorithm_instance(self, alg_config: Dict) -> Optional[Any]:
        """
        Load an algorithm instance from configuration.
        
        Args:
            alg_config: Algorithm configuration dictionary
            
        Returns:
            Algorithm instance or None if loading failed
        """
        try:
            # Import module
            module = importlib.import_module(alg_config['module_path'])
            
            # Get class
            algorithm_class = getattr(module, alg_config['class_name'])
            
            # Initialize with parameters
            instance = algorithm_class(**alg_config.get('parameters', {}))
            
            return instance
            
        except Exception as e:
            self.logger.error(f"Failed to load {alg_config['alg_id']}: {e}")
            return None
    
    def _setup_ab_tests(self):
        """Setup and initialize A/B tests."""
        self.logger.info("🧪 Setting up A/B tests...")
        
        for test_config in self.config.get('ab_tests', []):
            if test_config.get('status') == 'running':
                test_id = test_config['test_id']
                self.active_ab_tests[test_id] = {
                    'config': test_config,
                    'performance_a': {},
                    'performance_b': {},
                    'traffic_split': test_config.get('traffic_split', 0.5)
                }
                self.logger.info(f"🧪 Active A/B test: {test_config['test_name']}")
        
        self.logger.info(f"✅ Setup {len(self.active_ab_tests)} active A/B tests")
    
    def get_recommendations(self, 
                          symbols: List[str], 
                          trading_theme: str = 'intraday_buy',
                          limit: int = 20) -> Dict[str, Any]:
        """
        Generate recommendations for given symbols and trading theme.
        
        Args:
            symbols: List of stock symbols to analyze
            trading_theme: Trading theme (intraday_buy, swing_buy, etc.)
            limit: Maximum number of recommendations to return
            
        Returns:
            Dictionary containing recommendations and metadata
        """
        self.logger.info(f"🎯 Generating recommendations for {len(symbols)} symbols, theme: {trading_theme}")
        
        try:
            # Get applicable seed algorithms for the theme
            seed_algorithms = self._get_seed_algorithms_for_theme(trading_theme)
            
            if not seed_algorithms:
                self.logger.warning(f"No seed algorithms found for theme: {trading_theme}")
                return {'recommendations': [], 'metadata': {'error': 'No algorithms available'}}
            
            # Generate scores from seed algorithms
            seed_scores = self._generate_seed_scores(symbols, seed_algorithms)
            
            # Apply ranking algorithms
            ranked_results = self._apply_ranking_algorithms(seed_scores, trading_theme)
            
            # Apply A/B testing if applicable
            final_results = self._apply_ab_testing(ranked_results, trading_theme)
            
            # Prepare recommendations
            recommendations = self._prepare_recommendations(final_results, limit)
            
            # Track performance
            self._track_recommendation_performance(recommendations, trading_theme)
            
            return {
                'recommendations': recommendations,
                'metadata': {
                    'theme': trading_theme,
                    'algorithms_used': [alg['alg_id'] for alg in seed_algorithms],
                    'total_symbols_analyzed': len(symbols),
                    'timestamp': datetime.now().isoformat(),
                    'ab_tests_active': list(self.active_ab_tests.keys())
                }
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error generating recommendations: {e}")
            return {'recommendations': [], 'metadata': {'error': str(e)}}
    
    def _get_seed_algorithms_for_theme(self, trading_theme: str) -> List[Dict]:
        """Get active seed algorithms for a specific trading theme."""
        applicable_algorithms = []
        
        for alg_config in self.config['algorithms']:
            if (alg_config.get('is_active', True) and 
                alg_config.get('algorithm_type') == 'seed_algorithm' and
                (alg_config.get('trading_theme') == trading_theme or 
                 alg_config.get('trading_theme') == 'all')):
                
                applicable_algorithms.append(alg_config)
        
        return applicable_algorithms
    
    def _generate_seed_scores(self, symbols: List[str], algorithms: List[Dict], stock_data_df: pd.DataFrame = None) -> Dict[str, Dict]:
        """
        Generate scores from seed algorithms.
        
        Args:
            symbols: List of symbols to analyze
            algorithms: List of algorithm configurations
            stock_data_df: Optional DataFrame with stock data from Chartink
            
        Returns:
            Dictionary mapping symbol to algorithm scores
        """
        seed_scores = {symbol: {} for symbol in symbols}
        
        # Create stock data lookup if available
        stock_data_lookup = {}
        if stock_data_df is not None and not stock_data_df.empty:
            stock_data_lookup = stock_data_df.set_index('symbol').to_dict('index')
        
        for alg_config in algorithms:
            alg_id = alg_config['alg_id']
            
            if alg_id in self.loaded_algorithms:
                try:
                    algorithm = self.loaded_algorithms[alg_id]
                    
                    # Generate scores for all symbols
                    for symbol in symbols:
                        # Get stock data for this symbol
                        stock_data = stock_data_lookup.get(symbol, {
                            'symbol': symbol,
                            'close': 0,
                            'volume': 0,
                            'per_chg': 0,
                            'high': 0,
                            'low': 0
                        })
                        
                        # Calculate score using the algorithm
                        score = algorithm.calculate_score(stock_data)
                        seed_scores[symbol][alg_id] = score
                        
                except Exception as e:
                    self.logger.error(f"Error in seed algorithm {alg_id}: {e}")
        
        return seed_scores
    
    def _apply_ranking_algorithms(self, seed_scores: Dict, trading_theme: str) -> Dict:
        """Apply ranking algorithms to combine seed scores."""
        ranking_algorithms = []
        
        # Find applicable ranking algorithms
        for alg_config in self.config['algorithms']:
            if (alg_config.get('is_active', True) and 
                alg_config.get('algorithm_type') == 'ranking_algorithm' and
                (alg_config.get('trading_theme') == trading_theme or 
                 alg_config.get('trading_theme') == 'all')):
                
                ranking_algorithms.append(alg_config)
        
        if not ranking_algorithms:
            # Default ranking: simple average
            return self._default_ranking(seed_scores)
        
        # Use first ranking algorithm (can be enhanced for multiple)
        ranking_alg = ranking_algorithms[0]
        alg_id = ranking_alg['alg_id']
        
        if alg_id in self.loaded_algorithms:
            try:
                ranker = self.loaded_algorithms[alg_id]
                return ranker.rank_stocks(seed_scores)
            except Exception as e:
                self.logger.error(f"Error in ranking algorithm {alg_id}: {e}")
                return self._default_ranking(seed_scores)
        
        return self._default_ranking(seed_scores)
    
    def _default_ranking(self, seed_scores: Dict) -> Dict:
        """Default ranking method: simple average of all scores."""
        ranked_results = {}
        
        for symbol, scores in seed_scores.items():
            if scores:
                avg_score = np.mean(list(scores.values()))
                ranked_results[symbol] = {
                    'final_score': avg_score,
                    'algorithm_scores': scores,
                    'ranking_method': 'simple_average'
                }
        
        return ranked_results
    
    def _apply_ab_testing(self, ranked_results: Dict, trading_theme: str) -> Dict:
        """Apply A/B testing logic to results."""
        # For now, return original results
        # A/B testing logic can be enhanced based on specific requirements
        return ranked_results
    
    def _prepare_recommendations(self, ranked_results: Dict, limit: int) -> List[Dict]:
        """Prepare final recommendations list."""
        # Sort by final score
        sorted_results = sorted(
            ranked_results.items(),
            key=lambda x: x[1].get('final_score', 0),
            reverse=True
        )
        
        recommendations = []
        for symbol, result in sorted_results[:limit]:
            recommendations.append({
                'symbol': symbol,
                'score': result.get('final_score', 0),
                'confidence': self._calculate_confidence(result),
                'algorithm_breakdown': result.get('algorithm_scores', {}),
                'ranking_method': result.get('ranking_method', 'unknown'),
                'recommendation': self._get_recommendation_action(result.get('final_score', 0))
            })
        
        return recommendations
    
    def _calculate_confidence(self, result: Dict) -> float:
        """Calculate confidence score for a recommendation."""
        scores = list(result.get('algorithm_scores', {}).values())
        if not scores:
            return 0.0
        
        # Simple confidence based on score consistency
        mean_score = np.mean(scores)
        std_score = np.std(scores) if len(scores) > 1 else 0.0
        
        # Higher confidence when scores are consistent and high
        confidence = max(0, min(1, (mean_score / 100) * (1 - std_score / 100)))
        return round(confidence, 3)
    
    def _get_recommendation_action(self, score: float) -> str:
        """Get recommendation action based on score."""
        if score >= 70:
            return "STRONG_BUY"
        elif score >= 60:
            return "BUY"
        elif score >= 50:
            return "WEAK_BUY"
        elif score >= 40:
            return "HOLD"
        else:
            return "AVOID"
    
    def _track_recommendation_performance(self, recommendations: List[Dict], trading_theme: str):
        """Track recommendation performance for learning."""
        timestamp = datetime.now().isoformat()
        
        if trading_theme not in self.performance_tracker:
            self.performance_tracker[trading_theme] = []
        
        self.performance_tracker[trading_theme].append({
            'timestamp': timestamp,
            'recommendation_count': len(recommendations),
            'avg_score': np.mean([r['score'] for r in recommendations]) if recommendations else 0,
            'top_symbols': [r['symbol'] for r in recommendations[:5]]
        })
    
    def _start_background_monitor(self):
        """Start background monitoring for performance and updates."""
        def monitor():
            while True:
                try:
                    # Check for algorithm updates
                    self._check_algorithm_updates()
                    
                    # Update A/B test performance
                    self._update_ab_test_performance()
                    
                    # Sleep for 5 minutes
                    time.sleep(300)
                    
                except Exception as e:
                    self.logger.error(f"Background monitor error: {e}")
                    time.sleep(60)
        
        monitor_thread = threading.Thread(target=monitor, daemon=True)
        monitor_thread.start()
        self.logger.info("✅ Started background monitoring")
    
    def _check_algorithm_updates(self):
        """Check for algorithm configuration updates."""
        # Implementation for hot-reloading algorithms
        pass
    
    def _update_ab_test_performance(self):
        """Update A/B test performance metrics."""
        # Implementation for A/B test performance tracking
        pass
    
    def get_algorithm_performance(self) -> Dict[str, Any]:
        """Get performance metrics for all algorithms."""
        performance_data = {}
        
        for alg_config in self.config['algorithms']:
            alg_id = alg_config['alg_id']
            performance_data[alg_id] = {
                'metadata': alg_config,
                'performance_metrics': alg_config.get('performance_metrics', {}),
                'is_loaded': alg_id in self.loaded_algorithms,
                'last_used': 'real-time'  # Can be enhanced with actual tracking
            }
        
        return performance_data
    
    def update_algorithm_performance(self, alg_id: str, metrics: Dict[str, float]):
        """Update algorithm performance metrics."""
        # Find algorithm in config
        for alg_config in self.config['algorithms']:
            if alg_config['alg_id'] == alg_id:
                if 'performance_metrics' not in alg_config:
                    alg_config['performance_metrics'] = {}
                
                alg_config['performance_metrics'].update(metrics)
                
                # Save updated configuration
                self._save_configuration()
                break
    
    def _save_configuration(self):
        """Save updated configuration to file."""
        try:
            with open(self.config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
            self.logger.info("✅ Configuration saved")
        except Exception as e:
            self.logger.error(f"❌ Failed to save configuration: {e}")

    def get_recommendations_with_chartink_data(self, 
                                             stock_data_df: pd.DataFrame,
                                             trading_theme: str = 'intraday_buy',
                                             limit: int = 20) -> Dict[str, Any]:
        """
        Generate recommendations using Chartink stock data and multiple seed algorithms
        
        Args:
            stock_data_df: DataFrame with stock data from Chartink
            trading_theme: Trading theme (intraday_buy, swing_buy, etc.)
            limit: Maximum number of recommendations to return
            
        Returns:
            Dictionary containing recommendations and metadata
        """
        self.logger.info(f"🎯 Generating recommendations with Chartink data for {len(stock_data_df)} stocks, theme: {trading_theme}")
        
        try:
            if stock_data_df.empty:
                return {'recommendations': [], 'metadata': {'error': 'No stock data provided'}}
            
            # Extract symbols from DataFrame
            symbols = stock_data_df['symbol'].tolist()
            
            # Get applicable seed algorithms for the theme
            seed_algorithms = self._get_seed_algorithms_for_theme(trading_theme)
            
            if not seed_algorithms:
                self.logger.warning(f"No seed algorithms found for theme: {trading_theme}")
                return {'recommendations': [], 'metadata': {'error': 'No algorithms available'}}
            
            # Generate scores from seed algorithms with stock data
            seed_scores = self._generate_seed_scores(symbols, seed_algorithms, stock_data_df)
            
            # Apply ranking algorithms
            ranked_results = self._apply_ranking_algorithms(seed_scores, trading_theme)
            
            # Apply A/B testing if applicable
            final_results = self._apply_ab_testing(ranked_results, trading_theme)
            
            # Prepare recommendations
            recommendations = self._prepare_recommendations(final_results, limit)
            
            # Track performance
            self._track_recommendation_performance(recommendations, trading_theme)
            
            return {
                'recommendations': recommendations,
                'metadata': {
                    'theme': trading_theme,
                    'algorithms_used': [alg['alg_id'] for alg in seed_algorithms],
                    'total_symbols_analyzed': len(symbols),
                    'timestamp': datetime.now().isoformat(),
                    'ab_tests_active': list(self.active_ab_tests.keys()),
                    'chartink_data_available': True
                }
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error generating recommendations with Chartink data: {e}")
            return {'recommendations': [], 'metadata': {'error': str(e)}}


if __name__ == "__main__":
    # Example usage
    orchestrator = RecommendationOrchestrator()
    
    # Test with sample symbols
    test_symbols = ['SATIN', 'RTNPOWER', 'VINCOFE', 'RELIANCE', 'TCS']
    
    recommendations = orchestrator.get_recommendations(
        symbols=test_symbols,
        trading_theme='intraday_buy',
        limit=10
    )
    
    print("🎯 Sample Recommendations:")
    print(json.dumps(recommendations, indent=2)) 