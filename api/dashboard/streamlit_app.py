#!/usr/bin/env python3
"""
Streamlit Dashboard Application
==============================

A Streamlit application that consumes the AlgoDiscovery Dashboard API
to display real-time analytics and metrics.
"""

import streamlit as st
import requests
import json
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
import time
from typing import Dict, List, Any
import altair as alt

# Configuration
DASHBOARD_API_URL = "http://localhost:8005"
REFRESH_INTERVAL = 30  # seconds

def fetch_dashboard_data(endpoint: str = "/") -> Dict[str, Any]:
    """Fetch data from dashboard API"""
    try:
        response = requests.get(f"{DASHBOARD_API_URL}/api/dashboard{endpoint}", timeout=10)
        if response.status_code == 200:
            return response.json()
        else:
            st.error(f"API Error: {response.status_code}")
            return None
    except requests.exceptions.RequestException as e:
        st.error(f"Connection Error: {e}")
        return None

def create_system_health_gauge(value: float, title: str, max_value: float = 100):
    """Create a gauge chart for system metrics"""
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=value,
        domain={'x': [0, 1], 'y': [0, 1]},
        title={'text': title},
        delta={'reference': max_value * 0.8},
        gauge={
            'axis': {'range': [None, max_value]},
            'bar': {'color': "darkblue"},
            'steps': [
                {'range': [0, max_value * 0.6], 'color': "lightgray"},
                {'range': [max_value * 0.6, max_value * 0.8], 'color': "yellow"},
                {'range': [max_value * 0.8, max_value], 'color': "red"}
            ],
            'threshold': {
                'line': {'color': "red", 'width': 4},
                'thickness': 0.75,
                'value': max_value * 0.8
            }
        }
    ))
    return fig

def create_metric_card(title: str, value: Any, unit: str = "", status: str = "normal"):
    """Create a metric card"""
    color_map = {
        "normal": "green",
        "warning": "orange", 
        "error": "red",
        "critical": "darkred"
    }
    
    st.metric(
        label=title,
        value=f"{value} {unit}".strip(),
        delta=None
    )

