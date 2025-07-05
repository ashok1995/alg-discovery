#!/usr/bin/env python3
"""
Intraday BUY Server
===================

A trimmed-down FastAPI server that offers ONLY intraday BUY recommendations.
It re-uses the existing `IntradayService` for the underlying logic but avoids
hosting the SELL path so it can be deployed independently on its own port.

Default port: 8004 (override with PORT environment variable or env file).
"""

import logging
import time
from dataclasses import asdict
from datetime import datetime
from typing import List, Optional, Dict, Any
import json
import asyncio  # For handling client disconnect cancellations

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Local helpers
from api.env_loader import load_server_environment, setup_logging
from api.services.data_service import RealTimeDataService
from api.services.intraday_service import IntradayService
from shared.config import load_config
from api.models.recommendation_models import RecommendationCache, RecommendationRequest, RecommendationType

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment & logging
# ---------------------------------------------------------------------------

config = load_server_environment("intraday_buy") or {
    "server_type": "intraday_buy",
    "port": 8004,
    "host": "0.0.0.0",
    "cors_origins": [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
    ],
}
setup_logging("intraday_buy")

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Intraday BUY Server",
    description="Intraday BUY recommendations (AlgoDiscovery)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.get("cors_origins", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------

data_service: Optional[RealTimeDataService] = None
intraday_service: Optional[IntradayService] = None
recommendation_cache: Optional[RecommendationCache] = None


# ---------------------------------------------------------------------------
# Models & helpers
# ---------------------------------------------------------------------------

class BuyRequest(BaseModel):
    limit: int = Field(10, ge=1, le=100)
    chartink_theme: str = Field("intraday_buy")


class IntradayCombinationRequest(BaseModel):
    """Request model for intraday buy recommendations using variant combinations."""
    combination: Dict[str, str] = Field(
        ..., 
        description="Variant combination mapping category to version (e.g., {'momentum': 'v1.0', 'reversal': 'v2.0', 'technical': 'v1.5', 'volume': 'v1.0'})"
    )
    limit_per_query: int = Field(50, ge=10, le=200, description="Maximum stocks to fetch per category query")
    min_score: float = Field(25.0, ge=0.0, le=100.0, description="Minimum score threshold for recommendations")
    top_recommendations: int = Field(20, ge=5, le=50, description="Number of top recommendations to return")
    force_refresh: bool = Field(False, description="Force fresh analysis bypassing cache")


def _serialise(signals: List):
    """Serialize IntradaySignal objects for JSON response."""
    return [asdict(signal) for signal in signals]

