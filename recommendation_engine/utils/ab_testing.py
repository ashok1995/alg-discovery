#!/usr/bin/env python3
"""
A/B Testing Framework for Recommendation Engine

Provides comprehensive A/B testing capabilities for comparing algorithm versions,
traffic splitting, statistical analysis, and performance tracking.

Features:
- Multi-variant testing (A/B/C/D...)
- Statistical significance testing
- Real-time performance monitoring
- Automated winner selection
- Traffic splitting and routing
- Performance analytics and reporting
"""

import json
import logging
import random
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import hashlib
import numpy as np
from scipy import stats


class ABTestingFramework:
    """
    Comprehensive A/B testing framework for algorithm comparison
    """
    
    def __init__(self, config_path: str = "recommendation_engine/config/ab_tests.json"):
        """
        Initialize the A/B testing framework
        
        Args:
            config_path: Path to A/B test configuration file
        """
        self.config_path = config_path
        self.logger = logging.getLogger(__name__)
        self.test_results = {}
        self.active_tests = {}
        
        # Load existing configuration
        self.load_configuration()
    
    def load_configuration(self):
        """Load A/B test configuration"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    self.config = json.load(f)
            else:
                self.config = {
                    "active_tests": {},
                    "completed_tests": {},
                    "test_history": [],
                    "last_updated": datetime.now().isoformat()
                }
                self.save_configuration()
            
            # Load active tests into memory
            self.active_tests = self.config.get("active_tests", {})
            
            self.logger.info(f"✅ A/B testing configuration loaded")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to load A/B test configuration: {e}")
            self.config = {
                "active_tests": {},
                "completed_tests": {},
                "test_history": [],
                "last_updated": datetime.now().isoformat()
            }
    
    def save_configuration(self):
        """Save A/B test configuration"""
        try:
            import os
            
            # Update timestamp
            self.config["last_updated"] = datetime.now().isoformat()
            self.config["active_tests"] = self.active_tests
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            
            with open(self.config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
            
            self.logger.info(f"✅ A/B test configuration saved")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to save A/B test configuration: {e}")
    
    def create_test(self, test_name: str, variants: Dict[str, Dict[str, Any]], 
                   traffic_split: Dict[str, float], duration_days: int = 14,
                   success_metrics: List[str] = None) -> bool:
        """
        Create a new A/B test
        
        Args:
            test_name: Unique test identifier
            variants: Dictionary of variant configurations
            traffic_split: Traffic allocation per variant
            duration_days: Test duration in days
            success_metrics: List of metrics to track (e.g., ['accuracy', 'return'])
        
        Returns:
            bool: Success status
        """
        try:
            # Validate traffic split
            total_traffic = sum(traffic_split.values())
            if abs(total_traffic - 100.0) > 0.1:
                self.logger.error(f"❌ Traffic split must sum to 100%, got {total_traffic}%")
                return False
            
            # Validate variants exist in traffic split
            for variant_id in variants.keys():
                if variant_id not in traffic_split:
                    self.logger.error(f"❌ Variant {variant_id} missing from traffic split")
                    return False
            
            # Default success metrics
            if success_metrics is None:
                success_metrics = ['accuracy', 'return', 'sharpe_ratio']
            
            # Create test configuration
            test_config = {
                "test_name": test_name,
                "variants": variants,
                "traffic_split": traffic_split,
                "success_metrics": success_metrics,
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() + timedelta(days=duration_days)).isoformat(),
                "status": "active",
                "created_date": datetime.now().isoformat(),
                "duration_days": duration_days,
                
                # Initialize metrics tracking
                "variant_metrics": {
                    variant_id: {
                        "requests": 0,
                        "successes": 0,
                        "total_score": 0.0,
                        "scores": [],
                        "returns": [],
                        "accuracy_data": [],
                        "confidence_intervals": {},
                        "last_updated": datetime.now().isoformat()
                    } for variant_id in variants.keys()
                },
                
                # Statistical analysis
                "statistical_analysis": {
                    "significance_level": 0.05,
                    "minimum_sample_size": 100,
                    "power": 0.8,
                    "effect_size": 0.1,
                    "current_winner": None,
                    "confidence_level": 0.0
                }
            }
            
            # Add to active tests
            self.active_tests[test_name] = test_config
            
            # Log test creation
            self.config["test_history"].append({
                "action": "created",
                "test_name": test_name,
                "variants": list(variants.keys()),
                "timestamp": datetime.now().isoformat()
            })
            
            self.save_configuration()
            self.logger.info(f"✅ A/B test '{test_name}' created successfully")
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to create A/B test: {e}")
            return False
    
    def assign_variant(self, test_name: str, user_id: str) -> Optional[str]:
        """
        Assign a user to a test variant based on traffic split
        
        Args:
            test_name: Test identifier
            user_id: Unique user identifier (for consistent assignment)
        
        Returns:
            Variant ID or None if test not found
        """
        if test_name not in self.active_tests:
            return None
        
        test_config = self.active_tests[test_name]
        traffic_split = test_config["traffic_split"]
        
        # Use hash of user_id + test_name for consistent assignment
        hash_input = f"{user_id}_{test_name}".encode('utf-8')
        hash_value = int(hashlib.md5(hash_input).hexdigest(), 16)
        assignment_value = hash_value % 10000  # Scale to 0-9999
        
        # Assign based on traffic split percentages
        cumulative_percentage = 0
        for variant_id, percentage in traffic_split.items():
            cumulative_percentage += percentage * 100  # Convert to scale of 0-10000
            if assignment_value < cumulative_percentage:
                return variant_id
        
        # Fallback to first variant
        return list(traffic_split.keys())[0]
    
    def record_result(self, test_name: str, variant_id: str, 
                     metrics: Dict[str, float], success: bool = True) -> bool:
        """
        Record a result for a test variant
        
        Args:
            test_name: Test identifier
            variant_id: Variant that produced the result
            metrics: Dictionary of metric values
            success: Whether the result was successful
        
        Returns:
            bool: Success status
        """
        try:
            if test_name not in self.active_tests:
                self.logger.error(f"❌ Test {test_name} not found")
                return False
            
            test_config = self.active_tests[test_name]
            
            if variant_id not in test_config["variants"]:
                self.logger.error(f"❌ Variant {variant_id} not found in test {test_name}")
                return False
            
            # Update variant metrics
            variant_metrics = test_config["variant_metrics"][variant_id]
            variant_metrics["requests"] += 1
            
            if success:
                variant_metrics["successes"] += 1
            
            # Record metric values
            for metric_name, value in metrics.items():
                if metric_name == "score":
                    variant_metrics["total_score"] += value
                    variant_metrics["scores"].append(value)
                elif metric_name == "return":
                    variant_metrics["returns"].append(value)
                elif metric_name == "accuracy":
                    variant_metrics["accuracy_data"].append(value)
            
            variant_metrics["last_updated"] = datetime.now().isoformat()
            
            # Update statistical analysis if sufficient data
            self._update_statistical_analysis(test_name)
            
            # Check if test should be concluded
            self._check_test_conclusion(test_name)
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to record result: {e}")
            return False
    
    def _update_statistical_analysis(self, test_name: str):
        """Update statistical analysis for a test"""
        try:
            test_config = self.active_tests[test_name]
            analysis = test_config["statistical_analysis"]
            variant_metrics = test_config["variant_metrics"]
            
            # Check if we have sufficient sample size
            min_samples = analysis["minimum_sample_size"]
            variants_with_data = []
            
            for variant_id, metrics in variant_metrics.items():
                if metrics["requests"] >= min_samples:
                    variants_with_data.append(variant_id)
            
            if len(variants_with_data) < 2:
                return  # Need at least 2 variants with sufficient data
            
            # Perform statistical tests between variants
            results = {}
            
            for i, variant_a in enumerate(variants_with_data):
                for variant_b in variants_with_data[i+1:]:
                    comparison_key = f"{variant_a}_vs_{variant_b}"
                    
                    # Compare success rates
                    success_rate_a = (variant_metrics[variant_a]["successes"] / 
                                    variant_metrics[variant_a]["requests"])
                    success_rate_b = (variant_metrics[variant_b]["successes"] / 
                                    variant_metrics[variant_b]["requests"])
                    
                    # Chi-square test for success rates
                    if (variant_metrics[variant_a]["requests"] > 0 and 
                        variant_metrics[variant_b]["requests"] > 0):
                        
                        contingency_table = [
                            [variant_metrics[variant_a]["successes"], 
                             variant_metrics[variant_a]["requests"] - variant_metrics[variant_a]["successes"]],
                            [variant_metrics[variant_b]["successes"], 
                             variant_metrics[variant_b]["requests"] - variant_metrics[variant_b]["successes"]]
                        ]
                        
                        try:
                            chi2, p_value, _, _ = stats.chi2_contingency(contingency_table)
                            
                            results[comparison_key] = {
                                "success_rate_a": success_rate_a,
                                "success_rate_b": success_rate_b,
                                "p_value": p_value,
                                "significant": p_value < analysis["significance_level"],
                                "winner": variant_a if success_rate_a > success_rate_b else variant_b
                            }
                        except Exception:
                            # Handle cases where chi-square test fails
                            results[comparison_key] = {
                                "success_rate_a": success_rate_a,
                                "success_rate_b": success_rate_b,
                                "p_value": 1.0,
                                "significant": False,
                                "winner": variant_a if success_rate_a > success_rate_b else variant_b
                            }
            
            # Determine overall winner
            if results:
                # Find variant with highest success rate among significant results
                variant_scores = {}
                
                for variant_id in variants_with_data:
                    success_rate = (variant_metrics[variant_id]["successes"] / 
                                  variant_metrics[variant_id]["requests"])
                    variant_scores[variant_id] = success_rate
                
                # Current winner is variant with highest success rate
                current_winner = max(variant_scores, key=variant_scores.get)
                analysis["current_winner"] = current_winner
                
                # Calculate confidence level
                significant_results = [r for r in results.values() if r["significant"]]
                if significant_results:
                    analysis["confidence_level"] = len(significant_results) / len(results)
                else:
                    analysis["confidence_level"] = 0.0
            
            test_config["comparison_results"] = results
            
        except Exception as e:
            self.logger.error(f"❌ Failed to update statistical analysis: {e}")
    
    def _check_test_conclusion(self, test_name: str):
        """Check if test should be concluded based on statistical significance"""
        try:
            test_config = self.active_tests[test_name]
            analysis = test_config["statistical_analysis"]
            
            # Check if test duration has passed
            end_date = datetime.fromisoformat(test_config["end_date"])
            if datetime.now() > end_date:
                self.conclude_test(test_name, reason="duration_complete")
                return
            
            # Check for early conclusion based on statistical significance
            if (analysis.get("confidence_level", 0) > 0.95 and 
                analysis.get("current_winner")):
                
                # Check if winner has sufficient sample size
                winner = analysis["current_winner"]
                winner_requests = test_config["variant_metrics"][winner]["requests"]
                
                if winner_requests >= analysis["minimum_sample_size"] * 2:
                    self.conclude_test(test_name, reason="statistical_significance")
                    return
            
        except Exception as e:
            self.logger.error(f"❌ Failed to check test conclusion: {e}")
    
    def conclude_test(self, test_name: str, reason: str = "manual") -> Dict[str, Any]:
        """
        Conclude an A/B test and generate final results
        
        Args:
            test_name: Test identifier
            reason: Reason for conclusion (duration_complete, statistical_significance, manual)
        
        Returns:
            Test results summary
        """
        try:
            if test_name not in self.active_tests:
                self.logger.error(f"❌ Test {test_name} not found")
                return {}
            
            test_config = self.active_tests[test_name]
            test_config["status"] = "completed"
            test_config["conclusion_date"] = datetime.now().isoformat()
            test_config["conclusion_reason"] = reason
            
            # Generate final analysis
            final_results = self._generate_final_analysis(test_config)
            test_config["final_results"] = final_results
            
            # Move to completed tests
            if "completed_tests" not in self.config:
                self.config["completed_tests"] = {}
            
            self.config["completed_tests"][test_name] = test_config
            
            # Remove from active tests
            del self.active_tests[test_name]
            
            # Log conclusion
            self.config["test_history"].append({
                "action": "concluded",
                "test_name": test_name,
                "reason": reason,
                "winner": final_results.get("winner"),
                "timestamp": datetime.now().isoformat()
            })
            
            self.save_configuration()
            self.logger.info(f"✅ A/B test '{test_name}' concluded. Winner: {final_results.get('winner')}")
            
            return final_results
            
        except Exception as e:
            self.logger.error(f"❌ Failed to conclude test: {e}")
            return {}
    
    def _generate_final_analysis(self, test_config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate comprehensive final analysis"""
        variant_metrics = test_config["variant_metrics"]
        
        # Calculate final metrics for each variant
        variant_summaries = {}
        
        for variant_id, metrics in variant_metrics.items():
            if metrics["requests"] > 0:
                success_rate = metrics["successes"] / metrics["requests"]
                avg_score = metrics["total_score"] / metrics["requests"] if metrics["requests"] > 0 else 0
                
                variant_summaries[variant_id] = {
                    "requests": metrics["requests"],
                    "success_rate": success_rate,
                    "average_score": avg_score,
                    "total_scores": len(metrics["scores"]),
                    "score_mean": statistics.mean(metrics["scores"]) if metrics["scores"] else 0,
                    "score_std": statistics.stdev(metrics["scores"]) if len(metrics["scores"]) > 1 else 0,
                    "return_mean": statistics.mean(metrics["returns"]) if metrics["returns"] else 0,
                    "return_std": statistics.stdev(metrics["returns"]) if len(metrics["returns"]) > 1 else 0
                }
        
        # Determine winner
        winner = None
        winner_score = 0
        
        for variant_id, summary in variant_summaries.items():
            # Use success rate as primary metric, average score as tiebreaker
            composite_score = summary["success_rate"] * 0.7 + summary["average_score"] * 0.3
            
            if composite_score > winner_score:
                winner = variant_id
                winner_score = composite_score
        
        # Calculate improvement
        improvement = 0
        if len(variant_summaries) >= 2:
            sorted_variants = sorted(variant_summaries.items(), 
                                   key=lambda x: x[1]["success_rate"], reverse=True)
            
            if len(sorted_variants) >= 2:
                best_rate = sorted_variants[0][1]["success_rate"]
                second_rate = sorted_variants[1][1]["success_rate"]
                
                if second_rate > 0:
                    improvement = ((best_rate - second_rate) / second_rate) * 100
        
        return {
            "winner": winner,
            "improvement_percentage": improvement,
            "variant_summaries": variant_summaries,
            "total_requests": sum(summary["requests"] for summary in variant_summaries.values()),
            "statistical_analysis": test_config.get("statistical_analysis", {}),
            "comparison_results": test_config.get("comparison_results", {}),
            "conclusion_reason": test_config.get("conclusion_reason", "unknown")
        }
    
    def get_test_status(self, test_name: str) -> Dict[str, Any]:
        """Get current status of a test"""
        if test_name in self.active_tests:
            test_config = self.active_tests[test_name]
            status = "active"
        elif test_name in self.config.get("completed_tests", {}):
            test_config = self.config["completed_tests"][test_name]
            status = "completed"
        else:
            return {"error": "Test not found"}
        
        # Calculate current performance
        current_performance = {}
        for variant_id, metrics in test_config["variant_metrics"].items():
            if metrics["requests"] > 0:
                current_performance[variant_id] = {
                    "requests": metrics["requests"],
                    "success_rate": metrics["successes"] / metrics["requests"],
                    "average_score": metrics["total_score"] / metrics["requests"]
                }
        
        return {
            "test_name": test_name,
            "status": status,
            "start_date": test_config["start_date"],
            "end_date": test_config["end_date"],
            "current_performance": current_performance,
            "statistical_analysis": test_config.get("statistical_analysis", {}),
            "final_results": test_config.get("final_results")
        }
    
    def get_active_tests(self) -> List[str]:
        """Get list of active test names"""
        return list(self.active_tests.keys())
    
    def get_completed_tests(self) -> List[str]:
        """Get list of completed test names"""
        return list(self.config.get("completed_tests", {}).keys())


