"""
Backtest page
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from data.mongodb import MongoDB
from data.yahoo import get_stock_data
from strategies.intraday import analyze_stock_intraday
from strategies.swing import analyze_stock_swing
from strategies.long_term import analyze_stock_long_term
from strategies.short_sell import analyze_stock_short_sell
from utils.logger import get_logger

logger = get_logger(__name__)

# Initialize MongoDB
db = MongoDB()

def run_backtest(symbol, entry_type, strategy, start_date, end_date, initial_capital=100000, risk_percent=1.0):
    """
    Run backtest
    
    Args:
        symbol: Stock symbol
        entry_type: Entry type (intraday, swing, long_term, short_sell)
        strategy: Strategy name
        start_date: Start date
        end_date: End date
        initial_capital: Initial capital
        risk_percent: Risk percentage
    
    Returns:
        DataFrame with backtest results and metrics
    """
    try:
        # Get historical data
        df = get_stock_data(symbol, start_date=start_date, end_date=end_date)
        
        if df.empty:
            logger.warning(f"No data for {symbol}")
            return None, None
        
        # Initialize results
        results = []
        equity = initial_capital
        position = None
        
        # Select analysis function based on entry type
        if entry_type == "intraday":
            analyze_func = analyze_stock_intraday
        elif entry_type == "swing":
            analyze_func = analyze_stock_swing
        elif entry_type == "long_term":
            analyze_func = analyze_stock_long_term
        elif entry_type == "short_sell":
            analyze_func = analyze_stock_short_sell
        else:
            logger.error(f"Invalid entry type: {entry_type}")
            return None, None
        
        # Run backtest
        for i in range(20, len(df)):  # Start after indicators are calculated
            date = df.index[i]
            
            # Skip if not a trading day
            if pd.to_datetime(date).weekday() >= 5:  # Saturday or Sunday
                continue
            
            # Get historical data up to current date
            historical_df = df.iloc[:i+1]
            
            # Check for exit if in position
            if position is not None:
                current_price = historical_df["Close"].iloc[-1]
                
                # Check for exit conditions
                if position["type"] == "long":
                    # Check stop loss
                    if current_price <= position["stop_loss"]:
                        # Exit at stop loss
                        pnl = (current_price / position["entry_price"] - 1) * position["position_value"]
                        equity += pnl
                        
                        results.append({
                            "date": date,
                            "action": "exit",
                            "price": current_price,
                            "reason": "stop_loss",
                            "pnl": pnl,
                            "equity": equity,
                            "position_value": position["position_value"]
                        })
                        
                        position = None
                    
                    # Check target
                    elif current_price >= position["target"]:
                        # Exit at target
                        pnl = (current_price / position["entry_price"] - 1) * position["position_value"]
                        equity += pnl
                        
                        results.append({
                            "date": date,
                            "action": "exit",
                            "price": current_price,
                            "reason": "target",
                            "pnl": pnl,
                            "equity": equity,
                            "position_value": position["position_value"]
                        })
                        
                        position = None
                
                elif position["type"] == "short":
                    # Check stop loss
                    if current_price >= position["stop_loss"]:
                        # Exit at stop loss
                        pnl = (position["entry_price"] / current_price - 1) * position["position_value"]
                        equity += pnl
                        
                        results.append({
                            "date": date,
                            "action": "exit",
                            "price": current_price,
                            "reason": "stop_loss",
                            "pnl": pnl,
                            "equity": equity,
                            "position_value": position["position_value"]
                        })
                        
                        position = None
                    
                    # Check target
                    elif current_price <= position["target"]:
                        # Exit at target
                        pnl = (position["entry_price"] / current_price - 1) * position["position_value"]
                        equity += pnl
                        
                        results.append({
                            "date": date,
                            "action": "exit",
                            "price": current_price,
                            "reason": "target",
                            "pnl": pnl,
                            "equity": equity,
                            "position_value": position["position_value"]
                        })
                        
                        position = None
            
            # Check for entry if not in position
            if position is None:
                # Analyze stock
                analysis = analyze_func(symbol, historical_df, account_balance=equity, risk_percent=risk_percent)
                
                # Check for entry signal
                if analysis and analysis.get("signal") in ["buy", "sell"]:
                    # Get entry details
                    entry_price = historical_df["Close"].iloc[-1]
                    stop_loss = analysis.get("stop_loss", entry_price * 0.95 if analysis["signal"] == "buy" else entry_price * 1.05)
                    target = analysis.get("target", entry_price * 1.1 if analysis["signal"] == "buy" else entry_price * 0.9)
                    
                    # Calculate position size
                    risk_amount = equity * (risk_percent / 100)
                    
                    if analysis["signal"] == "buy":
                        risk_per_share = entry_price - stop_loss
                    else:  # sell
                        risk_per_share = stop_loss - entry_price
                    
                    shares = int(risk_amount / risk_per_share) if risk_per_share > 0 else 0
                    position_value = shares * entry_price
                    
                    # Check if strategy matches
                    if strategy == "any" or analysis.get("strategy") == strategy:
                        # Enter position
                        position = {
                            "type": "long" if analysis["signal"] == "buy" else "short",
                            "entry_price": entry_price,
                            "stop_loss": stop_loss,
                            "target": target,
                            "shares": shares,
                            "position_value": position_value,
                            "entry_date": date
                        }
                        
                        results.append({
                            "date": date,
                            "action": "entry",
                            "price": entry_price,
                            "reason": analysis.get("strategy", "unknown"),
                            "pnl": 0,
                            "equity": equity,
                            "position_value": position_value
                        })
        
        # Close position at end of backtest if still open
        if position is not None:
            current_price = df["Close"].iloc[-1]
            
            if position["type"] == "long":
                pnl = (current_price / position["entry_price"] - 1) * position["position_value"]
            else:  # short
                pnl = (position["entry_price"] / current_price - 1) * position["position_value"]
            
            equity += pnl
            
            results.append({
                "date": df.index[-1],
                "action": "exit",
                "price": current_price,
                "reason": "end_of_backtest",
                "pnl": pnl,
                "equity": equity,
                "position_value": position["position_value"]
            })
        
        # Calculate performance metrics
        if results:
            results_df = pd.DataFrame(results)
            
            # Calculate metrics
            total_trades = len(results_df[results_df["action"] == "exit"])
            winning_trades = len(results_df[(results_df["action"] == "exit") & (results_df["pnl"] > 0)])
            losing_trades = len(results_df[(results_df["action"] == "exit") & (results_df["pnl"] <= 0)])
            
            win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
            
            avg_profit = results_df[(results_df["action"] == "exit") & (results_df["pnl"] > 0)]["pnl"].mean() if winning_trades > 0 else 0
            avg_loss = abs(results_df[(results_df["action"] == "exit") & (results_df["pnl"] <= 0)]["pnl"].mean()) if losing_trades > 0 else 0
            
            total_profit = results_df[(results_df["action"] == "exit") & (results_df["pnl"] > 0)]["pnl"].sum()
            total_loss = abs(results_df[(results_df["action"] == "exit") & (results_df["pnl"] <= 0)]["pnl"].sum())
            
            profit_factor = (total_profit / total_loss) if total_loss > 0 else float('inf')
            
            total_return = ((equity - initial_capital) / initial_capital * 100)
            
            metrics = {
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "losing_trades": losing_trades,
                "win_rate": win_rate,
                "avg_profit": avg_profit,
                "avg_loss": avg_loss,
                "profit_factor": profit_factor,
                "total_profit": total_profit,
                "total_loss": total_loss,
                "total_return": total_return,
                "initial_capital": initial_capital,
                "final_equity": equity
            }
            
            return results_df, metrics
        
        return None, None
    except Exception as e:
        logger.error(f"Error running backtest: {e}")
        return None, None

def show_backtest_page():
    """Show backtest page"""
    st.title("Backtest")
    
    # Create tabs
    tab1, tab2 = st.tabs(["Run Backtest", "Saved Backtests"])
    
    # Run Backtest tab
    with tab1:
        st.header("Run Backtest")
        
        # Input form
        with st.form("backtest_form"):
            # Symbol
            symbol = st.text_input("Symbol", "RELIANCE.NS")
            
            # Entry type
            entry_type = st.selectbox(
                "Entry Type",
                ["intraday", "swing", "long_term", "short_sell"]
            )
            
            # Strategy
            strategies = {
                "intraday": ["any", "momentum_long", "breakout_long", "reversal_long"],
                "swing": ["any", "trend_following_long", "pullback_long", "breakout_long"],
                "long_term": ["any", "value_investing", "growth_investing", "momentum_investing"],
                "short_sell": ["any", "trend_following_short", "breakdown_short", "volatility_short"]
            }
            
            strategy = st.selectbox(
                "Strategy",
                strategies.get(entry_type, ["any"])
            )
            
            # Date range
            col1, col2 = st.columns(2)
            
            with col1:
                start_date = st.date_input(
                    "Start Date",
                    datetime.now() - timedelta(days=365)
                )
            
            with col2:
                end_date = st.date_input(
                    "End Date",
                    datetime.now()
                )
            
            # Capital and risk
            col1, col2 = st.columns(2)
            
            with col1:
                initial_capital = st.number_input(
                    "Initial Capital",
                    min_value=10000,
                    max_value=10000000,
                    value=100000,
                    step=10000
                )
            
            with col2:
                risk_percent = st.number_input(
                    "Risk Percentage",
                    min_value=0.1,
                    max_value=10.0,
                    value=1.0,
                    step=0.1
                )
            
            # Submit button
            submitted = st.form_submit_button("Run Backtest")
        
        # Run backtest
        if submitted:
            with st.spinner("Running backtest..."):
                # Run backtest
                results_df, metrics = run_backtest(
                    symbol=symbol,
                    entry_type=entry_type,
                    strategy=strategy,
                    start_date=start_date,
                    end_date=end_date,
                    initial_capital=initial_capital,
                    risk_percent=risk_percent
                )
                
                if results_df is None or metrics is None:
                    st.error("Error running backtest")
                else:
                    # Display performance metrics
                    st.subheader("Performance Metrics")
                    
                    # Create columns for metrics
                    col1, col2, col3, col4 = st.columns(4)
                    
                    with col1:
                        st.metric("Total Return", f"{metrics['total_return']:.2f}%")
                        st.metric("Total Trades", metrics["total_trades"])
                    
                    with col2:
                        st.metric("Win Rate", f"{metrics['win_rate']:.2f}%")
                        st.metric("Profit Factor", f"{metrics['profit_factor']:.2f}")
                    
                    with col3:
                        st.metric("Avg. Profit", f"₹{metrics['avg_profit']:.2f}")
                        st.metric("Total Profit", f"₹{metrics['total_profit']:.2f}")
                    
                    with col4:
                        st.metric("Avg. Loss", f"₹{metrics['avg_loss']:.2f}")
                        st.metric("Total Loss", f"₹{metrics['total_loss']:.2f}")
                    
                    # Display equity curve
                    st.subheader("Equity Curve")
                    
                    fig = go.Figure()
                    
                    fig.add_trace(go.Scatter(
                        x=results_df["date"],
                        y=results_df["equity"],
                        mode="lines",
                        name="Equity",
                        line=dict(color="blue", width=2)
                    ))
                    
                    fig.update_layout(
                        title="Equity Curve",
                        xaxis_title="Date",
                        yaxis_title="Equity (₹)",
                        hovermode="x unified"
                    )
                    
                    st.plotly_chart(fig, use_container_width=True)
                    
                    # Display trade list
                    st.subheader("Trade List")
                    
                    # Format trade list
                    display_df = results_df.copy()
                    display_df["date"] = pd.to_datetime(display_df["date"]).dt.strftime("%Y-%m-%d")
                    display_df["price"] = display_df["price"].apply(lambda x: f"₹{x:.2f}")
                    display_df["pnl"] = display_df["pnl"].apply(lambda x: f"₹{x:.2f}")
                    display_df["equity"] = display_df["equity"].apply(lambda x: f"₹{x:.2f}")
                    display_df["position_value"] = display_df["position_value"].apply(lambda x: f"₹{x:.2f}")
                    
                    # Rename columns
                    display_df.columns = ["Date", "Action", "Price", "Reason", "P&L", "Equity", "Position Value"]
                    
                    # Display trade list
                    st.dataframe(display_df, use_container_width=True)
                    
                    # Display charts
                    st.subheader("Performance Charts")
                    
                    col1, col2 = st.columns(2)
                    
                    with col1:
                        # Create pie chart for win/loss ratio
                        fig = go.Figure(data=[go.Pie(
                            labels=["Winning Trades", "Losing Trades"],
                            values=[metrics["winning_trades"], metrics["losing_trades"]],
                            hole=0.4
                        )])
                        
                        fig.update_layout(
                            title="Win/Loss Ratio"
                        )
                        
                        st.plotly_chart(fig, use_container_width=True)
                    
                    with col2:
                        # Create bar chart for profit/loss by reason
                        profit_by_reason = results_df[results_df["action"] == "exit"].groupby("reason")["pnl"].sum()
                        
                        fig = go.Figure(data=[go.Bar(
                            x=profit_by_reason.index,
                            y=profit_by_reason.values
                        )])
                        
                        fig.update_layout(
                            title="Profit/Loss by Reason",
                            xaxis_title="Reason",
                            yaxis_title="Profit/Loss (₹)"
                        )
                        
                        st.plotly_chart(fig, use_container_width=True)
                    
                    # Save backtest results
                    if st.button("Save Backtest Results"):
                        # Convert results to dictionary
                        backtest_data = {
                            "symbol": symbol,
                            "entry_type": entry_type,
                            "strategy": strategy,
                            "start_date": start_date.isoformat(),
                            "end_date": end_date.isoformat(),
                            "initial_capital": initial_capital,
                            "risk_percent": risk_percent,
                            "metrics": metrics,
                            "trades": results_df.to_dict(orient="records"),
                            "timestamp": datetime.now().isoformat()
                        }
                        
                        # Save to MongoDB
                        db.save_backtest_result(backtest_data)
                        
                        st.success("Backtest results saved")
    
    # Saved Backtests tab
    with tab2:
        st.header("Saved Backtest Results")
        
        # Get saved backtest results
        backtest_results = db.get_backtest_results()
        
        if backtest_results:
            # Create DataFrame from backtest results
            df = pd.DataFrame(backtest_results)
            
            # Format timestamp
            df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.strftime("%Y-%m-%d %H:%M:%S")
            
            # Format metrics
            df["total_return"] = df["metrics"].apply(lambda x: f"{x.get('total_return', 0):.2f}%")
            df["win_rate"] = df["metrics"].apply(lambda x: f"{x.get('win_rate', 0):.2f}%")
            df["profit_factor"] = df["metrics"].apply(lambda x: f"{x.get('profit_factor', 0):.2f}")
            df["total_trades"] = df["metrics"].apply(lambda x: x.get("total_trades", 0))
            
            # Select columns to display
            display_df = df[["timestamp", "symbol", "entry_type", "strategy", "total_return", "win_rate", "profit_factor", "total_trades"]]
            
            # Rename columns
            display_df.columns = ["Timestamp", "Symbol", "Entry Type", "Strategy", "Total Return", "Win Rate", "Profit Factor", "Total Trades"]
            
            # Display backtest results
            st.dataframe(display_df, use_container_width=True)
            
            # Load saved backtest
            selected_backtest = st.selectbox("Load Saved Backtest", df["timestamp"].tolist())
            
            if selected_backtest and st.button("Load"):
                # Get selected backtest
                backtest = df[df["timestamp"] == selected_backtest].iloc[0]
                
                # Display backtest details
                st.subheader(f"Backtest Details: {backtest['symbol']} - {backtest['entry_type']} - {backtest['strategy']}")
                
                # Display performance metrics
                st.subheader("Performance Metrics")
                
                # Create columns for metrics
                col1, col2, col3, col4 = st.columns(4)
                
                metrics = backtest["metrics"]
                
                with col1:
                    st.metric("Total Return", f"{metrics.get('total_return', 0):.2f}%")
                    st.metric("Total Trades", metrics.get("total_trades", 0))
                
                with col2:
                    st.metric("Win Rate", f"{metrics.get('win_rate', 0):.2f}%")
                    st.metric("Profit Factor", f"{metrics.get('profit_factor', 0):.2f}")
                
                with col3:
                    st.metric("Avg. Profit", f"₹{metrics.get('avg_profit', 0):.2f}")
                    st.metric("Total Profit", f"₹{metrics.get('total_profit', 0):.2f}")
                
                with col4:
                    st.metric("Avg. Loss", f"₹{metrics.get('avg_loss', 0):.2f}")
                    st.metric("Total Loss", f"₹{metrics.get('total_loss', 0):.2f}")
                
                # Display trade list
                st.subheader("Trade List")
                
                # Create DataFrame from trades
                trades_df = pd.DataFrame(backtest["trades"])
                
                # Format trade list
                trades_df["date"] = pd.to_datetime(trades_df["date"]).dt.strftime("%Y-%m-%d")
                trades_df["price"] = trades_df["price"].apply(lambda x: f"₹{x:.2f}")
                trades_df["pnl"] = trades_df["pnl"].apply(lambda x: f"₹{x:.2f}")
                trades_df["equity"] = trades_df["equity"].apply(lambda x: f"₹{x:.2f}")
                trades_df["position_value"] = trades_df["position_value"].apply(lambda x: f"₹{x:.2f}")
                
                # Rename columns
                trades_df.columns = ["Date", "Action", "Price", "Reason", "P&L", "Equity", "Position Value"]
                
                # Display trade list
                st.dataframe(trades_df, use_container_width=True)
        else:
            st.info("No saved backtest results") 