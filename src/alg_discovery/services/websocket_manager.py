"""
WebSocket Manager
================

Manages WebSocket connections for real-time communication between backend and frontend.
Handles live data updates, trading signals, and system notifications.
"""

import asyncio
import json
import logging
import traceback
from typing import Dict, List, Optional, Set, Any, Callable
from datetime import datetime, timedelta
import websockets
from websockets.server import WebSocketServerProtocol
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
import numpy as np

from fastapi import WebSocket, WebSocketDisconnect
from api.models.stock_models import WebSocketMessage, LiveDataUpdate, TradingSignal
from api.services.data_service import RealTimeDataService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections and message broadcasting."""
    
    def __init__(self):
        # Active connections
        self.active_connections: Dict[str, WebSocket] = {}
        
        # Connection metadata
        self.connection_info: Dict[str, Dict[str, Any]] = {}
        
        # Channel subscriptions
        self.channel_subscriptions: Dict[str, Set[str]] = {}
        
        # Symbol subscriptions (for stock price updates)
        self.symbol_subscriptions: Dict[str, Set[str]] = {}
        
        # Message history for replay
        self.message_history: List[WebSocketMessage] = []
        self.max_history = 1000
        
        # Statistics
        self.stats = {
            "total_connections": 0,
            "active_connections": 0,
            "messages_sent": 0,
            "messages_received": 0,
            "errors": 0
        }
    
    async def connect(self, websocket: WebSocket, client_id: Optional[str] = None) -> str:
        """Accept a new WebSocket connection."""
        await websocket.accept()
        
        # Generate client ID if not provided
        if not client_id:
            client_id = str(uuid.uuid4())
        
        # Store connection
        self.active_connections[client_id] = websocket
        self.connection_info[client_id] = {
            "connected_at": datetime.now(),
            "client_ip": getattr(websocket.client, 'host', 'unknown'),
            "subscribed_channels": set(),
            "subscribed_symbols": set(),
            "last_activity": datetime.now()
        }
        
        # Update stats
        self.stats["total_connections"] += 1
        self.stats["active_connections"] = len(self.active_connections)
        
        logger.info(f"Client {client_id} connected. Total active: {self.stats['active_connections']}")
        
        # Send welcome message
        welcome_msg = WebSocketMessage(
            type="welcome",
            data={
                "client_id": client_id,
                "server_time": datetime.now().isoformat(),
                "available_channels": ["price_updates", "trading_signals", "market_status", "portfolio_updates"]
            }
        )
        await self.send_personal_message(welcome_msg.dict(), client_id)
        
        return client_id
    
    def disconnect(self, client_id: str):
        """Remove a WebSocket connection."""
        if client_id in self.active_connections:
            # Remove from all subscriptions
            self._remove_from_subscriptions(client_id)
            
            # Remove connection
            del self.active_connections[client_id]
            del self.connection_info[client_id]
            
            # Update stats
            self.stats["active_connections"] = len(self.active_connections)
            
            logger.info(f"Client {client_id} disconnected. Total active: {self.stats['active_connections']}")
    
    def _remove_from_subscriptions(self, client_id: str):
        """Remove client from all subscriptions."""
        # Remove from channel subscriptions
        for channel, subscribers in self.channel_subscriptions.items():
            subscribers.discard(client_id)
        
        # Remove from symbol subscriptions
        for symbol, subscribers in self.symbol_subscriptions.items():
            subscribers.discard(client_id)
        
        # Clean up empty subscription sets
        self.channel_subscriptions = {
            channel: subs for channel, subs in self.channel_subscriptions.items() if subs
        }
        self.symbol_subscriptions = {
            symbol: subs for symbol, subs in self.symbol_subscriptions.items() if subs
        }
    
    async def send_personal_message(self, message: Dict, client_id: str):
        """Send a message to a specific client."""
        if client_id in self.active_connections:
            try:
                websocket = self.active_connections[client_id]
                await websocket.send_text(json.dumps(message))
                
                # Update activity
                self.connection_info[client_id]["last_activity"] = datetime.now()
                self.stats["messages_sent"] += 1
                
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {str(e)}")
                self.stats["errors"] += 1
                # Remove bad connection
                self.disconnect(client_id)
    
    async def broadcast_to_channel(self, message: WebSocketMessage, channel: str):
        """Broadcast a message to all clients subscribed to a channel."""
        if channel in self.channel_subscriptions:
            subscribers = self.channel_subscriptions[channel].copy()
            
            # Add channel to message
            message.channel = channel
            message_dict = message.dict()
            
            # Send to all subscribers
            send_tasks = []
            for client_id in subscribers:
                if client_id in self.active_connections:
                    task = self.send_personal_message(message_dict, client_id)
                    send_tasks.append(task)
            
            if send_tasks:
                await asyncio.gather(*send_tasks, return_exceptions=True)
            
            # Store in history
            self._add_to_history(message)
    
    async def broadcast_to_symbol_subscribers(self, symbol: str, message: WebSocketMessage):
        """Broadcast a message to all clients subscribed to a symbol."""
        if symbol in self.symbol_subscriptions:
            subscribers = self.symbol_subscriptions[symbol].copy()
            
            message_dict = message.dict()
            
            # Send to all subscribers
            send_tasks = []
            for client_id in subscribers:
                if client_id in self.active_connections:
                    task = self.send_personal_message(message_dict, client_id)
                    send_tasks.append(task)
            
            if send_tasks:
                await asyncio.gather(*send_tasks, return_exceptions=True)
    
    async def broadcast_to_all(self, message: WebSocketMessage):
        """Broadcast a message to all connected clients."""
        message_dict = message.dict()
        
        send_tasks = []
        for client_id in list(self.active_connections.keys()):
            task = self.send_personal_message(message_dict, client_id)
            send_tasks.append(task)
        
        if send_tasks:
            await asyncio.gather(*send_tasks, return_exceptions=True)
        
        self._add_to_history(message)
    
    def subscribe_to_channel(self, client_id: str, channel: str) -> bool:
        """Subscribe a client to a channel."""
        if client_id not in self.active_connections:
            return False
        
        if channel not in self.channel_subscriptions:
            self.channel_subscriptions[channel] = set()
        
        self.channel_subscriptions[channel].add(client_id)
        self.connection_info[client_id]["subscribed_channels"].add(channel)
        
        logger.info(f"Client {client_id} subscribed to channel {channel}")
        return True
    
    def unsubscribe_from_channel(self, client_id: str, channel: str) -> bool:
        """Unsubscribe a client from a channel."""
        if client_id not in self.active_connections:
            return False
        
        if channel in self.channel_subscriptions:
            self.channel_subscriptions[channel].discard(client_id)
        
        self.connection_info[client_id]["subscribed_channels"].discard(channel)
        
        logger.info(f"Client {client_id} unsubscribed from channel {channel}")
        return True
    
    def subscribe_to_symbol(self, client_id: str, symbol: str) -> bool:
        """Subscribe a client to symbol price updates."""
        if client_id not in self.active_connections:
            return False
        
        if symbol not in self.symbol_subscriptions:
            self.symbol_subscriptions[symbol] = set()
        
        self.symbol_subscriptions[symbol].add(client_id)
        self.connection_info[client_id]["subscribed_symbols"].add(symbol)
        
        logger.info(f"Client {client_id} subscribed to symbol {symbol}")
        return True
    
    def unsubscribe_from_symbol(self, client_id: str, symbol: str) -> bool:
        """Unsubscribe a client from symbol price updates."""
        if client_id not in self.active_connections:
            return False
        
        if symbol in self.symbol_subscriptions:
            self.symbol_subscriptions[symbol].discard(client_id)
        
        self.connection_info[client_id]["subscribed_symbols"].discard(symbol)
        
        logger.info(f"Client {client_id} unsubscribed from symbol {symbol}")
        return True
    
    def _add_to_history(self, message: WebSocketMessage):
        """Add message to history with size limit."""
        self.message_history.append(message)
        
        # Maintain history size limit
        if len(self.message_history) > self.max_history:
            self.message_history = self.message_history[-self.max_history:]
    
    async def handle_client_message(self, client_id: str, message: str):
        """Handle incoming message from client."""
        try:
            data = json.loads(message)
            message_type = data.get("type")
            payload = data.get("data", {})
            
            # Update activity
            if client_id in self.connection_info:
                self.connection_info[client_id]["last_activity"] = datetime.now()
            
            self.stats["messages_received"] += 1
            
            # Handle different message types
            if message_type == "subscribe_channel":
                channel = payload.get("channel")
                if channel:
                    success = self.subscribe_to_channel(client_id, channel)
                    await self.send_personal_message({
                        "type": "subscription_response",
                        "data": {
                            "action": "subscribe_channel",
                            "channel": channel,
                            "success": success
                        }
                    }, client_id)
            
            elif message_type == "unsubscribe_channel":
                channel = payload.get("channel")
                if channel:
                    success = self.unsubscribe_from_channel(client_id, channel)
                    await self.send_personal_message({
                        "type": "subscription_response",
                        "data": {
                            "action": "unsubscribe_channel",
                            "channel": channel,
                            "success": success
                        }
                    }, client_id)
            
            elif message_type == "subscribe_symbol":
                symbol = payload.get("symbol")
                if symbol:
                    success = self.subscribe_to_symbol(client_id, symbol)
                    await self.send_personal_message({
                        "type": "subscription_response",
                        "data": {
                            "action": "subscribe_symbol",
                            "symbol": symbol,
                            "success": success
                        }
                    }, client_id)
            
            elif message_type == "unsubscribe_symbol":
                symbol = payload.get("symbol")
                if symbol:
                    success = self.unsubscribe_from_symbol(client_id, symbol)
                    await self.send_personal_message({
                        "type": "subscription_response",
                        "data": {
                            "action": "unsubscribe_symbol",
                            "symbol": symbol,
                            "success": success
                        }
                    }, client_id)
            
            elif message_type == "ping":
                await self.send_personal_message({
                    "type": "pong",
                    "data": {
                        "timestamp": datetime.now().isoformat(),
                        "client_id": client_id
                    }
                }, client_id)
            
            elif message_type == "get_status":
                await self.send_personal_message({
                    "type": "status_response",
                    "data": self.get_client_status(client_id)
                }, client_id)
            
            else:
                logger.warning(f"Unknown message type from {client_id}: {message_type}")
        
        except Exception as e:
            logger.error(f"Error handling message from {client_id}: {str(e)}")
            self.stats["errors"] += 1
    
    def get_client_status(self, client_id: str) -> Dict[str, Any]:
        """Get status information for a client."""
        if client_id not in self.connection_info:
            return {"error": "Client not found"}
        
        info = self.connection_info[client_id]
        return {
            "client_id": client_id,
            "connected_at": info["connected_at"].isoformat(),
            "last_activity": info["last_activity"].isoformat(),
            "subscribed_channels": list(info["subscribed_channels"]),
            "subscribed_symbols": list(info["subscribed_symbols"]),
            "connection_duration": (datetime.now() - info["connected_at"]).total_seconds()
        }
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get system-wide statistics."""
        return {
            **self.stats,
            "active_channels": list(self.channel_subscriptions.keys()),
            "active_symbols": list(self.symbol_subscriptions.keys()),
            "total_subscriptions": sum(len(subs) for subs in self.channel_subscriptions.values()),
            "total_symbol_subscriptions": sum(len(subs) for subs in self.symbol_subscriptions.values()),
            "message_history_size": len(self.message_history)
        }
    
    async def cleanup_inactive_connections(self, timeout_minutes: int = 30):
        """Clean up inactive connections."""
        current_time = datetime.now()
        inactive_clients = []
        
        for client_id, info in self.connection_info.items():
            last_activity = info["last_activity"]
            inactive_duration = (current_time - last_activity).total_seconds() / 60
            
            if inactive_duration > timeout_minutes:
                inactive_clients.append(client_id)
        
        for client_id in inactive_clients:
            logger.info(f"Cleaning up inactive client: {client_id}")
            self.disconnect(client_id)
        
        return len(inactive_clients)

