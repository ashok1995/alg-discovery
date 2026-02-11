#!/usr/bin/env python3
"""
Order Management System Demo
===========================

This script demonstrates the capabilities of the AlgoDiscovery Order Management System.
It shows how to:
1. Create various types of orders (market, limit, stop-loss, bracket)
2. Update and cancel orders
3. Monitor positions and P&L
4. Check risk metrics
5. Handle notifications

Run this script to see the order management system in action.
"""

import asyncio
import logging
import requests
import json
from typing import Dict, Any
from decimal import Decimal
from datetime import datetime
import time

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class OrderManagementDemo:
    """Demo class for Order Management System"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api/v1/orders"
        
    def check_health(self) -> bool:
        """Check if the API is healthy and order management is available"""
        try:
            response = requests.get(f"{self.base_url}/health")
            health_data = response.json()
            
            order_mgr_status = health_data.get('services', {}).get('order_manager', 'unavailable')
            
            logger.info(f"API Health Status: {health_data.get('status', 'unknown')}")
            logger.info(f"Order Manager: {order_mgr_status}")
            
            return order_mgr_status == 'available'
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def create_market_order(self, symbol: str, side: str, quantity: int) -> Dict[str, Any]:
        """Create a market order"""
        order_data = {
            "symbol": symbol,
            "side": side,
            "order_type": "MARKET",
            "quantity": quantity,
            "time_in_force": "DAY"
        }
        
        try:
            response = requests.post(self.api_url, json=order_data)
            response.raise_for_status()
            
            order = response.json()
            logger.info(f"✅ Market order created: {order['order_id']} - {side} {quantity} {symbol}")
            return order
            
        except Exception as e:
            logger.error(f"❌ Failed to create market order: {e}")
            return {}
    
    def create_limit_order(self, symbol: str, side: str, quantity: int, price: float) -> Dict[str, Any]:
        """Create a limit order"""
        order_data = {
            "symbol": symbol,
            "side": side,
            "order_type": "LIMIT",
            "quantity": quantity,
            "price": price,
            "time_in_force": "DAY"
        }
        
        try:
            response = requests.post(self.api_url, json=order_data)
            response.raise_for_status()
            
            order = response.json()
            logger.info(f"✅ Limit order created: {order['order_id']} - {side} {quantity} {symbol} @ ${price}")
            return order
            
        except Exception as e:
            logger.error(f"❌ Failed to create limit order: {e}")
            return {}
    
    def create_bracket_order(self, symbol: str, side: str, quantity: int, price: float, 
                           take_profit: float, stop_loss: float) -> Dict[str, Any]:
        """Create a bracket order with take profit and stop loss"""
        order_data = {
            "symbol": symbol,
            "side": side,
            "order_type": "LIMIT",
            "quantity": quantity,
            "price": price,
            "take_profit_price": take_profit,
            "stop_loss_price": stop_loss,
            "time_in_force": "DAY"
        }
        
        try:
            response = requests.post(self.api_url, json=order_data)
            response.raise_for_status()
            
            order = response.json()
            logger.info(f"✅ Bracket order created: {order['order_id']} - {side} {quantity} {symbol}")
            logger.info(f"   Entry: ${price}, Take Profit: ${take_profit}, Stop Loss: ${stop_loss}")
            return order
            
        except Exception as e:
            logger.error(f"❌ Failed to create bracket order: {e}")
            return {}
    
    def get_order(self, order_id: str) -> Dict[str, Any]:
        """Get order details"""
        try:
            response = requests.get(f"{self.api_url}/{order_id}")
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            logger.error(f"❌ Failed to get order {order_id}: {e}")
            return {}
    
    def update_order(self, order_id: str, new_price: float = None, new_quantity: int = None) -> Dict[str, Any]:
        """Update an existing order"""
        update_data = {}
        if new_price:
            update_data["price"] = new_price
        if new_quantity:
            update_data["quantity"] = new_quantity
        
        try:
            response = requests.put(f"{self.api_url}/{order_id}", json=update_data)
            response.raise_for_status()
            
            order = response.json()
            logger.info(f"✅ Order updated: {order_id}")
            return order
            
        except Exception as e:
            logger.error(f"❌ Failed to update order {order_id}: {e}")
            return {}
    
    def cancel_order(self, order_id: str, reason: str = "Demo cancellation") -> bool:
        """Cancel an order"""
        try:
            response = requests.delete(f"{self.api_url}/{order_id}", params={"reason": reason})
            response.raise_for_status()
            
            logger.info(f"✅ Order cancelled: {order_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to cancel order {order_id}: {e}")
            return False
    
    def get_positions(self) -> Dict[str, Any]:
        """Get all current positions"""
        try:
            response = requests.get(f"{self.api_url}/positions/")
            response.raise_for_status()
            
            positions = response.json()
            logger.info(f"📊 Retrieved {len(positions)} positions")
            
            for position in positions:
                symbol = position['symbol']
                quantity = position['quantity']
                pnl = position['total_pnl']
                logger.info(f"   {symbol}: {quantity} shares, P&L: ${pnl:.2f}")
            
            return positions
            
        except Exception as e:
            logger.error(f"❌ Failed to get positions: {e}")
            return []
    
    def get_risk_metrics(self) -> Dict[str, Any]:
        """Get current risk metrics"""
        try:
            response = requests.get(f"{self.api_url}/risk/metrics")
            response.raise_for_status()
            
            metrics = response.json()
            logger.info("📈 Risk Metrics:")
            logger.info(f"   Daily Trades: {metrics['daily_trades']}/{metrics['max_daily_trades']}")
            logger.info(f"   Daily Volume: ${metrics['daily_volume']:.2f}/${metrics['max_daily_volume']:.2f}")
            logger.info(f"   Daily P&L: ${metrics['daily_pnl']:.2f}")
            logger.info(f"   Open Positions: {metrics['open_positions']}/{metrics['max_symbols']}")
            
            return metrics
            
        except Exception as e:
            logger.error(f"❌ Failed to get risk metrics: {e}")
            return {}
    
    def get_order_stats(self) -> Dict[str, Any]:
        """Get order management statistics"""
        try:
            response = requests.get(f"{self.api_url}/stats")
            response.raise_for_status()
            
            stats = response.json()
            logger.info("📊 Order Statistics:")
            logger.info(f"   Total Orders: {stats.get('total_orders', 0)}")
            logger.info(f"   Filled Orders: {stats.get('filled_orders', 0)}")
            logger.info(f"   Cancelled Orders: {stats.get('cancelled_orders', 0)}")
            logger.info(f"   Average Fill Time: {stats.get('average_fill_time_seconds', 0):.2f}s")
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Failed to get order stats: {e}")
            return {}
    
    async def run_demo(self):
        """Run the complete demo"""
        logger.info("🚀 Starting Order Management System Demo")
        logger.info("=" * 50)
        
        # Health check
        if not self.check_health():
            logger.error("❌ Order Management System is not available. Make sure the API is running.")
            return
        
        logger.info("✅ Order Management System is healthy!")
        print("\n" + "=" * 50)
        
        # Demo data
        demo_symbols = ["AAPL", "MSFT", "GOOGL"]
        orders_created = []
        
        try:
            # 1. Create various order types
            logger.info("📝 Creating demo orders...")
            
            # Market order
            order1 = self.create_limit_order("AAPL", "BUY", 10, 150.50)
            if order1:
                orders_created.append(order1['order_id'])
            
            time.sleep(1)
            
            # Limit order
            order2 = self.create_limit_order("MSFT", "BUY", 5, 300.25)
            if order2:
                orders_created.append(order2['order_id'])
            
            time.sleep(1)
            
            # Bracket order
            order3 = self.create_bracket_order("GOOGL", "BUY", 3, 2500.00, 2600.00, 2400.00)
            if order3:
                orders_created.append(order3['order_id'])
            
            time.sleep(2)
            
            # 2. Show current orders
            logger.info("\n📋 Current Orders:")
            for order_id in orders_created:
                order = self.get_order(order_id)
                if order:
                    logger.info(f"   Order {order_id}: {order['status']} - {order['symbol']} {order['side']} {order['quantity']}")
            
            time.sleep(1)
            
            # 3. Update an order
            if orders_created:
                logger.info(f"\n🔄 Updating order {orders_created[0]}...")
                self.update_order(orders_created[0], new_price=151.00)
            
            time.sleep(1)
            
            # 4. Check positions
            logger.info("\n💼 Current Positions:")
            self.get_positions()
            
            time.sleep(1)
            
            # 5. Check risk metrics
            logger.info("\n⚠️ Risk Assessment:")
            self.get_risk_metrics()
            
            time.sleep(1)
            
            # 6. Order statistics
            logger.info("\n📈 Order Statistics:")
            self.get_order_stats()
            
            time.sleep(2)
            
            # 7. Cancel orders
            logger.info("\n❌ Cancelling demo orders...")
            for order_id in orders_created:
                self.cancel_order(order_id, "Demo cleanup")
                time.sleep(0.5)
            
            logger.info("\n✅ Demo completed successfully!")
            
        except Exception as e:
            logger.error(f"❌ Demo failed: {e}")
        
        finally:
            # Cleanup any remaining orders
            logger.info("\n🧹 Cleaning up...")
            for order_id in orders_created:
                try:
                    self.cancel_order(order_id, "Demo cleanup")
                except:
                    pass
        
        logger.info("=" * 50)
        logger.info("🎯 Order Management Demo Complete!")


def main():
    """Main demo function"""
    print("AlgoDiscovery Order Management System Demo")
    print("=========================================")
    print()
    print("This demo will showcase the order management capabilities:")
    print("• Creating different order types (market, limit, bracket)")
    print("• Updating and cancelling orders")
    print("• Monitoring positions and P&L")
    print("• Checking risk metrics and controls")
    print("• Order statistics and performance")
    print()
    
    # Check if user wants to proceed
    try:
        proceed = input("Do you want to proceed with the demo? (y/N): ").strip().lower()
        if proceed != 'y':
            print("Demo cancelled.")
            return
    except KeyboardInterrupt:
        print("\nDemo cancelled.")
        return
    
    print()
    
    # Run demo
    demo = OrderManagementDemo()
    asyncio.run(demo.run_demo())
    
    print()
    print("💡 Tips:")
    print("• Check the API logs to see real-time order processing")
    print("• Visit http://localhost:8000/docs for full API documentation")
    print("• Use WebSocket endpoints for real-time order updates")
    print("• Explore risk management features for production use")


if __name__ == "__main__":
    main() 