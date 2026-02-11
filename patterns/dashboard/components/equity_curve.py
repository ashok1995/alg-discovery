"""
Equity curve component
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from datetime import datetime, timedelta
import numpy as np

def render_equity_curve(equity_data):
    """Render equity curve with modern UI"""
    
    st.markdown('<div class="market-card">', unsafe_allow_html=True)
    
    # Header with title and download button
    col1, col2 = st.columns([3, 1])
    with col1:
        st.subheader("Portfolio Performance")
    with col2:
        st.download_button(
            label="📥 Export",
            data=pd.DataFrame(equity_data).to_csv().encode('utf-8'),
            file_name='equity_curve.csv',
            mime='text/csv',
            key="download_equity"
        )
    
    # Handle empty data
    if not equity_data:
        st.info("No equity data available. Your performance metrics will appear here once you start trading.")
        
        # Display a placeholder chart
        dates = [(datetime.now() - timedelta(days=x)).strftime("%Y-%m-%d") for x in range(90, 0, -1)]
        equity = [100000 * (1 + np.sin(x/15) * 0.05 + x/450) for x in range(90)]
        
        placeholder_df = pd.DataFrame({
            "date": dates,
            "equity": equity
        })
        
        # Display chart with note that it's a placeholder
        fig = go.Figure()
        
        fig.add_trace(go.Scatter(
            x=placeholder_df['date'],
            y=placeholder_df['equity'],
            mode='lines',
            line=dict(color='#0068c9', width=2),
            fill='tozeroy',
            fillcolor='rgba(0, 104, 201, 0.1)',
            name="Portfolio Value"
        ))
        
        fig.update_layout(
            title="Sample Portfolio Performance (Demo Data)",
            xaxis_title="Date",
            yaxis_title="Portfolio Value",
            height=400,
            margin=dict(l=0, r=0, t=40, b=0),
            hovermode="x unified",
            legend=dict(orientation="h", y=1.1),
            plot_bgcolor='white'
        )
        
        fig.update_xaxes(
            showgrid=True,
            gridcolor='rgba(204, 204, 204, 0.2)'
        )
        
        fig.update_yaxes(
            showgrid=True,
            gridcolor='rgba(204, 204, 204, 0.2)',
            tickprefix="₹"
        )
        
        st.plotly_chart(fig, use_container_width=True)
        
        # Quick start actions
        st.write("Quick Actions")
        col1, col2, col3 = st.columns(3)
        
        with col1:
            if st.button("➕ New Trade", key="new_trade"):
                st.session_state.page = "new_trade"
        
        with col2:
            if st.button("📊 Backtest", key="run_backtest"):
                st.session_state.page = "backtest"
                
        with col3:
            if st.button("📈 View Strategies", key="view_strategies"):
                st.session_state.page = "strategies"
                
    else:
        # Process real equity data
        try:
            # Convert to DataFrame if it's a list of dicts
            if isinstance(equity_data, list):
                df = pd.DataFrame(equity_data)
            else:
                df = equity_data
                
            # Ensure date column is datetime
            if 'date' in df.columns:
                date_col = 'date'
            elif 'timestamp' in df.columns:
                date_col = 'timestamp'
            else:
                # Find the first column that might be a date
                for col in df.columns:
                    if 'date' in col.lower() or 'time' in col.lower():
                        date_col = col
                        break
                else:
                    # If no date column found, create one
                    df['date'] = pd.date_range(end=datetime.now(), periods=len(df))
                    date_col = 'date'
            
            # Ensure date is datetime type
            if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
                df[date_col] = pd.to_datetime(df[date_col])
            
            # Find the equity/balance column
            if 'equity' in df.columns:
                equity_col = 'equity'
            elif 'balance' in df.columns:
                equity_col = 'balance'
            elif 'value' in df.columns:
                equity_col = 'value'
            else:
                # Find a column that might be the equity
                numeric_cols = df.select_dtypes(include=[np.number]).columns
                if len(numeric_cols) > 0:
                    equity_col = numeric_cols[0]
                else:
                    raise ValueError("No numeric column found for equity values")
            
            # Create the plot
            fig = go.Figure()
            
            # Add equity curve trace
            fig.add_trace(go.Scatter(
                x=df[date_col],
                y=df[equity_col],
                mode='lines',
                line=dict(color='#0068c9', width=2),
                fill='tozeroy',
                fillcolor='rgba(0, 104, 201, 0.1)',
                name="Portfolio Value"
            ))
            
            # Calculate drawdowns if possible
            try:
                df['rolling_max'] = df[equity_col].cummax()
                df['drawdown'] = (df[equity_col] - df['rolling_max']) / df['rolling_max'] * 100
                
                # Add drawdown shading
                fig.add_trace(go.Scatter(
                    x=df[date_col],
                    y=df['drawdown'],
                    mode='lines',
                    line=dict(color='red', width=1),
                    name="Drawdown %",
                    yaxis="y2"
                ))
            except Exception as e:
                st.warning(f"Couldn't calculate drawdowns: {e}")
            
            # Add annotations for key events if they exist
            if 'events' in df.columns:
                for i, event in enumerate(df['events']):
                    if event and str(event).strip():
                        fig.add_annotation(
                            x=df[date_col].iloc[i],
                            y=df[equity_col].iloc[i],
                            text=event,
                            showarrow=True,
                            arrowhead=1,
                            ax=0,
                            ay=-40
                        )
            
            # Update layout
            fig.update_layout(
                title="Portfolio Performance",
                xaxis_title="Date",
                yaxis_title="Portfolio Value",
                height=400,
                margin=dict(l=0, r=0, t=40, b=0),
                hovermode="x unified",
                legend=dict(orientation="h", y=1.1),
                plot_bgcolor='white',
                yaxis2=dict(
                    title="Drawdown %",
                    titlefont=dict(color="red"),
                    tickfont=dict(color="red"),
                    anchor="x",
                    overlaying="y",
                    side="right",
                    range=[df['drawdown'].min() * 1.1 if 'drawdown' in df.columns else -20, 5]
                )
            )
            
            fig.update_xaxes(
                showgrid=True,
                gridcolor='rgba(204, 204, 204, 0.2)'
            )
            
            fig.update_yaxes(
                showgrid=True,
                gridcolor='rgba(204, 204, 204, 0.2)',
                tickprefix="₹"
            )
            
            st.plotly_chart(fig, use_container_width=True)
            
            # Add metrics row
            metrics_col1, metrics_col2, metrics_col3, metrics_col4 = st.columns(4)
            
            # Calculate metrics
            start_value = df[equity_col].iloc[0]
            end_value = df[equity_col].iloc[-1]
            total_return = (end_value / start_value - 1) * 100
            
            max_drawdown = df['drawdown'].min() if 'drawdown' in df.columns else 0
            
            # Display metrics
            with metrics_col1:
                st.metric(
                    label="Total Return", 
                    value=f"{total_return:.2f}%",
                    delta=f"{total_return:.2f}%" if total_return > 0 else f"{total_return:.2f}%",
                    delta_color="normal"
                )
            
            with metrics_col2:
                annualized_return = total_return * (365 / (df[date_col].max() - df[date_col].min()).days)
                st.metric(
                    label="Annualized Return", 
                    value=f"{annualized_return:.2f}%",
                    delta=None
                )
            
            with metrics_col3:
                st.metric(
                    label="Max Drawdown", 
                    value=f"{max_drawdown:.2f}%",
                    delta=None
                )
            
            with metrics_col4:
                volatility = df[equity_col].pct_change().std() * 100 * (252 ** 0.5)  # Annualized
                st.metric(
                    label="Volatility", 
                    value=f"{volatility:.2f}%",
                    delta=None
                )
            
            # Add time period selector
            st.write("Time Period")
            time_periods = st.radio(
                "Select time period",
                options=["1M", "3M", "6M", "1Y", "All"],
                horizontal=True,
                index=4  # Default to "All"
            )
            
        except Exception as e:
            st.error(f"Error processing equity data: {e}")
    
    # Close the card container
    st.markdown('</div>', unsafe_allow_html=True) 