import pandas as pd
import plotly.graph_objects as go
from typing import Dict

def create_metrics_dashboard(backtest_results: Dict):
    """Create a dictionary of plotly figures for the backtest results"""
    metrics = backtest_results['metrics']
    equity_curve = backtest_results['equity_curve']
    
    figures = {
        'equity_curve': plot_equity_curve(equity_curve),
        'metrics_table': create_metrics_table(metrics)
    }
    
    return figures

def plot_equity_curve(equity_curve):
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        y=equity_curve,
        mode='lines',
        name='Portfolio Value'
    ))
    fig.update_layout(
        title='Equity Curve',
        yaxis_title='Portfolio Value',
        xaxis_title='Date'
    )
    return fig

def create_metrics_table(metrics):
    fig = go.Figure(data=[go.Table(
        header=dict(values=['Metric', 'Value']),
        cells=dict(values=[
            list(metrics.keys()),
            [f"{v:.2%}" if isinstance(v, float) else v for v in metrics.values()]
        ])
    )])
    return fig 