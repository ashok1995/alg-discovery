"""
Recommendation Engine Module

A modular, self-learning recommendation system for stock trading
with A/B testing capabilities and versioned algorithms.

Key Features:
- Modular seed algorithms for different trading themes
- Versioned ranking algorithms with performance tracking
- A/B testing framework for algorithm comparison
- Self-learning capabilities with market feedback
- Configuration-driven algorithm selection
"""

from .config.algorithm_registry import AlgorithmRegistry
from .utils.version_manager import VersionManager
from .utils.ab_testing import ABTestingFramework
from .utils.performance_tracker import PerformanceTracker

__version__ = "1.0.0"
__author__ = "Algo Discovery Team"

# Core exports
__all__ = [
    'AlgorithmRegistry',
    'VersionManager', 
    'ABTestingFramework',
    'PerformanceTracker'
] 