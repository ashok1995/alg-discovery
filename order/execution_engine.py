"""
Execution Engine - Handles order execution and broker integration
"""

import asyncio
import logging
from typing import Dict, List, Optional, Callable
from datetime import datetime
from abc import ABC, abstractmethod
import uuid

from .models import Order, OrderUpdate, OrderStatus, Trade, OrderSide
from decimal import Decimal


class BrokerAdapter(ABC):
    """Abstract base class for broker adapters"""
    
    @abstractmethod
    async def submit_order(self, order: Order) -> str:
        """Submit order to broker, returns broker order ID"""
        pass
    
    @abstractmethod
    async def update_order(self, order: Order, update: OrderUpdate) -> bool:
        """Update order at broker"""
        pass
    
    @abstractmethod
    async def cancel_order(self, order: Order) -> bool:
        """Cancel order at broker"""
        pass
    
    @abstractmethod
    async def get_order_status(self, broker_order_id: str) -> Dict:
        """Get order status from broker"""
        pass


class SimulatedBrokerAdapter(BrokerAdapter):
    """
    Simulated broker for testing and development
    """
    
    def __init__(self, fill_probability: float = 0.8, fill_delay: float = 1.0):
        self.fill_probability = fill_probability
        self.fill_delay = fill_delay
        self.orders: Dict[str, Order] = {}
        self.logger = logging.getLogger(__name__)
    
    async def submit_order(self, order: Order) -> str:
        """Submit order to simulated broker"""
        broker_order_id = f"SIM_{uuid.uuid4().hex[:8].upper()}"
        self.orders[broker_order_id] = order
        
        self.logger.info(f"Simulated broker received order: {broker_order_id}")
        
        # Simulate order processing
        asyncio.create_task(self._simulate_order_processing(order, broker_order_id))
        
        return broker_order_id
    
    async def update_order(self, order: Order, update: OrderUpdate) -> bool:
        """Update order in simulated broker"""
        if order.broker_order_id in self.orders:
            self.logger.info(f"Order update simulated: {order.broker_order_id}")
            return True
        return False
    
    async def cancel_order(self, order: Order) -> bool:
        """Cancel order in simulated broker"""
        if order.broker_order_id in self.orders:
            self.logger.info(f"Order cancellation simulated: {order.broker_order_id}")
            return True
        return False
    
    async def get_order_status(self, broker_order_id: str) -> Dict:
        """Get order status from simulated broker"""
        order = self.orders.get(broker_order_id)
        if order:
            return {
                'status': order.status.value,
                'filled_quantity': order.filled_quantity,
                'average_fill_price': float(order.average_fill_price) if order.average_fill_price else None
            }
        return {}
    
    async def _simulate_order_processing(self, order: Order, broker_order_id: str):
        """Simulate order processing and fills"""
        try:
            # Simulate processing delay
            await asyncio.sleep(0.1)
            
            # Acknowledge order
            if hasattr(self, 'execution_engine'):
                await self.execution_engine.process_order_update(
                    order.order_id, OrderStatus.ACKNOWLEDGED, broker_order_id=broker_order_id
                )
            
            # Simulate fill delay
            await asyncio.sleep(self.fill_delay)
            
            # Simulate fill (for market orders and some limit orders)
            import random
            if random.random() < self.fill_probability:
                # Simulate fill price (add some randomness to market price)
                base_price = order.price if order.price else Decimal('100.0')  # Default price
                fill_price = base_price * (1 + Decimal(str(random.uniform(-0.001, 0.001))))
                
                # Create simulated trade
                trade = Trade(
                    trade_id=str(uuid.uuid4()),
                    order_id=order.order_id,
                    symbol=order.symbol,
                    side=order.side,
                    quantity=order.quantity,
                    price=fill_price,
                    timestamp=datetime.utcnow()
                )
                
                if hasattr(self, 'execution_engine'):
                    await self.execution_engine.process_trade(trade)
            
        except Exception as e:
            self.logger.error(f"Error in simulated order processing: {e}")


