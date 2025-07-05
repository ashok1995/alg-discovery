#!/usr/bin/env python3
"""
Base Algorithm Classes

Provides base interfaces for seed algorithms and ranking algorithms
with common functionality and standardized methods.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class BaseSeedAlgorithm(ABC):
    """
    Base class for seed algorithms that generate stock selection criteria
    for different trading themes (intraday, swing, short-term, long-term)
    """
    
    def __init__(self, alg_id: str, version: str, trading_theme: str, **kwargs):
        self.alg_id = alg_id
        self.version = version
        self.trading_theme = trading_theme
        self.parameters = kwargs
        self.performance_history = []
        self.logger = logging.getLogger(f"{self.__class__.__name__}_{alg_id}")
        
        # Initialize algorithm-specific parameters
        self._initialize_parameters()
    
    @abstractmethod
    def _initialize_parameters(self):
        """Initialize algorithm-specific parameters"""
        pass
    
    @abstractmethod
    def calculate_score(self, stock_data: Dict[str, Any]) -> float:
        """
        Calculate score for a single stock
        
        Args:
            stock_data: Dictionary containing stock information
            
        Returns:
            float: Score between 0-100
        """
        pass
    
    @abstractmethod
    def get_selection_criteria(self) -> Dict[str, Any]:
        """
        Get the selection criteria this algorithm uses
        
        Returns:
            Dict with criteria like min_price, max_price, min_volume, etc.
        """
        pass
    
    def score_stocks(self, stocks_df: pd.DataFrame) -> pd.DataFrame:
        """
        Score multiple stocks and return ranked dataframe
        
        Args:
            stocks_df: DataFrame with stock data
            
        Returns:
            DataFrame with scores and rankings
        """
        if stocks_df.empty:
            return stocks_df
        
        scores = []
        for _, stock in stocks_df.iterrows():
            try:
                score = self.calculate_score(stock.to_dict())
                scores.append({
                    'symbol': stock.get('symbol', stock.get('nsecode', '')),
                    'alg_score': score,
                    'alg_id': self.alg_id,
                    'trading_theme': self.trading_theme,
                    'timestamp': datetime.now()
                })
            except Exception as e:
                self.logger.error(f"Error scoring {stock.get('symbol', 'unknown')}: {e}")
                scores.append({
                    'symbol': stock.get('symbol', stock.get('nsecode', '')),
                    'alg_score': 0.0,
                    'alg_id': self.alg_id,
                    'trading_theme': self.trading_theme,
                    'timestamp': datetime.now()
                })
        
        score_df = pd.DataFrame(scores)
        score_df = score_df.sort_values('alg_score', ascending=False)
        score_df['rank'] = range(1, len(score_df) + 1)
        
        return score_df
    
    def validate_stock(self, stock_data: Dict[str, Any]) -> bool:
        """
        Validate if stock meets basic criteria for this algorithm
        
        Args:
            stock_data: Stock information dictionary
            
        Returns:
            bool: True if stock is valid for this algorithm
        """
        criteria = self.get_selection_criteria()
        
        try:
            price = float(stock_data.get('close', 0))
            volume = float(stock_data.get('volume', 0))
            
            # Basic validation
            if price <= 0 or volume <= 0:
                return False
            
            # Apply criteria
            if 'min_price' in criteria and price < criteria['min_price']:
                return False
            if 'max_price' in criteria and price > criteria['max_price']:
                return False
            if 'min_volume' in criteria and volume < criteria['min_volume']:
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error validating stock: {e}")
            return False
    
    def update_performance(self, metrics: Dict[str, float]):
        """Update performance metrics for this algorithm"""
        performance_entry = {
            'timestamp': datetime.now(),
            'metrics': metrics,
            'alg_id': self.alg_id,
            'version': self.version
        }
        self.performance_history.append(performance_entry)
        
        # Keep only last 100 entries
        if len(self.performance_history) > 100:
            self.performance_history = self.performance_history[-100:]
    
    def get_algorithm_info(self) -> Dict[str, Any]:
        """Get algorithm information"""
        return {
            'alg_id': self.alg_id,
            'version': self.version,
            'trading_theme': self.trading_theme,
            'algorithm_type': 'seed_algorithm',
            'class_name': self.__class__.__name__,
            'parameters': self.parameters,
            'selection_criteria': self.get_selection_criteria(),
            'performance_entries': len(self.performance_history)
        }


class BaseRankingAlgorithm(ABC):
    """
    Base class for ranking algorithms that combine multiple seed algorithm scores
    to produce final rankings
    """
    
    def __init__(self, alg_id: str, version: str, **kwargs):
        self.alg_id = alg_id
        self.version = version
        self.parameters = kwargs
        self.performance_history = []
        self.logger = logging.getLogger(f"{self.__class__.__name__}_{alg_id}")
        
        # Initialize algorithm-specific parameters
        self._initialize_parameters()
    
    @abstractmethod
    def _initialize_parameters(self):
        """Initialize algorithm-specific parameters"""
        pass
    
    @abstractmethod
    def combine_scores(self, seed_scores: List[pd.DataFrame]) -> pd.DataFrame:
        """
        Combine scores from multiple seed algorithms
        
        Args:
            seed_scores: List of DataFrames from different seed algorithms
            
        Returns:
            DataFrame with combined scores and final rankings
        """
        pass
    
    def rank_stocks(self, stocks_df: pd.DataFrame, seed_algorithms: List[Any]) -> pd.DataFrame:
        """
        Rank stocks using multiple seed algorithms
        
        Args:
            stocks_df: DataFrame with stock data
            seed_algorithms: List of seed algorithm instances
            
        Returns:
            DataFrame with final rankings
        """
        if stocks_df.empty:
            return stocks_df
        
        # Get scores from each seed algorithm
        seed_scores = []
        for algorithm in seed_algorithms:
            try:
                scores = algorithm.score_stocks(stocks_df)
                if not scores.empty:
                    seed_scores.append(scores)
            except Exception as e:
                self.logger.error(f"Error getting scores from {algorithm.alg_id}: {e}")
        
        if not seed_scores:
            self.logger.warning("No seed scores available for ranking")
            return pd.DataFrame()
        
        # Combine scores using the ranking algorithm
        final_rankings = self.combine_scores(seed_scores)
        
        return final_rankings
    
    def update_performance(self, metrics: Dict[str, float]):
        """Update performance metrics for this algorithm"""
        performance_entry = {
            'timestamp': datetime.now(),
            'metrics': metrics,
            'alg_id': self.alg_id,
            'version': self.version
        }
        self.performance_history.append(performance_entry)
        
        # Keep only last 100 entries
        if len(self.performance_history) > 100:
            self.performance_history = self.performance_history[-100:]
    
    def get_algorithm_info(self) -> Dict[str, Any]:
        """Get algorithm information"""
        return {
            'alg_id': self.alg_id,
            'version': self.version,
            'algorithm_type': 'ranking_algorithm',
            'class_name': self.__class__.__name__,
            'parameters': self.parameters,
            'performance_entries': len(self.performance_history)
        }


class AlgorithmPerformanceTracker:
    """Tracks performance of algorithms for self-learning"""
    
    def __init__(self):
        self.performance_data = {}
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def record_performance(self, alg_id: str, trading_theme: str, 
                          predictions: List[str], actuals: List[float],
                          timestamp: datetime = None):
        """
        Record performance data for an algorithm
        
        Args:
            alg_id: Algorithm identifier
            trading_theme: Trading theme (intraday_buy, etc.)
            predictions: List of predicted symbols
            actuals: List of actual returns for those symbols
            timestamp: Timestamp of the performance data
        """
        if timestamp is None:
            timestamp = datetime.now()
        
        if alg_id not in self.performance_data:
            self.performance_data[alg_id] = []
        
        # Calculate performance metrics
        metrics = self._calculate_metrics(predictions, actuals)
        
        performance_entry = {
            'timestamp': timestamp,
            'trading_theme': trading_theme,
            'predictions': predictions,
            'actuals': actuals,
            'metrics': metrics,
            'sample_size': len(predictions)
        }
        
        self.performance_data[alg_id].append(performance_entry)
        
        # Keep only last 1000 entries per algorithm
        if len(self.performance_data[alg_id]) > 1000:
            self.performance_data[alg_id] = self.performance_data[alg_id][-1000:]
        
        self.logger.info(f"Recorded performance for {alg_id}: {metrics}")
    
    def _calculate_metrics(self, predictions: List[str], actuals: List[float]) -> Dict[str, float]:
        """Calculate performance metrics"""
        if not predictions or not actuals or len(predictions) != len(actuals):
            return {}
        
        actuals_array = np.array(actuals)
        
        metrics = {
            'accuracy': self._calculate_accuracy(actuals_array),
            'average_return': np.mean(actuals_array),
            'volatility': np.std(actuals_array),
            'sharpe_ratio': self._calculate_sharpe(actuals_array),
            'max_drawdown': self._calculate_max_drawdown(actuals_array),
            'hit_rate': np.sum(actuals_array > 0) / len(actuals_array),
            'sample_size': len(predictions)
        }
        
        return metrics
    
    def _calculate_accuracy(self, returns: np.ndarray) -> float:
        """Calculate accuracy as percentage of positive returns"""
        if len(returns) == 0:
            return 0.0
        return (returns > 0).mean() * 100
    
    def _calculate_sharpe(self, returns: np.ndarray) -> float:
        """Calculate Sharpe ratio"""
        if len(returns) == 0 or np.std(returns) == 0:
            return 0.0
        return np.mean(returns) / np.std(returns) * np.sqrt(252)  # Annualized
    
    def _calculate_max_drawdown(self, returns: np.ndarray) -> float:
        """Calculate maximum drawdown"""
        if len(returns) == 0:
            return 0.0
        
        cumulative = np.cumprod(1 + returns)
        running_max = np.maximum.accumulate(cumulative)
        drawdown = (cumulative - running_max) / running_max
        return abs(np.min(drawdown)) * 100
    
    def get_algorithm_performance(self, alg_id: str, days: int = 30) -> Dict[str, float]:
        """Get recent performance metrics for an algorithm"""
        if alg_id not in self.performance_data:
            return {}
        
        cutoff_date = datetime.now() - pd.Timedelta(days=days)
        recent_data = [
            entry for entry in self.performance_data[alg_id]
            if entry['timestamp'] >= cutoff_date
        ]
        
        if not recent_data:
            return {}
        
        # Aggregate metrics
        all_actuals = []
        for entry in recent_data:
            all_actuals.extend(entry['actuals'])
        
        if not all_actuals:
            return {}
        
        return self._calculate_metrics([], all_actuals) 