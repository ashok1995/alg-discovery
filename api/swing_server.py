#!/usr/bin/env python3
"""
Swing Trading Server for AlgoDiscovery Trading System
===================================================

This server provides swing trading recommendations using:
- Configuration-driven seed algorithms with variants (breakout, momentum, pattern, reversal)
- Multi-factor combination analysis similar to long-term system
- 3-10 day holding period optimization
- Advanced pattern recognition and re-ranking
- 0-100 scoring system for better usability

Author: Algorithm Discovery System
Created: 2024-01-15
"""

import asyncio
import json
import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
import numpy as np
from bs4 import BeautifulSoup as bs
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# =====================================================================
# CONFIGURATION MANAGEMENT
# =====================================================================

class SwingConfigManager:
    """Manages swing trading configuration and variants."""
    
    def __init__(self):
        self.config_path = Path(__file__).parent / "config" / "swing_config.json"
        self.config = self._load_config()
        
    def _load_config(self) -> Dict:
        """Load swing trading configuration."""
        try:
            with open(self.config_path, 'r') as file:
                return json.load(file)
        except Exception as e:
            logger.error(f"Failed to load swing config: {e}")
            return self._get_fallback_config()
    
    def _get_fallback_config(self) -> Dict:
        """Fallback configuration if file loading fails."""
        return {
            "sub_algorithm_variants": {
                "breakout": {
                    "v1.0": {
                        "query": "( {cash} ( latest close > latest sma(close,20) and latest volume > latest sma(volume,20) * 1.5 ) )",
                        "weight": 0.35,
                        "expected_results": 80
                    }
                }
            },
            "scoring_system": {
                "category_weights": {"breakout": 35, "momentum": 25, "pattern": 20, "reversal": 20}
            },
            "current_version": "v1.0.0"
        }
    
    def get_current_algorithm_config(self) -> Dict:
        """Get the current active algorithm configuration."""
        current_version = self.config.get("current_version", "v1.0.0")
        algorithms = self.config.get("algorithms", {})
        return algorithms.get(current_version, {})
    
    def get_variant_query(self, category: str, version: str) -> Optional[str]:
        """Get the query for a specific variant."""
        variants = self.config.get("sub_algorithm_variants", {})
        category_variants = variants.get(category, {})
        variant = category_variants.get(version, {})
        return variant.get("query")
    
    def get_scoring_weights(self) -> Dict[str, int]:
        """Get category weights for scoring."""
        scoring_system = self.config.get("scoring_system", {})
        return scoring_system.get("category_weights", {})

# Global configuration manager
config_manager = SwingConfigManager()

# =====================================================================
# CHARTINK INTEGRATION
# =====================================================================

