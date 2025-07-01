"""
Configuration Manager for Trading Strategies
Manages loading and updating of seed algorithms and strategy parameters
"""

import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import asyncio
from dataclasses import dataclass
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

logger = logging.getLogger(__name__)

@dataclass
class SeedAlgorithm:
    """Represents a seed algorithm configuration"""
    name: str
    weight: float
    limit: int
    filters: Dict[str, Any]
    enabled: bool = True

@dataclass
class StrategyConfig:
    """Represents a complete strategy configuration"""
    name: str
    timeframe: str
    target_return: float
    stop_loss: float
    seed_algorithms: Dict[str, List[SeedAlgorithm]]
    analysis_criteria: Dict[str, Any]

class ConfigFileWatcher(FileSystemEventHandler):
    """Watches for changes in configuration files"""
    
    def __init__(self, config_manager):
        self.config_manager = config_manager
        
    def on_modified(self, event):
        if event.src_path.endswith('trading_strategies.json'):
            logger.info("🔄 Trading strategies config file changed, reloading...")
            asyncio.create_task(self.config_manager.reload_config())

class TradingConfigManager:
    """Manages trading strategy configurations with hot-reload capability"""
    
    def __init__(self, config_path: str = "config/trading_strategies.json"):
        self.config_path = Path(config_path)
        self.config: Dict[str, Any] = {}
        self.strategies: Dict[str, StrategyConfig] = {}
        self.last_loaded: Optional[datetime] = None
        self.observer: Optional[Observer] = None
        
    async def initialize(self):
        """Initialize the configuration manager"""
        try:
            await self.load_config()
            self.setup_file_watcher()
            logger.info(f"✅ Config Manager initialized with {len(self.strategies)} strategies")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Config Manager: {e}")
            # Load default fallback configuration
            await self.load_default_config()
    
    async def load_config(self):
        """Load configuration from JSON file"""
        try:
            if not self.config_path.exists():
                logger.warning(f"⚠️ Config file not found: {self.config_path}")
                await self.create_default_config()
                return
                
            with open(self.config_path, 'r') as file:
                self.config = json.load(file)
                
            # Parse strategies
            self.strategies = {}
            for strategy_name, strategy_data in self.config.get('strategies', {}).items():
                self.strategies[strategy_name] = self._parse_strategy_config(strategy_name, strategy_data)
                
            self.last_loaded = datetime.utcnow()
            logger.info(f"📋 Loaded config v{self.config.get('version', 'unknown')} with {len(self.strategies)} strategies")
            
        except Exception as e:
            logger.error(f"❌ Error loading config: {e}")
            raise
    
    async def reload_config(self):
        """Reload configuration from file"""
        try:
            await self.load_config()
            logger.info("🔄 Configuration reloaded successfully")
        except Exception as e:
            logger.error(f"❌ Error reloading config: {e}")
    
    def _parse_strategy_config(self, name: str, config_data: Dict[str, Any]) -> StrategyConfig:
        """Parse strategy configuration from dictionary"""
        seed_algorithms = {}
        
        # Parse Chartink themes
        chartink_themes = []
        for theme_data in config_data.get('seed_algorithms', {}).get('chartink_themes', []):
            chartink_themes.append(SeedAlgorithm(
                name=theme_data['name'],
                weight=theme_data['weight'],
                limit=theme_data['limit'],
                filters=theme_data.get('filters', {}),
                enabled=theme_data.get('enabled', True)
            ))
        seed_algorithms['chartink_themes'] = chartink_themes
        
        # Parse custom scanners
        custom_scanners = []
        for scanner_data in config_data.get('seed_algorithms', {}).get('custom_scanners', []):
            custom_scanners.append(SeedAlgorithm(
                name=scanner_data['name'],
                weight=scanner_data['weight'],
                limit=scanner_data.get('limit', 10),
                filters=scanner_data.get('parameters', {}),
                enabled=scanner_data.get('enabled', True)
            ))
        seed_algorithms['custom_scanners'] = custom_scanners
        
        return StrategyConfig(
            name=config_data['name'],
            timeframe=config_data['timeframe'],
            target_return=config_data['target_return'],
            stop_loss=config_data['stop_loss'],
            seed_algorithms=seed_algorithms,
            analysis_criteria=config_data.get('analysis_criteria', {})
        )
    
    def get_strategy_config(self, strategy_name: str) -> Optional[StrategyConfig]:
        """Get configuration for a specific strategy"""
        return self.strategies.get(strategy_name)
    
    def get_all_strategies(self) -> Dict[str, StrategyConfig]:
        """Get all strategy configurations"""
        return self.strategies
    
    def get_seed_algorithms(self, strategy_name: str, algorithm_type: str = 'chartink_themes') -> List[SeedAlgorithm]:
        """Get seed algorithms for a specific strategy and type"""
        strategy = self.strategies.get(strategy_name)
        if not strategy:
            return []
        
        algorithms = strategy.seed_algorithms.get(algorithm_type, [])
        # Return only enabled algorithms
        return [algo for algo in algorithms if algo.enabled]
    
    def get_analysis_criteria(self, strategy_name: str) -> Dict[str, Any]:
        """Get analysis criteria for a strategy"""
        strategy = self.strategies.get(strategy_name)
        return strategy.analysis_criteria if strategy else {}
    
    def get_global_settings(self) -> Dict[str, Any]:
        """Get global settings"""
        return self.config.get('global_settings', {})
    
    def get_experimental_features(self) -> Dict[str, Any]:
        """Get experimental features configuration"""
        return self.config.get('experimental_features', {})
    
    def update_strategy_weight(self, strategy_name: str, algorithm_name: str, new_weight: float):
        """Update weight of a specific algorithm (for experimentation)"""
        strategy = self.strategies.get(strategy_name)
        if not strategy:
            return False
            
        for algorithm_type in strategy.seed_algorithms:
            for algorithm in strategy.seed_algorithms[algorithm_type]:
                if algorithm.name == algorithm_name:
                    algorithm.weight = new_weight
                    logger.info(f"🔧 Updated {algorithm_name} weight to {new_weight} for {strategy_name}")
                    return True
        return False
    
    def toggle_algorithm(self, strategy_name: str, algorithm_name: str) -> bool:
        """Enable/disable a specific algorithm"""
        strategy = self.strategies.get(strategy_name)
        if not strategy:
            return False
            
        for algorithm_type in strategy.seed_algorithms:
            for algorithm in strategy.seed_algorithms[algorithm_type]:
                if algorithm.name == algorithm_name:
                    algorithm.enabled = not algorithm.enabled
                    status = "enabled" if algorithm.enabled else "disabled"
                    logger.info(f"🔧 {algorithm_name} {status} for {strategy_name}")
                    return True
        return False
    
    async def save_config(self):
        """Save current configuration back to file"""
        try:
            # Convert strategies back to dictionary format
            config_to_save = self.config.copy()
            strategies_dict = {}
            
            for name, strategy in self.strategies.items():
                strategy_dict = {
                    "name": strategy.name,
                    "timeframe": strategy.timeframe,
                    "target_return": strategy.target_return,
                    "stop_loss": strategy.stop_loss,
                    "seed_algorithms": {
                        "chartink_themes": [
                            {
                                "name": algo.name,
                                "weight": algo.weight,
                                "limit": algo.limit,
                                "filters": algo.filters,
                                "enabled": algo.enabled
                            } for algo in strategy.seed_algorithms.get('chartink_themes', [])
                        ],
                        "custom_scanners": [
                            {
                                "name": algo.name,
                                "weight": algo.weight,
                                "limit": algo.limit,
                                "parameters": algo.filters,
                                "enabled": algo.enabled
                            } for algo in strategy.seed_algorithms.get('custom_scanners', [])
                        ]
                    },
                    "analysis_criteria": strategy.analysis_criteria
                }
                strategies_dict[name] = strategy_dict
            
            config_to_save['strategies'] = strategies_dict
            config_to_save['last_updated'] = datetime.utcnow().isoformat() + 'Z'
            
            with open(self.config_path, 'w') as file:
                json.dump(config_to_save, file, indent=2)
                
            logger.info("💾 Configuration saved successfully")
            
        except Exception as e:
            logger.error(f"❌ Error saving config: {e}")
            raise
    
    def setup_file_watcher(self):
        """Setup file watcher for hot-reload"""
        try:
            if self.observer:
                self.observer.stop()
                
            self.observer = Observer()
            event_handler = ConfigFileWatcher(self)
            
            # Watch the directory containing the config file
            watch_dir = self.config_path.parent
            self.observer.schedule(event_handler, str(watch_dir), recursive=False)
            self.observer.start()
            
            logger.info(f"👁️ File watcher started for {watch_dir}")
            
        except Exception as e:
            logger.warning(f"⚠️ Could not setup file watcher: {e}")
    
    async def create_default_config(self):
        """Create default configuration file if it doesn't exist"""
        logger.info("📝 Creating default configuration file...")
        
        # Ensure config directory exists
        self.config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # The default config is already created by the previous edit_file call
        # Just trigger a reload
        await self.load_config()
    
    async def load_default_config(self):
        """Load minimal default configuration as fallback"""
        logger.warning("⚠️ Loading fallback configuration")
        
        self.config = {
            "strategies": {
                "swing_buy": {
                    "name": "Swing Trading Buy Strategy",
                    "timeframe": "3-10 days",
                    "target_return": 0.08,
                    "stop_loss": 0.05,
                    "seed_algorithms": {
                        "chartink_themes": [
                            {
                                "name": "breakout_stocks",
                                "weight": 0.5,
                                "limit": 20,
                                "filters": {},
                                "enabled": True
                            },
                            {
                                "name": "momentum_stocks", 
                                "weight": 0.5,
                                "limit": 20,
                                "filters": {},
                                "enabled": True
                            }
                        ],
                        "custom_scanners": []
                    },
                    "analysis_criteria": {
                        "min_rsi": 35,
                        "max_rsi": 65,
                        "confidence_threshold": 60.0
                    }
                }
            },
            "global_settings": {
                "max_candidates_per_strategy": 100,
                "batch_processing_size": 10
            }
        }
        
        # Parse the fallback config
        self.strategies = {}
        for strategy_name, strategy_data in self.config['strategies'].items():
            self.strategies[strategy_name] = self._parse_strategy_config(strategy_name, strategy_data)
    
    def get_config_summary(self) -> Dict[str, Any]:
        """Get a summary of current configuration"""
        return {
            "version": self.config.get('version', 'unknown'),
            "last_loaded": self.last_loaded.isoformat() if self.last_loaded else None,
            "total_strategies": len(self.strategies),
            "strategies": {
                name: {
                    "timeframe": strategy.timeframe,
                    "chartink_themes": len(strategy.seed_algorithms.get('chartink_themes', [])),
                    "custom_scanners": len(strategy.seed_algorithms.get('custom_scanners', [])),
                    "enabled_algorithms": sum(
                        len([algo for algo in algorithms if algo.enabled])
                        for algorithms in strategy.seed_algorithms.values()
                    )
                }
                for name, strategy in self.strategies.items()
            },
            "experimental_features_enabled": sum(
                1 for feature in self.get_experimental_features().values() 
                if isinstance(feature, dict) and feature.get('enabled', False)
            )
        }
    
    def cleanup(self):
        """Cleanup resources"""
        if self.observer:
            self.observer.stop()
            self.observer.join()
            logger.info("🛑 File watcher stopped")

# Global instance
config_manager = TradingConfigManager() 