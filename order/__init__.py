"""
Order Management System for AlgoDiscovery Trading Platform

This package provides comprehensive order management capabilities including:
- Order creation and execution
- Order updates and cancellation
- Stop loss and target management
- Order status tracking and notifications
- Risk management and position sizing
"""

from .models import (
    Order, OrderType, OrderStatus, OrderSide, TimeInForce,
    Position, Trade, OrderRequest, OrderUpdate
)

from .order_manager import OrderManager
from .execution_engine import ExecutionEngine
from .risk_manager import RiskManager
from .position_manager import PositionManager
from .order_validator import OrderValidator
from .notification_service import NotificationService

__version__ = "1.0.0"
__author__ = "AlgoDiscovery Team"

__all__ = [
    # Models
    'Order', 'OrderType', 'OrderStatus', 'OrderSide', 'TimeInForce',
    'Position', 'Trade', 'OrderRequest', 'OrderUpdate',
    
    # Core Services
    'OrderManager', 'ExecutionEngine', 'RiskManager',
    'PositionManager', 'OrderValidator', 'NotificationService'
] 