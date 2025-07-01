#!/usr/bin/env python3
"""
Performance Tracker for Recommendation Engine

Tracks and analyzes algorithm performance metrics including accuracy, returns,
Sharpe ratios, and other key performance indicators. Provides real-time monitoring
and historical analysis.

Features:
- Real-time performance monitoring
- Historical performance tracking
- Risk-adjusted returns calculation
- Algorithm comparison analytics
- Performance alerts and notifications
- Detailed reporting and visualization data
"""

import json
import logging
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import os
import numpy as np


class PerformanceTracker:
    """
    Comprehensive performance tracking for recommendation algorithms
    """
    
    def __init__(self, data_path: str = "recommendation_engine/data/performance"):
        """
        Initialize the performance tracker
        
        Args:
            data_path: Directory path for storing performance data
        """
        self.data_path = data_path
        self.logger = logging.getLogger(__name__)
        
        # In-memory storage for recent performance data
        self.recent_performance = {}
        self.algorithm_metrics = {}
        self.daily_summaries = {}
        
        # Ensure data directory exists
        os.makedirs(self.data_path, exist_ok=True)
        
        # Load existing performance data
        self.load_performance_data()
    
    def load_performance_data(self):
        """Load existing performance data from files"""
        try:
            # Load algorithm metrics
            metrics_file = os.path.join(self.data_path, "algorithm_metrics.json")
            if os.path.exists(metrics_file):
                with open(metrics_file, 'r') as f:
                    self.algorithm_metrics = json.load(f)
            
            # Load daily summaries
            summaries_file = os.path.join(self.data_path, "daily_summaries.json")
            if os.path.exists(summaries_file):
                with open(summaries_file, 'r') as f:
                    self.daily_summaries = json.load(f)
            
            self.logger.info("✅ Performance data loaded successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to load performance data: {e}")
            # Initialize empty structures
            self.algorithm_metrics = {}
            self.daily_summaries = {}
    
    def save_performance_data(self):
        """Save performance data to files"""
        try:
            # Save algorithm metrics
            metrics_file = os.path.join(self.data_path, "algorithm_metrics.json")
            with open(metrics_file, 'w') as f:
                json.dump(self.algorithm_metrics, f, indent=2)
            
            # Save daily summaries
            summaries_file = os.path.join(self.data_path, "daily_summaries.json")
            with open(summaries_file, 'w') as f:
                json.dump(self.daily_summaries, f, indent=2)
            
            self.logger.info("✅ Performance data saved successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to save performance data: {e}")
    
    def record_prediction(self, algorithm_id: str, symbol: str, prediction: Dict[str, Any],
                         actual_result: Optional[Dict[str, Any]] = None) -> bool:
        """
        Record a prediction made by an algorithm
        
        Args:
            algorithm_id: Algorithm identifier
            symbol: Stock symbol
            prediction: Prediction details (score, recommendation, confidence)
            actual_result: Actual outcome (if available)
        
        Returns:
            bool: Success status
        """
        try:
            timestamp = datetime.now().isoformat()
            
            # Initialize algorithm tracking if not exists
            if algorithm_id not in self.algorithm_metrics:
                self.algorithm_metrics[algorithm_id] = {
                    "total_predictions": 0,
                    "correct_predictions": 0,
                    "total_return": 0.0,
                    "trades": [],
                    "daily_performance": {},
                    "last_updated": timestamp,
                    "created_date": timestamp
                }
            
            alg_metrics = self.algorithm_metrics[algorithm_id]
            
            # Record prediction
            prediction_record = {
                "symbol": symbol,
                "timestamp": timestamp,
                "score": prediction.get("score", 0),
                "recommendation": prediction.get("recommendation", "hold"),
                "confidence": prediction.get("confidence", 0),
                "predicted_return": prediction.get("predicted_return", 0),
                "actual_result": actual_result
            }
            
            alg_metrics["trades"].append(prediction_record)
            alg_metrics["total_predictions"] += 1
            alg_metrics["last_updated"] = timestamp
            
            # If actual result is provided, update accuracy and returns
            if actual_result:
                self._update_performance_metrics(algorithm_id, prediction, actual_result)
            
            # Limit stored trades to last 1000 to manage memory
            if len(alg_metrics["trades"]) > 1000:
                alg_metrics["trades"] = alg_metrics["trades"][-1000:]
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to record prediction: {e}")
            return False
    
    def _update_performance_metrics(self, algorithm_id: str, prediction: Dict[str, Any], 
                                  actual_result: Dict[str, Any]):
        """Update performance metrics based on actual results"""
        try:
            alg_metrics = self.algorithm_metrics[algorithm_id]
            
            # Check if prediction was correct
            predicted_direction = prediction.get("recommendation", "hold")
            actual_return = actual_result.get("return", 0)
            
            # Simple accuracy check: positive return for buy, negative for sell, any for hold
            is_correct = False
            if predicted_direction == "buy" and actual_return > 0:
                is_correct = True
            elif predicted_direction == "sell" and actual_return < 0:
                is_correct = True
            elif predicted_direction == "hold":
                is_correct = True  # Conservative approach: count holds as correct
            
            if is_correct:
                alg_metrics["correct_predictions"] += 1
            
            # Update return tracking
            alg_metrics["total_return"] += actual_return
            
            # Update daily performance
            today = datetime.now().strftime("%Y-%m-%d")
            if today not in alg_metrics["daily_performance"]:
                alg_metrics["daily_performance"][today] = {
                    "predictions": 0,
                    "correct": 0,
                    "total_return": 0.0,
                    "trades": []
                }
            
            daily_perf = alg_metrics["daily_performance"][today]
            daily_perf["predictions"] += 1
            if is_correct:
                daily_perf["correct"] += 1
            daily_perf["total_return"] += actual_return
            daily_perf["trades"].append({
                "symbol": prediction.get("symbol", ""),
                "return": actual_return,
                "correct": is_correct
            })
            
        except Exception as e:
            self.logger.error(f"❌ Failed to update performance metrics: {e}")
    
    def get_algorithm_performance(self, algorithm_id: str, 
                                days_back: Optional[int] = None) -> Dict[str, Any]:
        """
        Get performance metrics for a specific algorithm
        
        Args:
            algorithm_id: Algorithm identifier
            days_back: Number of days to look back (None for all time)
        
        Returns:
            Performance metrics dictionary
        """
        if algorithm_id not in self.algorithm_metrics:
            return {
                "error": "Algorithm not found",
                "algorithm_id": algorithm_id
            }
        
        alg_metrics = self.algorithm_metrics[algorithm_id]
        
        # Calculate basic metrics
        total_predictions = alg_metrics["total_predictions"]
        correct_predictions = alg_metrics["correct_predictions"]
        total_return = alg_metrics["total_return"]
        
        accuracy = (correct_predictions / total_predictions * 100) if total_predictions > 0 else 0
        avg_return = total_return / total_predictions if total_predictions > 0 else 0
        
        # Calculate period-specific metrics if days_back is specified
        if days_back is not None:
            cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
            period_metrics = self._calculate_period_metrics(alg_metrics, cutoff_date)
        else:
            period_metrics = {
                "period_predictions": total_predictions,
                "period_accuracy": accuracy,
                "period_return": total_return,
                "period_avg_return": avg_return
            }
        
        # Calculate additional metrics
        returns_list = [trade.get("actual_result", {}).get("return", 0) 
                       for trade in alg_metrics["trades"] 
                       if trade.get("actual_result")]
        
        sharpe_ratio = self._calculate_sharpe_ratio(returns_list)
        max_drawdown = self._calculate_max_drawdown(returns_list)
        win_rate = self._calculate_win_rate(returns_list)
        
        return {
            "algorithm_id": algorithm_id,
            "total_predictions": total_predictions,
            "accuracy": accuracy,
            "total_return": total_return,
            "average_return": avg_return,
            "sharpe_ratio": sharpe_ratio,
            "max_drawdown": max_drawdown,
            "win_rate": win_rate,
            "last_updated": alg_metrics["last_updated"],
            "created_date": alg_metrics["created_date"],
            **period_metrics
        }
    
    def _calculate_period_metrics(self, alg_metrics: Dict[str, Any], 
                                cutoff_date: str) -> Dict[str, Any]:
        """Calculate metrics for a specific time period"""
        period_predictions = 0
        period_correct = 0
        period_return = 0.0
        
        for date, daily_perf in alg_metrics["daily_performance"].items():
            if date >= cutoff_date:
                period_predictions += daily_perf["predictions"]
                period_correct += daily_perf["correct"]
                period_return += daily_perf["total_return"]
        
        period_accuracy = (period_correct / period_predictions * 100) if period_predictions > 0 else 0
        period_avg_return = period_return / period_predictions if period_predictions > 0 else 0
        
        return {
            "period_predictions": period_predictions,
            "period_accuracy": period_accuracy,
            "period_return": period_return,
            "period_avg_return": period_avg_return
        }
    
    def _calculate_sharpe_ratio(self, returns: List[float], 
                               risk_free_rate: float = 0.02) -> float:
        """Calculate Sharpe ratio for a series of returns"""
        if len(returns) < 2:
            return 0.0
        
        try:
            excess_returns = [r - risk_free_rate/252 for r in returns]  # Daily risk-free rate
            avg_excess_return = statistics.mean(excess_returns)
            std_excess_return = statistics.stdev(excess_returns)
            
            if std_excess_return == 0:
                return 0.0
            
            sharpe = avg_excess_return / std_excess_return * np.sqrt(252)  # Annualized
            return round(sharpe, 3)
            
        except Exception:
            return 0.0
    
    def _calculate_max_drawdown(self, returns: List[float]) -> float:
        """Calculate maximum drawdown from a series of returns"""
        if not returns:
            return 0.0
        
        try:
            cumulative_returns = [1.0]
            for r in returns:
                cumulative_returns.append(cumulative_returns[-1] * (1 + r))
            
            max_drawdown = 0.0
            peak = cumulative_returns[0]
            
            for value in cumulative_returns:
                if value > peak:
                    peak = value
                
                drawdown = (peak - value) / peak
                if drawdown > max_drawdown:
                    max_drawdown = drawdown
            
            return round(max_drawdown * 100, 2)  # Return as percentage
            
        except Exception:
            return 0.0
    
    def _calculate_win_rate(self, returns: List[float]) -> float:
        """Calculate win rate (percentage of positive returns)"""
        if not returns:
            return 0.0
        
        winning_trades = sum(1 for r in returns if r > 0)
        return round(winning_trades / len(returns) * 100, 2)
    
    def compare_algorithms(self, algorithm_ids: List[str], 
                          days_back: Optional[int] = 30) -> Dict[str, Any]:
        """
        Compare performance of multiple algorithms
        
        Args:
            algorithm_ids: List of algorithm IDs to compare
            days_back: Number of days to look back for comparison
        
        Returns:
            Comparison results
        """
        comparison = {
            "algorithms": {},
            "ranking": [],
            "comparison_period": f"Last {days_back} days" if days_back else "All time",
            "timestamp": datetime.now().isoformat()
        }
        
        # Get performance for each algorithm
        for alg_id in algorithm_ids:
            perf = self.get_algorithm_performance(alg_id, days_back)
            if "error" not in perf:
                comparison["algorithms"][alg_id] = perf
        
        # Rank algorithms by composite score
        algorithm_scores = []
        for alg_id, perf in comparison["algorithms"].items():
            # Composite score: accuracy (40%) + Sharpe ratio (30%) + win rate (30%)
            composite_score = (
                perf.get("accuracy", 0) * 0.4 +
                perf.get("sharpe_ratio", 0) * 10 * 0.3 +  # Scale Sharpe ratio
                perf.get("win_rate", 0) * 0.3
            )
            
            algorithm_scores.append({
                "algorithm_id": alg_id,
                "composite_score": composite_score,
                "accuracy": perf.get("accuracy", 0),
                "sharpe_ratio": perf.get("sharpe_ratio", 0),
                "win_rate": perf.get("win_rate", 0),
                "total_predictions": perf.get("total_predictions", 0)
            })
        
        # Sort by composite score
        algorithm_scores.sort(key=lambda x: x["composite_score"], reverse=True)
        comparison["ranking"] = algorithm_scores
        
        return comparison
    
    def get_performance_summary(self, days_back: int = 7) -> Dict[str, Any]:
        """
        Get overall performance summary for all algorithms
        
        Args:
            days_back: Number of days to include in summary
        
        Returns:
            Performance summary
        """
        summary = {
            "period": f"Last {days_back} days",
            "total_algorithms": len(self.algorithm_metrics),
            "active_algorithms": 0,
            "total_predictions": 0,
            "overall_accuracy": 0.0,
            "best_performing": None,
            "algorithm_breakdown": {},
            "timestamp": datetime.now().isoformat()
        }
        
        cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
        
        total_correct = 0
        total_predictions = 0
        best_score = 0
        
        for alg_id, alg_metrics in self.algorithm_metrics.items():
            # Check if algorithm was active in the period
            has_recent_activity = any(
                date >= cutoff_date 
                for date in alg_metrics.get("daily_performance", {}).keys()
            )
            
            if has_recent_activity:
                summary["active_algorithms"] += 1
                
                # Calculate period metrics
                period_metrics = self._calculate_period_metrics(alg_metrics, cutoff_date)
                
                summary["algorithm_breakdown"][alg_id] = period_metrics
                
                # Update totals
                total_predictions += period_metrics["period_predictions"]
                total_correct += period_metrics["period_predictions"] * period_metrics["period_accuracy"] / 100
                
                # Check if this is the best performing algorithm
                if period_metrics["period_accuracy"] > best_score:
                    best_score = period_metrics["period_accuracy"]
                    summary["best_performing"] = alg_id
        
        # Calculate overall accuracy
        if total_predictions > 0:
            summary["overall_accuracy"] = round(total_correct / total_predictions * 100, 2)
        
        summary["total_predictions"] = total_predictions
        
        return summary
    
    def generate_performance_alerts(self, thresholds: Dict[str, float] = None) -> List[Dict[str, Any]]:
        """
        Generate performance alerts based on thresholds
        
        Args:
            thresholds: Performance thresholds for alerts
        
        Returns:
            List of alerts
        """
        if thresholds is None:
            thresholds = {
                "min_accuracy": 50.0,
                "min_sharpe_ratio": 0.5,
                "max_drawdown": 20.0,
                "min_predictions": 10
            }
        
        alerts = []
        
        for alg_id in self.algorithm_metrics.keys():
            perf = self.get_algorithm_performance(alg_id, days_back=7)
            
            if "error" in perf:
                continue
            
            # Check accuracy threshold
            if perf["accuracy"] < thresholds["min_accuracy"]:
                alerts.append({
                    "type": "low_accuracy",
                    "algorithm_id": alg_id,
                    "current_value": perf["accuracy"],
                    "threshold": thresholds["min_accuracy"],
                    "severity": "warning",
                    "message": f"Algorithm {alg_id} accuracy ({perf['accuracy']:.1f}%) below threshold"
                })
            
            # Check Sharpe ratio threshold
            if perf["sharpe_ratio"] < thresholds["min_sharpe_ratio"]:
                alerts.append({
                    "type": "low_sharpe_ratio",
                    "algorithm_id": alg_id,
                    "current_value": perf["sharpe_ratio"],
                    "threshold": thresholds["min_sharpe_ratio"],
                    "severity": "warning",
                    "message": f"Algorithm {alg_id} Sharpe ratio ({perf['sharpe_ratio']:.2f}) below threshold"
                })
            
            # Check drawdown threshold
            if perf["max_drawdown"] > thresholds["max_drawdown"]:
                alerts.append({
                    "type": "high_drawdown",
                    "algorithm_id": alg_id,
                    "current_value": perf["max_drawdown"],
                    "threshold": thresholds["max_drawdown"],
                    "severity": "critical",
                    "message": f"Algorithm {alg_id} max drawdown ({perf['max_drawdown']:.1f}%) exceeds threshold"
                })
            
            # Check minimum predictions threshold
            if perf["total_predictions"] < thresholds["min_predictions"]:
                alerts.append({
                    "type": "insufficient_data",
                    "algorithm_id": alg_id,
                    "current_value": perf["total_predictions"],
                    "threshold": thresholds["min_predictions"],
                    "severity": "info",
                    "message": f"Algorithm {alg_id} has insufficient predictions ({perf['total_predictions']})"
                })
        
        return alerts
    
    def export_performance_data(self, algorithm_ids: Optional[List[str]] = None,
                               format: str = "json") -> str:
        """
        Export performance data for analysis
        
        Args:
            algorithm_ids: Specific algorithms to export (None for all)
            format: Export format ("json" or "csv")
        
        Returns:
            File path of exported data
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            if algorithm_ids is None:
                algorithm_ids = list(self.algorithm_metrics.keys())
            
            export_data = {}
            for alg_id in algorithm_ids:
                if alg_id in self.algorithm_metrics:
                    export_data[alg_id] = self.get_algorithm_performance(alg_id)
            
            if format.lower() == "json":
                filename = f"performance_export_{timestamp}.json"
                filepath = os.path.join(self.data_path, filename)
                
                with open(filepath, 'w') as f:
                    json.dump(export_data, f, indent=2)
            
            else:
                # CSV format would require additional implementation
                raise ValueError("CSV format not implemented yet")
            
            self.logger.info(f"✅ Performance data exported to {filepath}")
            return filepath
            
        except Exception as e:
            self.logger.error(f"❌ Failed to export performance data: {e}")
            return ""


def main():
    """Demo of the Performance Tracker"""
    print("📊 Performance Tracker Demo")
    print("=" * 50)
    
    # Initialize tracker
    tracker = PerformanceTracker()
    
    # Demo: Record some predictions and results
    print("\n📝 Recording sample predictions and results...")
    
    import random
    algorithms = ["momentum_intraday_v1", "volume_surge_v1", "momentum_intraday_v2"]
    symbols = ["RELIANCE", "TCS", "HDFC", "INFY", "WIPRO"]
    
    for i in range(50):
        alg_id = random.choice(algorithms)
        symbol = random.choice(symbols)
        
        # Generate prediction
        prediction = {
            "score": random.uniform(5.0, 9.5),
            "recommendation": random.choice(["buy", "sell", "hold"]),
            "confidence": random.uniform(0.6, 0.95),
            "predicted_return": random.uniform(-2, 8)
        }
        
        # Generate actual result
        actual_result = {
            "return": random.uniform(-5, 12),
            "holding_period": random.randint(1, 5)
        }
        
        tracker.record_prediction(alg_id, symbol, prediction, actual_result)
    
    print("✅ Sample data recorded")
    
    # Demo: Get performance for specific algorithm
    print("\n📈 Algorithm Performance:")
    for alg_id in algorithms:
        perf = tracker.get_algorithm_performance(alg_id)
        if "error" not in perf:
            print(f"  {alg_id}:")
            print(f"    Accuracy: {perf['accuracy']:.1f}%")
            print(f"    Sharpe Ratio: {perf['sharpe_ratio']:.2f}")
            print(f"    Win Rate: {perf['win_rate']:.1f}%")
            print(f"    Total Predictions: {perf['total_predictions']}")
    
    # Demo: Compare algorithms
    print("\n🏆 Algorithm Comparison:")
    comparison = tracker.compare_algorithms(algorithms)
    
    for i, alg_ranking in enumerate(comparison["ranking"], 1):
        print(f"  {i}. {alg_ranking['algorithm_id']} - Score: {alg_ranking['composite_score']:.1f}")
        print(f"     Accuracy: {alg_ranking['accuracy']:.1f}%, "
              f"Sharpe: {alg_ranking['sharpe_ratio']:.2f}, "
              f"Win Rate: {alg_ranking['win_rate']:.1f}%")
    
    # Demo: Performance summary
    print("\n📋 Performance Summary:")
    summary = tracker.get_performance_summary()
    print(f"  Active Algorithms: {summary['active_algorithms']}")
    print(f"  Total Predictions: {summary['total_predictions']}")
    print(f"  Overall Accuracy: {summary['overall_accuracy']:.1f}%")
    print(f"  Best Performer: {summary['best_performing']}")
    
    # Demo: Performance alerts
    print("\n🚨 Performance Alerts:")
    alerts = tracker.generate_performance_alerts()
    if alerts:
        for alert in alerts:
            print(f"  {alert['severity'].upper()}: {alert['message']}")
    else:
        print("  No alerts generated")
    
    # Save data
    tracker.save_performance_data()
    
    print("\n✅ Performance Tracker demo completed!")


if __name__ == "__main__":
    main() 