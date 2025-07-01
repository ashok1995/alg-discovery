"""
Notification Service - Handles order status updates, trade alerts, and risk notifications
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any, Callable, Set
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, asdict
import json

from .models import Order, Trade, OrderStatus


class NotificationChannel(Enum):
    """Available notification channels"""
    WEBSOCKET = "websocket"
    EMAIL = "email"
    SMS = "sms"
    WEBHOOK = "webhook"
    SLACK = "slack"
    DISCORD = "discord"
    DATABASE = "database"
    LOG = "log"


class NotificationPriority(Enum):
    """Notification priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class NotificationEvent:
    """Notification event data"""
    event_type: str
    priority: NotificationPriority
    title: str
    message: str
    data: Dict[str, Any]
    timestamp: datetime
    channels: List[NotificationChannel]
    user_id: Optional[str] = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.tags is None:
            self.tags = []
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        result['priority'] = self.priority.value
        result['channels'] = [ch.value for ch in self.channels]
        return result


class NotificationService:
    """
    Comprehensive notification service for trading events
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or self._default_config()
        self.logger = logging.getLogger(__name__)
        
        # Channel handlers
        self.channel_handlers: Dict[NotificationChannel, Callable] = {}
        self.websocket_connections: Set[Any] = set()
        
        # Event tracking
        self.notification_queue: asyncio.Queue = asyncio.Queue()
        self.is_running = False
        self.processor_task: Optional[asyncio.Task] = None
        
        # Subscription management
        self.subscriptions: Dict[str, Set[str]] = {
            'order_updates': set(),
            'trade_executions': set(),
            'risk_alerts': set(),
            'position_updates': set(),
            'system_alerts': set()
        }
        
        # Initialize default handlers
        self._initialize_default_handlers()
    
    def _default_config(self) -> Dict[str, Any]:
        """Default notification configuration"""
        return {
            'enabled': True,
            'batch_size': 10,
            'processing_interval': 0.1,  # seconds
            'max_queue_size': 1000,
            'email': {
                'enabled': False,
                'smtp_server': 'smtp.gmail.com',
                'smtp_port': 587,
                'username': '',
                'password': '',
                'from_address': ''
            },
            'webhook': {
                'enabled': False,
                'urls': [],
                'timeout': 30,
                'retry_attempts': 3
            },
            'slack': {
                'enabled': False,
                'webhook_url': '',
                'channel': '#trading-alerts'
            },
            'priority_channels': {
                'critical': [NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL, NotificationChannel.SLACK],
                'high': [NotificationChannel.WEBSOCKET, NotificationChannel.SLACK],
                'medium': [NotificationChannel.WEBSOCKET],
                'low': [NotificationChannel.LOG]
            }
        }
    
    def _initialize_default_handlers(self):
        """Initialize default notification handlers"""
        self.channel_handlers = {
            NotificationChannel.LOG: self._handle_log_notification,
            NotificationChannel.WEBSOCKET: self._handle_websocket_notification,
            NotificationChannel.DATABASE: self._handle_database_notification,
            NotificationChannel.WEBHOOK: self._handle_webhook_notification,
            NotificationChannel.EMAIL: self._handle_email_notification,
            NotificationChannel.SLACK: self._handle_slack_notification,
        }
    
    async def start(self):
        """Start notification service"""
        if self.is_running:
            return
        
        self.is_running = True
        self.processor_task = asyncio.create_task(self._process_notifications())
        self.logger.info("Notification service started")
    
    async def stop(self):
        """Stop notification service"""
        if not self.is_running:
            return
        
        self.is_running = False
        if self.processor_task:
            self.processor_task.cancel()
            try:
                await self.processor_task
            except asyncio.CancelledError:
                pass
        
        self.logger.info("Notification service stopped")
    
    async def notify_order_created(self, order: Order, user_id: Optional[str] = None):
        """Notify order creation"""
        event = NotificationEvent(
            event_type="order_created",
            priority=NotificationPriority.MEDIUM,
            title=f"Order Created: {order.symbol}",
            message=f"New {order.side.value} order for {order.quantity} shares of {order.symbol} at {order.price}",
            data={
                'order_id': order.order_id,
                'symbol': order.symbol,
                'side': order.side.value,
                'quantity': order.quantity,
                'price': float(order.price) if order.price else None,
                'order_type': order.order_type.value
            },
            timestamp=datetime.now(),
            channels=self._get_channels_for_priority(NotificationPriority.MEDIUM),
            user_id=user_id,
            tags=['order', 'created']
        )
        await self._queue_notification(event)
    
    async def notify_order_updated(self, order: Order, changes: Dict[str, Any], user_id: Optional[str] = None):
        """Notify order update"""
        event = NotificationEvent(
            event_type="order_updated",
            priority=NotificationPriority.MEDIUM,
            title=f"Order Updated: {order.symbol}",
            message=f"Order {order.order_id} updated: {', '.join(f'{k}={v}' for k, v in changes.items())}",
            data={
                'order_id': order.order_id,
                'symbol': order.symbol,
                'changes': changes,
                'status': order.status.value
            },
            timestamp=datetime.now(),
            channels=self._get_channels_for_priority(NotificationPriority.MEDIUM),
            user_id=user_id,
            tags=['order', 'updated']
        )
        await self._queue_notification(event)
    
    async def notify_order_filled(self, order: Order, trade: Trade, user_id: Optional[str] = None):
        """Notify order fill"""
        priority = NotificationPriority.HIGH if order.status == OrderStatus.FILLED else NotificationPriority.MEDIUM
        
        event = NotificationEvent(
            event_type="order_filled",
            priority=priority,
            title=f"Order Filled: {order.symbol}",
            message=f"Order {order.order_id} filled: {trade.quantity} shares at {trade.price}",
            data={
                'order_id': order.order_id,
                'symbol': order.symbol,
                'trade_id': trade.trade_id,
                'quantity': trade.quantity,
                'price': float(trade.price),
                'value': float(trade.value),
                'commission': float(trade.commission),
                'total_filled': order.filled_quantity,
                'remaining': order.quantity - order.filled_quantity
            },
            timestamp=datetime.now(),
            channels=self._get_channels_for_priority(priority),
            user_id=user_id,
            tags=['order', 'filled', 'trade']
        )
        await self._queue_notification(event)
    
    async def notify_order_cancelled(self, order: Order, reason: str, user_id: Optional[str] = None):
        """Notify order cancellation"""
        event = NotificationEvent(
            event_type="order_cancelled",
            priority=NotificationPriority.MEDIUM,
            title=f"Order Cancelled: {order.symbol}",
            message=f"Order {order.order_id} cancelled: {reason}",
            data={
                'order_id': order.order_id,
                'symbol': order.symbol,
                'reason': reason,
                'filled_quantity': order.filled_quantity,
                'remaining_quantity': order.quantity - order.filled_quantity
            },
            timestamp=datetime.now(),
            channels=self._get_channels_for_priority(NotificationPriority.MEDIUM),
            user_id=user_id,
            tags=['order', 'cancelled']
        )
        await self._queue_notification(event)
    
    async def notify_risk_alert(self, alert_type: str, message: str, data: Dict[str, Any], user_id: Optional[str] = None):
        """Notify risk alert"""
        priority = NotificationPriority.CRITICAL if alert_type == "trading_halt" else NotificationPriority.HIGH
        
        event = NotificationEvent(
            event_type="risk_alert",
            priority=priority,
            title=f"Risk Alert: {alert_type.replace('_', ' ').title()}",
            message=message,
            data=data,
            timestamp=datetime.now(),
            channels=self._get_channels_for_priority(priority),
            user_id=user_id,
            tags=['risk', 'alert', alert_type]
        )
        await self._queue_notification(event)
    
    async def notify_position_update(self, symbol: str, position_data: Dict[str, Any], user_id: Optional[str] = None):
        """Notify position update"""
        event = NotificationEvent(
            event_type="position_update",
            priority=NotificationPriority.LOW,
            title=f"Position Update: {symbol}",
            message=f"Position in {symbol} updated",
            data=position_data,
            timestamp=datetime.now(),
            channels=self._get_channels_for_priority(NotificationPriority.LOW),
            user_id=user_id,
            tags=['position', 'update']
        )
        await self._queue_notification(event)
    
    async def notify_system_alert(self, alert_type: str, message: str, data: Dict[str, Any] = None):
        """Notify system alert"""
        event = NotificationEvent(
            event_type="system_alert",
            priority=NotificationPriority.HIGH,
            title=f"System Alert: {alert_type}",
            message=message,
            data=data or {},
            timestamp=datetime.now(),
            channels=self._get_channels_for_priority(NotificationPriority.HIGH),
            tags=['system', 'alert', alert_type]
        )
        await self._queue_notification(event)
    
    def add_websocket_connection(self, websocket):
        """Add WebSocket connection for real-time notifications"""
        self.websocket_connections.add(websocket)
        self.logger.info(f"WebSocket connection added. Total: {len(self.websocket_connections)}")
    
    def remove_websocket_connection(self, websocket):
        """Remove WebSocket connection"""
        self.websocket_connections.discard(websocket)
        self.logger.info(f"WebSocket connection removed. Total: {len(self.websocket_connections)}")
    
    def subscribe(self, user_id: str, event_types: List[str]):
        """Subscribe user to event types"""
        for event_type in event_types:
            if event_type in self.subscriptions:
                self.subscriptions[event_type].add(user_id)
    
    def unsubscribe(self, user_id: str, event_types: List[str]):
        """Unsubscribe user from event types"""
        for event_type in event_types:
            if event_type in self.subscriptions:
                self.subscriptions[event_type].discard(user_id)
    
    def _get_channels_for_priority(self, priority: NotificationPriority) -> List[NotificationChannel]:
        """Get notification channels for priority level"""
        return self.config.get('priority_channels', {}).get(
            priority.value, 
            [NotificationChannel.LOG]
        )
    
    async def _queue_notification(self, event: NotificationEvent):
        """Queue notification for processing"""
        if not self.config.get('enabled', True):
            return
        
        try:
            await self.notification_queue.put(event)
        except asyncio.QueueFull:
            self.logger.warning("Notification queue full, dropping notification")
    
    async def _process_notifications(self):
        """Process notifications from queue"""
        while self.is_running:
            try:
                # Process batch of notifications
                notifications = []
                for _ in range(self.config.get('batch_size', 10)):
                    try:
                        event = await asyncio.wait_for(
                            self.notification_queue.get(),
                            timeout=self.config.get('processing_interval', 0.1)
                        )
                        notifications.append(event)
                    except asyncio.TimeoutError:
                        break
                
                if notifications:
                    await self._process_notification_batch(notifications)
                
            except Exception as e:
                self.logger.error(f"Notification processing error: {e}")
                await asyncio.sleep(1)
    
    async def _process_notification_batch(self, notifications: List[NotificationEvent]):
        """Process batch of notifications"""
        for event in notifications:
            try:
                # Send to all specified channels
                for channel in event.channels:
                    if channel in self.channel_handlers:
                        try:
                            await self.channel_handlers[channel](event)
                        except Exception as e:
                            self.logger.error(f"Handler error for {channel}: {e}")
                
            except Exception as e:
                self.logger.error(f"Notification processing error: {e}")
    
    async def _handle_log_notification(self, event: NotificationEvent):
        """Handle log notification"""
        log_level = {
            NotificationPriority.CRITICAL: logging.CRITICAL,
            NotificationPriority.HIGH: logging.ERROR,
            NotificationPriority.MEDIUM: logging.WARNING,
            NotificationPriority.LOW: logging.INFO
        }.get(event.priority, logging.INFO)
        
        self.logger.log(log_level, f"{event.title}: {event.message}")
    
    async def _handle_websocket_notification(self, event: NotificationEvent):
        """Handle WebSocket notification"""
        if not self.websocket_connections:
            return
        
        message = json.dumps(event.to_dict())
        disconnected = set()
        
        for websocket in self.websocket_connections.copy():
            try:
                await websocket.send(message)
            except Exception as e:
                self.logger.warning(f"WebSocket send error: {e}")
                disconnected.add(websocket)
        
        # Remove disconnected connections
        for websocket in disconnected:
            self.websocket_connections.discard(websocket)
    
    async def _handle_database_notification(self, event: NotificationEvent):
        """Handle database notification (placeholder)"""
        # This would typically save to a notifications table
        self.logger.debug(f"Database notification: {event.title}")
    
    async def _handle_webhook_notification(self, event: NotificationEvent):
        """Handle webhook notification (placeholder)"""
        if not self.config.get('webhook', {}).get('enabled', False):
            return
        
        # This would send HTTP POST to configured webhooks
        self.logger.debug(f"Webhook notification: {event.title}")
    
    async def _handle_email_notification(self, event: NotificationEvent):
        """Handle email notification (placeholder)"""
        if not self.config.get('email', {}).get('enabled', False):
            return
        
        # This would send email using SMTP
        self.logger.debug(f"Email notification: {event.title}")
    
    async def _handle_slack_notification(self, event: NotificationEvent):
        """Handle Slack notification (placeholder)"""
        if not self.config.get('slack', {}).get('enabled', False):
            return
        
        # This would send to Slack webhook
        self.logger.debug(f"Slack notification: {event.title}")
    
    def get_notification_stats(self) -> Dict[str, Any]:
        """Get notification service statistics"""
        return {
            'queue_size': self.notification_queue.qsize(),
            'websocket_connections': len(self.websocket_connections),
            'subscriptions': {k: len(v) for k, v in self.subscriptions.items()},
            'is_running': self.is_running,
            'config': {
                'enabled': self.config.get('enabled', True),
                'batch_size': self.config.get('batch_size', 10),
                'max_queue_size': self.config.get('max_queue_size', 1000)
            }
        }
    
    def register_custom_handler(self, channel: NotificationChannel, handler: Callable):
        """Register custom notification handler"""
        self.channel_handlers[channel] = handler
        self.logger.info(f"Custom handler registered for {channel.value}")
    
    async def send_custom_notification(
        self, 
        title: str, 
        message: str, 
        priority: NotificationPriority = NotificationPriority.MEDIUM,
        channels: Optional[List[NotificationChannel]] = None,
        data: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        tags: Optional[List[str]] = None
    ):
        """Send custom notification"""
        event = NotificationEvent(
            event_type="custom",
            priority=priority,
            title=title,
            message=message,
            data=data or {},
            timestamp=datetime.now(),
            channels=channels or self._get_channels_for_priority(priority),
            user_id=user_id,
            tags=tags or ['custom']
        )
        await self._queue_notification(event) 