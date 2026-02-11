"""Component for displaying sector performance"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go

def get_default_sector_data():
    """Get default sector performance data if real data is unavailable"""
    sectors = {
        "Sector": ["IT", "Banking", "Pharma", "Auto", "FMCG", "Energy", "Metal", "Realty"],
        "DailyChange": [1.2, -0.5, 0.8, 1.5, -0.3, 2.1, -1.2, 0.7],
        "WeeklyChange": [3.5, 1.2, -2.1, 4.2, 0.8, 5.6, -3.2, 1.9],
        "MonthlyChange": [5.8, 3.4, -1.5, 7.6, 2.3, 8.9, -5.6, 4.2]
    }
    return pd.DataFrame(sectors)

def render_sector_performance(sector_data=None):
    """
    Render sector performance view
    
    Args:
        sector_data: DataFrame with sector performance data
    """
    st.markdown('<div class="section-title">Sector Performance</div>', unsafe_allow_html=True)
    
    if sector_data is None or sector_data.empty:
        sector_data = get_default_sector_data()
    
    render_heat_map(sector_data)

def render_heat_map(sector_data):
    """
    Render sector performance heat map
    
    Args:
        sector_data: DataFrame with sector performance
    """
    # Prepare data for heatmap
    fig = go.Figure()
    
    # Add daily change trace
    fig.add_trace(go.Bar(
        y=sector_data["Sector"],
        x=sector_data["DailyChange"],
        orientation='h',
        marker=dict(
            color=sector_data["DailyChange"].apply(lambda x: 'green' if x > 0 else 'red'),
            colorscale='RdYlGn',
        ),
        name='Daily Change %'
    ))
    
    # Update layout
    fig.update_layout(
        height=400,
        margin=dict(l=10, r=10, t=10, b=10),
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        font=dict(color='#e2e8f0'),
        xaxis=dict(title='Change %'),
        barmode='group'
    )
    
    st.plotly_chart(fig, use_container_width=True) 