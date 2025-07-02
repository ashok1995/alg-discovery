#!/usr/bin/env python3
"""
Short-Term Trading Server for AlgoDiscovery Trading System
========================================================

This server provides short-term trading recommendations using:
- Configuration-driven seed algorithms with variants (momentum, sector_rotation, breakout, reversal)
- Multi-factor combination analysis for 1-4 week positions
- Advanced sector rotation and institutional volume analysis
- 0-100 scoring system with re-ranking criteria
- Trend persistence and volatility filtering

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

class ShortTermConfigManager:
    """Manages short-term trading configuration and variants."""
    
    def __init__(self):
        self.config_path = Path(__file__).parent / "config" / "short_term_config.json"
        self.config = self._load_config()
        
    def _load_config(self) -> Dict:
        """Load short-term trading configuration."""
        try:
            with open(self.config_path, 'r') as file:
                return json.load(file)
        except Exception as e:
            logger.error(f"Failed to load short-term config: {e}")
            return self._get_fallback_config()
    
    def _get_fallback_config(self) -> Dict:
        """Fallback configuration if file loading fails."""
        return {
            "sub_algorithm_variants": {
                "momentum": {
                    "v1.0": {
                        "query": "( {cash} ( latest close > latest sma(close,20) and latest volume > latest sma(volume,20) * 1.2 ) )",
                        "weight": 0.3,
                        "expected_results": 150
                    }
                }
            },
            "scoring_system": {
                "category_weights": {"momentum": 30, "sector_rotation": 25, "breakout": 25, "reversal": 20}
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
    
    def get_re_ranking_criteria(self) -> Dict:
        """Get re-ranking criteria for short-term analysis."""
        return self.config.get("re_ranking_criteria", {})

# Global configuration manager
config_manager = ShortTermConfigManager()

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
                        
                        # Convert to our format and limit results
                        formatted_stocks = []
                        for stock in stocks[:max_results]:
                            try:
                                # Try different symbol field names - prioritize nsecode for actual trading symbols
                                symbol = None
                                for field in ['nsecode', 'symbol', 'stock', 'ticker', 'name']:
                                    if field in stock and stock[field]:
                                        symbol = stock[field]
                                        break
                                
                                if symbol:
                                    # Clean up symbol (remove .NS, .BO suffixes)
                                    symbol = str(symbol).replace('.NS', '').replace('.BO', '').strip()
                                    
                                    formatted_stock = {
                                        'symbol': symbol,
                                        'price': float(stock.get('close', 0)),
                                        'change': float(stock.get('per_chg', 0)),
                                        'volume': int(stock.get('volume', 0)),
                                        'market_cap': float(stock.get('mcap', 0))
                                    }
                                    formatted_stocks.append(formatted_stock)
                                else:
                                    logger.warning(f"⚠️ No valid symbol found in stock data: {stock}")
                                    continue
                                    
                            except (ValueError, TypeError) as e:
                                logger.warning(f"⚠️ Skipping malformed stock data: {stock} - Error: {e}")
                                continue
                        
                        logger.info(f"✅ Successfully parsed {len(formatted_stocks)} stocks from ChartInk")
                        if formatted_stocks:
                            sample_symbols = [s['symbol'] for s in formatted_stocks[:5]]
                            logger.info(f"🎯 Sample symbols: {sample_symbols}")
                        
                        return formatted_stocks
                        
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
                                
                                # Process the same way as above
                                formatted_stocks = []
                                for stock in stocks[:max_results]:
                                    try:
                                        symbol = None
                                        for field in ['nsecode', 'symbol', 'stock', 'ticker', 'name']:
                                            if field in stock and stock[field]:
                                                symbol = stock[field]
                                                break
                                        
                                        if symbol:
                                            symbol = str(symbol).replace('.NS', '').replace('.BO', '').strip()
                                            formatted_stock = {
                                                'symbol': symbol,
                                                'price': float(stock.get('close', 0)),
                                                'change': float(stock.get('per_chg', 0)),
                                                'volume': int(stock.get('volume', 0)),
                                                'market_cap': float(stock.get('mcap', 0))
                                            }
                                            formatted_stocks.append(formatted_stock)
                                    except (ValueError, TypeError):
                                        continue
                                
                                logger.info(f"✅ Successfully decompressed and parsed {len(formatted_stocks)} stocks")
                                return formatted_stocks
                            else:
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
# SHORT-TERM ANALYSIS ENGINE
# =====================================================================

class ShortTermAnalysisEngine:
    """Short-term analysis engine using ChartInk for stock screening."""
    
    def __init__(self):
        self.config_manager = config_manager
    
    async def run_combination_analysis(self, combination: Dict[str, str], limit_per_query: int = 40) -> Dict:
        """Run combination analysis with direct ChartInk data and scoring."""
        logger.info(f"🚀 Starting combination analysis for {combination}")
        
        all_stocks = defaultdict(float)  # symbol -> accumulated score
        stock_category_mapping = defaultdict(set)  # symbol -> set of categories
        category_results = {}
        stock_details = {}  # symbol -> stock details from ChartInk
        
        weights = self.config_manager.get_scoring_weights()
        logger.info(f"⚖️ Scoring weights: {weights}")
        
        for category, version in combination.items():
            logger.info(f"📊 Processing {category} v{version}...")
            
            query = self.config_manager.get_variant_query(category, version)
            if not query:
                logger.warning(f"⚠️ No query found for {category} v{version}")
                continue
            
            stocks = await chartink_service.run_query(query, max_results=limit_per_query)
            
            if stocks:
                logger.info(f"🎯 {category} returned {len(stocks)} stocks")
                
                # Store stock details from ChartInk - prioritize nsecode as symbol
                for stock in stocks:
                    # Try different field names for symbol, prioritizing nsecode for actual trading symbols
                    symbol = None
                    for field in ['nsecode', 'symbol', 'stock', 'ticker', 'name']:
                        if field in stock and stock[field]:
                            symbol = str(stock[field]).upper().strip()
                            break
                    
                    if symbol:
                        stock_details[symbol] = {
                            'symbol': symbol,
                            'name': stock.get('name', symbol),
                            'price': float(stock.get('per', 0) or stock.get('price', 0) or 0),
                            'volume': int(stock.get('volume', 0) or 0),
                            'per_change': float(stock.get('per_chg', 0) or stock.get('change', 0) or 0),
                            'categories': []
                        }
                
                logger.info(f"🎯 {category} top 5 symbols: {[s.get('nsecode', s.get('symbol', 'N/A')) for s in stocks[:5]]}")
            else:
                logger.warning(f"⚠️ {category} query returned NO stocks!")
            
            # Calculate weight for this category
            weight = weights.get(category, 25)  # Default weight of 25
            
            category_results[category] = {
                'version': version,
                'stocks_found': len(stocks),
                'weight': weight,
                'symbols': [stock.get('nsecode', stock.get('symbol', '')) for stock in stocks if stock.get('nsecode') or stock.get('symbol')]
            }
            
            # Add to scoring and track categories
            for stock in stocks:
                symbol = None
                for field in ['nsecode', 'symbol', 'stock', 'ticker', 'name']:
                    if field in stock and stock[field]:
                        symbol = str(stock[field]).upper().strip()
                        break
                
                if symbol:
                    all_stocks[symbol] += weight  # Add weight to score (0-100 scale)
                    stock_category_mapping[symbol].add(category)
                    # Update categories in stock_details
                    if symbol in stock_details:
                        stock_details[symbol]['categories'].append(category)
        
        logger.info(f"📊 Total unique stocks before filtering: {len(all_stocks)}")
        if all_stocks:
            logger.info(f"🏆 Top 10 stocks by score: {dict(list(sorted(all_stocks.items(), key=lambda x: x[1], reverse=True))[:10])}")
        
        # Calculate metrics (no re-ranking needed since we're using ChartInk data directly)
        unique_stocks = len(all_stocks)
        total_stocks_across_categories = sum(len(cr['symbols']) for cr in category_results.values())
        
        logger.info(f"📈 Metrics - Unique: {unique_stocks}, Total across categories: {total_stocks_across_categories}")
        
        # Calculate performance score
        if unique_stocks > 0:
            avg_score = sum(all_stocks.values()) / len(all_stocks)
            multi_category_stocks = sum(1 for symbol in all_stocks 
                                      if len(stock_category_mapping[symbol]) > 1)
            performance_score = min(100, (avg_score / 100) * 100 + (multi_category_stocks / unique_stocks) * 30)
            logger.info(f"📊 Performance metrics - Avg score: {avg_score:.1f}, Multi-category: {multi_category_stocks}, Performance: {performance_score:.1f}")
        else:
            avg_score = 0
            multi_category_stocks = 0
            performance_score = 0
            logger.warning("⚠️ No stocks found - all metrics are 0")
        
        # Sort stocks by final score
        sorted_stocks = sorted(all_stocks.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'stocks_with_scores': dict(sorted_stocks),
            'stock_details': stock_details,
            'stock_categories': {symbol: list(categories) for symbol, categories in stock_category_mapping.items()},
            'metrics': {
                'unique_stocks': unique_stocks,
                'total_stocks_across_categories': total_stocks_across_categories,
                'avg_score': avg_score,
                'multi_category_stocks': multi_category_stocks,
                'performance_score': performance_score,
                'diversity_score': (unique_stocks / max(total_stocks_across_categories, 1)) * 100,
                'chartink_data_only': True
            },
            'category_results': category_results,
            'combination_used': combination
        }

# Global analysis engine
analysis_engine = ShortTermAnalysisEngine()

# =====================================================================
# API MODELS
# =====================================================================

class ShortTermBuyRequest(BaseModel):
    combination: Optional[Dict[str, str]] = None
    limit_per_query: Optional[int] = 50  # Increased from 40 to 50 for more stocks from ChartInk
    min_score: Optional[float] = 35.0  # Score on 0-100 scale (higher threshold for short-term)
    top_recommendations: Optional[int] = 20

# =====================================================================
# FASTAPI APPLICATION
# =====================================================================

app = FastAPI(
    title="Short-Term Trading Server",
    description="Short-term trading recommendations with 1-4 week holding periods",
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
        "service": "Short-Term Trading Server",
        "description": "Configuration-driven short-term trading recommendations with re-ranking",
        "version": "1.0.0",
        "timeframe": "1-4 weeks",
        "endpoints": {
            "recommendations": "/api/shortterm/shortterm-buy-recommendations",
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
            "categories_available": list(config_manager.get_scoring_weights().keys()),
            "re_ranking_enabled": bool(config_manager.get_re_ranking_criteria())
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.post("/api/shortterm/shortterm-buy-recommendations")
async def get_shortterm_buy_recommendations(request: ShortTermBuyRequest):
    """
    Get short-term trading buy recommendations using ChartInk data directly.
    
    Features:
    - Multi-factor combination analysis (momentum, sector_rotation, breakout, reversal)
    - Direct ChartInk data usage with nsecode symbols
    - 0-100 scoring system based on weighted sum
    - DataFrame-ready response format
    """
    try:
        logger.info("🚀 SHORT-TERM TRADING ANALYSIS STARTED")
        start_time = time.time()
        
        # Get default combination from current algorithm config
        current_algo = config_manager.get_current_algorithm_config()
        default_combination = current_algo.get('sub_algorithm_config', {
            'momentum': 'v1.0',
            'sector_rotation': 'v1.0',
            'breakout': 'v1.0',
            'reversal': 'v1.0'
        })
        
        combination = request.combination or default_combination
        
        logger.info(f"📊 Using combination: {combination}")
        
        # Run combination analysis with ChartInk data
        result = await analysis_engine.run_combination_analysis(
            combination=combination,
            limit_per_query=request.limit_per_query or 50
        )
        
        # Get stocks with scores and details
        stocks_with_scores = result['stocks_with_scores']
        stock_details = result['stock_details']
        stock_categories = result['stock_categories']
        logger.info(f"📊 Initial stocks from analysis: {len(stocks_with_scores)}")
        
        # Filter by minimum score
        if request.min_score:
            original_count = len(stocks_with_scores)
            filtered_stocks = {
                symbol: score for symbol, score in stocks_with_scores.items() 
                if score >= request.min_score
            }
            filtered_count = len(filtered_stocks)
            logger.info(f"🔍 Score filtering (min_score={request.min_score}): {original_count} -> {filtered_count} stocks")
        else:
            filtered_stocks = stocks_with_scores
        
        # Sort and limit to top recommendations
        top_stocks_items = sorted(filtered_stocks.items(), key=lambda x: x[1], reverse=True)
        before_limit = len(top_stocks_items)
        top_stocks_items = top_stocks_items[:request.top_recommendations or 20]
        after_limit = len(top_stocks_items)
        logger.info(f"📋 Top stocks limiting: {before_limit} -> {after_limit} stocks")
        
        # Build final recommendations in DataFrame-ready format
        recommendations = []
        for symbol, score in top_stocks_items:
            stock_detail = stock_details.get(symbol, {})
            categories = stock_categories.get(symbol, [])
            
            # Determine categories for this stock
            def _determine_categories(score: float) -> str:
                """Determine category based on score and original categories."""
                if score >= 75:
                    return "Strong Short-Term"
                elif score >= 55:
                    return "Short-Term Buy"
                else:
                    return "Watch"
            
            recommendation = {
                "symbol": symbol,
                "name": stock_detail.get('name', symbol),
                "price": float(stock_detail.get('price', 0)),
                "score": float(score),
                "per_change": float(stock_detail.get('per_change', 0)),
                "volume": int(stock_detail.get('volume', 0)),
                "recommendation_type": _determine_categories(score),
                "appearances": len(categories),
                "category_count": len(categories),
                "momentum": "momentum" in categories,
                "sector_rotation": "sector_rotation" in categories,
                "breakout": "breakout" in categories,
                "reversal": "reversal" in categories,
                "categories": categories
            }
            recommendations.append(recommendation)
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Build final response
        response_data = {
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
                    "approach": "Multi-factor short-term analysis with ChartInk data",
                    "timeframe": "1-4 weeks", 
                    "categories": ["momentum", "sector_rotation", "breakout", "reversal"],
                    "scoring": "Weighted sum using ChartInk data (0-100 scale)",
                    "max_possible_score": 100.0,
                    "score_breakdown": "Momentum: 30pts, Sector Rotation: 25pts, Breakout: 25pts, Reversal: 20pts",
                    "data_source": "ChartInk with nsecode symbols"
                }
            },
            "columns": [
                "symbol", "name", "price", "score", "per_change", "volume",
                "recommendation_type", "appearances", "category_count",
                "momentum", "sector_rotation", "breakout", "reversal", "categories"
            ]
        }
        
        # Log the exact JSON response with proper indentation before sending to client
        logger.info("=" * 60)
        logger.info("EXACT JSON RESPONSE TO CLIENT:")
        logger.info("=" * 60)
        logger.info(json.dumps(response_data, indent=2, ensure_ascii=False))
        logger.info("=" * 60)
        
        return response_data
        
    except Exception as e:
        logger.error(f"❌ Error in short-term analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Short-term analysis failed: {str(e)}")

@app.get("/api/shortterm/config")
async def get_shortterm_config():
    """Get current short-term trading configuration."""
    try:
        return {
            "config": config_manager.config,
            "current_algorithm": config_manager.get_current_algorithm_config(),
            "scoring_weights": config_manager.get_scoring_weights(),
            "re_ranking_criteria": config_manager.get_re_ranking_criteria()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get config: {str(e)}")

# =====================================================================
# STARTUP/SHUTDOWN HANDLERS
# =====================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("🚀 Starting Short-Term Trading Server...")
    logger.info(f"📁 Config loaded from: {config_manager.config_path}")
    logger.info(f"🎯 Current algorithm: {config_manager.get_current_algorithm_config().get('name', 'Unknown')}")
    logger.info(f"🔄 Re-ranking criteria: {len(config_manager.get_re_ranking_criteria())} factors")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("🛑 Shutting down Short-Term Trading Server...")
    await chartink_service.close()

# =====================================================================
# MAIN ENTRY POINT
# =====================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "shortterm_server:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    ) 