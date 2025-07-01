"""
Position Manager - Tracks and manages trading positions
"""

import logging
from typing import Dict, List, Optional, Set
from datetime import datetime
from decimal import Decimal

from .models import Trade, Position, PositionSide, OrderSide


class PositionManager:
    """
    Manages trading positions and P&L calculations
    """
    
    def __init__(self, data_service=None):
        self.data_service = data_service
        self.positions: Dict[str, Position] = {}
        self.trades: List[Trade] = []
        
        # Position tracking
        self.position_callbacks: List[callable] = []
        
        self.logger = logging.getLogger(__name__)
    
    async def process_trade(self, trade: Trade) -> None:
        """
        Process a trade and update positions
        
        Args:
            trade: Trade to process
        """
        # Store trade
        self.trades.append(trade)
        
        # Get or create position
        position = self.positions.get(trade.symbol)
        if not position:
            # Create new position
            market_price = await self._get_market_price(trade.symbol) or trade.price
            position = Position(
                symbol=trade.symbol,
                side=PositionSide.FLAT,
                quantity=0,
                average_price=Decimal('0'),
                market_price=market_price
            )
            self.positions[trade.symbol] = position
        
        # Update position with trade
        position.add_trade(trade)
        
        # Update market price if we have data service
        if self.data_service:
            current_price = await self._get_market_price(trade.symbol)
            if current_price:
                position.update_market_price(current_price)
        
        # Notify callbacks
        for callback in self.position_callbacks:
            try:
                await callback(position, trade)
            except Exception as e:
                self.logger.error(f"Position callback error: {e}")
        
        self.logger.info(
            f"Position updated: {trade.symbol} - "
            f"{position.side.value} {position.quantity} @ {position.average_price}"
        )
    
    def get_position(self, symbol: str) -> Optional[Position]:
        """Get position for symbol"""
        return self.positions.get(symbol)
    
    def get_all_positions(self) -> List[Position]:
        """Get all positions"""
        return list(self.positions.values())
    
    def get_open_positions(self) -> List[Position]:
        """Get all open (non-flat) positions"""
        return [pos for pos in self.positions.values() if pos.side != PositionSide.FLAT]
    
    def get_long_positions(self) -> List[Position]:
        """Get all long positions"""
        return [pos for pos in self.positions.values() if pos.side == PositionSide.LONG]
    
    def get_short_positions(self) -> List[Position]:
        """Get all short positions"""
        return [pos for pos in self.positions.values() if pos.side == PositionSide.SHORT]
    
    async def update_market_prices(self, price_data: Dict[str, Decimal]) -> None:
        """
        Update market prices for all positions
        
        Args:
            price_data: Dict of symbol -> current price
        """
        updated_positions = []
        
        for symbol, position in self.positions.items():
            if symbol in price_data:
                old_pnl = position.unrealized_pnl
                position.update_market_price(price_data[symbol])
                
                if position.unrealized_pnl != old_pnl:
                    updated_positions.append(position)
        
        # Notify callbacks for updated positions
        for position in updated_positions:
            for callback in self.position_callbacks:
                try:
                    await callback(position, None)  # No trade, just price update
                except Exception as e:
                    self.logger.error(f"Position update callback error: {e}")
    
    def get_portfolio_summary(self) -> Dict:
        """Get portfolio summary statistics"""
        open_positions = self.get_open_positions()
        
        total_market_value = sum(pos.market_value for pos in open_positions)
        total_unrealized_pnl = sum(pos.unrealized_pnl for pos in open_positions)
        total_realized_pnl = sum(pos.realized_pnl for pos in self.positions.values())
        
        long_positions = [pos for pos in open_positions if pos.side == PositionSide.LONG]
        short_positions = [pos for pos in open_positions if pos.side == PositionSide.SHORT]
        
        return {
            'total_positions': len(self.positions),
            'open_positions': len(open_positions),
            'long_positions': len(long_positions),
            'short_positions': len(short_positions),
            'total_market_value': float(total_market_value),
            'total_unrealized_pnl': float(total_unrealized_pnl),
            'total_realized_pnl': float(total_realized_pnl),
            'total_pnl': float(total_unrealized_pnl + total_realized_pnl),
            'long_market_value': float(sum(pos.market_value for pos in long_positions)),
            'short_market_value': float(sum(pos.market_value for pos in short_positions)),
            'symbols': list(self.positions.keys())
        }
    
    def get_symbol_exposure(self) -> Dict[str, Dict]:
        """Get exposure by symbol"""
        exposure = {}
        
        for symbol, position in self.positions.items():
            if position.side != PositionSide.FLAT:
                exposure[symbol] = {
                    'side': position.side.value,
                    'quantity': position.quantity,
                    'market_value': float(position.market_value),
                    'unrealized_pnl': float(position.unrealized_pnl),
                    'percentage_of_portfolio': 0.0  # Will be calculated if needed
                }
        
        # Calculate percentages
        total_value = sum(abs(pos['market_value']) for pos in exposure.values())
        if total_value > 0:
            for pos_data in exposure.values():
                pos_data['percentage_of_portfolio'] = abs(pos_data['market_value']) / total_value * 100
        
        return exposure
    
    def get_trades_for_symbol(self, symbol: str) -> List[Trade]:
        """Get all trades for a symbol"""
        return [trade for trade in self.trades if trade.symbol == symbol]
    
    def get_trades_for_timeframe(self, start_time: datetime, end_time: datetime) -> List[Trade]:
        """Get trades within timeframe"""
        return [
            trade for trade in self.trades
            if start_time <= trade.timestamp <= end_time
        ]
    
    def calculate_position_risk(self, symbol: str) -> Dict:
        """
        Calculate risk metrics for a position
        
        Args:
            symbol: Symbol to analyze
            
        Returns:
            Risk metrics dictionary
        """
        position = self.positions.get(symbol)
        if not position or position.side == PositionSide.FLAT:
            return {'symbol': symbol, 'risk': 'No position'}
        
        # Calculate various risk metrics
        current_price = position.market_price
        avg_price = position.average_price
        
        # Price change percentage
        price_change_pct = ((current_price - avg_price) / avg_price) * 100
        if position.side == PositionSide.SHORT:
            price_change_pct = -price_change_pct
        
        # Position value as percentage of portfolio
        portfolio_summary = self.get_portfolio_summary()
        total_portfolio_value = abs(portfolio_summary['total_market_value'])
        position_percentage = 0.0
        if total_portfolio_value > 0:
            position_percentage = abs(position.market_value) / total_portfolio_value * 100
        
        return {
            'symbol': symbol,
            'side': position.side.value,
            'quantity': position.quantity,
            'current_price': float(current_price),
            'average_price': float(avg_price),
            'market_value': float(position.market_value),
            'unrealized_pnl': float(position.unrealized_pnl),
            'price_change_percentage': float(price_change_pct),
            'position_percentage_of_portfolio': float(position_percentage),
            'risk_level': self._assess_risk_level(position_percentage, abs(price_change_pct))
        }
    
    def _assess_risk_level(self, position_percentage: float, price_change_percentage: float) -> str:
        """Assess risk level based on position size and price movement"""
        # High risk: Large position with significant adverse movement
        if position_percentage > 20 and price_change_percentage > 10:
            return 'HIGH'
        
        # Medium risk: Medium position or significant movement
        elif position_percentage > 10 or price_change_percentage > 5:
            return 'MEDIUM'
        
        # Low risk: Small position and minor movement
        else:
            return 'LOW'
    
    async def close_position(self, symbol: str, close_price: Optional[Decimal] = None) -> Optional[Trade]:
        """
        Close a position (simulation for demonstration)
        
        Args:
            symbol: Symbol to close
            close_price: Price to close at (uses market price if not provided)
            
        Returns:
            Simulated closing trade
        """
        position = self.positions.get(symbol)
        if not position or position.side == PositionSide.FLAT:
            return None
        
        # Use provided price or current market price
        price = close_price or position.market_price
        
        # Create closing trade
        closing_side = OrderSide.SELL if position.side == PositionSide.LONG else OrderSide.BUY
        
        # This would normally be done through the order system
        # Here we simulate for demonstration
        import uuid
        closing_trade = Trade(
            trade_id=str(uuid.uuid4()),
            order_id=f"CLOSE_{uuid.uuid4().hex[:8]}",
            symbol=symbol,
            side=closing_side,
            quantity=abs(position.quantity),
            price=price,
            timestamp=datetime.utcnow()
        )
        
        # Process the closing trade
        await self.process_trade(closing_trade)
        
        self.logger.info(f"Position closed: {symbol} at {price}")
        
        return closing_trade
    
    def add_position_callback(self, callback: callable):
        """Add callback for position updates"""
        self.position_callbacks.append(callback)
    
    async def _get_market_price(self, symbol: str) -> Optional[Decimal]:
        """Get current market price for symbol"""
        if not self.data_service:
            return None
        
        try:
            quote = await self.data_service.get_quote(symbol)
            if quote and 'last_price' in quote:
                return Decimal(str(quote['last_price']))
        except Exception as e:
            self.logger.error(f"Failed to get market price for {symbol}: {e}")
        
        return None
    
    def get_position_history(self, symbol: str) -> Dict:
        """
        Get position history for a symbol
        
        Args:
            symbol: Symbol to get history for
            
        Returns:
            Position history with trades and P&L progression
        """
        position = self.positions.get(symbol)
        symbol_trades = self.get_trades_for_symbol(symbol)
        
        if not position and not symbol_trades:
            return {'symbol': symbol, 'history': []}
        
        # Build history timeline
        history = []
        running_quantity = 0
        running_avg_price = Decimal('0')
        cumulative_realized_pnl = Decimal('0')
        
        for trade in sorted(symbol_trades, key=lambda t: t.timestamp):
            # Calculate position after this trade
            trade_quantity = trade.quantity if trade.side == OrderSide.BUY else -trade.quantity
            
            if running_quantity == 0:
                # New position
                running_quantity = trade_quantity
                running_avg_price = trade.price
            elif (running_quantity > 0 and trade_quantity > 0) or (running_quantity < 0 and trade_quantity < 0):
                # Adding to position
                total_cost = running_avg_price * abs(running_quantity) + trade.price * abs(trade_quantity)
                running_quantity += trade_quantity
                running_avg_price = total_cost / abs(running_quantity)
            else:
                # Reducing or closing position
                if abs(trade_quantity) >= abs(running_quantity):
                    # Position closed or reversed
                    pnl_quantity = abs(running_quantity)
                    if running_quantity > 0:
                        trade_pnl = (trade.price - running_avg_price) * pnl_quantity
                    else:
                        trade_pnl = (running_avg_price - trade.price) * pnl_quantity
                    
                    cumulative_realized_pnl += trade_pnl
                    
                    remaining_quantity = abs(trade_quantity) - abs(running_quantity)
                    if remaining_quantity > 0:
                        # Position reversed
                        running_quantity = remaining_quantity if trade.side == OrderSide.BUY else -remaining_quantity
                        running_avg_price = trade.price
                    else:
                        # Position closed
                        running_quantity = 0
                        running_avg_price = Decimal('0')
                else:
                    # Partially reducing position
                    if running_quantity > 0:
                        trade_pnl = (trade.price - running_avg_price) * trade.quantity
                    else:
                        trade_pnl = (running_avg_price - trade.price) * trade.quantity
                    cumulative_realized_pnl += trade_pnl
                    running_quantity += trade_quantity
            
            history.append({
                'timestamp': trade.timestamp.isoformat(),
                'trade': trade.to_dict(),
                'position_after_trade': {
                    'quantity': int(running_quantity),
                    'average_price': float(running_avg_price),
                    'side': 'LONG' if running_quantity > 0 else 'SHORT' if running_quantity < 0 else 'FLAT'
                },
                'cumulative_realized_pnl': float(cumulative_realized_pnl)
            })
        
        return {
            'symbol': symbol,
            'current_position': position.to_dict() if position else None,
            'trade_count': len(symbol_trades),
            'total_realized_pnl': float(cumulative_realized_pnl),
            'history': history
        } 