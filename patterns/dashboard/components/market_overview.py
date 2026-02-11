"""
Market overview component
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import plotly.graph_objects as go
import random  # For demo data if needed

def render_market_condition_card(title, value, color):
    """
    Render a market condition card
    
    Args:
        title: Card title
        value: Card value
        color: Card color
    """
    st.markdown(
        f"""
        <div style="padding: 10px; border-radius: 5px; background-color: {color}; color: white; text-align: center;">
            <h3 style="margin: 0; font-size: 16px;">{title}</h3>
            <p style="margin: 0; font-size: 20px; font-weight: bold;">{value.replace('_', ' ').title()}</p>
        </div>
        """,
        unsafe_allow_html=True
    )

def render_market_overview(market_condition):
    """Render market overview with modern UI"""
    
    # Create a card-like container with custom styling
    with st.container():
        # Add some CSS to create a card effect
        st.markdown("""
        <style>
        .market-card {
            border-radius: 10px;
            padding: 15px;
            background-color: #f8f9fa;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }
        </style>
        """, unsafe_allow_html=True)
        
        # Create a card container
        st.markdown('<div class="market-card">', unsafe_allow_html=True)
        
        # Header with title and refresh button
        col1, col2 = st.columns([3, 1])
        with col1:
            st.subheader("Market Overview")
        with col2:
            refresh = st.button("🔄 Refresh", key="refresh_market")
        
        # Market metrics in columns
        col1, col2, col3 = st.columns(3)
        
        # Market condition indicators with colors based on values
        with col1:
            overall = market_condition.get('overall', 'Unknown')
            color = 'green' if overall in ['bullish', 'strongly_bullish'] else 'red' if overall in ['bearish', 'strongly_bearish'] else 'orange'
            st.metric(
                label="Market Condition", 
                value=overall.replace('_', ' ').title(),
                delta="Improving" if color == 'green' else "Deteriorating" if color == 'red' else "Stable",
                delta_color="normal" if color == 'orange' else "good" if color == 'green' else "inverse"
            )
        
        with col2:
            trend = market_condition.get('trend', 'Unknown')
            trend_color = 'green' if trend in ['uptrend', 'strong_uptrend'] else 'red' if trend in ['downtrend', 'strong_downtrend'] else 'orange'
            st.metric(
                label="Market Trend", 
                value=trend.replace('_', ' ').title(),
                delta=None
            )
        
        with col3:
            volatility = market_condition.get('volatility', 'Unknown')
            vol_value = volatility.replace('_', ' ').title() if isinstance(volatility, str) else str(volatility)
            st.metric(
                label="Volatility", 
                value=vol_value,
                delta=None
            )
        
        # Add description or analysis
        st.markdown(f"""
        <div style="font-size: 0.9em; color: #555;">
        Current market analysis indicates a <b>{overall.replace('_', ' ')}</b> condition with 
        <b>{trend.replace('_', ' ')}</b> momentum. Trading approach should be adjusted accordingly.
        </div>
        """, unsafe_allow_html=True)
        
        # Close the card container
        st.markdown('</div>', unsafe_allow_html=True)

def render_market_indices():
    """Render market indices with modern UI"""
    
    # Create a card-like container
    st.markdown('<div class="market-card">', unsafe_allow_html=True)
    
    # Header with tabs
    st.subheader("Market Indices")
    
    # Create tabs for different time frames
    tabs = st.tabs(["Today", "1 Week", "1 Month", "3 Months"])
    
    # Generate some demo data if real data isn't available
    def get_demo_index_data():
        dates = [(datetime.now() - timedelta(days=x)).strftime("%Y-%m-%d") for x in range(90, 0, -1)]
        nifty = [random.randint(17000, 19000) for _ in range(90)]
        sensex = [random.randint(57000, 63000) for _ in range(90)]
        return pd.DataFrame({
            "Date": dates,
            "Nifty 50": nifty,
            "Sensex": sensex,
            "Bank Nifty": [random.randint(35000, 42000) for _ in range(90)]
        })
    
    try:
        # Try to get real data
        # indices_data = get_market_indices_data()  # Replace with your actual function
        # If no data, use demo data
        indices_data = get_demo_index_data()
        
        # Create chart
        fig = go.Figure()
        
        # Create charts for each tab
        with tabs[0]:  # Today
            today_data = indices_data.tail(1)
            st.write("Today's Performance")
            
            # Display indices in a modern way
            col1, col2, col3 = st.columns(3)
            with col1:
                nifty_change = 0.75  # Example change
                st.metric(
                    label="Nifty 50", 
                    value=f"{today_data['Nifty 50'].values[0]:,.0f}", 
                    delta=f"{nifty_change:.2f}%",
                    delta_color="normal"
                )
            
            with col2:
                sensex_change = 0.62  # Example change
                st.metric(
                    label="Sensex", 
                    value=f"{today_data['Sensex'].values[0]:,.0f}", 
                    delta=f"{sensex_change:.2f}%",
                    delta_color="normal"
                )
                
            with col3:
                bank_change = -0.18  # Example change
                st.metric(
                    label="Bank Nifty", 
                    value=f"{today_data['Bank Nifty'].values[0]:,.0f}", 
                    delta=f"{bank_change:.2f}%",
                    delta_color="normal"
                )
                
            # Add heatmap of sectors
            st.write("Sector Performance")
            sectors = {
                "IT": random.uniform(-1.5, 2),
                "Banking": random.uniform(-1.5, 2),
                "FMCG": random.uniform(-1.5, 2),
                "Pharma": random.uniform(-1.5, 2),
                "Auto": random.uniform(-1.5, 2),
                "Metal": random.uniform(-1.5, 2),
                "Energy": random.uniform(-1.5, 2),
                "Realty": random.uniform(-1.5, 2)
            }
            
            # Display sectors as a horizontal bar chart
            sector_df = pd.DataFrame({
                'Sector': list(sectors.keys()),
                'Change': list(sectors.values())
            })
            sector_df = sector_df.sort_values('Change')
            
            fig = go.Figure(go.Bar(
                x=sector_df['Change'],
                y=sector_df['Sector'],
                orientation='h',
                marker=dict(
                    color=sector_df['Change'],
                    colorscale='RdYlGn',
                    colorbar=dict(title="% Change"),
                    cmin=-2,
                    cmax=2
                )
            ))
            
            fig.update_layout(
                title="Sector Performance (%)",
                xaxis_title="% Change",
                yaxis_title="",
                height=400,
                margin=dict(l=0, r=0, t=40, b=0)
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        with tabs[1]:  # 1 Week
            st.write("Weekly Performance")
            week_data = indices_data.tail(7)
            
            # Line chart
            fig = go.Figure()
            
            fig.add_trace(go.Scatter(
                x=week_data['Date'], 
                y=week_data['Nifty 50'],
                mode='lines+markers',
                name='Nifty 50'
            ))
            
            fig.add_trace(go.Scatter(
                x=week_data['Date'], 
                y=week_data['Sensex'] / 3.5,  # Scale down to fit on same chart
                mode='lines+markers',
                name='Sensex (scaled)'
            ))
            
            fig.add_trace(go.Scatter(
                x=week_data['Date'], 
                y=week_data['Bank Nifty'],
                mode='lines+markers',
                name='Bank Nifty'
            ))
            
            fig.update_layout(
                title="Weekly Index Movement",
                xaxis_title="Date",
                yaxis_title="Index Value",
                legend=dict(orientation="h", y=1.1),
                height=400,
                margin=dict(l=0, r=0, t=40, b=0)
            )
            
            st.plotly_chart(fig, use_container_width=True)
        
        with tabs[2]:  # 1 Month
            st.write("Monthly Performance")
            month_data = indices_data.tail(30)
            
            # Line chart
            fig = go.Figure()
            
            fig.add_trace(go.Scatter(
                x=month_data['Date'], 
                y=month_data['Nifty 50'],
                mode='lines',
                name='Nifty 50'
            ))
            
            fig.update_layout(
                title="Monthly Index Movement",
                xaxis_title="Date",
                yaxis_title="Index Value",
                height=400,
                margin=dict(l=0, r=0, t=40, b=0)
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Add monthly performance comparison
            st.write("Monthly Performance Comparison")
            monthly_perf = {
                "Nifty 50": random.uniform(-5, 10),
                "Sensex": random.uniform(-5, 10),
                "Bank Nifty": random.uniform(-5, 10),
                "IT Index": random.uniform(-5, 10),
                "Pharma Index": random.uniform(-5, 10),
                "Auto Index": random.uniform(-5, 10)
            }
            
            perf_df = pd.DataFrame({
                'Index': list(monthly_perf.keys()),
                'Monthly Change (%)': list(monthly_perf.values())
            })
            
            st.dataframe(
                perf_df,
                column_config={
                    "Monthly Change (%)": st.column_config.NumberColumn(
                        "Monthly Change (%)",
                        format="%.2f%%",
                        help="Percentage change over the last month"
                    )
                },
                hide_index=True,
                use_container_width=True
            )
        
        with tabs[3]:  # 3 Months
            st.write("Quarterly Performance")
            quarter_data = indices_data
            
            # Area chart
            fig = go.Figure()
            
            fig.add_trace(go.Scatter(
                x=quarter_data['Date'], 
                y=quarter_data['Nifty 50'],
                mode='lines',
                fill='tozeroy',
                name='Nifty 50'
            ))
            
            fig.update_layout(
                title="Quarterly Index Movement",
                xaxis_title="Date",
                yaxis_title="Index Value",
                height=400,
                margin=dict(l=0, r=0, t=40, b=0)
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Add buttons for additional analysis
            st.write("Additional Analysis Tools")
            
            col1, col2, col3 = st.columns(3)
            with col1:
                if st.button("📊 Technical Analysis", key="tech_analysis"):
                    st.session_state.show_tech_analysis = True
            
            with col2:
                if st.button("📈 Correlation Analysis", key="corr_analysis"):
                    st.session_state.show_corr_analysis = True
                    
            with col3:
                if st.button("🔮 Market Prediction", key="market_prediction"):
                    st.session_state.show_market_prediction = True
            
            # Show additional analysis if button clicked
            if st.session_state.get("show_tech_analysis", False):
                st.write("Technical Analysis")
                st.info("Technical analysis tools would be displayed here.")
                
            if st.session_state.get("show_corr_analysis", False):
                st.write("Correlation Analysis")
                st.info("Correlation matrix would be displayed here.")
                
            if st.session_state.get("show_market_prediction", False):
                st.write("Market Prediction")
                st.info("Market prediction models would be displayed here.")
    
    except Exception as e:
        st.error(f"Unable to load market indices: {e}")
        
    # Close the card container
    st.markdown('</div>', unsafe_allow_html=True) 