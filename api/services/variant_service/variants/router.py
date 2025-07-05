"""
Router for variant endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import Dict, Optional
from datetime import datetime
from pydantic import BaseModel

from ..models import PageType, VariantResponse, IntradayVariantResponse, AlgorithmVariant
from utils.api_logger import APILogger
from utils.config_loader import ConfigLoader
from utils.query_tester import test_query_silent

logger = APILogger(__name__, service="variants")
router = APIRouter()

class CombinationTestRequest(BaseModel):
    """Request model for testing variant combinations."""
    fundamental_version: str
    momentum_version: str
    value_version: str
    quality_version: str
    limit_per_query: Optional[int] = 50

@router.get("/{page_type}")
async def get_algorithm_variants(page_type: PageType):
    """Get all available algorithm variants for a specific page type."""
    try:
        config = ConfigLoader.load_config(page_type)
        
        # Handle intraday buy/sell separately
        if page_type in [PageType.INTRADAY_BUY, PageType.INTRADAY_SELL]:
            return await get_intraday_variants(page_type, config)
        
        # Handle other page types
        return await get_standard_variants(page_type, config)
        
    except Exception as e:
        logger.error(f"Error getting variants for {page_type}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available")
async def get_available_variants(page_type: PageType):
    """Get all available query variants by category for combination building."""
    try:
        config = ConfigLoader.load_config(page_type)
        variants_summary = {}
        
        if page_type in [PageType.INTRADAY_BUY, PageType.INTRADAY_SELL]:
            categories = ["momentum", "reversal", "technical", "volume"]
            variant_prefix = "_buy" if page_type == PageType.INTRADAY_BUY else "_sell"
        else:
            categories = ["fundamental", "momentum", "value", "quality"]
            variant_prefix = ""
        
        for category in categories:
            category_key = f"{category}{variant_prefix}" if variant_prefix else category
            variants = config['sub_algorithm_variants'].get(category_key, {})
            variants_summary[category] = {
                version: {
                    "name": data['name'],
                    "description": data.get('description', ''),
                    "weight": data['weight'],
                    "expected_results": data.get('expected_results', 'N/A')
                }
                for version, data in variants.items()
            }
        
        total_combinations = 1
        for category in variants_summary.values():
            total_combinations *= len(category)
        
        return {
            "status": "success",
            "variants": variants_summary,
            "total_categories": len(variants_summary),
            "total_combinations": total_combinations,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting available variants: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test-combination")
async def test_combination(page_type: PageType, request: CombinationTestRequest):
    """Test a specific combination of query variants and return detailed results."""
    try:
        config = ConfigLoader.load_config(page_type)
        
        logger.info(f"🧪 Testing combination for {page_type}: F:{request.fundamental_version} M:{request.momentum_version} V:{request.value_version} Q:{request.quality_version}")
        
        result = await run_combination_analysis(
            config,
            request.fundamental_version,
            request.momentum_version,
            request.value_version,
            request.quality_version,
            request.limit_per_query or 50,
            page_type
        )
        
        return {
            "status": "success",
            "test_results": result,
            "combination_tested": {
                "fundamental": request.fundamental_version,
                "momentum": request.momentum_version,
                "value": request.value_version,
                "quality": request.quality_version
            },
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ Error testing combination: {e}")
        raise HTTPException(status_code=500, detail=f"Error testing combination: {str(e)}")

async def get_intraday_variants(page_type: PageType, config: Dict) -> IntradayVariantResponse:
    """Get variants for intraday trading."""
    variants = config["sub_algorithm_variants"]
    
    variant_mapping = {
        "momentum": "momentum_buy" if page_type == PageType.INTRADAY_BUY else "momentum_sell",
        "reversal": "reversal_buy" if page_type == PageType.INTRADAY_BUY else "reversal_sell",
        "technical": "technical_buy" if page_type == PageType.INTRADAY_BUY else "technical_sell",
        "volume": "volume_buy" if page_type == PageType.INTRADAY_BUY else "volume_sell"
    }
    
    transformed_variants = {
        category: {
            k: AlgorithmVariant(
                name=v["name"],
                description=v.get("description", ""),
                query=v["query"],
                weight=float(v["weight"]),
                expected_results=v.get("expected_results", 0)
            )
            for k, v in variants[variant_name].items()
        }
        for category, variant_name in variant_mapping.items()
    }
    
    default_combo = None
    if "current_version" in config and "algorithms" in config:
        current_version = config["current_version"]
        if current_version in config["algorithms"]:
            default_combo = config["algorithms"][current_version].get("sub_algorithm_config")
    
    weights = None
    if "scoring_criteria" in config:
        weights = {
            "momentum": config["scoring_criteria"].get("momentum_weight", 0.25),
            "reversal": config["scoring_criteria"].get("reversal_weight", 0.25),
            "technical": config["scoring_criteria"].get("technical_weight", 0.25),
            "volume": config["scoring_criteria"].get("volume_weight", 0.25)
        }
    
    return IntradayVariantResponse(
        momentum=transformed_variants["momentum"],
        reversal=transformed_variants["reversal"],
        technical=transformed_variants["technical"],
        volume=transformed_variants["volume"],
        default_combination=default_combo,
        page_specific_weights=weights
    )

async def get_standard_variants(page_type: PageType, config: Dict) -> VariantResponse:
    """Get variants for standard trading timeframes."""
    try:
        page_config = ConfigLoader.load_config(page_type)
        variants = {**config["sub_algorithm_variants"], **page_config.get("sub_algorithm_variants", {})}
        default_combo = page_config["algorithms"][page_config["current_version"]]["sub_algorithm_config"]
        page_weights = page_config.get("category_weights", None)
    except Exception:
        logger.warning(f"Using base config for {page_type}")
        variants = config["sub_algorithm_variants"]
        default_combo = config["algorithms"][config["current_version"]]["sub_algorithm_config"]
        page_weights = None
    
    return VariantResponse(
        fundamental=variants["fundamental"],
        momentum=variants["momentum"],
        value=variants["value"],
        quality=variants["quality"],
        default_combination=default_combo,
        page_specific_weights=page_weights
    )

async def run_combination_analysis(config: Dict, fundamental_v: str, momentum_v: str, value_v: str, quality_v: str, limit: int = 50, page_type: PageType = PageType.LONG_TERM) -> Dict:
    """Run combination analysis using the test_single_combination logic."""
    from collections import defaultdict
    
    if page_type in [PageType.INTRADAY_BUY, PageType.INTRADAY_SELL]:
        categories = ['momentum', 'reversal', 'technical', 'volume']
        suffix = '_buy' if page_type == PageType.INTRADAY_BUY else '_sell'
        versions = [f"{v}{suffix}" for v in [momentum_v, fundamental_v, value_v, quality_v]]
    else:
        categories = ['fundamental', 'momentum', 'value', 'quality']
        versions = [fundamental_v, momentum_v, value_v, quality_v]
    
    all_stocks = defaultdict(float)
    stock_appearances = defaultdict(int)
    stock_categories = defaultdict(set)
    category_results = {}
    
    total_weight = 0
    total_stocks_found = 0
    
    # Test each category
    for category, version in zip(categories, versions):
        try:
            variant_data = config['sub_algorithm_variants'][category][version]
            query = variant_data['query']
            weight = variant_data['weight']
            name = variant_data['name']
            
            logger.info(f"  🔍 {category.capitalize()} ({version}): {name}")
            
            # Run the query
            results = await test_query_silent(query, limit=limit)
            
            if results and 'data' in results and results.get('success', False):
                stocks = results['data']
                stocks_found = len(stocks)
                logger.info(f"     ✅ Found {stocks_found} stocks")
                
                category_results[category] = {
                    'version': version,
                    'name': name,
                    'stocks_found': stocks_found,
                    'weight': weight,
                    'stocks': stocks,
                    'query_success': True
                }
                
                total_stocks_found += stocks_found
                total_weight += weight
                
                # Score stocks from this category
                for stock in stocks:
                    symbol = stock.get('nsecode', 'UNKNOWN')
                    all_stocks[symbol] += weight * 100
                    stock_appearances[symbol] += 1
                    stock_categories[symbol].add(category)
            else:
                logger.warning(f"     ❌ No results for {category} {version}")
                category_results[category] = {
                    'version': version,
                    'name': name,
                    'stocks_found': 0,
                    'weight': weight,
                    'stocks': [],
                    'query_success': False,
                    'error': results.get('error', 'No data returned') if results else 'Query failed'
                }
        except Exception as e:
            logger.error(f"     💥 Error in {category} {version}: {e}")
            category_results[category] = {
                'version': version,
                'name': 'Error',
                'stocks_found': 0,
                'weight': 0,
                'stocks': [],
                'query_success': False,
                'error': str(e)
            }
    
    # Calculate metrics
    unique_stocks = len(all_stocks)
    multi_category_stocks = sum(1 for s in stock_categories.values() if len(s) > 1)
    
    # Get top stocks
    sorted_stocks = sorted(all_stocks.items(), key=lambda x: x[1], reverse=True)
    top_stocks = []
    
    for symbol, score in sorted_stocks[:20]:
        stock_details = None
        for cat_data in category_results.values():
            if cat_data.get('stocks'):
                for stock in cat_data['stocks']:
                    if stock.get('nsecode') == symbol:
                        stock_details = stock
                        break
            if stock_details:
                break
        
        if stock_details:
            top_stocks.append({
                'symbol': symbol,
                'name': stock_details.get('name', 'N/A'),
                'price': stock_details.get('close', 'N/A'),
                'score': round(score, 2),
                'appearances': stock_appearances[symbol],
                'categories': list(stock_categories[symbol]),
                'volume': stock_details.get('volume', 'N/A'),
                'per_change': stock_details.get('per_chg', stock_details.get('per_change', 'N/A'))
            })
    
    # Calculate performance metrics
    diversity_score = (multi_category_stocks / max(unique_stocks, 1)) * 100 if unique_stocks > 0 else 0
    coverage_score = (unique_stocks / max(total_stocks_found, 1)) * 100 if total_stocks_found > 0 else 0
    weight_efficiency = (total_weight / len(categories)) if total_weight > 0 else 0
    
    performance_score = (diversity_score * 0.4 + coverage_score * 0.3 + weight_efficiency * 100 * 0.3)
    
    logger.info(f"📊 Analysis Complete: {unique_stocks} unique stocks, {multi_category_stocks} multi-category")
    
    return {
        'combination': dict(zip(categories, versions)),
        'metrics': {
            'unique_stocks': unique_stocks,
            'total_stocks_found': total_stocks_found,
            'multi_category_stocks': multi_category_stocks,
            'diversity_score': round(diversity_score, 2),
            'coverage_score': round(coverage_score, 2),
            'performance_score': round(performance_score, 2),
            'total_weight': total_weight
        },
        'top_stocks': top_stocks,
        'category_results': category_results,
        'tested_at': datetime.now().isoformat()
    } 