def _validate_combination_request(combination: Dict[str, str], available_variants: Dict) -> None:
    """Validate that the requested combination has valid categories and versions."""
    # Determine valid categories based on what shape the service returned
    if "categories" in available_variants and available_variants["categories"]:
        valid_categories = {c.replace("_buy", "") for c in available_variants["categories"].keys()}
    elif "variants" in available_variants and available_variants["variants"]:
        valid_categories = {c.replace("_buy", "") for c in available_variants["variants"].keys()}
    else:
        # Fallback to common defaults
        valid_categories = {"momentum", "reversal", "technical", "volume"}
    
    for category, version in combination.items():
        if category not in valid_categories:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid category '{category}'. Available categories: {sorted(valid_categories)}"
            )
        
        # Check if version format is valid (should be like v1.0, v1.1, etc.)
        if not version.startswith("v") or "." not in version:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid version format '{version}'. Version should be like 'v1.0', 'v1.1', etc."
            )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {
        "service": "Intraday BUY Server",
        "endpoints": {
            "legacy": "/api/intraday/intraday-buy-recommendations",
            "combination": "/api/intraday/combination-buy-recommendations",
            "variants": "/api/intraday/available-variants"
        },
        "health": "/health",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy" if intraday_service else "initialising",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.post("/api/intraday/intraday-buy-recommendations")
async def get_buy_recommendations(req: BuyRequest, raw_request: Request):
    if not intraday_service:
        raise HTTPException(status_code=503, detail="Service not ready")

    start = time.time()
    try:
        signals = await intraday_service.get_intraday_buy_recommendations(
            limit=req.limit, chartink_theme=req.chartink_theme
        )
    except Exception as exc:
        logger.exception("BUY recommendation generation failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "status": "success",
        "recommendations": _serialise(signals),
        "total": len(signals),
        "processing_time_seconds": round(time.time() - start, 2),
        "timestamp": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# New Endpoint: Available Sub-Algorithm Variants
# ---------------------------------------------------------------------------


@app.get("/api/intraday/available-variants")
async def get_available_variants():
    """Return available sub-algorithm variants (category → version → details)."""
    try:
        if not hasattr(app.state, "config"):
            raise HTTPException(status_code=503, detail="Configuration not loaded")

        config_data = app.state.config

        variants_summary = {}
        for category, variants in config_data.get("sub_algorithm_variants", {}).items():
            variants_summary[category] = {
                version: {
                    "name": variant_info.get("name"),
                    "weight": variant_info.get("weight"),
                }
                for version, variant_info in variants.items()
            }

        return {
            "status": "success",
            "variants": variants_summary,
            "total_categories": len(variants_summary),
            "timestamp": datetime.utcnow().isoformat(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error fetching available variants")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/intraday/combination-buy-recommendations")
async def get_combination_buy_recommendations(
    request: IntradayCombinationRequest
) -> Dict[str, Any]:
    """
    Get intraday buy recommendations using a combination of algorithm variants.
    
    This endpoint allows testing different combinations of variants and stores
    the combination used in cache for tracking performance.
    """
    try:
        # Get available variants to validate the request
        available_variants = await intraday_service.get_available_variants()
        
        # Validate the combination
        _validate_combination_request(request.combination, available_variants)
        
        # Map variants to actual ChartInk queries
        chartink_queries_map = {
            "momentum": {
                "v1.0": ("gap_momentum", "Gap Up Momentum"),
                "v1.1": ("volume_breakout", "Volume Breakout with Momentum")
            },
            "reversal": {
                "v1.0": ("morning_momentum", "Morning Momentum Reversal"),
                "v1.1": ("gap_momentum", "Opening Range Breakout")
            },
            "technical": {
                "v1.0": ("volume_breakout", "VWAP Support with Volume"),
                "v1.1": ("morning_momentum", "Previous Day High Breakout")
            },
            "volume": {
                "v1.0": ("volume_breakout", "High Volume Surge"),
                "v1.1": ("gap_momentum", "Afternoon Volume Breakout")
            }
        }
        
        # Build metadata and prepare for analysis
        combination_metadata = {
            "combination_used": request.combination,
            "performance_metrics": {
                "unique_stocks": 0,
                "total_stocks_found": 0,
                "multi_category_stocks": 0,
                "diversity_score": 0,
                "coverage_score": 0,
                "performance_score": 0.0,
                "total_weight": 0
            },
            "category_breakdown": {},
            "total_recommendations": 0,
            "request_parameters": {
                "combination": request.combination,
                "limit_per_query": request.limit_per_query,
                "min_score": float(request.min_score),
                "top_recommendations": request.top_recommendations,
                "force_refresh": request.force_refresh
            },
            "timestamp": datetime.now().isoformat(),
            "processing_time_seconds": 0.0,
            "cache_hit": False,
            "fresh_analysis": request.force_refresh,
            "force_refresh": request.force_refresh,
            "algorithm_info": {
                "approach": "Multi-category intraday analysis with variant combinations",
                "timeframe": "intraday",
                "categories": list(request.combination.keys()),
                "scoring": "Category weight-based scoring (0-100 scale)",
                "combination_strategy": "Frequency + weight-based ranking",
                "data_source": "ChartInk with nsecode symbols"
            }
        }
        
        # Check cache first if not forced refresh
        cache_key = None
        if not request.force_refresh and hasattr(intraday_service, 'cache'):
            import hashlib
            cache_data = {
                "combination": request.combination,
                "limit_per_query": request.limit_per_query,
                "min_score": request.min_score,
                "top_recommendations": request.top_recommendations
            }
            cache_key = hashlib.md5(json.dumps(cache_data, sort_keys=True).encode()).hexdigest()
            
            cached_result = await intraday_service.cache.get_cached_result(cache_key)
            if cached_result:
                combination_metadata["cache_hit"] = True
                combination_metadata["fresh_analysis"] = False
                return {
                    "status": "success",
                    "recommendations": cached_result.get("recommendations", []),
                    "metadata": {**combination_metadata, **cached_result.get("metadata", {})}
                }
        
        start_time = time.time()
        
        # Process each category in the combination
        all_stocks = {}
        category_weights = {}
        
        for category, version in request.combination.items():
            try:
                # Get the query mapping
                query_mapping = chartink_queries_map.get(category, {}).get(version)
                if not query_mapping:
                    logger.warning(f"No query mapping found for {category} {version}, using fallback")
                    query_key = "gap_momentum"  # Default fallback
                    variant_name = f"{category.title()} {version}"
                else:
                    query_key, variant_name = query_mapping
                
                # Get variant details for weight
                category_key = f"{category}_buy"
                variant_details = None
                if "variants" in available_variants and category_key in available_variants["variants"]:
                    variant_data = available_variants["variants"][category_key].get(version, {})
                    variant_details = {"weight": variant_data.get("weight", 1.0)}
                else:
                    variant_details = {"weight": 1.0}
                
                weight = variant_details.get("weight", 1.0)
                category_weights[category] = weight
                
                # Get stocks using the mapped ChartInk theme
                logger.info(f"Fetching stocks for {category} {version} using query: {query_key}")
                stocks = await intraday_service.get_intraday_buy_recommendations(
                    limit=request.limit_per_query, 
                    chartink_theme=query_key
                )
                
                stocks_found = len(stocks)
                combination_metadata["category_breakdown"][category] = {
                    "version": version,
                    "name": variant_name,
                    "stocks_found": stocks_found,
                    "weight": weight,
                    "query_success": stocks_found > 0,
                    "error": "No results from ChartInk" if stocks_found == 0 else None
                }
                
                # Add stocks to collection with category tracking
                for stock in stocks:
                    symbol = stock.symbol
                    if symbol not in all_stocks:
                        all_stocks[symbol] = {
                            "stock": stock,
                            "categories": [],
                            "total_weight": 0,
                            "frequency": 0
                        }
                    
                    all_stocks[symbol]["categories"].append(category)
                    all_stocks[symbol]["total_weight"] += weight
                    all_stocks[symbol]["frequency"] += 1
                
            except Exception as e:
                logger.error(f"Error processing category {category}: {e}")
                combination_metadata["category_breakdown"][category] = {
                    "version": version,
                    "name": f"Error processing {category}",
                    "stocks_found": 0,
                    "weight": 1.0,
                    "query_success": False,
                    "error": str(e)
                }
        
        # Calculate performance metrics
        unique_stocks = len(all_stocks)
        total_stocks_found = sum(
            breakdown["stocks_found"] 
            for breakdown in combination_metadata["category_breakdown"].values()
        )
        multi_category_stocks = sum(
            1 for stock_data in all_stocks.values() 
            if len(stock_data["categories"]) > 1
        )
        
        # Score and rank stocks based on frequency and weights
        scored_stocks = []
        for symbol, stock_data in all_stocks.items():
            # Calculate composite score
            frequency_score = (stock_data["frequency"] / len(request.combination)) * 50
            weight_score = (stock_data["total_weight"] / sum(category_weights.values())) * 50
            composite_score = frequency_score + weight_score
            
            if composite_score >= request.min_score:
                # Update the stock's strength with composite score
                stock = stock_data["stock"]
                stock.strength = int(composite_score)
                
                scored_stocks.append({
                    "stock": stock,
                    "score": composite_score,
                    "categories": stock_data["categories"],
                    "frequency": stock_data["frequency"],
                    "total_weight": stock_data["total_weight"]
                })
        
        # Sort by score and take top recommendations
        scored_stocks.sort(key=lambda x: x["score"], reverse=True)
        top_stocks = scored_stocks[:request.top_recommendations]
        
        # Prepare final recommendations
        recommendations = [item["stock"] for item in top_stocks]
        
        # Update metadata
        combination_metadata["performance_metrics"].update({
            "unique_stocks": unique_stocks,
            "total_stocks_found": total_stocks_found,
            "multi_category_stocks": multi_category_stocks,
            "diversity_score": (multi_category_stocks / unique_stocks * 100) if unique_stocks > 0 else 0,
            "coverage_score": (unique_stocks / max(total_stocks_found, 1) * 100),
            "performance_score": sum(item["score"] for item in top_stocks) / len(top_stocks) if top_stocks else 0.0,
            "total_weight": sum(category_weights.values())
        })
        combination_metadata["total_recommendations"] = len(recommendations)
        combination_metadata["processing_time_seconds"] = round(time.time() - start_time, 2)
        
        # Cache the result if cache is available
        if cache_key and hasattr(intraday_service, 'cache'):
            from dataclasses import asdict as _asdict
            cache_result = {
                "recommendations": [_asdict(stock) for stock in recommendations],
                "metadata": combination_metadata
            }
            await intraday_service.cache.store_result(cache_key, cache_result)
        
        return {
            "status": "success",
            "recommendations": [asdict(r) for r in recommendations],
            "metadata": combination_metadata
        }
        
    except Exception as e:
        # Allow FastAPI to handle expected HTTPException or cancellations gracefully
        # Differentiate between genuine errors and cancellations due to client disconnect or reload
        if isinstance(e, asyncio.CancelledError):
            # Let FastAPI/Uvicorn propagate 499 Client Closed Request
            logger.warning("Combination request cancelled – client disconnected or server reload")
            raise

        if isinstance(e, HTTPException):
            # Input validation errors etc. – re-raise so FastAPI returns the correct status
            raise

        logger.exception("Error in combination analysis:")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {type(e).__name__}: {e}")


async def _run_intraday_combination_analysis(config_data: Dict, combination: Dict[str, str], limit_per_query: int) -> Dict:
    """
    Run intraday combination analysis using multiple categories.
    
    Args:
        config_data: Configuration data with sub_algorithm_variants
        combination: Dict mapping category to version (e.g., {'momentum': 'v1.0'})
        limit_per_query: Max stocks to fetch per category
    
    Returns:
        Dict with stocks, stock_details, metrics, and category_results
    """
    from collections import defaultdict
    from api.data.chartink import get_chartink_scans
    
    # Get category weights from config
    scoring_criteria = config_data.get('scoring_criteria', {})
    weights = {
        'momentum_buy': scoring_criteria.get('momentum_weight', 0.25),
        'reversal_buy': scoring_criteria.get('reversal_weight', 0.25),
        'technical_buy': scoring_criteria.get('technical_weight', 0.25),
        'volume_buy': scoring_criteria.get('volume_weight', 0.25)
    }
    
    all_stocks = defaultdict(float)
    stock_appearances = defaultdict(int)
    stock_categories = defaultdict(set)
    stock_details = {}
    category_results = {}
    
    total_weight = 0
    total_stocks_found = 0
    
    logger.info(f"🔍 Running combination analysis with {len(combination)} categories...")
    
    # Process each category in the combination
    for category, version in combination.items():
        try:
            # Add '_buy' suffix for intraday buy variants
            category_key = f"{category}_buy"
            
            if category_key not in config_data['sub_algorithm_variants']:
                logger.warning(f"⚠️ Category {category_key} not found in configuration")
                continue
                
            variant_data = config_data['sub_algorithm_variants'][category_key][version]
            query = variant_data['query']
            weight = variant_data['weight']
            name = variant_data['name']
            
            logger.info(f"📊 Processing {category} v{version}: {name} (weight: {weight})")
            
            # Execute Chartink query
            df = get_chartink_scans(query, debug=False, use_cache=True)
            
            if not df.empty and len(df) > 0:
                stocks_found = min(len(df), limit_per_query)
                stocks = df.head(limit_per_query).to_dict('records')
                
                logger.info(f"✅ {category} returned {stocks_found} stocks")
                
                category_results[category] = {
                    'version': version,
                    'name': name,
                    'stocks_found': stocks_found,
                    'weight': weight,
                    'query_success': True
                }
                
                total_stocks_found += stocks_found
                total_weight += weight
                
                # Process stocks from this category
                for stock in stocks:
                    # Try different field names for symbol
                    symbol = None
                    for field in ['nsecode', 'symbol', 'stock', 'ticker', 'name']:
                        if field in stock and stock[field]:
                            symbol = str(stock[field]).upper().strip()
                            break
                    
                    if symbol:
                        # Add to scoring
                        all_stocks[symbol] += weight * 100
                        stock_appearances[symbol] += 1
                        stock_categories[symbol].add(category_key)
                        
                        # Store stock details (use first occurrence or update with better data)
                        if symbol not in stock_details or stock_details[symbol].get('price', 0) == 0:
                            stock_details[symbol] = {
                                'symbol': symbol,
                                'name': stock.get('name', symbol),
                                'price': float(stock.get('close', 0) or stock.get('price', 0) or 0),
                                'volume': int(stock.get('volume', 0) or 0),
                                'per_change': float(stock.get('per_chg', 0) or stock.get('change', 0) or 0),
                                'categories': []
                            }
                
                # Log top symbols from this category
                top_symbols = [
                    stock.get('nsecode', stock.get('symbol', 'N/A')) 
                    for stock in stocks[:5]
                ]
                logger.info(f"🎯 {category} top 5 symbols: {top_symbols}")
                
            else:
                logger.warning(f"⚠️ {category} query returned NO stocks!")
                category_results[category] = {
                    'version': version,
                    'name': name,
                    'stocks_found': 0,
                    'weight': weight,
                    'query_success': False,
                    'error': 'No results from ChartInk'
                }
            
        except Exception as e:
            logger.error(f"💥 Error processing {category} {version}: {e}")
            category_results[category] = {
                'version': version,
                'name': f'Error: {category}',
                'stocks_found': 0,
                'weight': 0,
                'query_success': False,
                'error': str(e)
            }
    
    # Calculate metrics
    unique_stocks = len(all_stocks)
    multi_category_stocks = sum(1 for s in stock_categories.values() if len(s) > 1)
    
    # Create ranked list of stocks
    ranked_stocks = []
    for symbol, score in all_stocks.items():
        ranked_stocks.append({
            'symbol': symbol,
            'score': score,
            'appearances': stock_appearances[symbol],
            'categories': list(stock_categories[symbol])
        })
    
    # Sort by score
    ranked_stocks.sort(key=lambda x: x['score'], reverse=True)
    
    # Calculate performance metrics
    diversity_score = (multi_category_stocks / max(unique_stocks, 1)) * 100 if unique_stocks > 0 else 0
    coverage_score = (unique_stocks / max(total_stocks_found, 1)) * 100 if total_stocks_found > 0 else 0
    weight_efficiency = (total_weight / len(combination)) if total_weight > 0 else 0
    performance_score = (diversity_score * 0.4 + coverage_score * 0.3 + weight_efficiency * 100 * 0.3)
    
    logger.info(f"📊 Analysis Complete: {unique_stocks} unique stocks, {multi_category_stocks} multi-category")
    
    return {
        'stocks': ranked_stocks,
        'stock_details': stock_details,
        'metrics': {
            'unique_stocks': unique_stocks,
            'total_stocks_found': total_stocks_found,
            'multi_category_stocks': multi_category_stocks,
            'diversity_score': round(diversity_score, 2),
            'coverage_score': round(coverage_score, 2),
            'performance_score': round(performance_score, 2),
            'total_weight': total_weight
        },
        'category_results': category_results,
        'combination': combination,
        'tested_at': datetime.utcnow().isoformat()
    }


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup():
    global data_service, intraday_service, recommendation_cache
    logger.info("🚀 Starting Intraday BUY server …")
    data_service = RealTimeDataService()
    intraday_service = IntradayService(data_service)

    # Initialize recommendation cache
    try:
        recommendation_cache = RecommendationCache()
        await recommendation_cache.initialize()
        logger.info("✅ Recommendation cache initialized")
    except Exception as cache_exc:
        logger.warning("⚠️ Failed to initialize recommendation cache: %s", cache_exc)
        recommendation_cache = None

    # Load intraday buy configuration and store in app state for quick access
    try:
        app.state.config = load_config("intraday_buy")
        logger.info("✅ Loaded intraday_buy configuration with %d categories", len(app.state.config.get("sub_algorithm_variants", {})))
    except Exception as cfg_exc:
        logger.warning("⚠️ Failed to load intraday_buy configuration: %s", cfg_exc)

    logger.info("✅ Services initialised")


@app.on_event("shutdown")
async def shutdown():
    logger.info("🛑 Shutting down Intraday BUY server …")
    
    # Close recommendation cache
    if recommendation_cache:
        try:
            await recommendation_cache.close()
            logger.info("✅ Recommendation cache closed")
        except Exception as e:
            logger.warning("⚠️ Error closing recommendation cache: %s", e)


# ---------------------------------------------------------------------------
# Entrypoint helper
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Stand-alone execution is deprecated; use the consolidated server instead:
    #   uvicorn alg_discovery.api.v1.main:app --reload
    from warnings import warn

    warn(
        "Running 'intraday_buy_server' directly is deprecated. Use the central FastAPI app.",
        DeprecationWarning,
    ) 