"""
Order Manager - Core service for order lifecycle management
"""

import asyncio
import logging
from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from .models import (
    Order, OrderRequest, OrderUpdate, OrderStatus, OrderType,
    Trade, Position, OrderSide, PositionSide, TimeInForce
)
from .validators import OrderValidator
from .execution_engine import ExecutionEngine
from .position_manager import PositionManager
from .risk_manager import RiskManager
from .notification_service import NotificationService


class OrderManager:
    """
    Central order management service that coordinates all order operations
    """
    
    def __init__(
        self,
        execution_engine: ExecutionEngine,
        position_manager: PositionManager,
        risk_manager: RiskManager,
        notification_service: NotificationService,
        validator: Optional[OrderValidator] = None
    ):
        self.execution_engine = execution_engine
        self.position_manager = position_manager
        self.risk_manager = risk_manager
        self.notification_service = notification_service
        self.validator = validator or OrderValidator()
        
        # Order storage
        self.orders: Dict[str, Order] = {}
        self.trades: Dict[str, Trade] = {}
        
        # Indexing for faster lookups
        self.orders_by_symbol: Dict[str, Set[str]] = {}
        self.orders_by_status: Dict[OrderStatus, Set[str]] = {}
        self.orders_by_strategy: Dict[str, Set[str]] = {}
        
        # Background tasks
        self.background_tasks: List[asyncio.Task] = []
        self.is_running = False
        
        # Logger
        self.logger = logging.getLogger(__name__)
        
        # Event callbacks
        self.order_callbacks: List[callable] = []
        self.trade_callbacks: List[callable] = []
    
    async def start(self):
        """Start the order manager and background tasks"""
        self.is_running = True
        
        # Start execution engine
        await self.execution_engine.start()
        
        # Start background tasks
        self.background_tasks.append(
            asyncio.create_task(self._order_monitor())
        )
        self.background_tasks.append(
            asyncio.create_task(self._expiry_monitor())
        )
        
        self.logger.info("OrderManager started successfully")
    
    async def stop(self):
        """Stop the order manager and cleanup"""
        self.is_running = False
        
        # Cancel all background tasks
        for task in self.background_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        if self.background_tasks:
            await asyncio.gather(*self.background_tasks, return_exceptions=True)
        
        # Stop execution engine
        await self.execution_engine.stop()
        
        self.logger.info("OrderManager stopped")
    
    async def create_order(self, request: OrderRequest) -> Order:
        """
        Create a new order from request
        
        Args:
            request: OrderRequest with order details
            
        Returns:
            Created Order object
            
        Raises:
            ValueError: If order validation fails
            Exception: If risk check fails
        """
        # Validate order request
        validation_errors = request.validate()
        if validation_errors:
            raise ValueError(f"Order validation failed: {', '.join(validation_errors)}")
        
        # Additional validation
        await self.validator.validate_order_request(request)
        
        # Risk management check
        risk_result = await self.risk_manager.check_order_risk(request)
        if not risk_result.approved:
            raise Exception(f"Order rejected by risk management: {risk_result.reason}")
        
        # Create order
        order = Order.from_request(request)
        
        # Handle bracket orders
        if request.order_type == OrderType.BRACKET:
            child_orders = await self._create_bracket_orders(order, request)
            order.child_order_ids = [child.order_id for child in child_orders]
        
        # Store order
        await self._store_order(order)
        
        # Submit to execution engine
        try:
            await self.execution_engine.submit_order(order)
            order.update_status(OrderStatus.SUBMITTED)
            await self._update_order(order)
        except Exception as e:
            order.update_status(OrderStatus.REJECTED)
            await self._update_order(order)
            self.logger.error(f"Failed to submit order {order.order_id}: {e}")
            raise
        
        # Notify
        await self.notification_service.send_order_notification(order, "ORDER_CREATED")
        
        self.logger.info(f"Order created: {order.order_id} - {order.symbol} {order.side.value} {order.quantity}")
        
        return order
    
    async def update_order(self, order_id: str, update: OrderUpdate) -> Order:
        """
        Update an existing order
        
        Args:
            order_id: ID of order to update
            update: OrderUpdate with new values
            
        Returns:
            Updated Order object
            
        Raises:
            ValueError: If order not found or cannot be updated
        """
        order = self.orders.get(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        if not order.is_active:
            raise ValueError(f"Cannot update order {order_id} in status {order.status.value}")
        
        if not update.has_updates():
            return order
        
        # Create updated order for validation
        original_values = {
            'quantity': order.quantity,
            'price': order.price,
            'stop_price': order.stop_price,
            'time_in_force': order.time_in_force
        }
        
        # Apply updates temporarily for validation
        if update.quantity is not None:
            order.quantity = update.quantity
        if update.price is not None:
            order.price = update.price
        if update.stop_price is not None:
            order.stop_price = update.stop_price
        if update.time_in_force is not None:
            order.time_in_force = update.time_in_force
        
        try:
            # Validate updated order
            await self.validator.validate_order_update(order, update)
            
            # Risk check for update
            risk_result = await self.risk_manager.check_order_update_risk(order, update)
            if not risk_result.approved:
                raise Exception(f"Order update rejected by risk management: {risk_result.reason}")
            
            # Submit update to execution engine
            await self.execution_engine.update_order(order, update)
            
            # Update timestamp
            order.updated_at = datetime.utcnow()
            await self._update_order(order)
            
            # Notify
            await self.notification_service.send_order_notification(order, "ORDER_UPDATED")
            
            self.logger.info(f"Order updated: {order_id}")
            
            return order
            
        except Exception as e:
            # Restore original values
            for key, value in original_values.items():
                setattr(order, key, value)
            raise
    
    async def cancel_order(self, order_id: str, reason: str = "User requested") -> Order:
        """
        Cancel an existing order
        
        Args:
            order_id: ID of order to cancel
            reason: Cancellation reason
            
        Returns:
            Cancelled Order object
            
        Raises:
            ValueError: If order not found or cannot be cancelled
        """
        order = self.orders.get(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        if not order.is_active:
            raise ValueError(f"Cannot cancel order {order_id} in status {order.status.value}")
        
        try:
            # Submit cancellation to execution engine
            await self.execution_engine.cancel_order(order)
            
            # Update status
            order.update_status(OrderStatus.PENDING_CANCEL)
            await self._update_order(order)
            
            # Cancel child orders for bracket orders
            if order.child_order_ids:
                for child_id in order.child_order_ids:
                    try:
                        await self.cancel_order(child_id, "Parent order cancelled")
                    except Exception as e:
                        self.logger.warning(f"Failed to cancel child order {child_id}: {e}")
            
            # Notify
            await self.notification_service.send_order_notification(
                order, "ORDER_CANCEL_REQUESTED", {"reason": reason}
            )
            
            self.logger.info(f"Order cancellation requested: {order_id} - {reason}")
            
            return order
            
        except Exception as e:
            self.logger.error(f"Failed to cancel order {order_id}: {e}")
            raise
    
    async def get_order(self, order_id: str) -> Optional[Order]:
        """Get order by ID"""
        return self.orders.get(order_id)
    
    async def get_orders(
        self,
        symbol: Optional[str] = None,
        status: Optional[OrderStatus] = None,
        strategy_id: Optional[str] = None,
        limit: Optional[int] = None
    ) -> List[Order]:
        """
        Get orders with optional filters
        
        Args:
            symbol: Filter by symbol
            status: Filter by status
            strategy_id: Filter by strategy
            limit: Maximum number of orders to return
            
        Returns:
            List of matching orders
        """
        order_ids = set(self.orders.keys())
        
        # Apply filters
        if symbol:
            symbol_orders = self.orders_by_symbol.get(symbol, set())
            order_ids = order_ids.intersection(symbol_orders)
        
        if status:
            status_orders = self.orders_by_status.get(status, set())
            order_ids = order_ids.intersection(status_orders)
        
        if strategy_id:
            strategy_orders = self.orders_by_strategy.get(strategy_id, set())
            order_ids = order_ids.intersection(strategy_orders)
        
        # Get orders and sort by creation time
        orders = [self.orders[order_id] for order_id in order_ids]
        orders.sort(key=lambda x: x.created_at, reverse=True)
        
        # Apply limit
        if limit:
            orders = orders[:limit]
        
        return orders
    
    async def get_active_orders(self, symbol: Optional[str] = None) -> List[Order]:
        """Get all active orders"""
        active_statuses = [
            OrderStatus.PENDING,
            OrderStatus.SUBMITTED,
            OrderStatus.ACKNOWLEDGED,
            OrderStatus.PARTIALLY_FILLED,
            OrderStatus.TRIGGERED
        ]
        
        all_active = []
        for status in active_statuses:
            orders = await self.get_orders(symbol=symbol, status=status)
            all_active.extend(orders)
        
        return all_active
    
    async def process_trade(self, trade: Trade) -> None:
        """
        Process a trade execution
        
        Args:
            trade: Trade object with execution details
        """
        # Store trade
        self.trades[trade.trade_id] = trade
        
        # Get associated order
        order = self.orders.get(trade.order_id)
        if not order:
            self.logger.warning(f"Trade {trade.trade_id} for unknown order {trade.order_id}")
            return
        
        # Apply fill to order
        order.apply_fill(trade.quantity, trade.price)
        await self._update_order(order)
        
        # Update position
        await self.position_manager.process_trade(trade)
        
        # Risk monitoring
        await self.risk_manager.monitor_trade(trade)
        
        # Handle bracket order triggers
        if order.order_type == OrderType.BRACKET and order.is_filled:
            await self._activate_bracket_children(order)
        
        # Notify
        await self.notification_service.send_trade_notification(trade)
        
        # Trigger callbacks
        for callback in self.trade_callbacks:
            try:
                await callback(trade)
            except Exception as e:
                self.logger.error(f"Trade callback error: {e}")
        
        self.logger.info(
            f"Trade processed: {trade.trade_id} - {trade.symbol} "
            f"{trade.side.value} {trade.quantity} @ {trade.price}"
        )
    
    async def process_order_update(self, order_id: str, status: OrderStatus, **kwargs) -> None:
        """
        Process order status update from execution engine
        
        Args:
            order_id: Order ID
            status: New order status
            **kwargs: Additional update data
        """
        order = self.orders.get(order_id)
        if not order:
            self.logger.warning(f"Status update for unknown order {order_id}")
            return
        
        old_status = order.status
        order.update_status(status)
        
        # Update broker order ID if provided
        if 'broker_order_id' in kwargs:
            order.broker_order_id = kwargs['broker_order_id']
        
        await self._update_order(order)
        
        # Handle status-specific logic
        if status == OrderStatus.CANCELLED:
            # Cancel child orders for bracket orders
            if order.child_order_ids:
                for child_id in order.child_order_ids:
                    child_order = self.orders.get(child_id)
                    if child_order and child_order.is_active:
                        try:
                            await self.cancel_order(child_id, "Parent order cancelled")
                        except Exception as e:
                            self.logger.warning(f"Failed to cancel child order {child_id}: {e}")
        
        # Notify
        await self.notification_service.send_order_notification(
            order, "ORDER_STATUS_CHANGED", 
            {"old_status": old_status.value, "new_status": status.value}
        )
        
        # Trigger callbacks
        for callback in self.order_callbacks:
            try:
                await callback(order)
            except Exception as e:
                self.logger.error(f"Order callback error: {e}")
        
        self.logger.info(f"Order status updated: {order_id} {old_status.value} -> {status.value}")
    
    async def get_statistics(self) -> Dict:
        """Get order management statistics"""
        total_orders = len(self.orders)
        total_trades = len(self.trades)
        
        status_counts = {}
        for status in OrderStatus:
            status_counts[status.value] = len(self.orders_by_status.get(status, set()))
        
        active_orders = sum(
            len(self.orders_by_status.get(status, set()))
            for status in [
                OrderStatus.PENDING,
                OrderStatus.SUBMITTED,
                OrderStatus.ACKNOWLEDGED,
                OrderStatus.PARTIALLY_FILLED,
                OrderStatus.TRIGGERED
            ]
        )
        
        return {
            'total_orders': total_orders,
            'active_orders': active_orders,
            'total_trades': total_trades,
            'status_breakdown': status_counts,
            'symbols_traded': len(self.orders_by_symbol),
            'strategies_active': len(self.orders_by_strategy)
        }
    
    def add_order_callback(self, callback: callable):
        """Add callback for order events"""
        self.order_callbacks.append(callback)
    
    def add_trade_callback(self, callback: callable):
        """Add callback for trade events"""
        self.trade_callbacks.append(callback)
    
    # Private methods
    
    async def _store_order(self, order: Order) -> None:
        """Store order and update indices"""
        self.orders[order.order_id] = order
        
        # Update symbol index
        if order.symbol not in self.orders_by_symbol:
            self.orders_by_symbol[order.symbol] = set()
        self.orders_by_symbol[order.symbol].add(order.order_id)
        
        # Update status index
        if order.status not in self.orders_by_status:
            self.orders_by_status[order.status] = set()
        self.orders_by_status[order.status].add(order.order_id)
        
        # Update strategy index
        if order.strategy_id:
            if order.strategy_id not in self.orders_by_strategy:
                self.orders_by_strategy[order.strategy_id] = set()
            self.orders_by_strategy[order.strategy_id].add(order.order_id)
    
    async def _update_order(self, order: Order) -> None:
        """Update order and refresh indices"""
        # Remove from old status index
        for status, order_ids in self.orders_by_status.items():
            order_ids.discard(order.order_id)
        
        # Add to new status index
        if order.status not in self.orders_by_status:
            self.orders_by_status[order.status] = set()
        self.orders_by_status[order.status].add(order.order_id)
    
    async def _create_bracket_orders(self, parent_order: Order, request: OrderRequest) -> List[Order]:
        """Create child orders for bracket order"""
        child_orders = []
        
        # Create stop loss order
        if request.stop_loss_price:
            stop_request = OrderRequest(
                symbol=request.symbol,
                side=OrderSide.SELL if request.side == OrderSide.BUY else OrderSide.BUY,
                order_type=OrderType.STOP_LOSS,
                quantity=request.quantity,
                stop_price=request.stop_loss_price,
                parent_order_id=parent_order.order_id,
                strategy_id=request.strategy_id,
                tags=request.tags.copy()
            )
            
            stop_order = Order.from_request(stop_request)
            child_orders.append(stop_order)
            await self._store_order(stop_order)
        
        # Create take profit order
        if request.target_price:
            profit_request = OrderRequest(
                symbol=request.symbol,
                side=OrderSide.SELL if request.side == OrderSide.BUY else OrderSide.BUY,
                order_type=OrderType.TAKE_PROFIT,
                quantity=request.quantity,
                price=request.target_price,
                parent_order_id=parent_order.order_id,
                strategy_id=request.strategy_id,
                tags=request.tags.copy()
            )
            
            profit_order = Order.from_request(profit_request)
            child_orders.append(profit_order)
            await self._store_order(profit_order)
        
        return child_orders
    
    async def _activate_bracket_children(self, parent_order: Order) -> None:
        """Activate child orders when bracket parent is filled"""
        for child_id in parent_order.child_order_ids:
            child_order = self.orders.get(child_id)
            if child_order and child_order.status == OrderStatus.PENDING:
                try:
                    await self.execution_engine.submit_order(child_order)
                    child_order.update_status(OrderStatus.SUBMITTED)
                    await self._update_order(child_order)
                except Exception as e:
                    self.logger.error(f"Failed to activate child order {child_id}: {e}")
    
    async def _order_monitor(self) -> None:
        """Background task to monitor orders"""
        while self.is_running:
            try:
                # Monitor order timeouts and other conditions
                current_time = datetime.utcnow()
                
                for order in list(self.orders.values()):
                    # Check for order timeouts
                    if (order.is_active and 
                        order.submitted_at and 
                        current_time - order.submitted_at > timedelta(hours=24)):
                        
                        self.logger.warning(f"Order {order.order_id} timeout detected")
                        # Could implement automatic cancellation here
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Order monitor error: {e}")
                await asyncio.sleep(30)
    
    async def _expiry_monitor(self) -> None:
        """Background task to monitor order expiry"""
        while self.is_running:
            try:
                current_time = datetime.utcnow()
                
                for order in list(self.orders.values()):
                    if (order.is_active and 
                        order.time_in_force == TimeInForce.DAY and
                        current_time.date() > order.created_at.date()):
                        
                        try:
                            await self.cancel_order(order.order_id, "Day order expired")
                        except Exception as e:
                            self.logger.error(f"Failed to expire order {order.order_id}: {e}")
                
                await asyncio.sleep(60)  # Check every minute
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Expiry monitor error: {e}")
                await asyncio.sleep(60) 