def main():
    """Main Streamlit application"""
    st.set_page_config(
        page_title="AlgoDiscovery Dashboard",
        page_icon="📊",
        layout="wide",
        initial_sidebar_state="expanded"
    )
    
    # Header
    st.title("📊 AlgoDiscovery Trading System Dashboard")
    st.markdown("Real-time analytics and monitoring for the AlgoDiscovery Trading System")
    
    # Sidebar
    st.sidebar.title("🎛️ Dashboard Controls")
    
    # Auto-refresh
    auto_refresh = st.sidebar.checkbox("Auto-refresh", value=True)
    refresh_interval = st.sidebar.slider("Refresh interval (seconds)", 10, 60, 30)
    
    # Metric selection
    st.sidebar.subheader("📈 Metrics")
    selected_metrics = st.sidebar.multiselect(
        "Select metrics to display",
        ["System Health", "Database", "Cache", "API", "Cron Jobs", "Alerts"],
        default=["System Health", "Database", "Cache", "API"]
    )
    
    # Main content
    if auto_refresh:
        time.sleep(1)  # Small delay for auto-refresh
    
    # Fetch dashboard data
    dashboard_data = fetch_dashboard_data("/")
    
    if dashboard_data and dashboard_data.get("success"):
        data = dashboard_data.get("data", {})
        
        # System Health Section
        if "System Health" in selected_metrics:
            st.header("🖥️ System Health")
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                create_metric_card("CPU Usage", f"{data['system']['cpu_usage']:.1f}", "%")
                fig_cpu = create_system_health_gauge(data['system']['cpu_usage'], "CPU Usage")
                st.plotly_chart(fig_cpu, use_container_width=True)
            
            with col2:
                create_metric_card("Memory Usage", f"{data['system']['memory_usage']:.1f}", "%")
                fig_mem = create_system_health_gauge(data['system']['memory_usage'], "Memory Usage")
                st.plotly_chart(fig_mem, use_container_width=True)
            
            with col3:
                create_metric_card("Disk Usage", f"{data['system']['disk_usage']:.1f}", "%")
                fig_disk = create_system_health_gauge(data['system']['disk_usage'], "Disk Usage")
                st.plotly_chart(fig_disk, use_container_width=True)
            
            with col4:
                uptime_hours = data['system']['uptime_seconds'] / 3600
                create_metric_card("Uptime", f"{uptime_hours:.1f}", "hours")
                st.info(f"Processes: {data['system']['process_count']}")
        
        # Database Section
        if "Database" in selected_metrics:
            st.header("🗄️ Database Analytics")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                create_metric_card("Database Size", data['database']['total_size_human'])
                create_metric_card("Collections", data['database']['collections_count'])
            
            with col2:
                create_metric_card("Documents", f"{data['database']['documents_count']:,}")
                create_metric_card("Indexes", data['database']['indexes_count'])
            
            with col3:
                status_color = "green" if data['database']['connection_status'] == "connected" else "red"
                st.markdown(f"**Connection Status:** :{status_color}[{data['database']['connection_status']}]")
                
                # Database size chart
                db_data = {
                    'Type': ['Data Size', 'Index Size'],
                    'Size (MB)': [
                        data['database']['performance_metrics'].get('storage_size', 0) / 1024 / 1024,
                        data['database']['performance_metrics'].get('index_size', 0) / 1024 / 1024
                    ]
                }
                df_db = pd.DataFrame(db_data)
                fig_db = px.pie(df_db, values='Size (MB)', names='Type', title="Database Size Distribution")
                st.plotly_chart(fig_db, use_container_width=True)
        
        # Cache Section
        if "Cache" in selected_metrics:
            st.header("⚡ Cache Analytics")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                create_metric_card("Total Keys", f"{data['cache']['total_keys']:,}")
                create_metric_card("Memory Usage", data['cache']['memory_usage_human'])
            
            with col2:
                create_metric_card("Hit Rate", f"{data['cache']['hit_rate']:.1f}", "%")
                create_metric_card("Miss Rate", f"{data['cache']['miss_rate']:.1f}", "%")
            
            with col3:
                status_color = "green" if data['cache']['redis_status'] == "connected" else "red"
                st.markdown(f"**Redis Status:** :{status_color}[{data['cache']['redis_status']}]")
                create_metric_card("Evictions", data['cache']['eviction_count'])
            
            # TTL Distribution
            if data['cache']['ttl_distribution']:
                ttl_data = list(data['cache']['ttl_distribution'].items())
                df_ttl = pd.DataFrame(ttl_data, columns=['TTL Range', 'Count'])
                fig_ttl = px.bar(df_ttl, x='TTL Range', y='Count', title="Cache TTL Distribution")
                st.plotly_chart(fig_ttl, use_container_width=True)
        
        # API Section
        if "API" in selected_metrics:
            st.header("🌐 API Analytics")
            
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                create_metric_card("Total Requests", f"{data['api']['total_requests']:,}")
                create_metric_card("Requests/min", f"{data['api']['requests_per_minute']:.1f}")
            
            with col2:
                create_metric_card("Success Rate", f"{data['api']['successful_requests']:,}")
                create_metric_card("Failed Requests", f"{data['api']['failed_requests']:,}")
            
            with col3:
                create_metric_card("Error Rate", f"{data['api']['error_rate']:.1f}", "%")
                create_metric_card("Avg Response Time", f"{data['api']['average_response_time']:.3f}", "s")
            
            with col4:
                # Status codes chart
                status_codes = data['api']['status_codes']
                if status_codes:
                    df_status = pd.DataFrame(list(status_codes.items()), columns=['Status Code', 'Count'])
                    fig_status = px.pie(df_status, values='Count', names='Status Code', title="Status Code Distribution")
                    st.plotly_chart(fig_status, use_container_width=True)
        
        # Cron Jobs Section
        if "Cron Jobs" in selected_metrics:
            st.header("⏰ Cron Job Analytics")
            
            col1, col2, col3 = st.columns(3)
            
            with col1:
                create_metric_card("Total Jobs", data['cron']['total_jobs'])
                create_metric_card("Active Jobs", data['cron']['active_jobs'])
            
            with col2:
                create_metric_card("Success Rate", f"{data['cron']['success_rate']:.1f}", "%")
                create_metric_card("Avg Execution Time", f"{data['cron']['average_execution_time']:.1f}", "s")
            
            with col3:
                create_metric_card("Failed Jobs", data['cron']['failed_jobs'])
            
            # Last run times
            if data['cron']['last_run_times']:
                st.subheader("Last Run Times")
                for job, last_run in data['cron']['last_run_times'].items():
                    time_ago = datetime.now() - datetime.fromisoformat(last_run.replace('Z', '+00:00'))
                    st.text(f"{job}: {time_ago.total_seconds() / 3600:.1f} hours ago")
        
        # Alerts Section
        if "Alerts" in selected_metrics:
            st.header("🚨 System Alerts")
            
            alerts_data = fetch_dashboard_data("/alerts")
            if alerts_data and alerts_data.get("success"):
                alerts = alerts_data.get("data", {}).get("alerts", [])
                
                if alerts:
                    for alert in alerts:
                        alert_type = alert['type']
                        if alert_type == "critical":
                            st.error(f"🚨 {alert['message']}")
                        elif alert_type == "error":
                            st.error(f"❌ {alert['message']}")
                        elif alert_type == "warning":
                            st.warning(f"⚠️ {alert['message']}")
                        else:
                            st.info(f"ℹ️ {alert['message']}")
                else:
                    st.success("✅ No active alerts")
            else:
                st.error("Failed to fetch alerts")
        
        # Graph Visualization
        st.header("🕸️ System Architecture Graph")
        
        graph_data = fetch_dashboard_data("/graph")
        if graph_data and graph_data.get("success"):
            graph = graph_data.get("data", {})
            
            # Create nodes dataframe
            nodes_data = []
            for node in graph.get("nodes", []):
                nodes_data.append({
                    "id": node["id"],
                    "name": node["name"],
                    "type": node["type"],
                    "value": str(node["value"]),
                    "status": node["status"]
                })
            
            if nodes_data:
                df_nodes = pd.DataFrame(nodes_data)
                st.dataframe(df_nodes)
                
                # Create edges dataframe
                edges_data = []
                for edge in graph.get("edges", []):
                    edges_data.append({
                        "source": edge["source"],
                        "target": edge["target"],
                        "relationship": edge["relationship"]
                    })
                
                if edges_data:
                    df_edges = pd.DataFrame(edges_data)
                    st.subheader("System Relationships")
                    st.dataframe(df_edges)
        
        # Footer
        st.markdown("---")
        st.markdown(f"*Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
        
        # Auto-refresh
        if auto_refresh:
            time.sleep(refresh_interval)
            st.experimental_rerun()
    
    else:
        st.error("❌ Failed to connect to Dashboard API")
        st.info("Make sure the dashboard server is running on port 8005")
        
        # Show connection status
        st.subheader("Connection Status")
        health_data = fetch_dashboard_data("/health")
        if health_data:
            st.json(health_data)
        else:
            st.error("Cannot connect to dashboard server")

if __name__ == "__main__":
    main() 