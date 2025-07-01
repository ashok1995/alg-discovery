#!/usr/bin/env python3
"""
Algorithm Version Manager

Handles versioning, deployment, and rollback of algorithms in the recommendation engine.
Provides version control, A/B testing deployment, and algorithm lifecycle management.

Features:
- Algorithm version deployment and rollback
- A/B testing version management
- Performance comparison between versions
- Safe deployment with gradual rollout
- Version history and audit trails
"""

import json
import logging
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import copy


class VersionManager:
    """
    Manages algorithm versions, deployment, and rollback operations
    """
    
    def __init__(self, config_path: str = "recommendation_engine/config/algorithms.json"):
        """
        Initialize the version manager
        
        Args:
            config_path: Path to the algorithms configuration file
        """
        self.config_path = config_path
        self.logger = logging.getLogger(__name__)
        self.version_history = {}
        self.deployment_log = []
        
        # Load existing configuration
        self.load_configuration()
    
    def load_configuration(self):
        """Load the algorithms configuration"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    self.config = json.load(f)
            else:
                self.config = {
                    "algorithms": {},
                    "ab_tests": {},
                    "last_updated": datetime.now().isoformat()
                }
                self.save_configuration()
            
            self.logger.info(f"✅ Configuration loaded from {self.config_path}")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to load configuration: {e}")
            self.config = {"algorithms": {}, "ab_tests": {}, "last_updated": datetime.now().isoformat()}
    
    def save_configuration(self):
        """Save the current configuration to file"""
        try:
            # Update timestamp
            self.config["last_updated"] = datetime.now().isoformat()
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            
            # Save with backup
            backup_path = f"{self.config_path}.backup"
            if os.path.exists(self.config_path):
                os.rename(self.config_path, backup_path)
            
            with open(self.config_path, 'w') as f:
                json.dump(self.config, f, indent=2)
            
            self.logger.info(f"✅ Configuration saved to {self.config_path}")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to save configuration: {e}")
            # Restore backup if save failed
            if os.path.exists(f"{self.config_path}.backup"):
                os.rename(f"{self.config_path}.backup", self.config_path)
    
    def register_algorithm_version(self, alg_id: str, version: str, metadata: Dict[str, Any]) -> bool:
        """
        Register a new algorithm version
        
        Args:
            alg_id: Algorithm identifier
            version: Version string (e.g., "2.0", "1.5-beta")
            metadata: Algorithm metadata including configuration
        
        Returns:
            bool: Success status
        """
        try:
            # Create versioned algorithm ID
            versioned_id = f"{alg_id}_v{version.replace('.', '_')}"
            
            # Prepare algorithm entry
            algorithm_entry = {
                "alg_id": versioned_id,
                "base_id": alg_id,
                "version": version,
                "name": metadata.get("name", f"{alg_id} v{version}"),
                "description": metadata.get("description", ""),
                "trading_theme": metadata.get("trading_theme", ""),
                "algorithm_type": metadata.get("algorithm_type", "seed_algorithm"),
                "module_path": metadata.get("module_path", ""),
                "class_name": metadata.get("class_name", ""),
                "parameters": metadata.get("parameters", {}),
                "is_active": metadata.get("is_active", False),
                "created_date": datetime.now().isoformat(),
                "performance_metrics": metadata.get("performance_metrics", {}),
                "deployment_status": "registered"
            }
            
            # Add to configuration
            self.config["algorithms"][versioned_id] = algorithm_entry
            
            # Update version history
            if alg_id not in self.version_history:
                self.version_history[alg_id] = []
            
            self.version_history[alg_id].append({
                "version": version,
                "versioned_id": versioned_id,
                "registered_date": datetime.now().isoformat(),
                "status": "registered"
            })
            
            # Log deployment
            self.deployment_log.append({
                "action": "register",
                "algorithm": versioned_id,
                "version": version,
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            })
            
            self.save_configuration()
            self.logger.info(f"✅ Algorithm {versioned_id} registered successfully")
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to register algorithm version: {e}")
            return False
    
    def deploy_algorithm_version(self, alg_id: str, version: str, rollout_percentage: float = 100.0) -> bool:
        """
        Deploy a specific algorithm version
        
        Args:
            alg_id: Base algorithm identifier
            version: Version to deploy
            rollout_percentage: Percentage of traffic to route to this version (0-100)
        
        Returns:
            bool: Success status
        """
        try:
            versioned_id = f"{alg_id}_v{version.replace('.', '_')}"
            
            if versioned_id not in self.config["algorithms"]:
                self.logger.error(f"❌ Algorithm version {versioned_id} not found")
                return False
            
            # Update deployment status
            self.config["algorithms"][versioned_id]["is_active"] = True
            self.config["algorithms"][versioned_id]["deployment_status"] = "deployed"
            self.config["algorithms"][versioned_id]["deployed_date"] = datetime.now().isoformat()
            self.config["algorithms"][versioned_id]["rollout_percentage"] = rollout_percentage
            
            # Deactivate other versions if full rollout
            if rollout_percentage >= 100.0:
                for other_id, other_alg in self.config["algorithms"].items():
                    if (other_alg.get("base_id") == alg_id and 
                        other_id != versioned_id and 
                        other_alg.get("is_active")):
                        
                        other_alg["is_active"] = False
                        other_alg["deployment_status"] = "replaced"
                        self.logger.info(f"🔄 Deactivated {other_id} in favor of {versioned_id}")
            
            # Log deployment
            self.deployment_log.append({
                "action": "deploy",
                "algorithm": versioned_id,
                "version": version,
                "rollout_percentage": rollout_percentage,
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            })
            
            self.save_configuration()
            self.logger.info(f"✅ Algorithm {versioned_id} deployed successfully ({rollout_percentage}% rollout)")
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to deploy algorithm version: {e}")
            return False
    
    def rollback_algorithm(self, alg_id: str, target_version: Optional[str] = None) -> bool:
        """
        Rollback algorithm to previous or specified version
        
        Args:
            alg_id: Base algorithm identifier
            target_version: Specific version to rollback to (if None, uses previous)
        
        Returns:
            bool: Success status
        """
        try:
            # Find current active version
            current_version = None
            for versioned_id, alg_data in self.config["algorithms"].items():
                if (alg_data.get("base_id") == alg_id and 
                    alg_data.get("is_active") and 
                    alg_data.get("deployment_status") == "deployed"):
                    current_version = alg_data.get("version")
                    current_versioned_id = versioned_id
                    break
            
            if not current_version:
                self.logger.error(f"❌ No active version found for {alg_id}")
                return False
            
            # Determine target version
            if target_version is None:
                # Find previous version
                version_history = self.get_version_history(alg_id)
                if len(version_history) < 2:
                    self.logger.error(f"❌ No previous version available for rollback")
                    return False
                
                # Get the version before current
                for i, version_info in enumerate(version_history):
                    if version_info["version"] == current_version and i > 0:
                        target_version = version_history[i-1]["version"]
                        break
                
                if not target_version:
                    self.logger.error(f"❌ Could not determine previous version for rollback")
                    return False
            
            target_versioned_id = f"{alg_id}_v{target_version.replace('.', '_')}"
            
            if target_versioned_id not in self.config["algorithms"]:
                self.logger.error(f"❌ Target version {target_versioned_id} not found")
                return False
            
            # Perform rollback
            # Deactivate current version
            self.config["algorithms"][current_versioned_id]["is_active"] = False
            self.config["algorithms"][current_versioned_id]["deployment_status"] = "rolled_back"
            self.config["algorithms"][current_versioned_id]["rollback_date"] = datetime.now().isoformat()
            
            # Activate target version
            self.config["algorithms"][target_versioned_id]["is_active"] = True
            self.config["algorithms"][target_versioned_id]["deployment_status"] = "deployed"
            self.config["algorithms"][target_versioned_id]["rollback_activated_date"] = datetime.now().isoformat()
            self.config["algorithms"][target_versioned_id]["rollout_percentage"] = 100.0
            
            # Log rollback
            self.deployment_log.append({
                "action": "rollback",
                "algorithm": alg_id,
                "from_version": current_version,
                "to_version": target_version,
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            })
            
            self.save_configuration()
            self.logger.info(f"✅ Algorithm {alg_id} rolled back from v{current_version} to v{target_version}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to rollback algorithm: {e}")
            return False
    
    def setup_ab_test(self, test_name: str, algorithm_a: str, algorithm_b: str, 
                      traffic_split: Dict[str, float], duration_days: int = 7) -> bool:
        """
        Setup A/B testing between two algorithm versions
        
        Args:
            test_name: Name of the A/B test
            algorithm_a: First algorithm (control)
            algorithm_b: Second algorithm (treatment)
            traffic_split: Traffic split percentage {"a": 50.0, "b": 50.0}
            duration_days: Duration of test in days
        
        Returns:
            bool: Success status
        """
        try:
            # Validate algorithms exist
            if (algorithm_a not in self.config["algorithms"] or 
                algorithm_b not in self.config["algorithms"]):
                self.logger.error(f"❌ One or both algorithms not found")
                return False
            
            # Validate traffic split
            total_split = sum(traffic_split.values())
            if abs(total_split - 100.0) > 0.1:
                self.logger.error(f"❌ Traffic split must sum to 100%, got {total_split}%")
                return False
            
            # Create A/B test configuration
            ab_test_config = {
                "test_name": test_name,
                "algorithm_a": {
                    "id": algorithm_a,
                    "traffic_percentage": traffic_split.get("a", 50.0)
                },
                "algorithm_b": {
                    "id": algorithm_b,
                    "traffic_percentage": traffic_split.get("b", 50.0)
                },
                "start_date": datetime.now().isoformat(),
                "end_date": (datetime.now() + timedelta(days=duration_days)).isoformat(),
                "status": "active",
                "metrics": {
                    "algorithm_a": {"requests": 0, "success_rate": 0.0, "avg_score": 0.0},
                    "algorithm_b": {"requests": 0, "success_rate": 0.0, "avg_score": 0.0}
                },
                "created_date": datetime.now().isoformat()
            }
            
            # Add to configuration
            self.config["ab_tests"][test_name] = ab_test_config
            
            # Activate both algorithms for the test
            self.config["algorithms"][algorithm_a]["is_active"] = True
            self.config["algorithms"][algorithm_a]["ab_test"] = test_name
            self.config["algorithms"][algorithm_b]["is_active"] = True
            self.config["algorithms"][algorithm_b]["ab_test"] = test_name
            
            # Log A/B test setup
            self.deployment_log.append({
                "action": "ab_test_setup",
                "test_name": test_name,
                "algorithm_a": algorithm_a,
                "algorithm_b": algorithm_b,
                "traffic_split": traffic_split,
                "duration_days": duration_days,
                "timestamp": datetime.now().isoformat(),
                "status": "success"
            })
            
            self.save_configuration()
            self.logger.info(f"✅ A/B test '{test_name}' setup successfully")
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to setup A/B test: {e}")
            return False
    
    def get_version_history(self, alg_id: str) -> List[Dict[str, Any]]:
        """
        Get version history for an algorithm
        
        Args:
            alg_id: Base algorithm identifier
        
        Returns:
            List of version information sorted by date
        """
        versions = []
        
        for versioned_id, alg_data in self.config["algorithms"].items():
            if alg_data.get("base_id") == alg_id:
                versions.append({
                    "version": alg_data.get("version"),
                    "versioned_id": versioned_id,
                    "created_date": alg_data.get("created_date"),
                    "is_active": alg_data.get("is_active", False),
                    "deployment_status": alg_data.get("deployment_status", "registered"),
                    "performance_metrics": alg_data.get("performance_metrics", {})
                })
        
        # Sort by creation date (newest first)
        versions.sort(key=lambda x: x.get("created_date", ""), reverse=True)
        
        return versions
    
    def get_active_algorithms(self, trading_theme: Optional[str] = None) -> Dict[str, Dict[str, Any]]:
        """
        Get all currently active algorithms
        
        Args:
            trading_theme: Filter by trading theme (optional)
        
        Returns:
            Dictionary of active algorithms
        """
        active_algorithms = {}
        
        for versioned_id, alg_data in self.config["algorithms"].items():
            if (alg_data.get("is_active") and 
                alg_data.get("deployment_status") == "deployed"):
                
                if trading_theme is None or alg_data.get("trading_theme") == trading_theme:
                    active_algorithms[versioned_id] = alg_data
        
        return active_algorithms
    
    def get_deployment_log(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get recent deployment log entries
        
        Args:
            limit: Maximum number of entries to return
        
        Returns:
            List of deployment log entries
        """
        # Sort by timestamp (newest first)
        sorted_log = sorted(self.deployment_log, 
                           key=lambda x: x.get("timestamp", ""), 
                           reverse=True)
        
        return sorted_log[:limit]
    
    def validate_algorithm_health(self, alg_id: str) -> Dict[str, Any]:
        """
        Validate the health and performance of an algorithm
        
        Args:
            alg_id: Algorithm identifier
        
        Returns:
            Health status and metrics
        """
        if alg_id not in self.config["algorithms"]:
            return {"status": "not_found", "message": "Algorithm not found"}
        
        alg_data = self.config["algorithms"][alg_id]
        health_status = {
            "status": "healthy",
            "algorithm": alg_id,
            "version": alg_data.get("version"),
            "is_active": alg_data.get("is_active"),
            "deployment_status": alg_data.get("deployment_status"),
            "checks": []
        }
        
        # Check deployment status
        if not alg_data.get("is_active"):
            health_status["checks"].append({
                "check": "active_status",
                "status": "warning",
                "message": "Algorithm is not active"
            })
        
        # Check performance metrics
        metrics = alg_data.get("performance_metrics", {})
        if not metrics:
            health_status["checks"].append({
                "check": "performance_metrics",
                "status": "warning",
                "message": "No performance metrics available"
            })
        else:
            # Check key performance indicators
            accuracy = metrics.get("accuracy", 0)
            if accuracy < 50:
                health_status["checks"].append({
                    "check": "accuracy",
                    "status": "critical",
                    "message": f"Low accuracy: {accuracy}%"
                })
            
            sharpe_ratio = metrics.get("sharpe_ratio", 0)
            if sharpe_ratio < 1.0:
                health_status["checks"].append({
                    "check": "sharpe_ratio",
                    "status": "warning",
                    "message": f"Low Sharpe ratio: {sharpe_ratio}"
                })
        
        # Determine overall status
        critical_issues = [c for c in health_status["checks"] if c["status"] == "critical"]
        warning_issues = [c for c in health_status["checks"] if c["status"] == "warning"]
        
        if critical_issues:
            health_status["status"] = "critical"
        elif warning_issues:
            health_status["status"] = "warning"
        
        return health_status
    
    def cleanup_old_versions(self, alg_id: str, keep_versions: int = 3) -> int:
        """
        Clean up old algorithm versions, keeping only the most recent ones
        
        Args:
            alg_id: Base algorithm identifier
            keep_versions: Number of versions to keep
        
        Returns:
            Number of versions cleaned up
        """
        try:
            version_history = self.get_version_history(alg_id)
            
            if len(version_history) <= keep_versions:
                return 0  # Nothing to clean up
            
            # Identify versions to remove (keep the most recent ones and any active)
            versions_to_remove = []
            
            for i, version_info in enumerate(version_history):
                if (i >= keep_versions and 
                    not version_info["is_active"] and 
                    version_info["deployment_status"] not in ["deployed", "testing"]):
                    versions_to_remove.append(version_info["versioned_id"])
            
            # Remove old versions
            cleanup_count = 0
            for versioned_id in versions_to_remove:
                if versioned_id in self.config["algorithms"]:
                    del self.config["algorithms"][versioned_id]
                    cleanup_count += 1
                    self.logger.info(f"🧹 Cleaned up old version: {versioned_id}")
            
            if cleanup_count > 0:
                self.save_configuration()
                
                # Log cleanup
                self.deployment_log.append({
                    "action": "cleanup",
                    "algorithm": alg_id,
                    "versions_removed": cleanup_count,
                    "timestamp": datetime.now().isoformat(),
                    "status": "success"
                })
            
            return cleanup_count
            
        except Exception as e:
            self.logger.error(f"❌ Failed to cleanup old versions: {e}")
            return 0