def main():
    """Demo of the A/B Testing Framework"""
    print("🧪 A/B Testing Framework Demo")
    print("=" * 50)
    
    # Initialize framework
    ab_framework = ABTestingFramework()
    
    # Demo: Create an A/B test
    print("\n📝 Creating A/B test...")
    success = ab_framework.create_test(
        test_name="momentum_algorithm_test",
        variants={
            "control": {
                "algorithm_id": "momentum_intraday_v1_0",
                "description": "Original momentum algorithm"
            },
            "treatment": {
                "algorithm_id": "momentum_intraday_v2_0", 
                "description": "Enhanced momentum with ML"
            }
        },
        traffic_split={"control": 50.0, "treatment": 50.0},
        duration_days=14,
        success_metrics=["accuracy", "return", "sharpe_ratio"]
    )
    print(f"✅ Test Creation: {'Success' if success else 'Failed'}")
    
    # Demo: Simulate user assignments and results
    print("\n👥 Simulating user assignments and results...")
    import random
    
    for i in range(200):  # Simulate 200 users
        user_id = f"user_{i}"
        variant = ab_framework.assign_variant("momentum_algorithm_test", user_id)
        
        # Simulate results (treatment performs slightly better)
        if variant == "control":
            success = random.random() > 0.35  # 65% success rate
            score = random.uniform(6.0, 8.5)
            accuracy = random.uniform(60, 75)
        else:  # treatment
            success = random.random() > 0.25  # 75% success rate  
            score = random.uniform(7.0, 9.5)
            accuracy = random.uniform(70, 85)
        
        ab_framework.record_result(
            test_name="momentum_algorithm_test",
            variant_id=variant,
            metrics={
                "score": score,
                "accuracy": accuracy,
                "return": random.uniform(-2, 15)
            },
            success=success
        )
    
    # Demo: Check test status
    print("\n📊 Checking test status...")
    status = ab_framework.get_test_status("momentum_algorithm_test")
    
    print(f"Test Status: {status['status']}")
    print("Current Performance:")
    for variant_id, perf in status['current_performance'].items():
        print(f"  {variant_id}: {perf['success_rate']:.1%} success rate, "
              f"avg score: {perf['average_score']:.1f}")
    
    # Demo: Conclude test
    print("\n🏁 Concluding test...")
    final_results = ab_framework.conclude_test("momentum_algorithm_test", "manual")
    
    if final_results:
        print(f"🏆 Winner: {final_results['winner']}")
        print(f"📈 Improvement: {final_results['improvement_percentage']:.1f}%")
        print(f"📊 Total Requests: {final_results['total_requests']}")
    
    print("\n✅ A/B Testing Framework demo completed!")


if __name__ == "__main__":
    main() 