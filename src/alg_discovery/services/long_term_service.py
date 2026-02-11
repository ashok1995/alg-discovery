"""
Long-term Investment Service
===========================

Advanced long-term investment analysis service focused on BSE/NSE Indian stocks.
Integrates versioned seed algorithms with comprehensive re-ranking and fundamental analysis.
"""

import os
import json
import asyncio
import logging
import time
import random
import pandas as pd
import yfinance as yf
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta

from .data_service import RealTimeDataService
from .seed_algorithm_manager import SeedAlgorithmManager
from .fundamental_reranker import FundamentalReranker
from .chartink_service import ChartinkService

logger = logging.getLogger(__name__)

class LongTermInvestmentService:
    """
    Service for long-term investment analysis and recommendations.
    Focuses on BSE/NSE Indian stocks with dedicated configuration and versioned algorithms.
    """
    
    def __init__(self, data_service: RealTimeDataService):
        """Initialize the Long Term Investment Service with dedicated config"""
        # Configure logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        self.data_service = data_service
        
        # Load dedicated long-term configuration
        self.config = self._load_long_term_config()
        
        # Initialize Chartink integration with config-based queries
        try:
            self.chartink_service = ChartinkService()
            self.chartink_service.LONG_TERM_QUERIES = self.config['chartink_queries']
            self.logger.info("✅ Real Chartink service initialized with dedicated config")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Chartink integration: {e}")
            self.chartink_service = None
        
        # Initialize Seed Algorithm Manager with version control (fallback)
        try:
            self.seed_algorithm_manager = SeedAlgorithmManager()
            self.logger.info("✅ Seed Algorithm Manager initialized as fallback")
        except Exception as e:
            self.logger.error(f"❌ Failed to initialize Seed Algorithm Manager: {e}")
            self.seed_algorithm_manager = None
        
        # Indian stock watchlist (BSE/NSE)
        self.default_watchlist = [
            # Large Cap Stocks (NSE/BSE)
            "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
            "HINDUNILVR.NS", "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS",
            "LT.NS", "ASIANPAINT.NS", "HCLTECH.NS", "MARUTI.NS", "AXISBANK.NS",
            "BAJFINANCE.NS", "WIPRO.NS", "ULTRACEMCO.NS", "NESTLEIND.NS", "POWERGRID.NS",
            "TECHM.NS", "SUNPHARMA.NS", "TITAN.NS", "INDUSINDBK.NS", "JSWSTEEL.NS",
            "M&M.NS", "TATAMOTORS.NS", "BAJAJFINSV.NS", "ADANIPORTS.NS", "COALINDIA.NS",
            "ONGC.NS", "GRASIM.NS", "HEROMOTOCO.NS", "BRITANNIA.NS", "DRREDDY.NS",
            "CIPLA.NS", "BPCL.NS", "EICHERMOT.NS", "SHREECEM.NS", "DIVISLAB.NS"
        ]
        
        # Indian sector ETFs and indices
        self.sector_etfs = {
            "Technology": "NIFTYBEES.NS",
            "Banking": "BANKBEES.NS", 
            "Pharma": "PHARMABEES.NS",
            "Auto": "AUTOBEES.NS",
            "FMCG": "FMCGBEES.NS",
            "Energy": "ENERGYBEES.NS",
            "Infrastructure": "INFRABEES.NS",
            "IT": "ITBEES.NS",
            "Metals": "METALBEES.NS",
            "PSU": "PSUBEES.NS",
            "Realty": "REALTYBEES.NS"
        }
        
        # Indian market indices
        self.market_indices = [
            "^NSEI",  # Nifty 50
            "^BSESN", # Sensex
            "^NSEBANK", # Bank Nifty
            "^NSEIT",   # Nifty IT
            "^NSEAUTO"  # Nifty Auto
        ]
        
        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 0.5  # 500ms between requests
        
        # Re-ranking factors (now primary focus since seed algorithms are managed separately)
        self.reranking_factors = {
            "sector_rotation": 0.25,
            "market_sentiment": 0.30,
            "liquidity": 0.20,
            "volatility": 0.15,
            "peer_comparison": 0.10
        }

        self.fundamental_reranker = FundamentalReranker()
        self.logger.info("✅ Long-term Investment Service initialized with fundamental re-ranker")

    def _load_long_term_config(self) -> Dict[str, Any]:
        """Load the dedicated long-term investment configuration"""
        try:
            config_path = os.path.join(os.path.dirname(__file__), '..', 'config', 'long_term_config.json')
            with open(config_path, 'r') as f:
                config = json.load(f)
            
            self.logger.info(f"✅ Loaded long-term config: {config['metadata']['strategy_type']} v{config['metadata']['file_version']}")
            self.logger.info(f"📊 Algorithm: {config['current_algorithm']['name']} v{config['current_algorithm']['version']}")
            self.logger.info(f"🎯 Target Return: {config['metadata']['target_return']*100:.1f}%, Stop Loss: {config['metadata']['stop_loss']*100:.1f}%")
            
            return config
        except Exception as e:
            self.logger.error(f"❌ Failed to load long-term config: {e}")
            # Return default config structure
            return {
                'metadata': {
                    'strategy_type': 'long_term',
                    'target_return': 0.25,
                    'stop_loss': 0.12
                },
                'chartink_queries': {},
                'scoring_criteria': {
                    'fundamental_weight': 0.6,
                    'technical_weight': 0.3,
                    'quality_weight': 0.1,
                    'min_score_threshold': 60.0
                },
                'risk_management': {
                    'position_sizing': {
                        'max_position_size': 0.05,
                        'min_position_size': 0.01
                    }
                }
            }

    def get_config_info(self) -> Dict[str, Any]:
        """Get current configuration information"""
        return {
            'strategy_type': self.config['metadata']['strategy_type'],
            'algorithm_name': self.config['current_algorithm']['name'],
            'algorithm_version': self.config['current_algorithm']['version'],
            'target_return': self.config['metadata']['target_return'],
            'stop_loss': self.config['metadata']['stop_loss'],
            'timeframe': self.config['metadata']['timeframe'],
            'active_queries': list(self.config['chartink_queries'].keys()),
            'scoring_criteria': self.config['scoring_criteria'],
            'risk_management': self.config['risk_management']
        }

    async def _rate_limit(self):
        """Implement rate limiting to avoid 429 errors."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        if time_since_last < self.min_request_interval:
            await asyncio.sleep(self.min_request_interval - time_since_last)
        self.last_request_time = time.time()

    def _convert_to_indian_symbol(self, symbol: str) -> str:
        """Convert symbol to NSE format if needed."""
        if not symbol.endswith('.NS') and not symbol.endswith('.BO'):
            # Default to NSE format
            return f"{symbol}.NS"
        return symbol

    async def get_stock_fundamental_data(self, symbol: str) -> Optional[Dict]:
        """Get fundamental data for Indian stocks with error handling and retries."""
        try:
            await self._rate_limit()
            
            # Ensure proper Indian stock format
            indian_symbol = self._convert_to_indian_symbol(symbol)
            
            # Use yfinance with error handling
            ticker = yf.Ticker(indian_symbol)
            info = ticker.info
            
            if not info or len(info) < 5:  # Basic validation
                self.logger.warning(f"Insufficient fundamental data for {indian_symbol}")
                return None
                
            return info
        except Exception as e:
            self.logger.error(f"Error fetching fundamental data for {symbol}: {e}")
            return None

    async def get_historical_data(self, symbol: str, period: str = "2y") -> Optional[pd.DataFrame]:
        """Get historical price data for Indian stocks."""
        try:
            await self._rate_limit()
            
            indian_symbol = self._convert_to_indian_symbol(symbol)
            ticker = yf.Ticker(indian_symbol)
            
            # Try different periods if the requested one fails
            periods_to_try = [period, "1y", "6mo", "3mo"]
            
            for p in periods_to_try:
                try:
                    hist = ticker.history(period=p)
                    if not hist.empty and len(hist) > 30:  # Minimum 30 days of data
                        return hist
                    await asyncio.sleep(0.1)  # Brief pause between attempts
                except Exception as e:
                    self.logger.debug(f"Failed to get {p} data for {indian_symbol}: {e}")
                    continue
            
            self.logger.warning(f"No historical data available for {indian_symbol}")
            return None
            
        except Exception as e:
            self.logger.error(f"Error fetching historical data for {symbol}: {e}")
            return None

    async def _calculate_reranking_score(self, symbol: str, base_score: float) -> float:
        """Apply re-ranking factors to adjust the base score."""
        try:
            reranking_adjustment = 0.0
            
            # Sector rotation factor
            sector = self._get_stock_sector(symbol)
            if sector in ["Technology", "Banking", "Pharma"]:  # Currently favored sectors
                reranking_adjustment += 5 * self.reranking_factors["sector_rotation"]
            
            # Market sentiment (based on Nifty performance)
            nifty_data = await self.get_historical_data("^NSEI", "1mo")
            if nifty_data is not None and not nifty_data.empty:
                nifty_return = (nifty_data['Close'].iloc[-1] / nifty_data['Close'].iloc[0] - 1) * 100
                if nifty_return > 5:
                    reranking_adjustment += 10 * self.reranking_factors["market_sentiment"]
                elif nifty_return > 0:
                    reranking_adjustment += 5 * self.reranking_factors["market_sentiment"]
                else:
                    reranking_adjustment -= 5 * self.reranking_factors["market_sentiment"]
            
            # Liquidity factor (volume-based)
            hist_data = await self.get_historical_data(symbol, "1mo")
            if hist_data is not None and not hist_data.empty:
                avg_volume = hist_data['Volume'].mean()
                if avg_volume > 1000000:  # High liquidity
                    reranking_adjustment += 3 * self.reranking_factors["liquidity"]
                elif avg_volume > 100000:  # Medium liquidity
                    reranking_adjustment += 1 * self.reranking_factors["liquidity"]
            
            # Apply adjustment
            final_score = base_score + reranking_adjustment
            return min(max(final_score, 0), 100)  # Ensure score is between 0-100
            
        except Exception as e:
            self.logger.error(f"Error in re-ranking for {symbol}: {e}")
            return base_score

    def _get_stock_sector(self, symbol: str) -> str:
        """Get the sector of a stock."""
        try:
            # Use a synchronous approach for sector mapping
            sector_mapping = {
                "RELIANCE": "Energy", "TCS": "Technology", "HDFCBANK": "Banking",
                "INFY": "Technology", "ICICIBANK": "Banking", "HINDUNILVR": "FMCG",
                "ITC": "FMCG", "SBIN": "Banking", "BHARTIARTL": "Telecom",
                "KOTAKBANK": "Banking", "LT": "Infrastructure", "ASIANPAINT": "Chemicals",
                "HCLTECH": "Technology", "MARUTI": "Auto", "AXISBANK": "Banking"
            }
            
            base_symbol = symbol.replace('.NS', '').replace('.BO', '')
            return sector_mapping.get(base_symbol, 'Unknown')
        except:
            return 'Unknown'

    async def _get_chartink_filtered_stocks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Use config-based sub-algorithm queries for stock filtering with proper resolution
        
        Args:
            limit: Maximum number of stocks to fetch
            
        Returns:
            List of stocks that passed long-term investment filters
        """
        filtered_stocks = []
        
        # Primary approach: Use sub-algorithm variant resolution from config
        if self.chartink_service and self.config.get('sub_algorithm_variants'):
            try:
                self.logger.info("🔍 Using config-based sub-algorithm variant resolution...")
                self.logger.info(f"📊 CONFIG VERSION: {self.config['metadata']['file_version']}")
                
                # Get current algorithm and its sub-algorithm configuration
                current_version = self.config.get('current_version', 'v2.1.0')
                current_algorithm = self.config['algorithms'].get(current_version)
                
                if not current_algorithm:
                    self.logger.warning(f"❌ Current algorithm version {current_version} not found")
                    return []
                
                self.logger.info(f"📊 ALGORITHM: {current_algorithm['name']} ({current_version})")
                self.logger.info(f"📊 STATUS: {current_algorithm['status']}")
                
                # Get sub-algorithm configuration
                sub_algo_config = current_algorithm.get('sub_algorithm_config', {})
                self.logger.info(f"📊 Sub-algorithm config: {sub_algo_config}")
                
                # Resolve queries from sub-algorithm variants
                resolved_queries = {}
                for algo_type, version in sub_algo_config.items():
                    if algo_type in self.config['sub_algorithm_variants']:
                        variant_data = self.config['sub_algorithm_variants'][algo_type].get(version)
                        if variant_data:
                            query_name = f"{algo_type}_{version}"
                            resolved_queries[query_name] = {
                                'query': variant_data['query'],
                                'description': variant_data['description'],
                                'weight': variant_data['weight'],
                                'expected_results': variant_data['expected_results'],
                                'algo_type': algo_type,
                                'version': version
                            }
                            self.logger.info(f"✅ Resolved {algo_type} {version}: {variant_data['name']}")
                        else:
                            self.logger.warning(f"⚠️ Sub-algorithm variant {algo_type}.{version} not found")
                
                self.logger.info(f"📊 Total resolved queries: {len(resolved_queries)}")
                
                # Execute resolved sub-algorithm queries
                all_stocks = []
                for i, (query_name, query_config) in enumerate(resolved_queries.items()):
                    try:
                        self.logger.info(f"📊 Running sub-algorithm query {i+1}/{len(resolved_queries)}: {query_name}")
                        self.logger.info(f"📊 Description: {query_config['description']}")
                        self.logger.info(f"📊 Weight: {query_config['weight']}, Expected: {query_config.get('expected_results', 30)}")
                        self.logger.info(f"📊 FULL SUB-ALGORITHM QUERY: {query_config['query']}")
                        
                        stocks = await self.chartink_service.get_stocks_by_query(
                            query_config['query'], 
                            limit=query_config.get('expected_results', 30)
                        )
                        
                        if stocks:
                            # Add metadata to each stock
                            for stock in stocks:
                                stock.update({
                                    'chartink_theme': query_name,
                                    'query_description': query_config['description'],
                                    'query_weight': query_config['weight'],
                                    'source': 'sub_algorithm_variant',
                                    'algo_type': query_config['algo_type'],
                                    'algo_version': query_config['version'],
                                    'config_version': self.config['metadata']['file_version'],
                                    'algorithm_version': current_version
                                })
                            all_stocks.extend(stocks)
                            self.logger.info(f"✅ {query_name} returned {len(stocks)} stocks")
                        else:
                            self.logger.warning(f"⚠️ {query_name} returned no stocks")
                            self.logger.warning(f"⚠️ FAILED SUB-ALGORITHM QUERY: {query_config['query']}")
                    
                    except Exception as e:
                        self.logger.error(f"❌ Error running {query_name}: {e}")
                        self.logger.error(f"❌ FAILED SUB-ALGORITHM QUERY: {query_config['query']}")
                        continue
                
                if all_stocks:
                    # Remove duplicates and prioritize by score
                    unique_stocks = {}
                    for stock in all_stocks:
                        symbol = stock.get('symbol', '')
                        if symbol:
                            if symbol not in unique_stocks or stock.get('chartink_score', 0) > unique_stocks[symbol].get('chartink_score', 0):
                                unique_stocks[symbol] = stock
                    
                    filtered_stocks = list(unique_stocks.values())[:limit]
                    self.logger.info(f"✅ Sub-algorithm variant filtering completed: {len(filtered_stocks)} unique stocks selected")
                    
                    return filtered_stocks
                else:
                    self.logger.warning("⚠️ No stocks returned from sub-algorithm queries, trying fallback chartink queries")
            
            except Exception as e:
                self.logger.error(f"❌ Sub-algorithm variant filtering failed: {e}")
        
        # Fallback 1: Try legacy chartink_queries from config 
        if self.chartink_service and self.config.get('chartink_queries') and not filtered_stocks:
            try:
                self.logger.info("🔄 Using fallback legacy chartink_queries...")
                self.logger.info(f"📊 Available chartink queries: {list(self.config['chartink_queries'].keys())}")
                
                # Get stocks from each query in the config
                all_stocks = []
                for i, (query_name, query_config) in enumerate(self.config['chartink_queries'].items()):
                    try:
                        self.logger.info(f"📊 Running fallback query {i+1}/{len(self.config['chartink_queries'])}: {query_name}")
                        self.logger.info(f"📊 Description: {query_config['description']}")
                        self.logger.info(f"📊 Weight: {query_config['weight']}, Expected: {query_config.get('expected_results', 30)}")
                        self.logger.info(f"📊 FULL FALLBACK QUERY: {query_config['query']}")
                        
                        stocks = await self.chartink_service.get_stocks_by_query(
                            query_config['query'], 
                            limit=query_config.get('expected_results', 30)
                        )
                        
                        if stocks:
                            # Add metadata to each stock
                            for stock in stocks:
                                stock.update({
                                    'chartink_theme': query_name,
                                    'query_description': query_config['description'],
                                    'query_weight': query_config['weight'],
                                    'source': 'legacy_chartink_query',
                                    'config_version': self.config['metadata']['file_version'],
                                    'algorithm_version': self.config.get('current_version', 'unknown')
                                })
                            all_stocks.extend(stocks)
                            self.logger.info(f"✅ {query_name} returned {len(stocks)} stocks")
                        else:
                            self.logger.warning(f"⚠️ {query_name} returned no stocks")
                            self.logger.warning(f"⚠️ FAILED LEGACY QUERY: {query_config['query']}")
                    
                    except Exception as e:
                        self.logger.error(f"❌ Error running {query_name}: {e}")
                        self.logger.error(f"❌ FAILED LEGACY QUERY: {query_config['query']}")
                        continue
                
                if all_stocks:
                    # Remove duplicates and prioritize by score
                    unique_stocks = {}
                    for stock in all_stocks:
                        symbol = stock.get('symbol', '')
                        if symbol:
                            if symbol not in unique_stocks or stock.get('chartink_score', 0) > unique_stocks[symbol].get('chartink_score', 0):
                                unique_stocks[symbol] = stock
                    
                    filtered_stocks = list(unique_stocks.values())[:limit]
                    self.logger.info(f"✅ Legacy chartink filtering completed: {len(filtered_stocks)} unique stocks selected")
                    
                    return filtered_stocks
            
            except Exception as e:
                self.logger.error(f"❌ Legacy chartink queries failed: {e}")
        
        # Fallback 2: Try additional fallback queries
        if self.chartink_service and self.config.get('fallback_queries') and not filtered_stocks:
            try:
                fallback_queries = self.config.get('fallback_queries', [])
                if fallback_queries:
                    self.logger.info("🔄 Using additional fallback queries...")
                    self.logger.info(f"📊 Available fallback queries: {len(fallback_queries)}")
                    for i, fallback_query in enumerate(fallback_queries):
                        try:
                            self.logger.info(f"📊 ADDITIONAL FALLBACK QUERY {i+1}: {fallback_query}")
                            stocks = await self.chartink_service.get_stocks_by_query(fallback_query, limit=limit//2)
                            if stocks:
                                for stock in stocks:
                                    stock.update({
                                        'chartink_theme': f'additional_fallback_{i+1}',
                                        'source': 'additional_fallback_query',
                                        'fallback_query_index': i+1
                                    })
                                filtered_stocks.extend(stocks)
                                self.logger.info(f"✅ Additional fallback query {i+1} returned {len(stocks)} stocks")
                                break
                            else:
                                self.logger.warning(f"⚠️ FAILED ADDITIONAL FALLBACK QUERY {i+1}: {fallback_query}")
                        except Exception as e:
                            self.logger.warning(f"Additional fallback query {i+1} failed: {e}")
                            self.logger.warning(f"⚠️ FAILED ADDITIONAL FALLBACK QUERY {i+1}: {fallback_query}")
                            continue
            except Exception as e:
                self.logger.error(f"❌ Additional fallback queries failed: {e}")
        
        # Fallback 3: Use seed algorithm manager if available
        if not filtered_stocks and self.seed_algorithm_manager:
            self.logger.info("🔄 Falling back to seed algorithm manager...")
            try:
                # Get the active algorithm version
                active_algorithm = self.seed_algorithm_manager.get_active_algorithm()
                
                if active_algorithm:
                    test_results = self.seed_algorithm_manager.test_algorithm_version(
                        active_algorithm['version']
                    )
                    
                    if test_results and 'top_ranked_stocks' in test_results:
                        ranked_stocks = test_results['top_ranked_stocks'][:limit]
                        
                        # Convert to expected format
                        for stock in ranked_stocks:
                            symbol = stock['symbol']
                            if not symbol.endswith('.NS'):
                                symbol = f"{symbol}.NS"
                            
                            stock_data = {
                                'symbol': symbol,
                                'chartink_score': stock['total_score'],
                                'chartink_theme': 'seed_algorithm',
                                'source': 'seed_algorithm_fallback',
                                'algorithm_version': active_algorithm['version'],
                                'algorithm_name': active_algorithm['name']
                            }
                            filtered_stocks.append(stock_data)
                        
                        self.logger.info(f"✅ Seed algorithm fallback completed: {len(filtered_stocks)} stocks selected")
            except Exception as e:
                self.logger.error(f"❌ Seed algorithm fallback failed: {e}")
        
        # Final fallback: Use default watchlist
        if not filtered_stocks:
            self.logger.warning("⚠️ All filtering methods failed, using default watchlist")
            filtered_stocks = [
                {
                    'symbol': symbol, 
                    'chartink_score': 50, 
                    'chartink_theme': 'default_watchlist',
                    'source': 'default_fallback'
                } 
                for symbol in self.default_watchlist[:limit]
            ]
        
        return filtered_stocks

    def _apply_reranking_algorithm(self, chartink_stocks: List[Dict[str, Any]], min_score_api: float = 60.0) -> List[Dict[str, Any]]:
        """
        Apply re-ranking algorithm to config-filtered stocks using scoring criteria from config
        
        Args:
            chartink_stocks: List of stocks from config-based filtering
            min_score_api: Minimum score threshold from API request (overrides config)
            
        Returns:
            Re-ranked stocks with detailed scoring based on config criteria
        """
        reranked_stocks = []
        
        # Get scoring criteria from config
        scoring_criteria = self.config.get('scoring_criteria', {})
        fundamental_weight = scoring_criteria.get('fundamental_weight', 0.6)
        technical_weight = scoring_criteria.get('technical_weight', 0.3)
        quality_weight = scoring_criteria.get('quality_weight', 0.1)
        
        # Use API parameter for threshold, not config
        min_score_threshold = min_score_api
        
        self.logger.info(f"🧮 Re-ranking {len(chartink_stocks)} stocks with threshold: {min_score_threshold}")
        self.logger.info(f"📊 Scoring weights - Fundamental: {fundamental_weight}, Technical: {technical_weight}, Quality: {quality_weight}")
        
        for i, stock in enumerate(chartink_stocks):
            try:
                symbol = stock['symbol']
                
                # Get base score from config query
                base_score = stock.get('chartink_score', 0)
                query_weight = stock.get('query_weight', 1.0)
                
                self.logger.debug(f"📊 Stock {i+1}/{len(chartink_stocks)}: {symbol} - Base score: {base_score}, Weight: {query_weight}")
                
                # Calculate re-ranking score using config weights
                reranking_score = self._calculate_reranking_score_sync(symbol, base_score)
                
                # Get fundamental data for additional insights
                fundamental_data = self._get_fundamental_data_sync(symbol)
                
                # Calculate final score using config-based weights
                weighted_base_score = base_score * query_weight
                final_score = min(100, max(0, 
                    (weighted_base_score * fundamental_weight) + 
                    (reranking_score * technical_weight) + 
                    (base_score * 0.1 * quality_weight)  # Quality component
                ))
                
                self.logger.debug(f"📊 {symbol}: Weighted base: {weighted_base_score:.1f}, Re-ranking: {reranking_score:.1f}, Final: {final_score:.1f}")
                
                # Apply API-based threshold (not config threshold)
                if final_score < min_score_threshold:
                    self.logger.debug(f"⚠️ {symbol} filtered out: {final_score:.1f} < {min_score_threshold}")
                    continue  # Skip stocks below threshold
                
                # Determine recommendation based on final score and config target return
                target_return = self.config['metadata']['target_return']
                if final_score >= 85:
                    recommendation = "Strong Buy"
                elif final_score >= 75:
                    recommendation = "Buy" 
                elif final_score >= min_score_threshold:
                    recommendation = "Moderate Buy"
                elif final_score >= 50:
                    recommendation = "Hold"
                else:
                    recommendation = "Avoid"
                
                # Calculate target price based on config target return
                current_price = fundamental_data.get('current_price', 100)
                target_price = current_price * (1 + (final_score / 100) * target_return)
                upside_potential = ((target_price - current_price) / current_price * 100) if current_price > 0 else 0
                
                # Determine risk level based on config risk management
                risk_management = self.config.get('risk_management', {})
                volatility = random.uniform(0.2, 0.8)  # Simulated volatility
                if volatility < 0.3:
                    risk_level = "Low"
                elif volatility < 0.6:
                    risk_level = "Medium"
                else:
                    risk_level = "High"
                
                reranked_stock = {
                    'symbol': symbol,
                    'final_score': round(final_score, 2),
                    'base_score': round(base_score, 2),
                    'weighted_base_score': round(weighted_base_score, 2),
                    'reranking_score': round(reranking_score, 2),
                    'recommendation': recommendation,
                    'target_price': round(target_price, 2),
                    'current_price': round(current_price, 2),
                    'upside_potential': round(upside_potential, 2),
                    'risk_level': risk_level,
                    'sector': self._get_stock_sector(symbol),
                    'market_cap': fundamental_data.get('market_cap', 'Large Cap'),
                    'exchange': 'NSE',
                    'source': stock.get('source', 'config_query'),
                    'chartink_theme': stock.get('chartink_theme', 'unknown'),
                    'query_description': stock.get('query_description', ''),
                    'algorithm_details': {
                        'config_algorithm': f"{self.config['current_algorithm']['name']} v{self.config['current_algorithm']['version']}",
                        'query_used': stock.get('chartink_theme', 'unknown'),
                        'scoring_weights': {
                            'fundamental': fundamental_weight,
                            'technical': technical_weight,
                            'quality': quality_weight
                        },
                        'final_score_calculation': f"Base ({base_score:.1f}) * Weight ({query_weight:.1f}) * Fund ({fundamental_weight:.1f}) + Technical ({reranking_score:.1f}) * ({technical_weight:.1f})"
                    },
                    'analysis_summary': f"Stock selected via {self.config['current_algorithm']['name']} algorithm "
                                       f"using {stock.get('query_description', 'config query')}. "
                                       f"Final score: {final_score:.1f}/100 (threshold: {min_score_threshold})"
                }
                
                reranked_stocks.append(reranked_stock)
                self.logger.debug(f"✅ {symbol} passed re-ranking: {final_score:.1f}/100")
                
            except Exception as e:
                self.logger.warning(f"⚠️ Error re-ranking stock {stock.get('symbol', 'Unknown')}: {e}")
                continue
        
        # Sort by final score
        reranked_stocks.sort(key=lambda x: x['final_score'], reverse=True)
        
        self.logger.info(f"✅ Config-based re-ranking completed: {len(reranked_stocks)} stocks passed threshold {min_score_threshold} "
                        f"(algorithm: {self.config['current_algorithm']['name']})")
        return reranked_stocks

    def _calculate_reranking_score_sync(self, symbol: str, base_score: float) -> float:
        """Synchronous version of re-ranking score calculation"""
        try:
            reranking_adjustment = 0.0
            
            # Sector rotation factor
            sector = self._get_stock_sector(symbol)
            if sector in ["Technology", "Banking", "Pharma"]:
                reranking_adjustment += 5 * self.reranking_factors["sector_rotation"]
            
            # Market sentiment (simplified for sync)
            market_sentiment = random.uniform(-3, 5)  # Simulated market sentiment
            reranking_adjustment += market_sentiment * self.reranking_factors["market_sentiment"]
            
            # Liquidity factor (simplified)
            liquidity_factor = random.uniform(0, 3)  # Simulated liquidity score
            reranking_adjustment += liquidity_factor * self.reranking_factors["liquidity"]
            
            final_score = base_score + reranking_adjustment
            return min(max(final_score, 0), 100)
            
        except Exception as e:
            self.logger.error(f"Error in sync re-ranking for {symbol}: {e}")
            return base_score

    def _get_fundamental_data_sync(self, symbol: str) -> Dict[str, Any]:
        """Synchronous version of fundamental data retrieval"""
        try:
            # Return simulated fundamental data for demo purposes
            price_range = {
                "RELIANCE": 2450, "TCS": 3650, "HDFCBANK": 1580,
                "INFY": 1400, "ICICIBANK": 950
            }
            
            base_symbol = symbol.replace('.NS', '').replace('.BO', '')
            current_price = price_range.get(base_symbol, random.uniform(100, 2000))
            
            return {
                'current_price': current_price,
                'market_cap': 'Large Cap',
                'pe_ratio': random.uniform(15, 30),
                'pb_ratio': random.uniform(1, 5)
            }
        except:
            return {'current_price': 100, 'market_cap': 'Unknown'}

    def _get_reranking_factors_summary(self, symbol: str) -> Dict[str, Any]:
        """Get summary of re-ranking factors applied to a stock"""
        try:
            # Get sector for sector rotation factor
            sector = self._get_stock_sector(symbol)
            favored_sectors = ['Technology', 'Banking', 'Pharma']
            sector_boost = 5 if sector in favored_sectors else 0
            
            # Market sentiment (simplified)
            market_sentiment = random.uniform(-3, 5)  # Simulated market sentiment
            
            # Liquidity factor (simplified)
            liquidity_factor = random.uniform(0, 3)  # Simulated liquidity score
            
            return {
                'sector_rotation': f"{sector} sector ({'Favored' if sector_boost > 0 else 'Neutral'})",
                'market_sentiment': f"{'Positive' if market_sentiment > 0 else 'Negative'} ({market_sentiment:.1f})",
                'liquidity_factor': f"{'High' if liquidity_factor > 2 else 'Medium' if liquidity_factor > 1 else 'Low'} liquidity"
            }
        except:
            return {
                'sector_rotation': 'Unknown',
                'market_sentiment': 'Neutral',
                'liquidity_factor': 'Medium'
            }

    async def analyze_single_stock(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Analyze a single Indian stock using seed algorithms as filters first."""
        try:
            indian_symbol = self._convert_to_indian_symbol(symbol)
            self.logger.info(f"Analyzing {indian_symbol} using seed algorithm filters...")
            
            # Apply seed algorithm filters first
            screening_results = await self._screen_stocks_with_seed_algorithms([indian_symbol])
            
            if not screening_results:
                # Stock didn't pass filters, return basic analysis
                return {
                    'symbol': indian_symbol,
                    'overall_score': 0.0,
                    'recommendation': "Filtered Out",
                    'risk_level': "High",
                    'filters_passed': 0,
                    'reason': "Did not meet minimum seed algorithm criteria",
                    'exchange': 'NSE' if indian_symbol.endswith('.NS') else 'BSE',
                    'analysis_date': datetime.now().isoformat(),
                    'summary': "Stock filtered out by seed algorithms"
                }
            
            # Stock passed filters, get detailed analysis
            analysis = screening_results[0]
            
            # Determine recommendation based on score and filters passed
            score = analysis['overall_score']
            filters_passed = analysis['filters_passed']
            
            if score >= 80 and filters_passed >= 4:
                recommendation = "Strong Buy"
                risk_level = "Low"
            elif score >= 70 and filters_passed >= 3:
                recommendation = "Buy"
                risk_level = "Low-Medium"
            elif score >= 60 and filters_passed >= 3:
                recommendation = "Moderate Buy"
                risk_level = "Medium"
            elif filters_passed >= 3:
                recommendation = "Hold"
                risk_level = "Medium"
            else:
                recommendation = "Avoid"
                risk_level = "High"
            
            analysis.update({
                'recommendation': recommendation,
                'risk_level': risk_level,
                'summary': f"Score: {score:.1f}/100 - Passed {filters_passed} seed filters - {recommendation}"
            })
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Error analyzing {symbol}: {e}")
            return None
    
    async def get_recommendations(self, limit: int = 10, min_score: float = 60.0) -> Dict[str, Any]:
        """
        Get long-term investment recommendations using config-based filtering and re-ranking
        
        Args:
            limit: Maximum number of recommendations to return
            min_score: Minimum score threshold for filtering recommendations
            
        Returns:
            Dictionary containing recommendations and filtering summary
        """
        logger.info(f"🔍 Generating long-term recommendations (limit={limit}, min_score={min_score})")
        
        try:
            # Use the new config-based approach
            logger.info(f"📊 Using config-based filtering: {self.config['current_algorithm']['name']} v{self.config['current_algorithm']['version']}")
            
            # Step 1: Get filtered stocks using config-based Chartink queries
            chartink_filtered_stocks = await self._get_chartink_filtered_stocks(limit=limit * 3)  # Get more for filtering
            
            logger.info(f"📈 Config-based filtering returned: {len(chartink_filtered_stocks)} stocks")
            
            if not chartink_filtered_stocks:
                logger.warning("⚠️ No stocks found through config-based filtering")
                return {
                    "recommendations": [],
                    "filtering_summary": {
                        "total_stocks_screened": 0,
                        "unique_stocks_found": 0,
                        "seed_algorithm_passed": 0,
                        "fundamental_analysis_applied": 0,
                        "final_recommendations": 0,
                        "filter_success_rate": 0.0,
                        "algorithm_approach": f"Config-based Filtering ({self.config['current_algorithm']['name']} v{self.config['current_algorithm']['version']})",
                        "active_algorithm": {
                            "name": self.config['current_algorithm']['name'],
                            "version": self.config['current_algorithm']['version']
                        },
                        "score_threshold": min_score,
                        "market_condition": "Unknown"
                    }
                }
            
            # Step 2: Apply config-based re-ranking algorithm
            logger.info("🧮 Applying config-based re-ranking...")
            reranked_stocks = self._apply_reranking_algorithm(chartink_filtered_stocks, min_score)
            
            logger.info(f"📊 Re-ranking completed: {len(reranked_stocks)} stocks passed scoring threshold")
            
            # Step 3: Apply final filtering and limit
            final_recommendations = reranked_stocks[:limit]
            
            # Calculate filtering summary
            total_screened = len(chartink_filtered_stocks)
            final_count = len(final_recommendations)
            filter_success_rate = (final_count / total_screened * 100) if total_screened > 0 else 0.0
            
            filtering_summary = {
                "total_stocks_screened": total_screened,
                "unique_stocks_found": len(chartink_filtered_stocks),
                "seed_algorithm_passed": len(chartink_filtered_stocks),  # All config-filtered stocks "passed"
                "fundamental_analysis_applied": len(reranked_stocks),
                "final_recommendations": final_count,
                "filter_success_rate": round(filter_success_rate, 2),
                "algorithm_approach": f"Config-based Filtering ({self.config['current_algorithm']['name']} v{self.config['current_algorithm']['version']}) + Re-ranking",
                "active_algorithm": {
                    "name": self.config['current_algorithm']['name'],
                    "version": self.config['current_algorithm']['version']
                },
                "score_threshold": min_score,
                "market_condition": "Unknown",
                "config_version": self.config['metadata']['file_version'],
                "queries_used": list(self.config['chartink_queries'].keys()),
                "scoring_weights": self.config.get('scoring_criteria', {})
            }
            
            logger.info(f"🎯 Final recommendations: {final_count} stocks (success rate: {filter_success_rate:.2f}%)")
            
            return {
                "recommendations": final_recommendations,
                "filtering_summary": filtering_summary
            }
            
        except Exception as e:
            logger.error(f"❌ Error in get_recommendations: {e}")
            return {
                "recommendations": [],
                "filtering_summary": {
                    "total_stocks_screened": 0,
                    "unique_stocks_found": 0,
                    "seed_algorithm_passed": 0,
                    "fundamental_analysis_applied": 0,
                    "final_recommendations": 0,
                    "filter_success_rate": 0.0,
                    "algorithm_approach": f"Error: {str(e)}",
                    "active_algorithm": {
                        "name": "Error",
                        "version": "Unknown"
                    },
                    "score_threshold": min_score,
                    "market_condition": "Unknown"
                }
            }
    
    async def get_sector_analysis(self, limit_per_sector: int = 3) -> Dict[str, List[Dict[str, Any]]]:
        """Get top long-term recommendations by Indian sectors."""
        
        sector_recommendations = {}
        
        # Analyze Indian sector ETFs first to get sector trends
        sector_etf_analyses = []
        for sector, etf_symbol in self.sector_etfs.items():
            try:
                analysis = await self.analyze_single_stock(etf_symbol)
                if analysis:
                    sector_etf_analyses.append({
                        'sector': sector,
                        'etf_symbol': etf_symbol,
                        'score': analysis['overall_score'],
                        'recommendation': analysis['recommendation']
                    })
            except Exception as e:
                self.logger.error(f"Error analyzing sector ETF {etf_symbol}: {e}")
                continue
        
        # Sort sectors by ETF performance
        sector_etf_analyses.sort(key=lambda x: x['score'], reverse=True)
        
        # Get top stocks from each sector
        all_recommendations = await self.get_recommendations(limit=50)
        
        # Group by sector
        for recommendation in all_recommendations:
            sector = recommendation.get('sector', 'Unknown')
            if sector not in sector_recommendations:
                sector_recommendations[sector] = []
            
            if len(sector_recommendations[sector]) < limit_per_sector:
                sector_recommendations[sector].append(recommendation)
        
        return {
            'sector_etf_analysis': sector_etf_analyses,
            'sector_recommendations': sector_recommendations,
            'indian_market_focus': True,
            'exchanges': ['NSE', 'BSE']
        }
    
    async def get_portfolio_suggestions(self, 
                                      portfolio_value: float = 100000,
                                      risk_tolerance: str = "moderate") -> Dict[str, Any]:
        """Get portfolio allocation suggestions for long-term investing in Indian stocks."""
        
        recommendations = await self.get_recommendations(limit=30)
        
        if not recommendations:
            return {
                'error': 'No suitable Indian long-term investments found',
                'recommendations': []
            }
        
        # Risk-based allocation (Indian context)
        allocation_strategies = {
            'conservative': {
                'stocks': 0.60, 
                'bonds': 0.25, 
                'gold': 0.10, 
                'fd_ppf': 0.05,
                'max_single_position': 0.05
            },
            'moderate': {
                'stocks': 0.75, 
                'bonds': 0.15, 
                'gold': 0.08, 
                'fd_ppf': 0.02,
                'max_single_position': 0.08
            },
            'aggressive': {
                'stocks': 0.90, 
                'bonds': 0.05, 
                'gold': 0.03, 
                'fd_ppf': 0.02,
                'max_single_position': 0.12
            }
        }
        
        strategy = allocation_strategies.get(risk_tolerance, allocation_strategies['moderate'])
        stock_allocation = portfolio_value * strategy['stocks']
        max_position_size = portfolio_value * strategy['max_single_position']
        
        # Select top Indian stocks for portfolio
        portfolio_stocks = []
        allocated_amount = 0
        
        # Ensure sector diversification
        sectors_included = set()
        for recommendation in recommendations[:20]:  # Max 20 positions for diversification
            if allocated_amount >= stock_allocation:
                break
                
            # Diversification check - max 3 stocks per sector
            sector = recommendation.get('sector', 'Unknown')
            sector_count = len([s for s in portfolio_stocks if s['sector'] == sector])
            if sector_count >= 3:
                continue
                
            # Calculate position size
            remaining_allocation = stock_allocation - allocated_amount
            suggested_allocation = min(max_position_size, remaining_allocation / max(1, 20 - len(portfolio_stocks)))
            
            current_price = recommendation.get('current_price', 0)
            if current_price > 0:
                shares = int(suggested_allocation / current_price)
                actual_allocation = shares * current_price
                
                if shares > 0:
                    portfolio_stocks.append({
                        'symbol': recommendation['symbol'],
                        'shares': shares,
                        'allocation_amount': actual_allocation,
                        'allocation_percentage': (actual_allocation / portfolio_value) * 100,
                        'current_price': current_price,
                        'target_price': recommendation.get('target_price'),
                        'expected_return': recommendation.get('upside_potential', 0),
                        'overall_score': recommendation['score'],
                        'sector': sector,
                        'exchange': recommendation.get('exchange', 'NSE'),
                        'risk_level': recommendation.get('risk_level', 'Medium')
                    })
                    allocated_amount += actual_allocation
                    sectors_included.add(sector)
        
        # Calculate portfolio metrics
        total_expected_return = sum(
            stock.get('expected_return', 0) * (stock['allocation_amount'] / stock_allocation) 
            for stock in portfolio_stocks
        ) if stock_allocation > 0 else 0
        
        # Indian-specific recommendations
        tax_saving_suggestions = [
            "Consider ELSS mutual funds for tax saving under 80C",
            "PPF and EPF contributions for long-term tax-free returns",
            "NPS for retirement planning with additional tax benefits"
        ]
        
        return {
            'portfolio_value': portfolio_value,
            'risk_tolerance': risk_tolerance,
            'stock_allocation': stock_allocation,
            'allocated_amount': allocated_amount,
            'cash_remaining': portfolio_value - allocated_amount,
            'portfolio_stocks': portfolio_stocks,
            'expected_annual_return': round(total_expected_return, 2),
            'number_of_positions': len(portfolio_stocks),
            'sector_diversity': len(sectors_included),
            'allocation_strategy': strategy,
            'rebalance_frequency': 'Quarterly',
            'indian_market_specific': True,
            'exchanges_used': list(set(stock.get('exchange', 'NSE') for stock in portfolio_stocks)),
            'tax_saving_suggestions': tax_saving_suggestions,
            'notes': [
                f"Diversified across {len(sectors_included)} Indian sectors",
                f"Maximum single position: {strategy['max_single_position']*100:.1f}%",
                f"Expected annual return: {total_expected_return:.1f}%",
                "Consider SIP for regular investments",
                "Review during quarterly results season"
            ]
        }
    
    async def get_market_outlook(self) -> Dict[str, Any]:
        """Get Indian market outlook with fallback data when external sources fail."""
        try:
            # Try to get Indian market data
            indian_indices_data = []
            
            for index in self.market_indices[:3]:  # Limit to avoid rate limits
                try:
                    await self._rate_limit()
                    hist = await self.get_historical_data(index, "1mo")
                    if hist is not None and not hist.empty:
                        recent_return = ((hist['Close'].iloc[-1] / hist['Close'].iloc[0]) - 1) * 100
                        indian_indices_data.append({
                            'index': index,
                            'return': recent_return
                        })
                except Exception as e:
                    self.logger.debug(f"Failed to get market data for {index}: {e}")
                    continue
            
            # Calculate market sentiment based on Indian indices
            if indian_indices_data:
                avg_return = np.mean([data['return'] for data in indian_indices_data])
                nifty_return = next((data['return'] for data in indian_indices_data if data['index'] == '^NSEI'), avg_return)
                
                if avg_return > 5:
                    sentiment = "Bullish"
                    advice = "Favorable conditions for Indian equity investments. Consider increasing allocation."
                elif avg_return > 0:
                    sentiment = "Neutral"
                    advice = "Mixed signals in Indian markets. Maintain balanced approach with SIP."
                else:
                    sentiment = "Bearish"
                    advice = "Cautious approach recommended. Consider defensive stocks or wait for better entry points."
                
                market_score = max(0, min(100, 50 + avg_return * 3))
            else:
                # Fallback data for Indian markets
                sentiment = "Neutral"
                advice = "Unable to assess current Indian market conditions - proceed with SIP approach"
                market_score = 50
                avg_return = 0
                nifty_return = 0
            
            return {
                "market_sentiment": sentiment,
                "average_market_score": round(market_score, 1),
                "nifty_50_return": round(nifty_return, 2) if 'nifty_return' in locals() else None,
                "recent_market_return": round(avg_return, 2) if indian_indices_data else None,
                "investment_advice": advice,
                "indian_market_focus": True,
                "indices_analyzed": [data['index'] for data in indian_indices_data],
                "last_updated": datetime.now().isoformat(),
                "data_quality": "Limited" if not indian_indices_data else "Good",
                "currency": "INR",
                "recommended_strategies": [
                    "SIP (Systematic Investment Plan)",
                    "Diversification across sectors",
                    "Focus on large-cap for stability"
                ]
            }
            
        except Exception as e:
            self.logger.error(f"Error getting Indian market outlook: {e}")
            return {
                "market_sentiment": "Unknown",
                "average_market_score": 50,
                "recent_market_return": None,
                "investment_advice": "Unable to assess Indian market conditions",
                "indian_market_focus": True,
                "last_updated": datetime.now().isoformat(),
                "data_quality": "Poor",
                "currency": "INR"
            }
    
    def update_strategy_parameters(self, **params):
        """Update strategy parameters."""
        for param, value in params.items():
            if hasattr(self.strategy, param):
                setattr(self.strategy, param, value)
                self.logger.info(f"Updated strategy parameter {param} to {value}")
    
    def get_strategy_info(self) -> Dict[str, Any]:
        """Get current Indian market strategy configuration."""
        return {
            'market_focus': 'Indian Equity Markets (BSE/NSE)',
            'seed_algorithms': self.seed_algorithm_manager.algorithms,
            'reranking_factors': self.reranking_factors,
            'default_watchlist_size': len(self.default_watchlist),
            'sector_coverage': list(self.sector_etfs.keys()),
            'investment_horizon': "1+ years",
            'strategy_type': "Indian Long-term Value & Growth Investing with Versioned Seed Algorithms",
            'currency': 'INR',
            'exchanges': ['NSE', 'BSE'],
            'rating_scale': '0-100 points',
            'risk_categories': ['Conservative', 'Moderate', 'Aggressive'],
            'indian_specific_features': [
                'Sector rotation based on Indian economic cycles',
                'Nifty-based market sentiment analysis',
                'Indian corporate governance factors',
                'Rupee-denominated returns calculation'
            ]
        }

    def update_seed_algorithm_weights(self, **weights):
        """Update seed algorithm weights for Indian market focus."""
        for algo_name, weight in weights.items():
            if algo_name in self.seed_algorithm_manager.algorithms:
                self.seed_algorithm_manager.algorithms[algo_name]['weight'] = weight
                self.logger.info(f"Updated {algo_name} weight to {weight}")
        
        # Normalize weights to sum to 1.0
        total_weight = sum(config['weight'] for config in self.seed_algorithm_manager.algorithms.values())
        if total_weight != 1.0:
            for config in self.seed_algorithm_manager.algorithms.values():
                config['weight'] = config['weight'] / total_weight
            self.logger.info("Normalized seed algorithm weights to sum to 1.0")

    def update_reranking_factors(self, **factors):
        """Update re-ranking factors for Indian market conditions."""
        for factor_name, weight in factors.items():
            if factor_name in self.reranking_factors:
                self.reranking_factors[factor_name] = weight
                self.logger.info(f"Updated re-ranking factor {factor_name} to {weight}") 

    async def _screen_stocks_with_seed_algorithms(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """Screen stocks using seed algorithms as filters, then rank the filtered stocks."""
        self.logger.info(f"Screening {len(symbols)} stocks using seed algorithm filters...")
        
        filtered_stocks = []
        
        for symbol in symbols:
            try:
                indian_symbol = self._convert_to_indian_symbol(symbol)
                self.logger.debug(f"Screening {indian_symbol}...")
                
                # Apply all seed algorithm filters
                filter_results = {}
                total_passed_filters = 0
                overall_filter_score = 0.0
                all_criteria_details = {
                    "met": [],
                    "failed": []
                }
                
                for algo_name, config in self.seed_algorithm_manager.algorithms.items():
                    if config.get("enabled", True):
                        filter_result = await self._apply_seed_algorithm_filter(indian_symbol, algo_name, config)
                        filter_results[algo_name] = filter_result
                        
                        if filter_result["passes_filter"]:
                            total_passed_filters += 1
                            overall_filter_score += filter_result["score"] * config["weight"]
                        
                        # Collect criteria details
                        all_criteria_details["met"].extend(filter_result.get("criteria_met", []))
                        all_criteria_details["failed"].extend(filter_result.get("criteria_failed", []))
                
                # Stock must pass at least 3 out of 5 seed algorithm filters
                minimum_filters_required = 3
                if total_passed_filters >= minimum_filters_required:
                    # Get additional data for ranking
                    fundamental_data = await self.get_stock_fundamental_data(indian_symbol)
                    hist_data = await self.get_historical_data(indian_symbol, "3mo")
                    
                    # Apply re-ranking to filtered stocks
                    final_score = await self._calculate_reranking_score(indian_symbol, overall_filter_score)
                    
                    # Calculate current price and target price
                    current_price = hist_data['Close'].iloc[-1] if hist_data is not None and not hist_data.empty else 0
                    target_price = current_price * (1 + (final_score - 50) / 100) if current_price > 0 else 0
                    
                    filtered_stocks.append({
                        'symbol': indian_symbol,
                        'overall_score': round(final_score, 2),
                        'filters_passed': total_passed_filters,
                        'total_filters': len([a for a in self.seed_algorithm_manager.algorithms.values() if a.get("enabled", True)]),
                        'filter_results': filter_results,
                        'criteria_summary': all_criteria_details,
                        'current_price': round(current_price, 2) if current_price > 0 else None,
                        'target_price': round(target_price, 2) if target_price > 0 else None,
                        'upside_potential': round(((target_price / current_price) - 1) * 100, 2) if current_price > 0 and target_price > 0 else None,
                        'sector': self._get_stock_sector(indian_symbol),
                        'market_cap': fundamental_data.get('marketCap') if fundamental_data else None,
                        'exchange': 'NSE' if indian_symbol.endswith('.NS') else 'BSE',
                        'analysis_date': datetime.now().isoformat()
                    })
                else:
                    self.logger.debug(f"{indian_symbol} filtered out: passed {total_passed_filters}/{len(self.seed_algorithm_manager.algorithms)} filters")
                
            except Exception as e:
                self.logger.error(f"Error screening {symbol}: {e}")
                continue
        
        # Sort filtered stocks by final score
        filtered_stocks.sort(key=lambda x: x['overall_score'], reverse=True)
        
        self.logger.info(f"Seed algorithm filtering: {len(filtered_stocks)} stocks passed out of {len(symbols)} screened")
        return filtered_stocks

    async def _apply_seed_algorithm_filter(self, symbol: str, algorithm_name: str, config: Dict) -> Dict[str, Any]:
        """Apply seed algorithm as a filter to determine if stock meets criteria."""
        try:
            if not config.get("enabled", True):
                return {"passes_filter": False, "reason": "Algorithm disabled"}
                
            fundamental_data = await self.get_stock_fundamental_data(symbol)
            historical_data = await self.get_historical_data(symbol, "1y")
            
            if not fundamental_data and not historical_data:
                return {"passes_filter": False, "reason": "Insufficient data"}
            
            filter_result = {
                "passes_filter": False,
                "score": 0.0,
                "criteria_met": [],
                "criteria_failed": [],
                "reason": ""
            }
            
            if algorithm_name == "fundamental_strength":
                # PE Ratio filter (5-25 range acceptable)
                pe_ratio = fundamental_data.get('forwardPE') or fundamental_data.get('trailingPE', 0)
                if pe_ratio and 5 <= pe_ratio <= 25:
                    filter_result["criteria_met"].append(f"PE Ratio: {pe_ratio:.2f} (Good)")
                    filter_result["score"] += 25
                else:
                    filter_result["criteria_failed"].append(f"PE Ratio: {pe_ratio:.2f} (Outside 5-25 range)")
                
                # ROE filter (minimum 15%)
                roe = fundamental_data.get('returnOnEquity', 0)
                if roe and roe > 0.15:
                    filter_result["criteria_met"].append(f"ROE: {roe*100:.1f}% (Good)")
                    filter_result["score"] += 25
                else:
                    filter_result["criteria_failed"].append(f"ROE: {roe*100:.1f}% (Below 15%)")
                
                # Debt to Equity filter (max 1.0)
                debt_to_equity = fundamental_data.get('debtToEquity', 0)
                if debt_to_equity is not None and debt_to_equity <= 1.0:
                    filter_result["criteria_met"].append(f"D/E: {debt_to_equity:.2f} (Good)")
                    filter_result["score"] += 25
                else:
                    filter_result["criteria_failed"].append(f"D/E: {debt_to_equity:.2f} (Above 1.0)")
                
                # Pass filter if at least 2 out of 3 criteria met
                filter_result["passes_filter"] = len(filter_result["criteria_met"]) >= 2
                
            elif algorithm_name == "technical_momentum":
                if historical_data is not None and not historical_data.empty:
                    criteria_passed = 0
                    
                    # Moving Average Trend Filter
                    closes = historical_data['Close']
                    if len(closes) >= 50:
                        sma_20 = closes.rolling(20).mean().iloc[-1]
                        sma_50 = closes.rolling(50).mean().iloc[-1]
                        current_price = closes.iloc[-1]
                        
                        if current_price > sma_20 > sma_50:
                            filter_result["criteria_met"].append("Strong uptrend (Price > SMA20 > SMA50)")
                            filter_result["score"] += 40
                            criteria_passed += 2
                        elif current_price > sma_20:
                            filter_result["criteria_met"].append("Moderate uptrend (Price > SMA20)")
                            filter_result["score"] += 20
                            criteria_passed += 1
                        else:
                            filter_result["criteria_failed"].append("No uptrend detected")
                    
                    # Volume Trend Filter
                    if len(historical_data) >= 20:
                        recent_volume = historical_data['Volume'].tail(5).mean()
                        avg_volume = historical_data['Volume'].mean()
                        if recent_volume > avg_volume * 1.2:
                            filter_result["criteria_met"].append("High volume activity")
                            filter_result["score"] += 20
                            criteria_passed += 1
                        else:
                            filter_result["criteria_failed"].append("Low volume activity")
                    
                    # RSI Filter (30-70 range for momentum)
                    if len(closes) >= 14:
                        delta = closes.diff()
                        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
                        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
                        rs = gain / loss
                        rsi = 100 - (100 / (1 + rs))
                        current_rsi = rsi.iloc[-1]
                        
                        if 30 <= current_rsi <= 70:
                            filter_result["criteria_met"].append(f"RSI: {current_rsi:.1f} (Good momentum)")
                            filter_result["score"] += 20
                            criteria_passed += 1
                        else:
                            filter_result["criteria_failed"].append(f"RSI: {current_rsi:.1f} (Overbought/Oversold)")
                    
                    # Pass filter if at least 2 technical criteria met
                    filter_result["passes_filter"] = criteria_passed >= 2
                else:
                    filter_result["criteria_failed"].append("No historical data available")
                    
            elif algorithm_name == "quality_score":
                criteria_passed = 0
                
                # Profit Margin Filter (minimum 10%)
                profit_margin = fundamental_data.get('profitMargins', 0)
                if profit_margin and profit_margin > 0.10:
                    filter_result["criteria_met"].append(f"Profit Margin: {profit_margin*100:.1f}% (Good)")
                    filter_result["score"] += 30
                    criteria_passed += 1
                else:
                    filter_result["criteria_failed"].append(f"Profit Margin: {profit_margin*100:.1f}% (Below 10%)")
                
                # Market Cap Filter (minimum 1000 Cr for stability)
                market_cap = fundamental_data.get('marketCap', 0)
                if market_cap and market_cap > 10000000000:  # 1000 Cr+
                    filter_result["criteria_met"].append("Large-cap stock (>1000 Cr)")
                    filter_result["score"] += 30
                    criteria_passed += 1
                else:
                    filter_result["criteria_failed"].append("Not a large-cap stock")
                
                # Pass filter if at least 1 quality criteria met
                filter_result["passes_filter"] = criteria_passed >= 1
                
            elif algorithm_name == "valuation_metrics":
                criteria_passed = 0
                
                # Price to Book Filter (0.5-3.0 range)
                pb_ratio = fundamental_data.get('priceToBook', 0)
                if pb_ratio and 0.5 <= pb_ratio <= 3.0:
                    filter_result["criteria_met"].append(f"P/B Ratio: {pb_ratio:.2f} (Reasonable)")
                    filter_result["score"] += 25
                    criteria_passed += 1
                else:
                    filter_result["criteria_failed"].append(f"P/B Ratio: {pb_ratio:.2f} (Outside 0.5-3.0)")
                
                # EV/EBITDA Filter (5-15 range)
                ev_ebitda = fundamental_data.get('enterpriseToEbitda', 0)
                if ev_ebitda and 5 <= ev_ebitda <= 15:
                    filter_result["criteria_met"].append(f"EV/EBITDA: {ev_ebitda:.2f} (Fair)")
                    filter_result["score"] += 25
                    criteria_passed += 1
                else:
                    filter_result["criteria_failed"].append(f"EV/EBITDA: {ev_ebitda:.2f} (Outside 5-15)")
                
                # Pass filter if at least 1 valuation criteria met
                filter_result["passes_filter"] = criteria_passed >= 1
                
            elif algorithm_name == "dividend_yield":
                # Dividend Yield Filter (minimum 1%)
                div_yield = fundamental_data.get('dividendYield', 0)
                if div_yield and div_yield > 0.01:
                    filter_result["criteria_met"].append(f"Dividend Yield: {div_yield*100:.2f}%")
                    filter_result["score"] += 50
                    filter_result["passes_filter"] = True
                else:
                    filter_result["criteria_failed"].append("No significant dividend yield")
                    filter_result["passes_filter"] = False
            
            # Set reason based on filter result
            if filter_result["passes_filter"]:
                filter_result["reason"] = f"Passed {len(filter_result['criteria_met'])} criteria"
            else:
                filter_result["reason"] = f"Failed: {', '.join(filter_result['criteria_failed'])}"
                
            return filter_result
            
        except Exception as e:
            self.logger.error(f"Error in seed filter {algorithm_name} for {symbol}: {e}")
            return {"passes_filter": False, "reason": f"Error: {str(e)}", "score": 0.0} 