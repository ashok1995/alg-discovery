#!/usr/bin/env python3
"""
Chartink Integration Module

Advanced integration with Chartink for fetching candidate stocks using various filters.
Supports multiple trading themes and seamlessly integrates with the recommendation engine
for multi-algorithm reranking.

Features:
- Theme-specific Chartink queries loaded from configuration
- Real-time stock data fetching
- Automatic retry mechanism
- Data caching for performance
- Integration with recommendation orchestrator
- Dynamic filter management
"""

import requests
from bs4 import BeautifulSoup as bs
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
import time
import json
from pathlib import Path
import os


class ChartinkFilterManager:
    """
    Manages Chartink filter configurations from external JSON file
    """
    
    def __init__(self, config_path: str = "recommendation_engine/config/chartink_filters.json"):
        """
        Initialize filter manager
        
        Args:
            config_path: Path to the filter configuration file
        """
        self.config_path = config_path
        self.logger = logging.getLogger(__name__)
        self.filters_config = {}
        self.load_filters()
    
    def load_filters(self):
        """Load filter configurations from JSON file"""
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r') as f:
                    self.filters_config = json.load(f)
                
                self.logger.info(f"✅ Loaded filter configurations from {self.config_path}")
                
                # Log available themes and filters
                themes = list(self.filters_config.get('trading_themes', {}).keys())
                total_filters = sum(len(theme_data.get('filters', {})) 
                                  for theme_data in self.filters_config.get('trading_themes', {}).values())
                
                self.logger.info(f"📊 Available themes: {themes}")
                self.logger.info(f"🔍 Total filters loaded: {total_filters}")
                
            else:
                self.logger.error(f"❌ Filter configuration file not found: {self.config_path}")
                self.filters_config = self._get_default_config()
                
        except Exception as e:
            self.logger.error(f"❌ Failed to load filter configurations: {e}")
            self.filters_config = self._get_default_config()
    
    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration if file loading fails"""
        return {
            "trading_themes": {},
            "default_filters": {
                "basic": {
                    "name": "Basic Filter",
                    "query": "( {cash} ( latest close > 50 ) )",
                    "is_active": True
                }
            }
        }
    
    def get_filters_for_theme(self, trading_theme: str) -> Dict[str, str]:
        """
        Get active filter queries for a specific trading theme
        
        Args:
            trading_theme: Trading theme name
            
        Returns:
            Dictionary mapping filter names to query strings
        """
        theme_config = self.filters_config.get('trading_themes', {}).get(trading_theme, {})
        filters = theme_config.get('filters', {})
        
        # Filter only active filters and sort by priority
        active_filters = {}
        filter_items = []
        
        for filter_id, filter_data in filters.items():
            if filter_data.get('is_active', True):
                priority = filter_data.get('priority', 999)
                filter_items.append((priority, filter_id, filter_data['query']))
        
        # Sort by priority (lower number = higher priority)
        filter_items.sort(key=lambda x: x[0])
        
        # Create ordered dictionary
        for _, filter_id, query in filter_items:
            active_filters[filter_id] = query
        
        # If no filters found, use default
        if not active_filters:
            default_filter = self.filters_config.get('default_filters', {}).get('basic', {})
            if default_filter.get('is_active', True):
                active_filters['basic'] = default_filter['query']
        
        return active_filters
    
    def get_filter_metadata(self, trading_theme: str, filter_id: str) -> Dict[str, Any]:
        """
        Get metadata for a specific filter
        
        Args:
            trading_theme: Trading theme name
            filter_id: Filter identifier
            
        Returns:
            Filter metadata including parameters and description
        """
        theme_config = self.filters_config.get('trading_themes', {}).get(trading_theme, {})
        filters = theme_config.get('filters', {})
        
        return filters.get(filter_id, {})
    
    def get_available_themes(self) -> List[str]:
        """Get list of available trading themes"""
        return list(self.filters_config.get('trading_themes', {}).keys())
    
    def validate_filter(self, filter_data: Dict[str, Any]) -> List[str]:
        """
        Validate a filter configuration
        
        Args:
            filter_data: Filter configuration to validate
            
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        validation_config = self.filters_config.get('filter_validation', {})
        
        # Check required fields
        required_fields = validation_config.get('required_fields', [])
        for field in required_fields:
            if field not in filter_data:
                errors.append(f"Missing required field: {field}")
        
        # Validate query
        query = filter_data.get('query', '')
        query_validation = validation_config.get('query_validation', {})
        
        must_contain = query_validation.get('must_contain', [])
        for keyword in must_contain:
            if keyword not in query:
                errors.append(f"Query must contain: {keyword}")
        
        return errors
    
    def add_custom_filter(self, trading_theme: str, filter_id: str, filter_config: Dict[str, Any]) -> bool:
        """
        Add a custom filter to the configuration
        
        Args:
            trading_theme: Trading theme name
            filter_id: Unique filter identifier
            filter_config: Filter configuration
            
        Returns:
            bool: Success status
        """
        try:
            # Validate filter
            errors = self.validate_filter(filter_config)
            if errors:
                self.logger.error(f"❌ Filter validation failed: {errors}")
                return False
            
            # Ensure theme exists
            if trading_theme not in self.filters_config.get('trading_themes', {}):
                self.filters_config.setdefault('trading_themes', {})[trading_theme] = {
                    'description': f'Custom theme: {trading_theme}',
                    'filters': {}
                }
            
            # Add filter
            theme_filters = self.filters_config['trading_themes'][trading_theme]['filters']
            theme_filters[filter_id] = filter_config
            
            # Save updated configuration
            self.save_filters()
            
            self.logger.info(f"✅ Added custom filter '{filter_id}' to theme '{trading_theme}'")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Failed to add custom filter: {e}")
            return False
    
    def save_filters(self):
        """Save current filter configuration to file"""
        try:
            # Update metadata
            self.filters_config.setdefault('filter_metadata', {})['last_updated'] = datetime.now().isoformat()
            
            # Ensure directory exists
            os.makedirs(os.path.dirname(self.config_path), exist_ok=True)
            
            with open(self.config_path, 'w') as f:
                json.dump(self.filters_config, f, indent=2)
            
            self.logger.info(f"✅ Filter configuration saved to {self.config_path}")
            
        except Exception as e:
            self.logger.error(f"❌ Failed to save filter configuration: {e}")


