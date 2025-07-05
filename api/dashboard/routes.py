"""
Dashboard API Routes
==================

FastAPI routes for the dashboard API endpoints.
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional, Any
import logging

from .models import (
    DashboardResponse, DashboardMetrics, MetricQuery, MetricType,
    DashboardConfig, MetricGraph
)
from .analytics import analytics_service

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/", response_model=DashboardResponse)
async def get_dashboard_overview():
    """Get complete dashboard overview with all metrics"""
    try:
        # Initialize analytics service if not already done
        if not analytics_service.redis_client:
            await analytics_service.initialize()
        
        # Get complete metrics
        metrics = await analytics_service.get_complete_metrics()
        
        return DashboardResponse(
            success=True,
            data=metrics,
            message="Dashboard metrics retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting dashboard overview: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard metrics: {str(e)}")

@router.get("/metrics", response_model=DashboardResponse)
async def get_specific_metrics(
    metric_type: Optional[MetricType] = Query(None, description="Type of metric to retrieve"),
    time_range: str = Query("1h", description="Time range for the query")
):
    """Get specific metrics or all metrics"""
    try:
        if not analytics_service.redis_client:
            await analytics_service.initialize()
        
        if metric_type:
            # Get specific metric
            metrics = await analytics_service.get_complete_metrics()
            
            # Extract specific metric based on type
            if metric_type == MetricType.CACHE_SIZE:
                data = {
                    "cache_size": metrics.cache.memory_usage_bytes,
                    "cache_size_human": metrics.cache.memory_usage_human,
                    "total_keys": metrics.cache.total_keys
                }
            elif metric_type == MetricType.DB_SIZE:
                data = {
                    "db_size": metrics.database.total_size_bytes,
                    "db_size_human": metrics.database.total_size_human,
                    "collections": metrics.database.collections_count,
                    "documents": metrics.database.documents_count
                }
            elif metric_type == MetricType.API_CALLS:
                data = {
                    "total_requests": metrics.api.total_requests,
                    "requests_per_minute": metrics.api.requests_per_minute,
                    "successful_requests": metrics.api.successful_requests,
                    "failed_requests": metrics.api.failed_requests
                }
            elif metric_type == MetricType.SYSTEM_HEALTH:
                data = {
                    "cpu_usage": metrics.system.cpu_usage,
                    "memory_usage": metrics.system.memory_usage,
                    "disk_usage": metrics.system.disk_usage,
                    "uptime_seconds": metrics.system.uptime_seconds
                }
            elif metric_type == MetricType.CRON_STATUS:
                data = {
                    "total_jobs": metrics.cron.total_jobs,
                    "active_jobs": metrics.cron.active_jobs,
                    "success_rate": metrics.cron.success_rate,
                    "last_run_times": metrics.cron.last_run_times
                }
            else:
                data = {"message": f"Metric type {metric_type} not implemented"}
        else:
            # Get all metrics
            metrics = await analytics_service.get_complete_metrics()
            data = metrics
        
        return DashboardResponse(
            success=True,
            data=data,
            message=f"Metrics retrieved successfully for {metric_type or 'all'}"
        )
        
    except Exception as e:
        logger.error(f"Error getting metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")

@router.get("/graph", response_model=DashboardResponse)
async def get_metric_graph():
    """Get metric graph representation"""
    try:
        if not analytics_service.redis_client:
            await analytics_service.initialize()
        
        metrics = await analytics_service.get_complete_metrics()
        
        return DashboardResponse(
            success=True,
            data=metrics.graph,
            message="Metric graph retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting metric graph: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get metric graph: {str(e)}")

@router.get("/database", response_model=DashboardResponse)
async def get_database_analytics():
    """Get database-specific analytics"""
    try:
        if not analytics_service.redis_client:
            await analytics_service.initialize()
        
        database_metrics = analytics_service.get_database_analytics()
        
        return DashboardResponse(
            success=True,
            data=database_metrics,
            message="Database analytics retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting database analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database analytics: {str(e)}")

@router.get("/cache", response_model=DashboardResponse)
async def get_cache_analytics():
    """Get cache-specific analytics"""
    try:
        if not analytics_service.redis_client:
            await analytics_service.initialize()
        
        cache_metrics = analytics_service.get_cache_analytics()
        
        return DashboardResponse(
            success=True,
            data=cache_metrics,
            message="Cache analytics retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting cache analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache analytics: {str(e)}")

@router.get("/api-stats", response_model=DashboardResponse)
async def get_api_analytics():
    """Get API-specific analytics"""
    try:
        if not analytics_service.redis_client:
            await analytics_service.initialize()
        
        api_metrics = analytics_service.get_api_analytics()
        
        return DashboardResponse(
            success=True,
            data=api_metrics,
            message="API analytics retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting API analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get API analytics: {str(e)}")

@router.get("/cron", response_model=DashboardResponse)
async def get_cron_analytics():
    """Get cron job analytics"""
    try:
        if not analytics_service.redis_client:
            await analytics_service.initialize()
        
        cron_metrics = analytics_service.get_cron_analytics()
        
        return DashboardResponse(
            success=True,
            data=cron_metrics,
            message="Cron analytics retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting cron analytics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cron analytics: {str(e)}")

@router.get("/system", response_model=DashboardResponse)
async def get_system_health():
    """Get system health metrics"""
    try:
        if not analytics_service.redis_client:
            await analytics_service.initialize()
        
        system_metrics = analytics_service.get_system_health()
        
        return DashboardResponse(
            success=True,
            data=system_metrics,
            message="System health metrics retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get system health: {str(e)}")

@router.get("/health", response_model=DashboardResponse)
async def dashboard_health_check():
    """Health check for dashboard service"""
    try:
        if not analytics_service.redis_client:
            await analytics_service.initialize()
        
        # Quick health check
        health_status = {
            "status": "healthy",
            "timestamp": analytics_service.last_collection.isoformat() if analytics_service.last_collection else None,
            "services": {
                "redis": "connected" if analytics_service.redis_client else "disconnected",
                "mongodb": "connected" if analytics_service.mongo_client else "disconnected",
                "analytics": "ready"
            }
        }
        
        return DashboardResponse(
            success=True,
            data=health_status,
            message="Dashboard service is healthy"
        )
        
    except Exception as e:
        logger.error(f"Dashboard health check failed: {e}")
        return DashboardResponse(
            success=False,
            data={"status": "unhealthy", "error": str(e)},
            message="Dashboard service is unhealthy"
        )

@router.get("/config", response_model=DashboardResponse)
async def get_dashboard_config():
    """Get dashboard configuration"""
    try:
        config = DashboardConfig(
            refresh_interval=30,
            enabled_metrics=[
                MetricType.CACHE_SIZE,
                MetricType.DB_SIZE,
                MetricType.API_CALLS,
                MetricType.SYSTEM_HEALTH,
                MetricType.CRON_STATUS
            ],
            alert_thresholds={
                "cpu_usage": 80.0,
                "memory_usage": 80.0,
                "error_rate": 5.0,
                "disk_usage": 90.0
            },
            graph_layout="force",
            max_data_points=1000
        )
        
        return DashboardResponse(
            success=True,
            data=config,
            message="Dashboard configuration retrieved successfully"
        )
        
    except Exception as e:
        logger.error(f"Error getting dashboard config: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard config: {str(e)}")

@router.get("/alerts", response_model=DashboardResponse)
async def get_system_alerts():
    """Get system alerts based on thresholds"""
    try:
        if not analytics_service.redis_client:
            await analytics_service.initialize()
        
        metrics = await analytics_service.get_complete_metrics()
        alerts = []
        
        # Check CPU usage
        if metrics.system.cpu_usage > 80:
            alerts.append({
                "type": "warning",
                "metric": "cpu_usage",
                "value": metrics.system.cpu_usage,
                "threshold": 80,
                "message": f"High CPU usage: {metrics.system.cpu_usage:.1f}%"
            })
        
        # Check memory usage
        if metrics.system.memory_usage > 80:
            alerts.append({
                "type": "warning",
                "metric": "memory_usage",
                "value": metrics.system.memory_usage,
                "threshold": 80,
                "message": f"High memory usage: {metrics.system.memory_usage:.1f}%"
            })
        
        # Check error rate
        if metrics.api.error_rate > 5:
            alerts.append({
                "type": "error",
                "metric": "error_rate",
                "value": metrics.api.error_rate,
                "threshold": 5,
                "message": f"High error rate: {metrics.api.error_rate:.1f}%"
            })
        
        # Check disk usage
        if metrics.system.disk_usage > 90:
            alerts.append({
                "type": "critical",
                "metric": "disk_usage",
                "value": metrics.system.disk_usage,
                "threshold": 90,
                "message": f"Critical disk usage: {metrics.system.disk_usage:.1f}%"
            })
        
        return DashboardResponse(
            success=True,
            data={"alerts": alerts, "count": len(alerts)},
            message=f"Found {len(alerts)} system alerts"
        )
        
    except Exception as e:
        logger.error(f"Error getting system alerts: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get system alerts: {str(e)}")

# Export router
dashboard_router = router 