class ExecutionEngine:
    """
    Order execution engine that manages order lifecycle and broker communication
    """
    
    def __init__(self, broker_adapter: BrokerAdapter):
        self.broker_adapter = broker_adapter
        self.logger = logging.getLogger(__name__)
        
        # Set reference for simulated broker
        if hasattr(broker_adapter, 'execution_engine'):
            broker_adapter.execution_engine = self
        
        # Event callbacks
        self.order_update_callbacks: List[Callable] = []
        self.trade_callbacks: List[Callable] = []
        
        # Background tasks
        self.background_tasks: List[asyncio.Task] = []
        self.is_running = False
        
        # Order tracking
        self.pending_orders: Dict[str, Order] = {}
        self.broker_order_mapping: Dict[str, str] = {}  # broker_id -> order_id
    
    async def start(self):
        """Start the execution engine"""
        self.is_running = True
        
        # Start background monitoring tasks
        self.background_tasks.append(
            asyncio.create_task(self._monitor_orders())
        )
        
        self.logger.info("ExecutionEngine started")
    
    async def stop(self):
        """Stop the execution engine"""
        self.is_running = False
        
        # Cancel background tasks
        for task in self.background_tasks:
            task.cancel()
        
        if self.background_tasks:
            await asyncio.gather(*self.background_tasks, return_exceptions=True)
        
        self.logger.info("ExecutionEngine stopped")
    
    async def submit_order(self, order: Order) -> None:
        """
        Submit order to broker
        
        Args:
            order: Order to submit
            
        Raises:
            Exception: If submission fails
        """
        try:
            # Submit to broker
            broker_order_id = await self.broker_adapter.submit_order(order)
            
            # Update order with broker ID
            order.broker_order_id = broker_order_id
            self.pending_orders[order.order_id] = order
            self.broker_order_mapping[broker_order_id] = order.order_id
            
            self.logger.info(f"Order submitted: {order.order_id} -> {broker_order_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to submit order {order.order_id}: {e}")
            raise
    
    async def update_order(self, order: Order, update: OrderUpdate) -> None:
        """
        Update order at broker
        
        Args:
            order: Order to update
            update: Update details
            
        Raises:
            Exception: If update fails
        """
        try:
            success = await self.broker_adapter.update_order(order, update)
            
            if not success:
                raise Exception("Broker rejected order update")
            
            self.logger.info(f"Order update submitted: {order.order_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to update order {order.order_id}: {e}")
            raise
    
    async def cancel_order(self, order: Order) -> None:
        """
        Cancel order at broker
        
        Args:
            order: Order to cancel
            
        Raises:
            Exception: If cancellation fails
        """
        try:
            success = await self.broker_adapter.cancel_order(order)
            
            if not success:
                raise Exception("Broker rejected order cancellation")
            
            self.logger.info(f"Order cancellation submitted: {order.order_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to cancel order {order.order_id}: {e}")
            raise
    
    async def process_order_update(self, order_id: str, status: OrderStatus, **kwargs) -> None:
        """
        Process order status update from broker
        
        Args:
            order_id: Order ID
            status: New status
            **kwargs: Additional update data
        """
        # Notify callbacks
        for callback in self.order_update_callbacks:
            try:
                await callback(order_id, status, **kwargs)
            except Exception as e:
                self.logger.error(f"Order update callback error: {e}")
        
        # Remove from pending if terminal state
        if status in [OrderStatus.FILLED, OrderStatus.CANCELLED, OrderStatus.REJECTED, OrderStatus.EXPIRED]:
            self.pending_orders.pop(order_id, None)
            
            # Remove broker mapping
            broker_order_id = kwargs.get('broker_order_id')
            if broker_order_id:
                self.broker_order_mapping.pop(broker_order_id, None)
    
    async def process_trade(self, trade: Trade) -> None:
        """
        Process trade execution
        
        Args:
            trade: Trade details
        """
        # Notify callbacks
        for callback in self.trade_callbacks:
            try:
                await callback(trade)
            except Exception as e:
                self.logger.error(f"Trade callback error: {e}")
    
    def add_order_update_callback(self, callback: Callable):
        """Add callback for order updates"""
        self.order_update_callbacks.append(callback)
    
    def add_trade_callback(self, callback: Callable):
        """Add callback for trade notifications"""
        self.trade_callbacks.append(callback)
    
    async def get_order_status(self, order_id: str) -> Optional[Dict]:
        """Get order status from broker"""
        order = self.pending_orders.get(order_id)
        if not order or not order.broker_order_id:
            return None
        
        try:
            return await self.broker_adapter.get_order_status(order.broker_order_id)
        except Exception as e:
            self.logger.error(f"Failed to get order status for {order_id}: {e}")
            return None
    
    async def _monitor_orders(self):
        """Background task to monitor pending orders"""
        while self.is_running:
            try:
                # Check status of pending orders
                for order_id, order in list(self.pending_orders.items()):
                    if order.broker_order_id:
                        status_data = await self.get_order_status(order_id)
                        if status_data:
                            # Process any status changes
                            broker_status = status_data.get('status')
                            if broker_status and broker_status != order.status.value:
                                try:
                                    new_status = OrderStatus(broker_status)
                                    await self.process_order_update(order_id, new_status)
                                except ValueError:
                                    self.logger.warning(f"Unknown broker status: {broker_status}")
                
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Order monitoring error: {e}")
                await asyncio.sleep(10)


