"""
Dashboard Models
===============

Pydantic models for dashboard API responses and data structures.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from enum import Enum

class MetricType(str, Enum):
    """Types of metrics available in the dashboard"""
    CACHE_SIZE = "cache_size"
    DB_SIZE = "db_size"
    API_CALLS = "api_calls"
    RESPONSE_TIME = "response_time"
    ERROR_RATE = "error_rate"
    RECOMMENDATIONS = "recommendations"
    SYSTEM_HEALTH = "system_health"
    CRON_STATUS = "cron_status"
    STORAGE_USAGE = "storage_usage"
    PERFORMANCE = "performance"

class NodeType(str, Enum):
    """Types of nodes in the graph architecture"""
    DATABASE = "database"
    CACHE = "cache"
    API = "api"
    CRON = "cron"
    SERVICE = "service"
    METRIC = "metric"
    ALERT = "alert"

class MetricNode(BaseModel):
    """A node in the metric graph"""
    id: str = Field(..., description="Unique identifier for the node")
    name: str = Field(..., description="Display name of the node")
    type: NodeType = Field(..., description="Type of the node")
    value: Union[str, int, float, bool] = Field(..., description="Current value of the metric")
    unit: Optional[str] = Field(None, description="Unit of measurement")
    status: str = Field("normal", description="Status: normal, warning, error, critical")
    timestamp: datetime = Field(default_factory=datetime.now, description="Last update timestamp")
    description: Optional[str] = Field(None, description="Description of the metric")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class MetricEdge(BaseModel):
    """An edge connecting nodes in the metric graph"""
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    relationship: str = Field(..., description="Type of relationship")
    weight: Optional[float] = Field(None, description="Weight of the relationship")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")

class MetricGraph(BaseModel):
    """Graph representation of metrics and their relationships"""
    nodes: List[MetricNode] = Field(..., description="List of metric nodes")
    edges: List[MetricEdge] = Field(..., description="List of relationships between nodes")
    layout: Optional[Dict[str, Any]] = Field(None, description="Layout configuration for visualization")

class DatabaseAnalytics(BaseModel):
    """Database analytics and metrics"""
    total_size_bytes: int = Field(..., description="Total database size in bytes")
    total_size_human: str = Field(..., description="Human readable database size")
    collections_count: int = Field(..., description="Number of collections/tables")
    documents_count: int = Field(..., description="Total number of documents/records")
    indexes_count: int = Field(..., description="Number of indexes")
    last_backup: Optional[datetime] = Field(None, description="Last backup timestamp")
    connection_status: str = Field(..., description="Database connection status")
    performance_metrics: Dict[str, Any] = Field(default_factory=dict, description="Performance metrics")

class CacheAnalytics(BaseModel):
    """Cache analytics and metrics"""
    redis_status: str = Field(..., description="Redis connection status")
    total_keys: int = Field(..., description="Total number of keys in cache")
    memory_usage_bytes: int = Field(..., description="Memory usage in bytes")
    memory_usage_human: str = Field(..., description="Human readable memory usage")
    hit_rate: float = Field(..., description="Cache hit rate percentage")
    miss_rate: float = Field(..., description="Cache miss rate percentage")
    eviction_count: int = Field(..., description="Number of evicted keys")
    ttl_distribution: Dict[str, int] = Field(default_factory=dict, description="TTL distribution")

class APIAnalytics(BaseModel):
    """API analytics and metrics"""
    total_requests: int = Field(..., description="Total number of API requests")
    successful_requests: int = Field(..., description="Number of successful requests")
    failed_requests: int = Field(..., description="Number of failed requests")
    average_response_time: float = Field(..., description="Average response time in seconds")
    requests_per_minute: float = Field(..., description="Requests per minute")
    error_rate: float = Field(..., description="Error rate percentage")
    endpoint_usage: Dict[str, int] = Field(default_factory=dict, description="Usage by endpoint")
    status_codes: Dict[str, int] = Field(default_factory=dict, description="Status code distribution")

class CronAnalytics(BaseModel):
    """Cron job analytics and metrics"""
    total_jobs: int = Field(..., description="Total number of cron jobs")
    active_jobs: int = Field(..., description="Number of active cron jobs")
    failed_jobs: int = Field(..., description="Number of failed jobs")
    last_run_times: Dict[str, datetime] = Field(default_factory=dict, description="Last run time for each job")
    next_run_times: Dict[str, datetime] = Field(default_factory=dict, description="Next scheduled run time")
    success_rate: float = Field(..., description="Success rate percentage")
    average_execution_time: float = Field(..., description="Average execution time in seconds")

class SystemHealth(BaseModel):
    """System health metrics"""
    cpu_usage: float = Field(..., description="CPU usage percentage")
    memory_usage: float = Field(..., description="Memory usage percentage")
    disk_usage: float = Field(..., description="Disk usage percentage")
    network_io: Dict[str, float] = Field(default_factory=dict, description="Network I/O metrics")
    uptime_seconds: int = Field(..., description="System uptime in seconds")
    process_count: int = Field(..., description="Number of running processes")
    load_average: List[float] = Field(default_factory=list, description="System load average")

class DashboardMetrics(BaseModel):
    """Complete dashboard metrics"""
    timestamp: datetime = Field(default_factory=datetime.now, description="Metrics timestamp")
    database: DatabaseAnalytics = Field(..., description="Database analytics")
    cache: CacheAnalytics = Field(..., description="Cache analytics")
    api: APIAnalytics = Field(..., description="API analytics")
    cron: CronAnalytics = Field(..., description="Cron job analytics")
    system: SystemHealth = Field(..., description="System health metrics")
    graph: MetricGraph = Field(..., description="Metric graph representation")

class DashboardConfig(BaseModel):
    """Dashboard configuration"""
    refresh_interval: int = Field(30, description="Refresh interval in seconds")
    enabled_metrics: List[MetricType] = Field(default_factory=list, description="Enabled metrics")
    alert_thresholds: Dict[str, float] = Field(default_factory=dict, description="Alert thresholds")
    graph_layout: str = Field("force", description="Graph layout algorithm")
    max_data_points: int = Field(1000, description="Maximum data points to store")

class MetricQuery(BaseModel):
    """Query parameters for specific metrics"""
    metric_type: MetricType = Field(..., description="Type of metric to query")
    time_range: Optional[str] = Field("1h", description="Time range for the query")
    aggregation: Optional[str] = Field("avg", description="Aggregation function")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional filters")

class DashboardResponse(BaseModel):
    """Standard dashboard API response"""
    success: bool = Field(..., description="Request success status")
    data: Optional[Union[DashboardMetrics, MetricGraph, Dict[str, Any]]] = Field(None, description="Response data")
    message: Optional[str] = Field(None, description="Response message")
    timestamp: datetime = Field(default_factory=datetime.now, description="Response timestamp")
    version: str = Field("1.0.0", description="API version") 