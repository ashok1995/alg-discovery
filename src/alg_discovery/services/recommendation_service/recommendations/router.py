"""
Router for recommendation endpoints.
"""

from fastapi import APIRouter, Query, Request, HTTPException
from typing import Dict, List, Optional
from datetime import datetime
import uuid
import time

from ..models import (
    RecommendationRequest, 
    RecommendationResponse,
    RecommendationStrategy,
    RecommendationHistoryStorage,
    PageType
)
from utils.api_logger import APILogger
from utils.market_timer import MarketTimer
from utils.config_loader import ConfigLoader

logger = APILogger(__name__, service="recommendations")
router = APIRouter()

@router.get("/{page_type}")
async def get_recommendations(
    page_type: PageType,
    limit: int = Query(10, description="Maximum number of recommendations"),
    min_score: float = Query(60.0, description="Minimum score for recommendations")
):
    """
    Get recommendations for a specific page type using versioned algorithms + re-ranking.
    
    Returns stocks that pass versioned algorithm filters and are re-ranked based on
    market sentiment, sector rotation, and other factors.
    """
    try:
        logger.info(f"🔍 Getting {page_type} recommendations (limit: {limit}, min_score: {min_score})")
        
        # Load appropriate config based on page type
        config = ConfigLoader.load_config(page_type)
        
        # Get recommendations using the service
        recommendations_data = await get_recommendations_for_type(
            page_type=page_type,
            limit=limit,
            min_score=min_score,
            config=config
        )
        
        return recommendations_data
        
    except Exception as e:
        logger.error(f"❌ Error in recommendations endpoint: {e}")
        return {
            "error": f"Failed to get {page_type} recommendations",
            "details": str(e),
            "recommendations": [],
            "total_found": 0,
            "limit": limit,
            "min_score": min_score
        }

@router.post("/{page_type}/recommendations")
async def get_recommendations_with_filters(
    page_type: PageType,
    request: RecommendationRequest,
    raw_request: Request
):
    """
    Get recommendations with custom filters and combinations.
    
    This endpoint provides sophisticated recommendations by combining:
    - Fundamental analysis for financial health
    - Momentum analysis for technical strength  
    - Value analysis for fair pricing
    - Quality analysis for business excellence
    - Database caching for improved performance
    - Force refresh option to bypass cache
    
    The scoring system produces a 0-100 scale where:
    - 70-100: Strong recommendations
    - 50-69: Good options
    - 25-49: Moderate potential
    - <25: Low confidence
    """
    try:
        start_time = time.time()
        logger.info(f"🔍 Getting {page_type} recommendations with filters")
        
        # Load appropriate config
        config = ConfigLoader.load_config(page_type)
        
        # Get recommendations using the service
        recommendations_data = await get_filtered_recommendations(
            page_type=page_type,
            request=request,
            config=config
        )
        
        # Calculate processing time
        processing_time = time.time() - start_time
        
        # Store in historical database when force refresh is used
        if request.force_refresh:
            try:
                execution_id = f"api_{page_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
                market_info = MarketTimer.get_market_session_info()
                
                await RecommendationHistoryStorage.store_recommendation_batch(
                    execution_id=execution_id,
                    cron_job_id=f"api_{page_type}_force_refresh",
                    strategy=RecommendationStrategy(page_type),
                    recommendations=recommendations_data["recommendations"],
                    metadata={
                        "algorithm_info": recommendations_data.get("metadata", {}).get("algorithm_info", {}),
                        "performance_metrics": {
                            "api_response_time_ms": processing_time * 1000,
                            "total_processing_time_seconds": processing_time,
                            "cache_bypassed": True,
                            "force_refresh": True
                        },
                        "source_info": {
                            "trigger": "api_force_refresh",
                            "endpoint": f"/api/{page_type}/recommendations",
                            "user_agent": "API_Client"
                        }
                    },
                    request_parameters={
                        "combination": request.combination,
                        "limit_per_query": request.limit_per_query or 50,
                        "min_score": request.min_score or 25.0,
                        "top_recommendations": request.top_recommendations or 20,
                        "force_refresh": True
                    }
                )
            except Exception as e:
                logger.error(f"❌ Error storing recommendation history: {e}")
        
        return recommendations_data
        
    except Exception as e:
        logger.error(f"❌ Error in recommendations endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get {page_type} recommendations: {str(e)}"
        ) 