class OrderRouter:
    """
    Routes orders to appropriate execution venues
    """
    
    def __init__(self):
        self.execution_engines: Dict[str, ExecutionEngine] = {}
        self.routing_rules: Dict[str, str] = {}  # symbol -> venue
        self.logger = logging.getLogger(__name__)
    
    def add_execution_engine(self, venue: str, engine: ExecutionEngine):
        """Add execution engine for venue"""
        self.execution_engines[venue] = engine
    
    def add_routing_rule(self, symbol: str, venue: str):
        """Add routing rule for symbol"""
        self.routing_rules[symbol] = venue
    
    def get_venue_for_order(self, order: Order) -> str:
        """Get execution venue for order"""
        # Check symbol-specific routing
        venue = self.routing_rules.get(order.symbol)
        if venue and venue in self.execution_engines:
            return venue
        
        # Default venue
        if 'default' in self.execution_engines:
            return 'default'
        
        # First available venue
        if self.execution_engines:
            return list(self.execution_engines.keys())[0]
        
        raise Exception("No execution venue available")
    
    async def route_order(self, order: Order) -> ExecutionEngine:
        """Route order to appropriate execution engine"""
        venue = self.get_venue_for_order(order)
        engine = self.execution_engines[venue]
        
        self.logger.info(f"Routing order {order.order_id} to venue {venue}")
        
        return engine


class SmartOrderRouter:
    """
    Intelligent order routing with market analysis
    """
    
    def __init__(self, data_service=None):
        self.data_service = data_service
        self.execution_engines: Dict[str, ExecutionEngine] = {}
        self.logger = logging.getLogger(__name__)
    
    def add_execution_engine(self, venue: str, engine: ExecutionEngine):
        """Add execution engine for venue"""
        self.execution_engines[venue] = engine
    
    async def route_order(self, order: Order) -> ExecutionEngine:
        """
        Intelligently route order based on market conditions
        
        Args:
            order: Order to route
            
        Returns:
            Best execution engine for the order
        """
        if not self.execution_engines:
            raise Exception("No execution venues available")
        
        # For now, use simple routing
        # In production, this would analyze:
        # - Liquidity at different venues
        # - Historical execution quality
        # - Current spreads and depth
        # - Order size vs. venue characteristics
        
        best_venue = self._select_best_venue(order)
        engine = self.execution_engines[best_venue]
        
        self.logger.info(f"Smart routing order {order.order_id} to venue {best_venue}")
        
        return engine
    
    def _select_best_venue(self, order: Order) -> str:
        """Select best venue for order"""
        # Simple venue selection logic
        available_venues = list(self.execution_engines.keys())
        
        if not available_venues:
            raise Exception("No venues available")
        
        # For large orders, prefer venues with better liquidity
        if order.quantity > 1000:
            for venue in ['institutional', 'primary']:
                if venue in available_venues:
                    return venue
        
        # For small orders, prefer venues with better pricing
        for venue in ['retail', 'default']:
            if venue in available_venues:
                return venue
        
        # Return first available venue
        return available_venues[0]
    
    async def analyze_execution_quality(self, venue: str, timeframe_hours: int = 24) -> Dict:
        """
        Analyze execution quality for a venue
        
        Args:
            venue: Venue to analyze
            timeframe_hours: Analysis timeframe in hours
            
        Returns:
            Execution quality metrics
        """
        # Placeholder for execution quality analysis
        # Would analyze fill rates, price improvement, speed, etc.
        
        return {
            'venue': venue,
            'fill_rate': 0.95,
            'average_fill_time': 1.2,
            'price_improvement': 0.001,
            'total_orders': 150
        } 