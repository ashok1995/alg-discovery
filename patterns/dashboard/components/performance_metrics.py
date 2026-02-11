"""
Performance metrics component
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px

def render_performance_metrics(performance_metrics):
    """
    Render performance metrics component
    
    Args:
        performance_metrics: Performance metrics data
    """
    st.subheader("Performance Metrics")
    
    if performance_metrics:
        # Create columns for metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Win Rate",
                f"{performance_metrics.get('win_rate', 0):.2f}%",
                delta=f"{performance_metrics.get('win_rate_change', 0):.2f}%"
            )
        
        with col2:
            st.metric(
                "Profit Factor",
                f"{performance_metrics.get('profit_factor', 0):.2f}",
                delta=f"{performance_metrics.get('profit_factor_change', 0):.2f}"
            )
        
        with col3:
            st.metric(
                "Average Profit",
                f"₹{performance_metrics.get('avg_profit', 0):.2f}",
                delta=f"₹{performance_metrics.get('avg_profit_change', 0):.2f}"
            )
        
        with col4:
            st.metric(
                "Average Loss",
                f"₹{performance_metrics.get('avg_loss', 0):.2f}",
                delta=f"₹{performance_metrics.get('avg_loss_change', 0):.2f}",
                delta_color="inverse"
            )
        
        # Create second row of metrics
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "Total Trades",
                performance_metrics.get("total_trades", 0),
                delta=performance_metrics.get("total_trades_change", 0)
            )
        
        with col2:
            st.metric(
                "Winning Trades",
                performance_metrics.get("winning_trades", 0),
                delta=performance_metrics.get("winning_trades_change", 0)
            )
        
        with col3:
            st.metric(
                "Losing Trades",
                performance_metrics.get("losing_trades", 0),
                delta=performance_metrics.get("losing_trades_change", 0),
                delta_color="inverse"
            )
        
        with col4:
            st.metric(
                "Total Return",
                f"{performance_metrics.get('total_return', 0):.2f}%",
                delta=f"{performance_metrics.get('total_return_change', 0):.2f}%"
            )
    else:
        st.info("No performance metrics available")

def render_performance_charts(performance_metrics):
    """
    Render performance charts component
    
    Args:
        performance_metrics: Performance metrics data
    """
    st.subheader("Performance Charts")
    
    if performance_metrics:
        col1, col2 = st.columns(2)
        
        with col1:
            # Win/Loss Ratio Pie Chart
            fig = go.Figure(data=[go.Pie(
                labels=["Winning Trades", "Losing Trades"],
                values=[
                    performance_metrics.get("winning_trades", 0),
                    performance_metrics.get("losing_trades", 0)
                ],
                hole=0.4,
                marker_colors=["#4CAF50", "#F44336"]
            )])
            
            fig.update_layout(
                title="Win/Loss Ratio",
                height=300
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        with col2:
            # Monthly Returns Bar Chart
            # In a real implementation, you would calculate this from trade data
            monthly_returns = {
                "Month": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                "Return": [2.5, -1.2, 3.7, 1.8, -0.9, 4.2]
            }
            
            monthly_df = pd.DataFrame(monthly_returns)
            
            fig = px.bar(
                monthly_df,
                x="Month",
                y="Return",
                title="Monthly Returns (%)",
                color="Return",
                color_continuous_scale=["#F44336", "#FFFFFF", "#4CAF50"],
                color_continuous_midpoint=0
            )
            
            fig.update_layout(
                height=300,
                coloraxis_showscale=False
            )
            
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No performance metrics available") 