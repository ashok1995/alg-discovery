#!/usr/bin/env python3
"""
Cron Job Execution Tracking Models
===================================

Database models for tracking and analyzing cron job executions in the trading system.
Provides comprehensive logging of job performance, outcomes, and system health metrics.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from enum import Enum
from dataclasses import dataclass, asdict
from pathlib import Path
import uuid

import motor.motor_asyncio
from pymongo import MongoClient, ASCENDING, DESCENDING
from bson import ObjectId
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class CronJobStatus(Enum):
    """Cron job execution status."""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"

class CronJobType(Enum):
    """Types of cron jobs in the trading system."""
    SHORTTERM_ANALYSIS = "shortterm_analysis"
    SWING_ANALYSIS = "swing_analysis"
    LONGTERM_ANALYSIS = "longterm_analysis"
    CACHE_CLEANUP = "cache_cleanup"
    SYSTEM_HEALTH_CHECK = "system_health_check"
    DATA_BACKUP = "data_backup"

class MarketCondition(Enum):
    """Market conditions during job execution."""
    OPEN = "open"
    CLOSED = "closed"
    PRE_MARKET = "pre_market"
    POST_MARKET = "post_market"
    WEEKEND = "weekend"
    HOLIDAY = "holiday"

@dataclass
class JobExecutionMetrics:
    """Detailed execution metrics for analysis."""
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    cpu_usage_percent: Optional[float] = None
    memory_usage_mb: Optional[float] = None
    network_requests: Optional[int] = None
    api_response_time_ms: Optional[float] = None
    cache_hits: Optional[int] = None
    cache_misses: Optional[int] = None
    database_queries: Optional[int] = None
    recommendations_generated: Optional[int] = None
    data_points_processed: Optional[int] = None
    error_count: Optional[int] = None
    warning_count: Optional[int] = None

class CronJobExecution(BaseModel):
    """Complete cron job execution record."""
    
    # Unique identifiers
    execution_id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Unique execution ID")
    job_id: str = Field(..., description="Cron job identifier")
    job_name: str = Field(..., description="Human-readable job name")
    job_type: CronJobType = Field(..., description="Type of cron job")
    
    # Execution timing
    scheduled_time: datetime = Field(..., description="When job was scheduled to run")
    actual_start_time: datetime = Field(..., description="When job actually started")
    end_time: Optional[datetime] = Field(None, description="When job completed")
    duration_seconds: Optional[float] = Field(None, description="Total execution time")
    
    # Execution status and results
    status: CronJobStatus = Field(..., description="Job execution status")
    exit_code: Optional[int] = Field(None, description="Process exit code")
    success: bool = Field(False, description="Whether job completed successfully")
    
    # Market context
    market_condition: MarketCondition = Field(..., description="Market state during execution")
    trading_session: str = Field(..., description="Trading session identifier")
    
    # Output and results
    output_summary: Dict[str, Any] = Field(default_factory=dict, description="Job output summary")
    recommendations_count: Optional[int] = Field(None, description="Number of recommendations generated")
    api_calls_made: Optional[int] = Field(None, description="Number of API calls")
    cache_operations: Dict[str, int] = Field(default_factory=dict, description="Cache operation counts")
    
    # Performance metrics
    performance_metrics: Dict[str, Any] = Field(default_factory=dict, description="Detailed performance data")
    system_resources: Dict[str, Any] = Field(default_factory=dict, description="System resource usage")
    
    # Error handling
    error_message: Optional[str] = Field(None, description="Error message if failed")
    error_details: Optional[Dict[str, Any]] = Field(None, description="Detailed error information")
    warnings: List[str] = Field(default_factory=list, description="Warning messages")
    
    # Retry information
    retry_attempt: int = Field(default=0, description="Retry attempt number (0 = first attempt)")
    max_retries: int = Field(default=3, description="Maximum retry attempts")
    next_retry_time: Optional[datetime] = Field(None, description="When to retry if failed")
    
    # Environment and configuration
    server_info: Dict[str, Any] = Field(default_factory=dict, description="Server information")
    job_parameters: Dict[str, Any] = Field(default_factory=dict, description="Job configuration parameters")
    environment: str = Field(default="production", description="Environment (dev/staging/production)")
    
    # Tracking metadata
    created_at: datetime = Field(default_factory=datetime.now, description="Record creation time")
    updated_at: datetime = Field(default_factory=datetime.now, description="Last update time")
    version: str = Field(default="1.0", description="Schema version")
    
    def dict_for_db(self) -> Dict[str, Any]:
        """Convert to dictionary with enum values for database storage."""
        data = self.dict()
        # Convert enums to their values
        if isinstance(data.get('job_type'), CronJobType):
            data['job_type'] = data['job_type'].value
        elif 'job_type' in data and hasattr(data['job_type'], 'value'):
            data['job_type'] = data['job_type'].value
        
        if isinstance(data.get('status'), CronJobStatus):
            data['status'] = data['status'].value
        elif 'status' in data and hasattr(data['status'], 'value'):
            data['status'] = data['status'].value
            
        if isinstance(data.get('market_condition'), MarketCondition):
            data['market_condition'] = data['market_condition'].value
        elif 'market_condition' in data and hasattr(data['market_condition'], 'value'):
            data['market_condition'] = data['market_condition'].value
            
        return data

class CronJobSummary(BaseModel):
    """Summary statistics for a specific job type."""
    job_type: CronJobType
    job_name: str
    total_executions: int
    successful_executions: int
    failed_executions: int
    success_rate: float
    average_duration_seconds: float
    last_execution: Optional[datetime]
    last_success: Optional[datetime]
    last_failure: Optional[datetime]
    total_recommendations: int
    average_recommendations_per_run: float
    performance_trend: str  # "improving", "stable", "degrading"

class SystemHealthMetrics(BaseModel):
    """Overall system health based on cron job performance."""
    timestamp: datetime = Field(default_factory=datetime.now)
    overall_health_score: float = Field(..., ge=0, le=100, description="Overall health score (0-100)")
    job_health_scores: Dict[str, float] = Field(..., description="Health score per job type")
    critical_issues: List[str] = Field(default_factory=list, description="Critical issues identified")
    warnings: List[str] = Field(default_factory=list, description="System warnings")
    recommendations: List[str] = Field(default_factory=list, description="Improvement recommendations")
    uptime_percentage: float = Field(..., description="System uptime percentage")
    average_response_time: float = Field(..., description="Average job response time")
    error_rate: float = Field(..., description="Error rate percentage")

class CronExecutionTracker:
    """Database manager for cron job execution tracking."""
    
    def __init__(self, use_mongodb: bool = True, mongodb_url: str = "mongodb://localhost:27017", db_name: str = "trading_system"):
        self.use_mongodb = use_mongodb
        self.db_name = db_name
        
        if use_mongodb:
            self.client = motor.motor_asyncio.AsyncIOMotorClient(mongodb_url)
            self.db = self.client[db_name]
            self.executions_collection = self.db.cron_executions
            self.summaries_collection = self.db.cron_summaries
            self.health_collection = self.db.system_health
        else:
            # Fallback to file-based storage
            self.storage_dir = Path("api/cron_logs")
            self.storage_dir.mkdir(exist_ok=True)
    
    async def initialize(self):
        """Initialize the tracking system and create indexes."""
        try:
            if self.use_mongodb:
                # Test connection
                await self.client.admin.command('ping')
                
                # Create indexes for efficient querying
                await self.executions_collection.create_index([
                    ("job_type", ASCENDING),
                    ("scheduled_time", DESCENDING)
                ])
                await self.executions_collection.create_index([
                    ("status", ASCENDING),
                    ("actual_start_time", DESCENDING)
                ])
                await self.executions_collection.create_index([
                    ("market_condition", ASCENDING),
                    ("trading_session", ASCENDING)
                ])
                await self.executions_collection.create_index([
                    ("success", ASCENDING),
                    ("job_type", ASCENDING),
                    ("created_at", DESCENDING)
                ])
                
                logger.info("✅ Cron execution tracker initialized with MongoDB")
            else:
                logger.info("✅ Cron execution tracker initialized with file storage")
                
        except Exception as e:
            logger.warning(f"⚠️ MongoDB initialization failed, using file storage: {e}")
            self.use_mongodb = False
            self.storage_dir = Path("api/cron_logs")
            self.storage_dir.mkdir(parents=True, exist_ok=True)

    async def close(self):
        """Close database connections."""
        try:
            if self.use_mongodb and self.client:
                self.client.close()
                logger.info("✅ Cron tracking MongoDB connection closed")
        except Exception as e:
            logger.warning(f"⚠️ Error closing cron tracking connection: {e}")

    async def start_job_execution(self, 
                                  job_id: str, 
                                  job_name: str, 
                                  job_type: CronJobType,
                                  scheduled_time: datetime,
                                  job_parameters: Dict[str, Any] = None) -> str:
        """Record the start of a cron job execution."""
        
        execution = CronJobExecution(
            job_id=job_id,
            job_name=job_name,
            job_type=job_type,
            scheduled_time=scheduled_time,
            actual_start_time=datetime.now(),
            status=CronJobStatus.RUNNING,
            market_condition=self._get_current_market_condition(),
            trading_session=self._get_trading_session(),
            job_parameters=job_parameters or {},
            server_info=self._get_server_info()
        )
        
        try:
            if self.use_mongodb:
                result = await self.executions_collection.insert_one(execution.dict_for_db())
                logger.info(f"📝 Started tracking job execution: {execution.execution_id}")
                return execution.execution_id
            else:
                # File-based storage
                file_path = self.storage_dir / f"{execution.execution_id}.json"
                with open(file_path, 'w') as f:
                    json.dump(execution.dict(), f, default=str, indent=2)
                return execution.execution_id
                
        except Exception as e:
            logger.error(f"❌ Failed to record job start: {e}")
            return execution.execution_id

    async def complete_job_execution(self,
                                     execution_id: str,
                                     status: CronJobStatus,
                                     output_summary: Dict[str, Any] = None,
                                     performance_metrics: Dict[str, Any] = None,
                                     error_message: str = None,
                                     error_details: Dict[str, Any] = None) -> bool:
        """Record the completion of a cron job execution."""
        
        try:
            end_time = datetime.now()
            update_data = {
                "status": status.value,
                "end_time": end_time,
                "success": status == CronJobStatus.SUCCESS,
                "updated_at": end_time,
                "output_summary": output_summary or {},
                "performance_metrics": performance_metrics or {}
            }
            
            if error_message:
                update_data["error_message"] = error_message
            if error_details:
                update_data["error_details"] = error_details
            
            if self.use_mongodb:
                # Calculate duration if we have start time
                existing = await self.executions_collection.find_one({"execution_id": execution_id})
                if existing and existing.get("actual_start_time"):
                    start_time = existing["actual_start_time"]
                    if isinstance(start_time, str):
                        start_time = datetime.fromisoformat(start_time)
                    duration = (end_time - start_time).total_seconds()
                    update_data["duration_seconds"] = duration
                
                result = await self.executions_collection.update_one(
                    {"execution_id": execution_id},
                    {"$set": update_data}
                )
                
                if result.modified_count > 0:
                    logger.info(f"✅ Completed job execution tracking: {execution_id} - {status.value}")
                    
                    # Update summary statistics
                    await self._update_job_summary(execution_id)
                    return True
                else:
                    logger.warning(f"⚠️ No execution found to update: {execution_id}")
                    return False
            else:
                # File-based storage
                file_path = self.storage_dir / f"{execution_id}.json"
                if file_path.exists():
                    with open(file_path, 'r') as f:
                        data = json.load(f)
                    
                    data.update(update_data)
                    
                    # Calculate duration
                    if data.get("actual_start_time"):
                        start_time = datetime.fromisoformat(data["actual_start_time"])
                        duration = (end_time - start_time).total_seconds()
                        data["duration_seconds"] = duration
                    
                    with open(file_path, 'w') as f:
                        json.dump(data, f, default=str, indent=2)
                    
                    return True
                return False
                
        except Exception as e:
            logger.error(f"❌ Failed to complete job execution tracking: {e}")
            return False

    async def get_job_history(self, 
                              job_type: Optional[CronJobType] = None,
                              limit: int = 100,
                              status_filter: Optional[CronJobStatus] = None,
                              start_date: Optional[datetime] = None,
                              end_date: Optional[datetime] = None) -> List[Dict[str, Any]]:
        """Get historical job execution data."""
        
        try:
            if self.use_mongodb:
                # Build query
                query = {}
                if job_type:
                    query["job_type"] = job_type.value
                if status_filter:
                    query["status"] = status_filter.value
                if start_date or end_date:
                    date_query = {}
                    if start_date:
                        date_query["$gte"] = start_date
                    if end_date:
                        date_query["$lte"] = end_date
                    query["actual_start_time"] = date_query
                
                cursor = self.executions_collection.find(query).sort("actual_start_time", DESCENDING).limit(limit)
                results = []
                async for doc in cursor:
                    # Convert ObjectId to string
                    if "_id" in doc:
                        doc["_id"] = str(doc["_id"])
                    results.append(doc)
                
                return results
            else:
                # File-based storage
                results = []
                for file_path in self.storage_dir.glob("*.json"):
                    try:
                        with open(file_path, 'r') as f:
                            data = json.load(f)
                        
                        # Apply filters
                        if job_type and data.get("job_type") != job_type.value:
                            continue
                        if status_filter and data.get("status") != status_filter.value:
                            continue
                        
                        results.append(data)
                    except Exception:
                        continue
                
                # Sort by start time
                results.sort(key=lambda x: x.get("actual_start_time", ""), reverse=True)
                return results[:limit]
                
        except Exception as e:
            logger.error(f"❌ Failed to get job history: {e}")
            return []

    async def get_performance_analytics(self, 
                                        job_type: Optional[CronJobType] = None,
                                        days: int = 30) -> Dict[str, Any]:
        """Get performance analytics for cron jobs."""
        
        try:
            start_date = datetime.now() - timedelta(days=days)
            
            # Get recent executions
            executions = await self.get_job_history(
                job_type=job_type,
                start_date=start_date,
                limit=1000
            )
            
            if not executions:
                return {"message": "No execution data found", "executions": 0}
            
            # Calculate analytics
            total_executions = len(executions)
            successful = len([e for e in executions if e.get("success", False)])
            failed = total_executions - successful
            
            durations = [e.get("duration_seconds", 0) for e in executions if e.get("duration_seconds")]
            avg_duration = sum(durations) / len(durations) if durations else 0
            
            recommendations = [e.get("recommendations_count", 0) for e in executions if e.get("recommendations_count")]
            total_recommendations = sum(recommendations)
            avg_recommendations = sum(recommendations) / len(recommendations) if recommendations else 0
            
            # Performance trend analysis
            recent_success_rate = 0
            if total_executions >= 10:
                recent_executions = executions[:10]
                recent_successful = len([e for e in recent_executions if e.get("success", False)])
                recent_success_rate = (recent_successful / len(recent_executions)) * 100
            
            return {
                "analysis_period_days": days,
                "total_executions": total_executions,
                "successful_executions": successful,
                "failed_executions": failed,
                "success_rate_percent": (successful / total_executions) * 100 if total_executions > 0 else 0,
                "recent_success_rate_percent": recent_success_rate,
                "average_duration_seconds": avg_duration,
                "total_recommendations_generated": total_recommendations,
                "average_recommendations_per_execution": avg_recommendations,
                "performance_trend": "stable",  # Could be enhanced with trend analysis
                "execution_frequency_per_day": total_executions / days if days > 0 else 0,
                "last_execution": executions[0].get("actual_start_time") if executions else None,
                "last_successful_execution": next(
                    (e.get("actual_start_time") for e in executions if e.get("success")), None
                )
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get performance analytics: {e}")
            return {"error": str(e)}

    def _get_current_market_condition(self) -> MarketCondition:
        """Determine current market condition."""
        now = datetime.now()
        hour = now.hour
        minute = now.minute
        weekday = now.weekday()  # 0=Monday, 6=Sunday
        
        # Weekend
        if weekday >= 5:
            return MarketCondition.WEEKEND
        
        # Market timings (IST): 9:15 AM to 3:30 PM
        market_open_time = 9 * 60 + 15  # 9:15 AM in minutes
        market_close_time = 15 * 60 + 30  # 3:30 PM in minutes
        current_time = hour * 60 + minute
        
        if current_time < market_open_time:
            return MarketCondition.PRE_MARKET
        elif current_time > market_close_time:
            return MarketCondition.POST_MARKET
        else:
            return MarketCondition.OPEN

    def _get_trading_session(self) -> str:
        """Get current trading session identifier."""
        now = datetime.now()
        return f"{now.strftime('%Y-%m-%d')}_session"

    def _get_server_info(self) -> Dict[str, Any]:
        """Get server information for tracking."""
        import platform
        import psutil
        
        try:
            return {
                "hostname": platform.node(),
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "cpu_count": psutil.cpu_count(),
                "memory_total_mb": psutil.virtual_memory().total / (1024 * 1024),
                "timestamp": datetime.now().isoformat()
            }
        except Exception:
            return {"hostname": "unknown", "timestamp": datetime.now().isoformat()}

    async def _update_job_summary(self, execution_id: str):
        """Update job summary statistics."""
        try:
            if not self.use_mongodb:
                return  # Skip for file storage
            
            # Get the execution details
            execution = await self.executions_collection.find_one({"execution_id": execution_id})
            if not execution:
                return
            
            job_type = execution.get("job_type")
            
            # Calculate summary statistics
            pipeline = [
                {"$match": {"job_type": job_type}},
                {"$group": {
                    "_id": "$job_type",
                    "total_executions": {"$sum": 1},
                    "successful_executions": {"$sum": {"$cond": ["$success", 1, 0]}},
                    "total_duration": {"$sum": "$duration_seconds"},
                    "total_recommendations": {"$sum": "$recommendations_count"},
                    "last_execution": {"$max": "$actual_start_time"},
                    "avg_duration": {"$avg": "$duration_seconds"}
                }}
            ]
            
            async for result in self.executions_collection.aggregate(pipeline):
                summary = {
                    "job_type": job_type,
                    "job_name": execution.get("job_name", ""),
                    "total_executions": result.get("total_executions", 0),
                    "successful_executions": result.get("successful_executions", 0),
                    "failed_executions": result.get("total_executions", 0) - result.get("successful_executions", 0),
                    "success_rate": (result.get("successful_executions", 0) / result.get("total_executions", 1)) * 100,
                    "average_duration_seconds": result.get("avg_duration", 0),
                    "total_recommendations": result.get("total_recommendations", 0),
                    "last_updated": datetime.now()
                }
                
                await self.summaries_collection.replace_one(
                    {"job_type": job_type},
                    summary,
                    upsert=True
                )
                
        except Exception as e:
            logger.error(f"❌ Failed to update job summary: {e}")

# Global instance
cron_execution_tracker = CronExecutionTracker() 