class WebSocketManager:
    """High-level WebSocket manager with data service integration."""
    
    def __init__(self):
        self.connection_manager = ConnectionManager()
        self.is_running = False
        self.background_tasks: List[asyncio.Task] = []
    
    async def start(self):
        """Start the WebSocket manager and background tasks."""
        self.is_running = True
        
        # Start background tasks
        cleanup_task = asyncio.create_task(self._periodic_cleanup())
        self.background_tasks.append(cleanup_task)
        
        logger.info("WebSocket Manager started")
    
    async def stop(self):
        """Stop the WebSocket manager and background tasks."""
        self.is_running = False
        
        # Cancel background tasks
        for task in self.background_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.background_tasks:
            await asyncio.gather(*self.background_tasks, return_exceptions=True)
        
        logger.info("WebSocket Manager stopped")
    
    async def handle_websocket(self, websocket: WebSocket, client_id: Optional[str] = None):
        """Handle a new WebSocket connection."""
        client_id = await self.connection_manager.connect(websocket, client_id)
        
        try:
            while self.is_running:
                # Wait for message from client
                message = await websocket.receive_text()
                await self.connection_manager.handle_client_message(client_id, message)
        
        except WebSocketDisconnect:
            logger.info(f"Client {client_id} disconnected normally")
        except Exception as e:
            logger.error(f"Error in WebSocket connection {client_id}: {str(e)}")
        finally:
            self.connection_manager.disconnect(client_id)
    
    async def send_price_update(self, live_update: LiveDataUpdate):
        """Send price update to subscribed clients."""
        message = WebSocketMessage(
            type="price_update",
            data=live_update.dict()
        )
        await self.connection_manager.broadcast_to_symbol_subscribers(live_update.symbol, message)
    
    async def send_trading_signal(self, signal: TradingSignal):
        """Send trading signal to subscribed clients."""
        message = WebSocketMessage(
            type="trading_signal",
            data=signal.dict()
        )
        await self.connection_manager.broadcast_to_channel(message, "trading_signals")
    
    async def send_market_status(self, status_data: Dict[str, Any]):
        """Send market status update."""
        message = WebSocketMessage(
            type="market_status",
            data=status_data
        )
        await self.connection_manager.broadcast_to_channel(message, "market_status")
    
    async def send_portfolio_update(self, portfolio_data: Dict[str, Any]):
        """Send portfolio update."""
        message = WebSocketMessage(
            type="portfolio_update",
            data=portfolio_data
        )
        await self.connection_manager.broadcast_to_channel(message, "portfolio_updates")
    
    async def send_system_notification(self, notification: Dict[str, Any]):
        """Send system-wide notification."""
        message = WebSocketMessage(
            type="system_notification",
            data=notification
        )
        await self.connection_manager.broadcast_to_all(message)
    
    async def _periodic_cleanup(self):
        """Periodic cleanup task."""
        while self.is_running:
            try:
                # Clean up inactive connections every 5 minutes
                await asyncio.sleep(300)  # 5 minutes
                
                if self.is_running:
                    cleaned = await self.connection_manager.cleanup_inactive_connections()
                    if cleaned > 0:
                        logger.info(f"Cleaned up {cleaned} inactive connections")
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {str(e)}")
                await asyncio.sleep(60)  # Wait a minute before retrying
    
    def get_stats(self) -> Dict[str, Any]:
        """Get WebSocket manager statistics."""
        return self.connection_manager.get_system_stats()
    
    def get_active_symbols(self) -> List[str]:
        """Get list of symbols with active subscriptions."""
        return list(self.connection_manager.symbol_subscriptions.keys())
    
    async def health_check(self) -> Dict[str, Any]:
        """Health check for WebSocket manager."""
        try:
            stats = self.get_stats()
            return {
                "status": "healthy" if self.is_running else "stopped",
                "is_running": self.is_running,
                "active_connections": stats["active_connections"],
                "total_connections": stats["total_connections"],
                "active_channels": len(stats["active_channels"]),
                "active_symbols": len(stats["active_symbols"]),
                "background_tasks": len(self.background_tasks)
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e),
                "is_running": self.is_running
            }

# Global WebSocket manager instance
websocket_manager = WebSocketManager() 