def main():
    """Demo of the Version Manager"""
    print("🔧 Version Manager Demo")
    print("=" * 50)
    
    # Initialize version manager
    vm = VersionManager()
    
    # Demo: Register a new algorithm version
    print("\n📝 Registering new algorithm version...")
    success = vm.register_algorithm_version(
        alg_id="momentum_intraday",
        version="3.0",
        metadata={
            "name": "Enhanced Momentum Intraday V3",
            "description": "ML-enhanced momentum with sentiment analysis",
            "trading_theme": "intraday_buy",
            "algorithm_type": "seed_algorithm",
            "module_path": "recommendation_engine.seed_algorithms.intraday.momentum_v3",
            "class_name": "MomentumIntradayV3",
            "parameters": {
                "min_price_change": 1.5,
                "momentum_lookback": 7,
                "ml_confidence_threshold": 0.8
            },
            "performance_metrics": {
                "accuracy": 82.3,
                "return": 12.8,
                "sharpe_ratio": 1.95
            }
        }
    )
    print(f"✅ Registration: {'Success' if success else 'Failed'}")
    
    # Demo: Deploy the algorithm
    print("\n🚀 Deploying algorithm...")
    success = vm.deploy_algorithm_version("momentum_intraday", "3.0", rollout_percentage=75.0)
    print(f"✅ Deployment: {'Success' if success else 'Failed'}")
    
    # Demo: Setup A/B test
    print("\n🧪 Setting up A/B test...")
    success = vm.setup_ab_test(
        test_name="momentum_v2_vs_v3",
        algorithm_a="momentum_intraday_v2_0",
        algorithm_b="momentum_intraday_v3_0",
        traffic_split={"a": 40.0, "b": 60.0},
        duration_days=14
    )
    print(f"✅ A/B Test Setup: {'Success' if success else 'Failed'}")
    
    # Demo: Get version history
    print("\n📜 Version History:")
    history = vm.get_version_history("momentum_intraday")
    for version_info in history:
        status = "🟢" if version_info["is_active"] else "⚪"
        print(f"  {status} v{version_info['version']} - {version_info['deployment_status']}")
    
    # Demo: Get active algorithms
    print("\n🔴 Active Algorithms:")
    active = vm.get_active_algorithms("intraday_buy")
    for alg_id, alg_data in active.items():
        print(f"  • {alg_data['name']} (v{alg_data['version']})")
    
    print("\n✅ Version Manager demo completed!")


if __name__ == "__main__":
    main() 