class ChartinkStockFetcher:
    """
    Advanced Chartink integration for fetching candidate stocks with filtering
    """
    
    def __init__(self, cache_duration_minutes: int = 5, 
                 filter_config_path: str = "recommendation_engine/config/chartink_filters.json"):
        """
        Initialize Chartink stock fetcher
        
        Args:
            cache_duration_minutes: How long to cache results (default: 5 minutes)
            filter_config_path: Path to filter configuration file
        """
        self.logger = logging.getLogger(__name__)
        self.session = requests.Session()
        self.cache = {}
        self.cache_duration = timedelta(minutes=cache_duration_minutes)
        
        # Initialize filter manager
        self.filter_manager = ChartinkFilterManager(filter_config_path)
        
        # Setup headers
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'X-Requested-With': 'XMLHttpRequest'
        })
        
        # Initialize CSRF token
        self._get_csrf_token()
    
    def _get_csrf_token(self):
        """Get CSRF token from Chartink"""
        try:
            response = self.session.get('https://chartink.com/screener/alg-test-1')
            soup = bs(response.content, 'html.parser')
            csrf_token = soup.select_one('[name=csrf-token]')
            
            if csrf_token:
                self.session.headers['X-CSRF-TOKEN'] = csrf_token['content']
                self.logger.info("✅ CSRF token obtained successfully")
            else:
                self.logger.warning("⚠️ CSRF token not found")
                
        except Exception as e:
            self.logger.error(f"❌ Error getting CSRF token: {e}")
    
    def get_stocks_by_filter(self, 
                           filter_query: str, 
                           trading_theme: str = 'intraday_buy',
                           use_cache: bool = True) -> pd.DataFrame:
        """
        Fetch stocks using Chartink filter query
        
        Args:
            filter_query: Chartink filter query string
            trading_theme: Trading theme for context
            use_cache: Whether to use cached results
            
        Returns:
            DataFrame with stock data
        """
        # Check cache first
        cache_key = f"{filter_query}_{trading_theme}"
        if use_cache and self._is_cache_valid(cache_key):
            self.logger.info(f"📋 Using cached results for {trading_theme}")
            return self.cache[cache_key]['data']
        
        try:
            self.logger.info(f"🔍 Fetching stocks for theme: {trading_theme}")
            self.logger.info(f"📊 Filter query: {filter_query}")
            
            # Prepare data for API call
            data = {'scan_clause': filter_query}
            
            # Make API call with retry mechanism
            df = self._make_api_call_with_retry(data)
            
            if not df.empty:
                # Enhance data with additional fields
                df = self._enhance_stock_data(df, trading_theme)
                
                # Cache results
                if use_cache:
                    self.cache[cache_key] = {
                        'data': df,
                        'timestamp': datetime.now(),
                        'trading_theme': trading_theme
                    }
                
                self.logger.info(f"✅ Retrieved {len(df)} stocks for {trading_theme}")
            else:
                self.logger.warning(f"⚠️ No stocks found for filter: {filter_query}")
            
            return df
            
        except Exception as e:
            self.logger.error(f"❌ Error fetching stocks: {e}")
            return pd.DataFrame()
    
    def _make_api_call_with_retry(self, data: Dict, max_retries: int = 3) -> pd.DataFrame:
        """Make API call with retry mechanism"""
        for attempt in range(max_retries):
            try:
                response = self.session.post(
                    'https://chartink.com/screener/process', 
                    data=data,
                    timeout=30
                )
                
                if response.status_code == 200:
                    json_data = response.json()
                    
                    if 'data' in json_data and json_data['data']:
                        df = pd.DataFrame(json_data['data'])
                        return df.sort_values(by=['per_chg'], ascending=False)
                    else:
                        self.logger.warning("📭 Empty response from Chartink")
                        return pd.DataFrame()
                else:
                    self.logger.warning(f"⚠️ HTTP {response.status_code} from Chartink")
                    
            except requests.exceptions.RequestException as e:
                self.logger.warning(f"🔄 Attempt {attempt + 1} failed: {e}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                    self._get_csrf_token()  # Refresh token
                
        self.logger.error("❌ All retry attempts failed")
        return pd.DataFrame()
    
    def _enhance_stock_data(self, df: pd.DataFrame, trading_theme: str) -> pd.DataFrame:
        """Enhance stock data with additional calculated fields"""
        try:
            # Add trading theme
            df['trading_theme'] = trading_theme
            df['fetch_timestamp'] = datetime.now()
            
            # Calculate additional metrics
            if 'close' in df.columns and 'volume' in df.columns:
                # Volume rank (percentile within the dataset)
                df['volume_rank'] = df['volume'].rank(pct=True)
                
                # Price change rank
                if 'per_chg' in df.columns:
                    df['price_change_rank'] = df['per_chg'].rank(pct=True)
                
                # Market cap estimation (if not available)
                if 'market_cap' not in df.columns and 'close' in df.columns:
                    # Rough estimation - needs shares outstanding data for accuracy
                    df['market_cap_estimated'] = df['close'] * df.get('volume', 1000000)
                
                # Volatility indicator (range/close)
                if all(col in df.columns for col in ['high', 'low', 'close']):
                    df['daily_volatility'] = ((df['high'] - df['low']) / df['close'] * 100).round(2)
                
                # Position in daily range
                if all(col in df.columns for col in ['high', 'low', 'close']):
                    df['range_position'] = ((df['close'] - df['low']) / (df['high'] - df['low'])).fillna(0.5)
            
            # Add symbol standardization
            if 'nsecode' in df.columns:
                df['symbol'] = df['nsecode']
            elif 'name' in df.columns:
                df['symbol'] = df['name']
            
            self.logger.info(f"📈 Enhanced {len(df)} stocks with additional metrics")
            return df
            
        except Exception as e:
            self.logger.error(f"❌ Error enhancing stock data: {e}")
            return df
    
    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached data is still valid"""
        if cache_key not in self.cache:
            return False
        
        cache_time = self.cache[cache_key]['timestamp']
        return datetime.now() - cache_time < self.cache_duration
    
    def get_candidates_for_theme(self, trading_theme: str, limit: int = 100) -> pd.DataFrame:
        """
        Get candidate stocks for a specific trading theme using predefined filters
        
        Args:
            trading_theme: Trading theme (intraday_buy, swing_buy, etc.)
            limit: Maximum number of candidates to return
            
        Returns:
            DataFrame with candidate stocks
        """
        filter_queries = self._get_filter_queries_for_theme(trading_theme)
        all_candidates = pd.DataFrame()
        
        for filter_name, filter_query in filter_queries.items():
            self.logger.info(f"🎯 Applying filter: {filter_name}")
            
            candidates = self.get_stocks_by_filter(filter_query, trading_theme)
            
            if not candidates.empty:
                candidates['filter_source'] = filter_name
                all_candidates = pd.concat([all_candidates, candidates], ignore_index=True)
        
        if not all_candidates.empty:
            # Remove duplicates, keeping the first occurrence
            all_candidates = all_candidates.drop_duplicates(subset=['symbol'], keep='first')
            
            # Sort by percentage change and limit
            all_candidates = all_candidates.sort_values('per_chg', ascending=False).head(limit)
            
            self.logger.info(f"✅ Found {len(all_candidates)} unique candidates for {trading_theme}")
        
        return all_candidates
    
    def _get_filter_queries_for_theme(self, trading_theme: str) -> Dict[str, str]:
        """
        Get predefined filter queries for different trading themes from configuration
        
        Args:
            trading_theme: Trading theme
            
        Returns:
            Dictionary mapping filter names to queries
        """
        return self.filter_manager.get_filters_for_theme(trading_theme)
    
    def get_filter_metadata(self, trading_theme: str, filter_id: str) -> Dict[str, Any]:
        """
        Get metadata for a specific filter
        
        Args:
            trading_theme: Trading theme name
            filter_id: Filter identifier
            
        Returns:
            Filter metadata
        """
        return self.filter_manager.get_filter_metadata(trading_theme, filter_id)
    
    def get_available_themes(self) -> List[str]:
        """Get list of available trading themes"""
        return self.filter_manager.get_available_themes()
    
    def add_custom_filter(self, trading_theme: str, filter_id: str, 
                         name: str, description: str, query: str, 
                         parameters: Dict[str, Any] = None, 
                         priority: int = 999) -> bool:
        """
        Add a custom filter for a trading theme
        
        Args:
            trading_theme: Trading theme name
            filter_id: Unique filter identifier
            name: Human-readable filter name
            description: Filter description
            query: Chartink query string
            parameters: Filter parameters
            priority: Filter priority (lower = higher priority)
            
        Returns:
            bool: Success status
        """
        filter_config = {
            'name': name,
            'description': description,
            'query': query,
            'parameters': parameters or {},
            'is_active': True,
            'priority': priority
        }
        
        return self.filter_manager.add_custom_filter(trading_theme, filter_id, filter_config)
    
    def reload_filters(self):
        """Reload filter configurations from file"""
        self.filter_manager.load_filters()
        self.logger.info("🔄 Filter configurations reloaded")
    
    def clear_cache(self):
        """Clear all cached data"""
        self.cache.clear()
        self.logger.info("🗑️ Cache cleared")
    
    def get_cache_info(self) -> Dict[str, Any]:
        """Get information about cached data"""
        cache_info = {}
        
        for key, value in self.cache.items():
            cache_info[key] = {
                'timestamp': value['timestamp'].isoformat(),
                'trading_theme': value['trading_theme'],
                'stocks_count': len(value['data']),
                'age_minutes': (datetime.now() - value['timestamp']).total_seconds() / 60
            }
        
        return cache_info


class ChartinkRecommendationEngine:
    """
    Integration layer between Chartink stock fetcher and recommendation engine
    """
    
    def __init__(self, chartink_fetcher: ChartinkStockFetcher = None):
        """
        Initialize Chartink recommendation engine
        
        Args:
            chartink_fetcher: ChartinkStockFetcher instance
        """
        self.logger = logging.getLogger(__name__)
        self.chartink_fetcher = chartink_fetcher or ChartinkStockFetcher()
        
        # Import recommendation orchestrator
        try:
            from ..recommendation_orchestrator import RecommendationOrchestrator
            self.orchestrator = RecommendationOrchestrator()
            self.logger.info("✅ Recommendation orchestrator initialized")
        except ImportError as e:
            self.logger.error(f"❌ Failed to import recommendation orchestrator: {e}")
            self.orchestrator = None
    
    def get_ranked_recommendations(self, 
                                 trading_theme: str = 'intraday_buy',
                                 candidate_limit: int = 100,
                                 final_limit: int = 20) -> Dict[str, Any]:
        """
        Get ranked recommendations using Chartink candidates and multiple seed algorithms
        
        Args:
            trading_theme: Trading theme for stock selection
            candidate_limit: Maximum candidates to fetch from Chartink
            final_limit: Final number of recommendations to return
            
        Returns:
            Dictionary with ranked recommendations and metadata
        """
        self.logger.info(f"🎯 Getting ranked recommendations for {trading_theme}")
        
        try:
            # Step 1: Fetch candidates from Chartink
            candidates_df = self.chartink_fetcher.get_candidates_for_theme(
                trading_theme=trading_theme,
                limit=candidate_limit
            )
            
            if candidates_df.empty:
                self.logger.warning("⚠️ No candidates found from Chartink")
                return {
                    'recommendations': [],
                    'metadata': {
                        'error': 'No candidates found',
                        'trading_theme': trading_theme
                    }
                }
            
            # Step 2: Extract symbols for recommendation engine
            symbols = candidates_df['symbol'].tolist()
            
            # Step 3: Get recommendations using multiple seed algorithms
            if self.orchestrator:
                recommendations = self.orchestrator.get_recommendations_with_chartink_data(
                    stock_data_df=candidates_df,
                    trading_theme=trading_theme,
                    limit=final_limit
                )
                
                # Step 4: Enhance recommendations with Chartink data
                enhanced_recommendations = self._enhance_recommendations_with_chartink_data(
                    recommendations, candidates_df
                )
                
                return enhanced_recommendations
            else:
                # Fallback: simple ranking by percentage change
                return self._fallback_ranking(candidates_df, final_limit, trading_theme)
                
        except Exception as e:
            self.logger.error(f"❌ Error getting ranked recommendations: {e}")
            return {
                'recommendations': [],
                'metadata': {
                    'error': str(e),
                    'trading_theme': trading_theme
                }
            }
    
    def _enhance_recommendations_with_chartink_data(self, 
                                                  recommendations: Dict[str, Any], 
                                                  candidates_df: pd.DataFrame) -> Dict[str, Any]:
        """Enhance recommendations with Chartink data"""
        try:
            # Create lookup dictionary for Chartink data
            chartink_data = candidates_df.set_index('symbol').to_dict('index')
            
            # Enhance each recommendation
            for rec in recommendations['recommendations']:
                symbol = rec['symbol']
                
                if symbol in chartink_data:
                    chartink_info = chartink_data[symbol]
                    
                    # Add Chartink-specific data
                    rec['chartink_data'] = {
                        'price': chartink_info.get('close', 0),
                        'volume': chartink_info.get('volume', 0),
                        'price_change_pct': chartink_info.get('per_chg', 0),
                        'high': chartink_info.get('high', 0),
                        'low': chartink_info.get('low', 0),
                        'filter_source': chartink_info.get('filter_source', 'unknown'),
                        'volume_rank': chartink_info.get('volume_rank', 0),
                        'daily_volatility': chartink_info.get('daily_volatility', 0),
                        'range_position': chartink_info.get('range_position', 0.5)
                    }
                    
                    # Calculate combined score
                    rec['combined_score'] = self._calculate_combined_score(rec, chartink_info)
            
            # Add metadata about Chartink integration
            recommendations['metadata']['chartink_integration'] = {
                'candidates_fetched': len(candidates_df),
                'filters_used': candidates_df['filter_source'].unique().tolist() if 'filter_source' in candidates_df.columns else [],
                'fetch_timestamp': datetime.now().isoformat()
            }
            
            return recommendations
            
        except Exception as e:
            self.logger.error(f"❌ Error enhancing recommendations: {e}")
            return recommendations
    
    def _calculate_combined_score(self, recommendation: Dict, chartink_data: Dict) -> float:
        """Calculate combined score from recommendation engine and Chartink data"""
        try:
            # Get algorithm score
            algo_score = recommendation.get('score', 0)
            
            # Get Chartink indicators
            price_change = chartink_data.get('per_chg', 0)
            volume_rank = chartink_data.get('volume_rank', 0.5)
            range_position = chartink_data.get('range_position', 0.5)
            
            # Combine scores with weights
            combined_score = (
                algo_score * 0.6 +  # 60% algorithm score
                min(price_change * 5, 25) * 0.2 +  # 20% price momentum (capped at 25)
                volume_rank * 100 * 0.1 +  # 10% volume rank
                range_position * 100 * 0.1  # 10% range position
            )
            
            return round(min(100, max(0, combined_score)), 2)
            
        except Exception as e:
            self.logger.error(f"❌ Error calculating combined score: {e}")
            return recommendation.get('score', 0)
    
    def _fallback_ranking(self, candidates_df: pd.DataFrame, limit: int, trading_theme: str) -> Dict[str, Any]:
        """Fallback ranking when recommendation orchestrator is not available"""
        try:
            # Sort by percentage change
            top_candidates = candidates_df.head(limit)
            
            recommendations = []
            for _, row in top_candidates.iterrows():
                recommendations.append({
                    'symbol': row['symbol'],
                    'score': min(100, max(0, row.get('per_chg', 0) * 10 + 50)),  # Simple scoring
                    'confidence': 0.5,  # Default confidence
                    'recommendation': 'BUY' if row.get('per_chg', 0) > 1 else 'WEAK_BUY',
                    'chartink_data': {
                        'price': row.get('close', 0),
                        'volume': row.get('volume', 0),
                        'price_change_pct': row.get('per_chg', 0),
                        'filter_source': row.get('filter_source', 'basic')
                    }
                })
            
            return {
                'recommendations': recommendations,
                'metadata': {
                    'trading_theme': trading_theme,
                    'method': 'fallback_ranking',
                    'chartink_integration': {
                        'candidates_fetched': len(candidates_df),
                        'fetch_timestamp': datetime.now().isoformat()
                    }
                }
            }
            
        except Exception as e:
            self.logger.error(f"❌ Error in fallback ranking: {e}")
            return {'recommendations': [], 'metadata': {'error': str(e)}} 