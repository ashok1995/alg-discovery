"""
Risk Manager - Provides risk checks and monitoring for orders and positions
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from decimal import Decimal
from dataclasses import dataclass

from .models import OrderRequest, OrderUpdate, Order, Trade, OrderSide


@dataclass
class RiskResult:
    """Result of a risk check"""
    approved: bool
    reason: str
    risk_score: float = 0.0
    warnings: List[str] = None
    
    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


class RiskManager:
    """
    Comprehensive risk management system
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None, position_manager=None):
        self.config = config or self._default_config()
        self.position_manager = position_manager
        self.logger = logging.getLogger(__name__)
        
        # Risk tracking
        self.daily_trades: List[Trade] = []
        self.daily_pnl = Decimal('0')
        self.max_drawdown = Decimal('0')
        self.peak_portfolio_value = Decimal('0')
        
        # Order tracking for concentration limits
        self.symbol_exposure: Dict[str, Decimal] = {}
        
    def _default_config(self) -> Dict[str, Any]:
        """Default risk configuration"""
        return {
            # Position limits
            'max_position_size': Decimal('100000'),           # Max position value
            'max_position_concentration': 0.20,               # 20% of portfolio
            'max_single_order_value': Decimal('50000'),       # Max single order value
            'max_leverage': 2.0,                              # Maximum leverage
            
            # Daily limits
            'max_daily_loss': Decimal('5000'),                # Max daily loss
            'max_daily_trades': 50,                           # Max trades per day
            'max_daily_volume': Decimal('200000'),            # Max daily volume
            
            # Symbol limits
            'max_symbols': 20,                                # Max symbols to hold
            'min_price': Decimal('1'),                        # Min stock price
            'max_order_quantity': 10000,                      # Max quantity per order
            
            # Risk ratios
            'max_portfolio_beta': 1.5,                        # Portfolio beta limit
            'max_sector_concentration': 0.30,                 # 30% per sector
            'var_limit': 0.05,                                # 5% VaR limit
            
            # Circuit breakers
            'stop_trading_on_loss': Decimal('10000'),         # Stop trading threshold
            'cool_down_period_minutes': 60,                   # Cool down after stop
        }
    
    async def check_order_risk(self, request: OrderRequest) -> RiskResult:
        """
        Check risk for new order
        
        Args:
            request: OrderRequest to check
            
        Returns:
            RiskResult with approval status and details
        """
        warnings = []
        risk_score = 0.0
        
        try:
            # Basic order validations
            basic_check = self._check_basic_order_limits(request)
            if not basic_check.approved:
                return basic_check
            warnings.extend(basic_check.warnings)
            risk_score += basic_check.risk_score
            
            # Position size checks
            position_check = await self._check_position_limits(request)
            if not position_check.approved:
                return position_check
            warnings.extend(position_check.warnings)
            risk_score += position_check.risk_score
            
            # Daily limits
            daily_check = self._check_daily_limits(request)
            if not daily_check.approved:
                return daily_check
            warnings.extend(daily_check.warnings)
            risk_score += daily_check.risk_score
            
            # Concentration limits
            concentration_check = await self._check_concentration_limits(request)
            if not concentration_check.approved:
                return concentration_check
            warnings.extend(concentration_check.warnings)
            risk_score += concentration_check.risk_score
            
            # Market conditions
            market_check = await self._check_market_conditions(request)
            warnings.extend(market_check.warnings)
            risk_score += market_check.risk_score
            
            return RiskResult(
                approved=True,
                reason="Order approved",
                risk_score=risk_score,
                warnings=warnings
            )
            
        except Exception as e:
            self.logger.error(f"Risk check error: {e}")
            return RiskResult(
                approved=False,
                reason=f"Risk check failed: {str(e)}"
            )
    
    async def check_order_update_risk(self, order: Order, update: OrderUpdate) -> RiskResult:
        """
        Check risk for order update
        
        Args:
            order: Existing order
            update: Update to apply
            
        Returns:
            RiskResult with approval status
        """
        # Create a temporary request to check the updated order
        temp_request = OrderRequest(
            symbol=order.symbol,
            side=order.side,
            order_type=order.order_type,
            quantity=update.quantity if update.quantity is not None else order.quantity,
            price=update.price if update.price is not None else order.price,
            stop_price=update.stop_price if update.stop_price is not None else order.stop_price,
            time_in_force=update.time_in_force if update.time_in_force is not None else order.time_in_force
        )
        
        # Check as if it's a new order (simplified approach)
        result = await self.check_order_risk(temp_request)
        result.reason = f"Order update {result.reason.lower()}"
        
        return result
    
    async def monitor_trade(self, trade: Trade) -> None:
        """
        Monitor trade for risk violations
        
        Args:
            trade: Trade to monitor
        """
        # Add to daily trades
        today = datetime.now().date()
        self.daily_trades = [t for t in self.daily_trades if t.timestamp.date() == today]
        self.daily_trades.append(trade)
        
        # Update daily P&L
        if self.position_manager:
            portfolio = self.position_manager.get_portfolio_summary()
            current_pnl = Decimal(str(portfolio.get('total_pnl', 0)))
            
            # Check for daily loss limit
            if current_pnl < -self.config['max_daily_loss']:
                self.logger.warning(f"Daily loss limit exceeded: {current_pnl}")
                # Could trigger trading halt here
        
        # Update exposure tracking
        if trade.side == OrderSide.BUY:
            self.symbol_exposure[trade.symbol] = self.symbol_exposure.get(trade.symbol, Decimal('0')) + trade.value
        else:
            self.symbol_exposure[trade.symbol] = self.symbol_exposure.get(trade.symbol, Decimal('0')) - trade.value
        
        self.logger.info(f"Risk monitoring: Trade processed for {trade.symbol}")
    
    def _check_basic_order_limits(self, request: OrderRequest) -> RiskResult:
        """Check basic order limits"""
        warnings = []
        risk_score = 0.0
        
        # Order value check
        if request.price:
            order_value = request.price * request.quantity
            max_order_value = self.config['max_single_order_value']
            
            if order_value > max_order_value:
                return RiskResult(
                    approved=False,
                    reason=f"Order value {order_value} exceeds limit {max_order_value}"
                )
            
            # Warning for large orders
            if order_value > max_order_value * Decimal('0.8'):
                warnings.append(f"Large order value: {order_value}")
                risk_score += 0.3
        
        # Quantity check
        max_quantity = self.config['max_order_quantity']
        if request.quantity > max_quantity:
            return RiskResult(
                approved=False,
                reason=f"Order quantity {request.quantity} exceeds limit {max_quantity}"
            )
        
        # Price check
        if request.price:
            min_price = self.config['min_price']
            if request.price < min_price:
                return RiskResult(
                    approved=False,
                    reason=f"Order price {request.price} below minimum {min_price}"
                )
        
        return RiskResult(
            approved=True,
            reason="Basic checks passed",
            risk_score=risk_score,
            warnings=warnings
        )
    
    async def _check_position_limits(self, request: OrderRequest) -> RiskResult:
        """Check position size limits"""
        if not self.position_manager:
            return RiskResult(approved=True, reason="No position manager")
        
        warnings = []
        risk_score = 0.0
        
        # Get current position
        current_position = self.position_manager.get_position(request.symbol)
        portfolio = self.position_manager.get_portfolio_summary()
        
        # Calculate new position size after order
        current_quantity = current_position.quantity if current_position else 0
        order_quantity = request.quantity if request.side == OrderSide.BUY else -request.quantity
        new_quantity = current_quantity + order_quantity
        
        if request.price and new_quantity != 0:
            new_position_value = abs(new_quantity) * request.price
            max_position_size = self.config['max_position_size']
            
            if new_position_value > max_position_size:
                return RiskResult(
                    approved=False,
                    reason=f"Position size {new_position_value} would exceed limit {max_position_size}"
                )
            
            # Check concentration limit
            total_portfolio_value = abs(portfolio.get('total_market_value', 0))
            if total_portfolio_value > 0:
                concentration = new_position_value / total_portfolio_value
                max_concentration = self.config['max_position_concentration']
                
                if concentration > max_concentration:
                    return RiskResult(
                        approved=False,
                        reason=f"Position concentration {concentration:.2%} exceeds limit {max_concentration:.2%}"
                    )
                
                # Warning for high concentration
                if concentration > max_concentration * 0.8:
                    warnings.append(f"High position concentration: {concentration:.2%}")
                    risk_score += 0.4
        
        return RiskResult(
            approved=True,
            reason="Position checks passed",
            risk_score=risk_score,
            warnings=warnings
        )
    
    def _check_daily_limits(self, request: OrderRequest) -> RiskResult:
        """Check daily trading limits"""
        warnings = []
        risk_score = 0.0
        
        # Check daily trade count
        today = datetime.now().date()
        daily_trades_today = [t for t in self.daily_trades if t.timestamp.date() == today]
        max_daily_trades = self.config['max_daily_trades']
        
        if len(daily_trades_today) >= max_daily_trades:
            return RiskResult(
                approved=False,
                reason=f"Daily trade limit {max_daily_trades} reached"
            )
        
        # Warning when approaching limit
        if len(daily_trades_today) > max_daily_trades * 0.8:
            warnings.append(f"Approaching daily trade limit: {len(daily_trades_today)}/{max_daily_trades}")
            risk_score += 0.2
        
        # Check daily volume
        if request.price:
            daily_volume = sum(t.value for t in daily_trades_today)
            order_value = request.price * request.quantity
            total_volume = daily_volume + order_value
            max_daily_volume = self.config['max_daily_volume']
            
            if total_volume > max_daily_volume:
                return RiskResult(
                    approved=False,
                    reason=f"Daily volume limit {max_daily_volume} would be exceeded"
                )
            
            # Warning when approaching limit
            if total_volume > max_daily_volume * 0.8:
                warnings.append(f"High daily volume: {total_volume}")
                risk_score += 0.2
        
        return RiskResult(
            approved=True,
            reason="Daily limits passed",
            risk_score=risk_score,
            warnings=warnings
        )
    
    async def _check_concentration_limits(self, request: OrderRequest) -> RiskResult:
        """Check concentration limits"""
        if not self.position_manager:
            return RiskResult(approved=True, reason="No position manager")
        
        warnings = []
        risk_score = 0.0
        
        # Check number of symbols
        positions = self.position_manager.get_open_positions()
        max_symbols = self.config['max_symbols']
        
        # If this is a new symbol and we're at the limit
        current_position = self.position_manager.get_position(request.symbol)
        if not current_position or current_position.quantity == 0:
            if len(positions) >= max_symbols:
                return RiskResult(
                    approved=False,
                    reason=f"Maximum symbols limit {max_symbols} reached"
                )
        
        # Warning when approaching symbol limit
        if len(positions) > max_symbols * 0.8:
            warnings.append(f"High symbol count: {len(positions)}/{max_symbols}")
            risk_score += 0.2
        
        return RiskResult(
            approved=True,
            reason="Concentration checks passed",
            risk_score=risk_score,
            warnings=warnings
        )
    
    async def _check_market_conditions(self, request: OrderRequest) -> RiskResult:
        """Check market conditions"""
        warnings = []
        risk_score = 0.0
        
        # Market hours check (basic)
        current_hour = datetime.now().hour
        if current_hour < 9 or current_hour > 15:
            warnings.append("Order placed outside regular market hours")
            risk_score += 0.1
        
        # Volatility check (placeholder - would need market data)
        # if high_volatility:
        #     warnings.append("High market volatility detected")
        #     risk_score += 0.3
        
        return RiskResult(
            approved=True,
            reason="Market condition checks passed",
            risk_score=risk_score,
            warnings=warnings
        )
    
    def get_risk_metrics(self) -> Dict[str, Any]:
        """Get current risk metrics"""
        today = datetime.now().date()
        daily_trades_today = [t for t in self.daily_trades if t.timestamp.date() == today]
        
        # Calculate daily volume
        daily_volume = sum(t.value for t in daily_trades_today)
        
        # Get portfolio metrics
        portfolio_summary = {}
        if self.position_manager:
            portfolio_summary = self.position_manager.get_portfolio_summary()
        
        return {
            'daily_trades': len(daily_trades_today),
            'max_daily_trades': self.config['max_daily_trades'],
            'daily_volume': float(daily_volume),
            'max_daily_volume': float(self.config['max_daily_volume']),
            'daily_pnl': float(portfolio_summary.get('total_pnl', 0)),
            'max_daily_loss': float(self.config['max_daily_loss']),
            'open_positions': portfolio_summary.get('open_positions', 0),
            'max_symbols': self.config['max_symbols'],
            'portfolio_value': portfolio_summary.get('total_market_value', 0),
            'utilization_metrics': {
                'trades_utilization': len(daily_trades_today) / self.config['max_daily_trades'],
                'volume_utilization': float(daily_volume) / float(self.config['max_daily_volume']),
                'symbol_utilization': portfolio_summary.get('open_positions', 0) / self.config['max_symbols']
            }
        }
    
    def get_position_risk_analysis(self) -> Dict[str, Any]:
        """Get position-level risk analysis"""
        if not self.position_manager:
            return {'error': 'No position manager available'}
        
        positions = self.position_manager.get_open_positions()
        portfolio_summary = self.position_manager.get_portfolio_summary()
        
        position_risks = []
        for position in positions:
            risk_data = self.position_manager.calculate_position_risk(position.symbol)
            position_risks.append(risk_data)
        
        # Aggregate risk metrics
        high_risk_count = sum(1 for p in position_risks if p.get('risk_level') == 'HIGH')
        medium_risk_count = sum(1 for p in position_risks if p.get('risk_level') == 'MEDIUM')
        
        return {
            'total_positions': len(positions),
            'high_risk_positions': high_risk_count,
            'medium_risk_positions': medium_risk_count,
            'low_risk_positions': len(position_risks) - high_risk_count - medium_risk_count,
            'portfolio_concentration': self._calculate_portfolio_concentration(),
            'largest_position_pct': max((p.get('position_percentage_of_portfolio', 0) for p in position_risks), default=0),
            'position_details': position_risks
        }
    
    def _calculate_portfolio_concentration(self) -> float:
        """Calculate portfolio concentration using Herfindahl index"""
        if not self.position_manager:
            return 0.0
        
        exposure = self.position_manager.get_symbol_exposure()
        if not exposure:
            return 0.0
        
        # Calculate Herfindahl index (sum of squared weights)
        total_exposure = sum(abs(pos['market_value']) for pos in exposure.values())
        if total_exposure == 0:
            return 0.0
        
        concentration = sum(
            (abs(pos['market_value']) / total_exposure) ** 2
            for pos in exposure.values()
        )
        
        return concentration
    
    def should_halt_trading(self) -> bool:
        """Check if trading should be halted due to risk limits"""
        if not self.position_manager:
            return False
        
        portfolio_summary = self.position_manager.get_portfolio_summary()
        current_pnl = Decimal(str(portfolio_summary.get('total_pnl', 0)))
        
        # Check stop trading threshold
        stop_threshold = -self.config['stop_trading_on_loss']
        if current_pnl <= stop_threshold:
            self.logger.critical(f"Trading halt triggered: P&L {current_pnl} below threshold {stop_threshold}")
            return True
        
        return False
    
    def reset_daily_limits(self) -> None:
        """Reset daily limits (typically called at start of new trading day)"""
        today = datetime.now().date()
        self.daily_trades = [t for t in self.daily_trades if t.timestamp.date() == today]
        self.daily_pnl = Decimal('0')
        
        self.logger.info("Daily risk limits reset") 