class ChartinkService:
    """Enhanced service for interacting with Chartink API with HTTP 419 error fixes."""
    
    def __init__(self):
        self.base_url = "https://chartink.com"
        self.screener_url = f"{self.base_url}/screener/process"
        self.referer_url = f"{self.base_url}/screener"
        self.session = None
        self.csrf_token = None
        self.last_request_time = 0
        self.min_request_interval = 3.0  # Increased to 3 seconds
        
        # User agents for rotation
        self.user_agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
        ]
        
    async def get_session(self):
        """Get or create HTTP session with proper headers."""
        if self.session is None:
            import random
            self.session = httpx.AsyncClient(
                timeout=45.0,
                headers={
                    'User-Agent': random.choice(self.user_agents),
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-origin',
                    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"macOS"',
                }
            )
            logger.info("✅ Initialized new async session with enhanced headers")
        return self.session
    
    async def _get_csrf_token(self):
        """Get fresh CSRF token from ChartInk with proper compression handling."""
        try:
            logger.info("🔑 Fetching fresh CSRF token...")
            session = await self.get_session()
            
            # Add small delay before CSRF request
            import asyncio, random
            await asyncio.sleep(random.uniform(1.0, 2.0))
            
            # Update headers for HTML page request
            html_headers = {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',  # Explicitly handle compression
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            }
            
            # Get the main screener page
            response = await session.get(self.referer_url, headers=html_headers)
            
            if response.status_code != 200:
                logger.error(f"❌ Failed to get CSRF token page: HTTP {response.status_code}")
                return False
            
            # Check if content is properly decoded
            html_content = response.text
            logger.info(f"📊 HTML content length: {len(html_content)}")
            
            # Check for signs of compressed/binary content
            if len(html_content) < 1000 or not html_content.strip().startswith('<'):
                logger.warning("⚠️ HTML content appears compressed or invalid")
                # Try with different headers
                simple_headers = {
                    'Accept': 'text/html',
                    'Accept-Encoding': 'identity'  # No compression
                }
                response = await session.get(self.referer_url, headers=simple_headers)
                html_content = response.text
                logger.info(f"📊 Retry - HTML content length: {len(html_content)}")
            
            # Parse HTML to find CSRF token
            soup = bs(html_content, 'html.parser')
            
            # Try multiple CSRF token extraction methods
            csrf_token = None
            
            # Method 1: Standard meta tag
            csrf_meta = soup.find('meta', {'name': 'csrf-token'})
            if csrf_meta and csrf_meta.get('content'):
                csrf_token = csrf_meta['content']
                logger.info(f"✅ CSRF token found via meta tag: {csrf_token[:16]}...")
            
            # Method 2: Alternative meta tag names
            if not csrf_token:
                for meta_name in ['_token', 'csrfmiddlewaretoken', 'authenticity_token']:
                    csrf_meta = soup.find('meta', {'name': meta_name})
                    if csrf_meta and csrf_meta.get('content'):
                        csrf_token = csrf_meta['content']
                        logger.info(f"✅ CSRF token found via {meta_name}: {csrf_token[:16]}...")
                        break
            
            # Method 3: Hidden input fields
            if not csrf_token:
                for input_name in ['_token', 'csrf_token', 'authenticity_token']:
                    csrf_input = soup.find('input', {'name': input_name})
                    if csrf_input and csrf_input.get('value'):
                        csrf_token = csrf_input['value']
                        logger.info(f"✅ CSRF token found via input {input_name}: {csrf_token[:16]}...")
                        break
            
            # Method 4: Search in script tags for window.csrf or similar
            if not csrf_token:
                script_tags = soup.find_all('script')
                for script in script_tags:
                    script_text = script.get_text()
                    if script_text:
                        # Look for common CSRF patterns in JavaScript
                        import re
                        patterns = [
                            r'csrf["\']?\s*[:=]\s*["\']([a-zA-Z0-9\-_]{20,})["\']',
                            r'_token["\']?\s*[:=]\s*["\']([a-zA-Z0-9\-_]{20,})["\']',
                            r'window\.csrf\s*=\s*["\']([a-zA-Z0-9\-_]{20,})["\']'
                        ]
                        for pattern in patterns:
                            match = re.search(pattern, script_text, re.IGNORECASE)
                            if match:
                                csrf_token = match.group(1)
                                logger.info(f"✅ CSRF token found in script: {csrf_token[:16]}...")
                                break
                        if csrf_token:
                            break
            
            if not csrf_token:
                logger.error("❌ CSRF token not found with any method")
                # Log some debug info
                logger.info(f"📊 HTML preview: {html_content[:200]}...")
                logger.info(f"📊 Meta tags count: {len(soup.find_all('meta'))}")
                logger.info(f"📊 Script tags count: {len(soup.find_all('script'))}")
                return False
            
            self.csrf_token = csrf_token
            logger.info(f"✅ CSRF token obtained successfully")
            
            # Update session headers with CSRF token
            session.headers.update({
                'X-CSRF-TOKEN': self.csrf_token,
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': self.referer_url,
                'Origin': self.base_url
            })
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error getting CSRF token: {e}")
            return False
    
    async def _rate_limit(self):
        """Implement rate limiting."""
        import time, asyncio, random
        current_time = time.time()
        elapsed = current_time - self.last_request_time
        
        if elapsed < self.min_request_interval:
            sleep_time = self.min_request_interval - elapsed + random.uniform(0.5, 1.5)
            logger.info(f"⏱️ Rate limiting: sleeping for {sleep_time:.2f}s")
            await asyncio.sleep(sleep_time)
        
        self.last_request_time = time.time()

    async def run_query(self, query: str, max_results: int = 100, max_retries: int = 3) -> List[Dict]:
        """Run a chartink query and return the results with enhanced error handling."""
        logger.info(f"🔍 Running Chartink query (max_results: {max_results})")
        logger.debug(f"📝 Query: {query}")
        
        for attempt in range(1, max_retries + 1):
            try:
                logger.info(f"🔍 Scan attempt {attempt}/{max_retries}")
                
                # Rate limiting
                await self._rate_limit()
                
                # Ensure we have a valid CSRF token
                if not self.csrf_token or attempt > 1:
                    success = await self._get_csrf_token()
                    if not success:
                        logger.error(f"❌ Failed to get CSRF token on attempt {attempt}")
                        continue
                
                session = await self.get_session()
                
                # Update headers for API request (no compression for JSON response)
                api_headers = {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                    'Accept-Encoding': 'identity',  # No compression for JSON response
                    'X-CSRF-TOKEN': self.csrf_token,
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': self.referer_url,
                    'Origin': self.base_url,
                    'Cache-Control': 'no-cache'
                }
                
                # Prepare form data
                data = {
                    'scan_clause': query,
                    'csrf_token': self.csrf_token
                }
                
                logger.info("📤 Sending POST request to ChartInk...")
                logger.info(f"📊 Query length: {len(query)} characters")
                
                # Make the request
                response = await session.post(
                    self.screener_url,
                    headers=api_headers,
                    data=data
                )
                
                logger.info(f"📥 Response: HTTP {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        # Try to parse JSON directly
                        json_data = response.json()
                        stocks = json_data.get('data', [])
                        
                        # Debug: Log the structure of the first stock
                        if stocks:
                            logger.info(f"🔍 Sample stock data structure: {list(stocks[0].keys())}")
                            logger.info(f"🔍 First stock sample: {stocks[0]}")
                        
                        # Limit results
                        if len(stocks) > max_results:
                            stocks = stocks[:max_results]
                        
                        logger.info(f"✅ Successfully parsed {len(stocks)} stocks from ChartInk")
                        if stocks:
                            # Try different symbol field names - prioritize nsecode for actual trading symbols
                            symbol_field = None
                            for field in ['nsecode', 'symbol', 'stock', 'ticker', 'name']:
                                if field in stocks[0] and stocks[0][field]:
                                    symbol_field = field
                                    break
                            
                            logger.info(f"🎯 Using symbol field: {symbol_field}")
                            if symbol_field:
                                sample_symbols = [s.get(symbol_field, 'N/A') for s in stocks[:5]]
                                logger.info(f"🎯 Sample symbols: {sample_symbols}")
                            else:
                                logger.warning("⚠️ No symbol field found in response data")
                        
                        return stocks
                        
                    except Exception as json_error:
                        logger.error(f"❌ JSON parsing error: {json_error}")
                        
                        # Try to handle compressed response
                        try:
                            import gzip
                            content = response.content
                            logger.info(f"Response content preview: {content[:100]}...")
                            
                            # Check if content is gzipped
                            if content.startswith(b'\x1f\x8b'):
                                logger.info("🔧 Detected gzipped content, decompressing...")
                                decompressed = gzip.decompress(content)
                                json_data = json.loads(decompressed.decode('utf-8'))
                                stocks = json_data.get('data', [])
                                
                                if len(stocks) > max_results:
                                    stocks = stocks[:max_results]
                                
                                logger.info(f"✅ Successfully decompressed and parsed {len(stocks)} stocks")
                                return stocks
                            else:
                                # Try different encoding
                                try:
                                    # Try to decode as text
                                    text_response = content.decode('utf-8', errors='ignore')
                                    if text_response.strip().startswith('{'):
                                        json_data = json.loads(text_response)
                                        stocks = json_data.get('data', [])
                                        
                                        if len(stocks) > max_results:
                                            stocks = stocks[:max_results]
                                        
                                        logger.info(f"✅ Successfully parsed with fallback encoding: {len(stocks)} stocks")
                                        return stocks
                                except:
                                    pass
                                
                                logger.warning("⚠️ Could not decode response content")
                                
                        except Exception as decomp_error:
                            logger.error(f"❌ Decompression error: {decomp_error}")
                            
                        return []
                        
                elif response.status_code == 419:
                    logger.warning("⚠️ HTTP 419 - CSRF token invalid, will retry")
                    self.csrf_token = None  # Force token refresh
                    continue
                    
                else:
                    logger.error(f"❌ Unexpected status code: {response.status_code}")
                    logger.info(f"Response content: {response.text[:200]}...")
                    
            except Exception as e:
                logger.error(f"❌ Error on attempt {attempt}: {e}")
                if attempt < max_retries:
                    logger.info(f"⏳ Retrying in 2 seconds...")
                    await asyncio.sleep(2)
                    
        logger.error(f"❌ All {max_retries} attempts failed")
        return []
    
    async def close(self):
        """Close the HTTP session."""
        if self.session:
            await self.session.aclose()
            logger.info("🔐 Session closed")

# Global chartink service
chartink_service = ChartinkService()

# =====================================================================
# SWING ANALYSIS ENGINE
# =====================================================================

class SwingAnalysisEngine:
    """Core engine for swing trading analysis using configuration-driven approach."""
    
    def __init__(self):
        self.config_manager = config_manager
        
    async def run_combination_analysis(self, combination: Dict[str, str], limit_per_query: int = 50) -> Dict:
        """Run combination analysis using multiple categories."""
        logger.info(f"🎯 Starting combination analysis with {len(combination)} categories")
        logger.info(f"📊 Limit per query: {limit_per_query}")
        
        weights = self.config_manager.get_scoring_weights()
        logger.info(f"⚖️ Scoring weights: {weights}")
        
        all_stocks = defaultdict(float)
        stock_details = {}  # Store stock details from ChartInk
        category_results = {}
        
        for category, version in combination.items():
            logger.info(f"🔍 Processing category: {category} (version: {version})")
            
            # Get query for this variant
            query = self.config_manager.get_variant_query(category, version)
            if not query:
                logger.warning(f"❌ No query found for {category} {version}")
                continue
            
            logger.info(f"📝 Query for {category}: {query[:100]}...")
            
            # Run chartink query with increased limit
            stocks = await chartink_service.run_query(query, max_results=limit_per_query)
            logger.info(f"📈 {category} query returned {len(stocks)} stocks")
            
            if stocks:
                logger.info(f"🎯 {category} top 5 symbols: {[s.get('name', s.get('nsecode', 'N/A')) for s in stocks[:5]]}")
            else:
                logger.warning(f"⚠️ {category} query returned NO stocks!")
            
            # Calculate weight for this category
            weight = weights.get(category, 25)  # Default weight of 25
            
            category_symbols = []
            
            # Add to scoring and store details
            for stock in stocks:
                # Try different symbol field names - prioritize nsecode for actual trading symbols
                symbol = None
                for field in ['nsecode', 'symbol', 'stock', 'ticker', 'name']:
                    if field in stock and stock[field]:
                        symbol = stock[field]
                        break
                
                if symbol:
                    # Clean up symbol (remove .NS, .BO suffixes)
                    clean_symbol = str(symbol).replace('.NS', '').replace('.BO', '').strip()
                    
                    all_stocks[clean_symbol] += weight  # Add weight to score (0-100 scale)
                    category_symbols.append(clean_symbol)
                    
                    # Store stock details for later use (without Yahoo API call)
                    if clean_symbol not in stock_details:
                        stock_details[clean_symbol] = {
                            'symbol': clean_symbol,
                            'name': stock.get('name', clean_symbol),
                            'price': float(stock.get('close', 0)) if stock.get('close') else 0.0,
                            'volume': int(stock.get('volume', 0)) if stock.get('volume') else 0,
                            'per_change': float(stock.get('per_chg', stock.get('per_change', 0))) if stock.get('per_chg') or stock.get('per_change') else 0.0,
                            'categories': set()
                        }
                    
                    # Add category to this stock
                    stock_details[clean_symbol]['categories'].add(category)
                    
                else:
                    logger.warning(f"⚠️ No valid symbol found in stock data: {stock}")
                    continue
            
            category_results[category] = {
                'version': version,
                'stocks_found': len(stocks),
                'weight': weight,
                'symbols': category_symbols
            }
                
        logger.info(f"📊 Total unique stocks before scoring: {len(all_stocks)}")
        if all_stocks:
            logger.info(f"🏆 Top 10 stocks by score: {dict(list(sorted(all_stocks.items(), key=lambda x: x[1], reverse=True))[:10])}")
        
        # Calculate metrics
        unique_stocks = len(all_stocks)
        total_stocks_across_categories = sum(len(cr['symbols']) for cr in category_results.values())
        
        logger.info(f"📈 Metrics - Unique: {unique_stocks}, Total across categories: {total_stocks_across_categories}")
        
        # Calculate performance score
        if unique_stocks > 0:
            avg_score = sum(all_stocks.values()) / len(all_stocks)
            multi_category_stocks = sum(1 for score in all_stocks.values() if score > max(weights.values()))
            performance_score = min(100, (avg_score / 100) * 100 + (multi_category_stocks / unique_stocks) * 20)
            logger.info(f"📊 Performance metrics - Avg score: {avg_score:.1f}, Multi-category: {multi_category_stocks}, Performance: {performance_score:.1f}")
        else:
            avg_score = 0
            multi_category_stocks = 0
            performance_score = 0
            logger.warning("⚠️ No stocks found - all metrics are 0")
        
        # Sort stocks by score
        sorted_stocks = sorted(all_stocks.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'stocks': dict(sorted_stocks),
            'stock_details': stock_details,
            'metrics': {
                'unique_stocks': unique_stocks,
                'total_stocks_across_categories': total_stocks_across_categories,
                'avg_score': avg_score,
                'multi_category_stocks': multi_category_stocks,
                'performance_score': performance_score,
                'diversity_score': (unique_stocks / max(total_stocks_across_categories, 1)) * 100
            },
            'category_results': category_results,
            'combination_used': combination
        }

# Global analysis engine
analysis_engine = SwingAnalysisEngine()

# =====================================================================
# API MODELS
# =====================================================================

class SwingBuyRequest(BaseModel):
    combination: Optional[Dict[str, str]] = None
    limit_per_query: Optional[int] = 50  # Increased default to get more stocks from ChartInk
    min_score: Optional[float] = 25.0  # Score on 0-100 scale
    top_recommendations: Optional[int] = 20

# =====================================================================
# FASTAPI APPLICATION
# =====================================================================

app = FastAPI(
    title="Swing Trading Server",
    description="Swing trading recommendations with 3-10 day holding periods",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================================
# API ENDPOINTS
# =====================================================================

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "service": "Swing Trading Server",
        "description": "Configuration-driven swing trading recommendations",
        "version": "1.0.0",
        "timeframe": "3-10 days",
        "endpoints": {
            "recommendations": "/api/swing/swing-buy-recommendations",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        # Test configuration loading
        config_loaded = bool(config_manager.config)
        
        # Test current algorithm
        current_algo = config_manager.get_current_algorithm_config()
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "config_loaded": config_loaded,
            "current_algorithm": current_algo.get('name', 'Unknown'),
            "categories_available": list(config_manager.get_scoring_weights().keys())
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/api/swing/swing-buy-recommendations")
async def get_swing_buy_recommendations(request: SwingBuyRequest):
    """
    Get swing trading buy recommendations using configuration-driven seed algorithms.
    
    Features:
    - Multi-factor combination analysis (breakout, momentum, pattern, reversal)
    - Configurable algorithm variants
    - 0-100 scoring system for better usability
    - Enhanced stock data with market information
    - DataFrame-ready response format
    """
    try:
        logger.info("🚀 SWING TRADING ANALYSIS STARTED")
        start_time = time.time()
        
        # Get default combination from current algorithm config
        current_algo = config_manager.get_current_algorithm_config()
        default_combination = current_algo.get('sub_algorithm_config', {
            'breakout': 'v1.0',
            'momentum': 'v1.0', 
            'pattern': 'v1.0',
            'reversal': 'v1.0'
        })
        
        combination = request.combination or default_combination
        
        logger.info(f"📊 Using combination: {combination}")
        
        # Run combination analysis
        result = await analysis_engine.run_combination_analysis(
            combination=combination,
            limit_per_query=request.limit_per_query or 30
        )
        
        # Get stocks with scores
        stocks_with_scores = result['stocks']
        stock_details = result['stock_details']
        logger.info(f"📊 Initial stocks from analysis: {len(stocks_with_scores)}")
        
        # Filter by minimum score
        if request.min_score:
            original_count = len(stocks_with_scores)
            stocks_with_scores = {
                symbol: score for symbol, score in stocks_with_scores.items() 
                if score >= request.min_score
            }
            filtered_count = len(stocks_with_scores)
            logger.info(f"🔍 Score filtering (min_score={request.min_score}): {original_count} -> {filtered_count} stocks")
            if filtered_count < original_count:
                removed_stocks = original_count - filtered_count
                logger.info(f"❌ Removed {removed_stocks} stocks due to low scores")
        
        # Sort and limit
        top_stocks_items = sorted(stocks_with_scores.items(), key=lambda x: x[1], reverse=True)
        before_limit = len(top_stocks_items)
        top_stocks_items = top_stocks_items[:request.top_recommendations or 20]
        after_limit = len(top_stocks_items)
        logger.info(f"📋 Top stocks limiting: {before_limit} -> {after_limit} stocks (limit: {request.top_recommendations or 20})")
        
        # Build final recommendations in DataFrame-ready format
        recommendations = []
        
        for i, (symbol, score) in enumerate(top_stocks_items):
            # Get stock details from ChartInk data
            stock_info = stock_details.get(symbol, {})
            
            if not stock_info:
                logger.warning(f"⚠️ No stock_details found for symbol: '{symbol}'")
                
            categories = list(stock_info.get('categories', set()))
            
            recommendation = {
                "symbol": symbol,
                "name": stock_info.get('name', symbol),
                "price": float(stock_info.get('price', 0)),
                "score": float(score),
                "per_change": float(stock_info.get('per_change', 0)),
                "volume": int(stock_info.get('volume', 0)),
                "appearances": len(categories),
                "category_count": len(categories),
                "recommendation_type": (
                    "Strong Swing" if score >= 70 else 
                    "Swing Buy" if score >= 50 else 
                    "Watch"
                ),
                "breakout": "breakout" in categories,
                "momentum": "momentum" in categories,
                "pattern": "pattern" in categories,
                "reversal": "reversal" in categories,
                "categories": categories
            }
            recommendations.append(recommendation)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Build final response
        response = {
            "status": "success",
            "recommendations": recommendations,
            "metadata": {
                "combination_used": combination,
                "performance_metrics": result.get('metrics', {}),
                "category_breakdown": result.get('category_results', {}),
                "total_recommendations": len(recommendations),
                "request_parameters": request.dict(),
                "timestamp": datetime.now().isoformat(),
                "processing_time_seconds": round(processing_time, 2),
                "algorithm_info": {
                    "approach": "Multi-factor swing analysis",
                    "timeframe": "1-4 weeks",
                    "categories": ["breakout", "momentum", "pattern", "reversal"],
                    "scoring": "Weighted sum (0-100 scale)",
                    "max_possible_score": 100.0,
                    "score_breakdown": "Equal weight distribution based on category appearances"
                }
            },
            "columns": [
                "symbol", "name", "price", "score", "per_change", "volume",
                "appearances", "category_count", "recommendation_type",
                "breakout", "momentum", "pattern", "reversal", "categories"
            ]
        }
        
        # Log the exact JSON response with proper indentation before sending to client
        response_data = {
            "status": "success",
            "recommendations": recommendations,
            "metadata": response['metadata'],
            "columns": response['columns']
        }
        
        logger.info("=" * 60)
        logger.info("EXACT JSON RESPONSE TO CLIENT:")
        logger.info("=" * 60)
        logger.info(json.dumps(response_data, indent=2, ensure_ascii=False))
        logger.info("=" * 60)
        
        return response_data
        
    except Exception as e:
        logger.error(f"❌ Error in swing analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Swing analysis failed: {str(e)}")

@app.get("/api/swing/config")
async def get_swing_config():
    """Get current swing trading configuration."""
    try:
        return {
            "config": config_manager.config,
            "current_algorithm": config_manager.get_current_algorithm_config(),
            "scoring_weights": config_manager.get_scoring_weights()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get config: {str(e)}")

# =====================================================================
# STARTUP/SHUTDOWN HANDLERS
# =====================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("🚀 Starting Swing Trading Server...")
    logger.info(f"📁 Config loaded from: {config_manager.config_path}")
    logger.info(f"🎯 Current algorithm: {config_manager.get_current_algorithm_config().get('name', 'Unknown')}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("🛑 Shutting down Swing Trading Server...")
    await chartink_service.close()

# =====================================================================
# MAIN ENTRY POINT
# =====================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "swing_server:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    ) 