"""
Order validation service with comprehensive validation rules
"""

import logging
from typing import List, Dict, Any, Optional
from decimal import Decimal
from datetime import datetime, time

from .models import OrderRequest, OrderUpdate, Order, OrderType, OrderSide, TimeInForce


class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass


class OrderValidator:
    """
    Comprehensive order validation service
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or self._default_config()
        self.logger = logging.getLogger(__name__)
    
    def _default_config(self) -> Dict[str, Any]:
        """Default validation configuration"""
        return {
            'min_price': Decimal('0.01'),
            'max_price': Decimal('100000'),
            'min_quantity': 1,
            'max_quantity': 100000,
            'max_order_value': Decimal('1000000'),
            'market_hours': {
                'start': time(9, 15),  # 9:15 AM
                'end': time(15, 30)    # 3:30 PM
            },
            'allowed_symbols': None,  # None means all symbols allowed
            'price_precision': 2,
            'lot_size': 1
        }
    
    async def validate_order_request(self, request: OrderRequest) -> None:
        """
        Validate order request
        
        Args:
            request: OrderRequest to validate
            
        Raises:
            ValidationError: If validation fails
        """
        errors = []
        
        # Basic validations
        errors.extend(self._validate_symbol(request.symbol))
        errors.extend(self._validate_quantity(request.quantity))
        errors.extend(self._validate_price(request.price, request.order_type))
        errors.extend(self._validate_stop_price(request.stop_price, request.order_type))
        errors.extend(self._validate_order_type(request))
        errors.extend(self._validate_time_in_force(request.time_in_force))
        errors.extend(self._validate_bracket_prices(request))
        errors.extend(self._validate_order_value(request))
        
        # Market timing validation
        errors.extend(self._validate_market_hours())
        
        if errors:
            raise ValidationError(f"Order validation failed: {'; '.join(errors)}")
    
    async def validate_order_update(self, order: Order, update: OrderUpdate) -> None:
        """
        Validate order update
        
        Args:
            order: Existing order
            update: OrderUpdate to validate
            
        Raises:
            ValidationError: If validation fails
        """
        errors = []
        
        # Validate that order can be updated
        if not order.is_active:
            errors.append(f"Cannot update order in status {order.status.value}")
        
        # Validate new quantity
        if update.quantity is not None:
            errors.extend(self._validate_quantity(update.quantity))
            
            # Check if quantity reduction is valid for partially filled orders
            if order.filled_quantity > 0 and update.quantity < order.filled_quantity:
                errors.append("Cannot reduce quantity below filled quantity")
        
        # Validate new price
        if update.price is not None:
            errors.extend(self._validate_price(update.price, order.order_type))
        
        # Validate new stop price
        if update.stop_price is not None:
            errors.extend(self._validate_stop_price(update.stop_price, order.order_type))
        
        # Validate time in force
        if update.time_in_force is not None:
            errors.extend(self._validate_time_in_force(update.time_in_force))
        
        if errors:
            raise ValidationError(f"Order update validation failed: {'; '.join(errors)}")
    
    def _validate_symbol(self, symbol: str) -> List[str]:
        """Validate symbol"""
        errors = []
        
        if not symbol:
            errors.append("Symbol is required")
            return errors
        
        if not symbol.isalpha():
            errors.append("Symbol must contain only letters")
        
        if len(symbol) < 1 or len(symbol) > 20:
            errors.append("Symbol length must be between 1 and 20 characters")
        
        # Check allowed symbols if configured
        allowed_symbols = self.config.get('allowed_symbols')
        if allowed_symbols and symbol not in allowed_symbols:
            errors.append(f"Symbol {symbol} not in allowed list")
        
        return errors
    
    def _validate_quantity(self, quantity: int) -> List[str]:
        """Validate quantity"""
        errors = []
        
        if quantity <= 0:
            errors.append("Quantity must be positive")
        
        min_qty = self.config.get('min_quantity', 1)
        max_qty = self.config.get('max_quantity', 100000)
        
        if quantity < min_qty:
            errors.append(f"Quantity must be at least {min_qty}")
        
        if quantity > max_qty:
            errors.append(f"Quantity cannot exceed {max_qty}")
        
        # Check lot size
        lot_size = self.config.get('lot_size', 1)
        if quantity % lot_size != 0:
            errors.append(f"Quantity must be multiple of lot size {lot_size}")
        
        return errors
    
    def _validate_price(self, price: Optional[Decimal], order_type: OrderType) -> List[str]:
        """Validate price"""
        errors = []
        
        # Check if price is required for order type
        price_required_types = [
            OrderType.LIMIT,
            OrderType.STOP_LOSS_LIMIT,
            OrderType.TAKE_PROFIT_LIMIT
        ]
        
        if order_type in price_required_types and price is None:
            errors.append(f"Price is required for {order_type.value} orders")
            return errors
        
        if price is None:
            return errors
        
        if price <= 0:
            errors.append("Price must be positive")
        
        min_price = self.config.get('min_price', Decimal('0.01'))
        max_price = self.config.get('max_price', Decimal('100000'))
        
        if price < min_price:
            errors.append(f"Price must be at least {min_price}")
        
        if price > max_price:
            errors.append(f"Price cannot exceed {max_price}")
        
        # Check price precision
        precision = self.config.get('price_precision', 2)
        if price.as_tuple().exponent < -precision:
            errors.append(f"Price precision cannot exceed {precision} decimal places")
        
        return errors
    
    def _validate_stop_price(self, stop_price: Optional[Decimal], order_type: OrderType) -> List[str]:
        """Validate stop price"""
        errors = []
        
        # Check if stop price is required for order type
        stop_price_required_types = [
            OrderType.STOP_LOSS,
            OrderType.STOP_LOSS_LIMIT
        ]
        
        if order_type in stop_price_required_types and stop_price is None:
            errors.append(f"Stop price is required for {order_type.value} orders")
            return errors
        
        if stop_price is None:
            return errors
        
        if stop_price <= 0:
            errors.append("Stop price must be positive")
        
        min_price = self.config.get('min_price', Decimal('0.01'))
        max_price = self.config.get('max_price', Decimal('100000'))
        
        if stop_price < min_price:
            errors.append(f"Stop price must be at least {min_price}")
        
        if stop_price > max_price:
            errors.append(f"Stop price cannot exceed {max_price}")
        
        return errors
    
    def _validate_order_type(self, request: OrderRequest) -> List[str]:
        """Validate order type specific rules"""
        errors = []
        
        # Validate stop loss orders
        if request.order_type in [OrderType.STOP_LOSS, OrderType.STOP_LOSS_LIMIT]:
            if request.side == OrderSide.BUY and request.stop_price and request.price:
                if request.stop_price <= request.price:
                    errors.append("Stop price must be above current price for buy stop orders")
            elif request.side == OrderSide.SELL and request.stop_price and request.price:
                if request.stop_price >= request.price:
                    errors.append("Stop price must be below current price for sell stop orders")
        
        # Validate take profit orders
        if request.order_type in [OrderType.TAKE_PROFIT, OrderType.TAKE_PROFIT_LIMIT]:
            if request.side == OrderSide.BUY and request.price:
                # Take profit for buy position should be above entry price
                pass  # Need market price for proper validation
            elif request.side == OrderSide.SELL and request.price:
                # Take profit for sell position should be below entry price
                pass  # Need market price for proper validation
        
        return errors
    
    def _validate_time_in_force(self, tif: TimeInForce) -> List[str]:
        """Validate time in force"""
        errors = []
        
        # All time in force options are valid for now
        # Could add market-specific restrictions here
        
        return errors
    
    def _validate_bracket_prices(self, request: OrderRequest) -> List[str]:
        """Validate bracket order prices"""
        errors = []
        
        if request.order_type != OrderType.BRACKET:
            return errors
        
        if not request.target_price or not request.stop_loss_price:
            errors.append("Bracket orders require both target and stop loss prices")
            return errors
        
        if request.price:  # Limit bracket order
            if request.side == OrderSide.BUY:
                if request.target_price <= request.price:
                    errors.append("Target price must be above entry price for buy bracket orders")
                if request.stop_loss_price >= request.price:
                    errors.append("Stop loss price must be below entry price for buy bracket orders")
            else:  # SELL
                if request.target_price >= request.price:
                    errors.append("Target price must be below entry price for sell bracket orders")
                if request.stop_loss_price <= request.price:
                    errors.append("Stop loss price must be above entry price for sell bracket orders")
        
        return errors
    
    def _validate_order_value(self, request: OrderRequest) -> List[str]:
        """Validate total order value"""
        errors = []
        
        if not request.price:
            return errors  # Cannot validate value for market orders
        
        order_value = request.price * request.quantity
        max_value = self.config.get('max_order_value', Decimal('1000000'))
        
        if order_value > max_value:
            errors.append(f"Order value {order_value} exceeds maximum {max_value}")
        
        return errors
    
    def _validate_market_hours(self) -> List[str]:
        """Validate if market is open"""
        errors = []
        
        market_hours = self.config.get('market_hours')
        if not market_hours:
            return errors
        
        current_time = datetime.now().time()
        start_time = market_hours.get('start', time(9, 15))
        end_time = market_hours.get('end', time(15, 30))
        
        # For now, just log a warning instead of blocking
        if not (start_time <= current_time <= end_time):
            self.logger.warning(f"Order placed outside market hours: {current_time}")
        
        return errors


class RealTimeValidator:
    """
    Real-time market data validator for orders
    """
    
    def __init__(self, data_service=None):
        self.data_service = data_service
        self.logger = logging.getLogger(__name__)
    
    async def validate_against_market_data(self, request: OrderRequest) -> List[str]:
        """
        Validate order against current market data
        
        Args:
            request: OrderRequest to validate
            
        Returns:
            List of validation errors
        """
        errors = []
        
        if not self.data_service:
            return errors
        
        try:
            # Get current market data
            market_data = await self.data_service.get_quote(request.symbol)
            if not market_data:
                errors.append(f"Cannot get market data for {request.symbol}")
                return errors
            
            current_price = market_data.get('last_price')
            if not current_price:
                errors.append(f"No current price available for {request.symbol}")
                return errors
            
            current_price = Decimal(str(current_price))
            
            # Validate limit order prices against current market
            if request.order_type == OrderType.LIMIT and request.price:
                price_diff_pct = abs((request.price - current_price) / current_price) * 100
                
                # Warn if limit price is too far from market
                if price_diff_pct > 20:  # 20% away from market
                    self.logger.warning(
                        f"Limit order price {request.price} is {price_diff_pct:.1f}% "
                        f"away from market price {current_price}"
                    )
            
            # Validate stop prices
            if request.order_type in [OrderType.STOP_LOSS, OrderType.STOP_LOSS_LIMIT] and request.stop_price:
                if request.side == OrderSide.BUY and request.stop_price <= current_price:
                    errors.append("Buy stop order trigger price should be above current market price")
                elif request.side == OrderSide.SELL and request.stop_price >= current_price:
                    errors.append("Sell stop order trigger price should be below current market price")
            
            # Check circuit limits if available
            if 'upper_circuit' in market_data and 'lower_circuit' in market_data:
                upper_limit = Decimal(str(market_data['upper_circuit']))
                lower_limit = Decimal(str(market_data['lower_circuit']))
                
                if request.price and (request.price > upper_limit or request.price < lower_limit):
                    errors.append(f"Order price outside circuit limits: {lower_limit} - {upper_limit}")
            
        except Exception as e:
            self.logger.error(f"Error validating against market data: {e}")
            errors.append("Unable to validate against market data")
        
        return errors
    
    async def validate_order_timing(self, request: OrderRequest) -> List[str]:
        """
        Validate order timing based on market conditions
        
        Args:
            request: OrderRequest to validate
            
        Returns:
            List of validation errors
        """
        errors = []
        
        current_time = datetime.now()
        
        # Check if it's a trading day
        if current_time.weekday() >= 5:  # Saturday or Sunday
            errors.append("Orders cannot be placed on weekends")
        
        # Check for market holidays (would need holiday calendar)
        # This is a placeholder for holiday checking
        
        return errors 