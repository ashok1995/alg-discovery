#!/usr/bin/env python3
"""
Algorithm Registry

Central registry for managing versioned algorithms with A/B testing capabilities.
Provides configuration-driven algorithm selection and performance tracking.
"""

import json
import os
import importlib
from datetime import datetime
from typing import Dict, List, Optional, Any, Type
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class AlgorithmConfig:
    """Configuration for an algorithm version"""
    alg_id: str
    version: str
    name: str
    description: str
    trading_theme: str  # intraday_buy, intraday_sell, swing_buy, etc.
    algorithm_type: str  # seed_algorithm, ranking_algorithm
    module_path: str
    class_name: str
    parameters: Dict[str, Any]
    is_active: bool = True
    created_at: str = None
    performance_metrics: Dict[str, float] = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()
        if self.performance_metrics is None:
            self.performance_metrics = {}


@dataclass
class ABTestConfig:
    """A/B test configuration for comparing algorithms"""
    test_id: str
    test_name: str
    description: str
    algorithm_a: str  # alg_id
    algorithm_b: str  # alg_id
    traffic_split: float = 0.5  # 0.5 means 50-50 split
    start_date: str = None
    end_date: str = None
    status: str = "planned"  # planned, running, completed, stopped
    metrics_to_track: List[str] = None
    
    def __post_init__(self):
        if self.start_date is None:
            self.start_date = datetime.now().isoformat()
        if self.metrics_to_track is None:
            self.metrics_to_track = ["accuracy", "return", "sharpe_ratio", "max_drawdown"]


class AlgorithmRegistry:
    """Central registry for managing algorithms and A/B tests"""
    
    def __init__(self, config_path: str = "recommendation_engine/config/algorithms.json"):
        self.config_path = config_path
        self.algorithms: Dict[str, AlgorithmConfig] = {}
        self.ab_tests: Dict[str, ABTestConfig] = {}
        self._loaded_algorithms: Dict[str, Any] = {}
        
        # Load existing configuration
        self.load_config()
    
    def load_config(self):
        """Load algorithm configurations from JSON file"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    data = json.load(f)
                
                # Load algorithms
                for alg_data in data.get('algorithms', []):
                    config = AlgorithmConfig(**alg_data)
                    self.algorithms[config.alg_id] = config
                
                # Load A/B tests
                for test_data in data.get('ab_tests', []):
                    config = ABTestConfig(**test_data)
                    self.ab_tests[config.test_id] = config
                
                logger.info(f"Loaded {len(self.algorithms)} algorithms and {len(self.ab_tests)} A/B tests")
            else:
                logger.info("No existing config found, starting with empty registry")
                
        except Exception as e:
            logger.error(f"Error loading config: {e}")
    
    def save_config(self):
        """Save current configuration to JSON file"""
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            
            data = {
                'algorithms': [asdict(config) for config in self.algorithms.values()],
                'ab_tests': [asdict(config) for config in self.ab_tests.values()],
                'last_updated': datetime.now().isoformat()
            }
            
            with open(self.config_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.info(f"Saved configuration with {len(self.algorithms)} algorithms")
            
        except Exception as e:
            logger.error(f"Error saving config: {e}")
    
    def register_algorithm(self, config: AlgorithmConfig) -> bool:
        """Register a new algorithm version"""
        try:
            # Validate algorithm can be loaded
            algorithm_class = self._load_algorithm_class(config)
            if algorithm_class is None:
                return False
            
            self.algorithms[config.alg_id] = config
            self.save_config()
            
            logger.info(f"Registered algorithm: {config.alg_id} v{config.version}")
            return True
            
        except Exception as e:
            logger.error(f"Error registering algorithm {config.alg_id}: {e}")
            return False
    
    def get_algorithm(self, alg_id: str) -> Optional[AlgorithmConfig]:
        """Get algorithm configuration by ID"""
        return self.algorithms.get(alg_id)
    
    def get_algorithms_by_theme(self, trading_theme: str) -> List[AlgorithmConfig]:
        """Get all algorithms for a specific trading theme"""
        return [
            config for config in self.algorithms.values()
            if config.trading_theme == trading_theme and config.is_active
        ]
    
    def get_algorithms_by_type(self, algorithm_type: str) -> List[AlgorithmConfig]:
        """Get all algorithms of a specific type (seed_algorithm or ranking_algorithm)"""
        return [
            config for config in self.algorithms.values()
            if config.algorithm_type == algorithm_type and config.is_active
        ]
    
    def load_algorithm_instance(self, alg_id: str, **kwargs):
        """Load and instantiate an algorithm"""
        config = self.get_algorithm(alg_id)
        if not config:
            raise ValueError(f"Algorithm {alg_id} not found")
        
        try:
            # Check if already loaded
            if alg_id in self._loaded_algorithms:
                algorithm_class = self._loaded_algorithms[alg_id]
            else:
                algorithm_class = self._load_algorithm_class(config)
                if algorithm_class:
                    self._loaded_algorithms[alg_id] = algorithm_class
            
            if algorithm_class:
                # Merge config parameters with runtime kwargs
                params = config.parameters.copy()
                params.update(kwargs)
                
                return algorithm_class(**params)
            
            return None
            
        except Exception as e:
            logger.error(f"Error loading algorithm {alg_id}: {e}")
            return None
    
    def _load_algorithm_class(self, config: AlgorithmConfig) -> Optional[Type]:
        """Load algorithm class from module"""
        try:
            module = importlib.import_module(config.module_path)
            algorithm_class = getattr(module, config.class_name)
            return algorithm_class
            
        except Exception as e:
            logger.error(f"Error loading class {config.class_name} from {config.module_path}: {e}")
            return None
    
    def create_ab_test(self, test_config: ABTestConfig) -> bool:
        """Create a new A/B test"""
        try:
            # Validate algorithms exist
            if test_config.algorithm_a not in self.algorithms:
                raise ValueError(f"Algorithm A {test_config.algorithm_a} not found")
            if test_config.algorithm_b not in self.algorithms:
                raise ValueError(f"Algorithm B {test_config.algorithm_b} not found")
            
            self.ab_tests[test_config.test_id] = test_config
            self.save_config()
            
            logger.info(f"Created A/B test: {test_config.test_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error creating A/B test {test_config.test_id}: {e}")
            return False
    
    def get_active_ab_tests(self) -> List[ABTestConfig]:
        """Get all active A/B tests"""
        return [
            test for test in self.ab_tests.values()
            if test.status == "running"
        ]
    
    def update_algorithm_performance(self, alg_id: str, metrics: Dict[str, float]):
        """Update performance metrics for an algorithm"""
        if alg_id in self.algorithms:
            self.algorithms[alg_id].performance_metrics.update(metrics)
            self.save_config()
            logger.info(f"Updated performance metrics for {alg_id}")
    
    def get_best_algorithm_for_theme(self, trading_theme: str, metric: str = "accuracy") -> Optional[str]:
        """Get the best performing algorithm for a trading theme"""
        algorithms = self.get_algorithms_by_theme(trading_theme)
        
        if not algorithms:
            return None
        
        # Find algorithm with best performance metric
        best_algorithm = None
        best_score = -float('inf')
        
        for alg in algorithms:
            if metric in alg.performance_metrics:
                score = alg.performance_metrics[metric]
                if score > best_score:
                    best_score = score
                    best_algorithm = alg.alg_id
        
        return best_algorithm
    
    def deactivate_algorithm(self, alg_id: str):
        """Deactivate an algorithm"""
        if alg_id in self.algorithms:
            self.algorithms[alg_id].is_active = False
            self.save_config()
            logger.info(f"Deactivated algorithm: {alg_id}")
    
    def list_algorithms(self) -> Dict[str, Dict]:
        """List all algorithms with their basic info"""
        return {
            alg_id: {
                'name': config.name,
                'version': config.version,
                'theme': config.trading_theme,
                'type': config.algorithm_type,
                'active': config.is_active,
                'performance': config.performance_metrics
            }
            for alg_id, config in self.algorithms.items()
        } 