#!/usr/bin/env python3
"""
Demo Script for AlgoDiscovery Streamlit Dashboard
=================================================

This script demonstrates how to use the Streamlit dashboard
and provides examples of different features.
"""

import requests
import json
import time
from datetime import datetime, timedelta
import sys
import os

def print_banner():
    """Print demo banner"""
    print("=" * 60)
    print("🎯 AlgoDiscovery Streamlit Dashboard Demo")
    print("=" * 60)
    print()

def demo_api_endpoints():
    """Demonstrate API endpoints"""
    print("🌐 API Endpoints Demo")
    print("-" * 30)
    
    base_url = "http://localhost:8005/api/dashboard"
    endpoints = [
        ("/", "Main Dashboard Data"),
        ("/health", "Health Check"),
        ("/alerts", "System Alerts"),
        ("/graph", "System Architecture Graph")
    ]
    
    for endpoint, description in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {endpoint}: {description}")
                print(f"   Status: {response.status_code}")
                print(f"   Message: {data.get('message', 'OK')}")
            else:
                print(f"❌ {endpoint}: {description}")
                print(f"   Status: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ {endpoint}: {description}")
            print(f"   Error: {e}")
        print()

def demo_dashboard_data():
    """Demonstrate dashboard data structure"""
    print("📊 Dashboard Data Structure Demo")
    print("-" * 35)
    
    try:
        response = requests.get("http://localhost:8005/api/dashboard/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                dashboard_data = data.get("data", {})
                
                # System data
                if "system" in dashboard_data:
                    system = dashboard_data["system"]
                    print("🖥️  System Metrics:")
                    print(f"   CPU Usage: {system.get('cpu_usage', 0):.1f}%")
                    print(f"   Memory Usage: {system.get('memory_usage', 0):.1f}%")
                    print(f"   Disk Usage: {system.get('disk_usage', 0):.1f}%")
                    print(f"   Uptime: {system.get('uptime_seconds', 0) / 3600:.1f} hours")
                    print()
                
                # Database data
                if "database" in dashboard_data:
                    db = dashboard_data["database"]
                    print("🗄️  Database Metrics:")
                    print(f"   Total Size: {db.get('total_size_human', 'N/A')}")
                    print(f"   Collections: {db.get('collections_count', 0)}")
                    print(f"   Documents: {db.get('documents_count', 0):,}")
                    print(f"   Connection: {db.get('connection_status', 'unknown')}")
                    print()
                
                # Cache data
                if "cache" in dashboard_data:
                    cache = dashboard_data["cache"]
                    print("⚡ Cache Metrics:")
                    print(f"   Total Keys: {cache.get('total_keys', 0):,}")
                    print(f"   Memory Usage: {cache.get('memory_usage_human', 'N/A')}")
                    print(f"   Hit Rate: {cache.get('hit_rate', 0):.1f}%")
                    print(f"   Redis Status: {cache.get('redis_status', 'unknown')}")
                    print()
                
                # API data
                if "api" in dashboard_data:
                    api = dashboard_data["api"]
                    print("🌐 API Metrics:")
                    print(f"   Total Requests: {api.get('total_requests', 0):,}")
                    print(f"   Requests/min: {api.get('requests_per_minute', 0):.1f}")
                    print(f"   Success Rate: {api.get('successful_requests', 0):,}")
                    print(f"   Error Rate: {api.get('error_rate', 0):.1f}%")
                    print()
                
                # Cron data
                if "cron" in dashboard_data:
                    cron = dashboard_data["cron"]
                    print("⏰ Cron Job Metrics:")
                    print(f"   Total Jobs: {cron.get('total_jobs', 0)}")
                    print(f"   Active Jobs: {cron.get('active_jobs', 0)}")
                    print(f"   Success Rate: {cron.get('success_rate', 0):.1f}%")
                    print(f"   Failed Jobs: {cron.get('failed_jobs', 0)}")
                    print()
            else:
                print("❌ Dashboard API returned unsuccessful response")
        else:
            print(f"❌ Dashboard API returned status code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot fetch dashboard data: {e}")

def demo_alerts():
    """Demonstrate alerts functionality"""
    print("🚨 Alerts Demo")
    print("-" * 15)
    
    try:
        response = requests.get("http://localhost:8005/api/dashboard/alerts", timeout=5)
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                alerts = data.get("data", {}).get("alerts", [])
                
                if alerts:
                    print(f"Found {len(alerts)} active alerts:")
                    for i, alert in enumerate(alerts, 1):
                        alert_type = alert.get('type', 'info')
                        message = alert.get('message', 'No message')
                        timestamp = alert.get('timestamp', 'Unknown')
                        
                        print(f"   {i}. [{alert_type.upper()}] {message}")
                        print(f"      Time: {timestamp}")
                else:
                    print("✅ No active alerts")
            else:
                print("❌ Alerts API returned unsuccessful response")
        else:
            print(f"❌ Alerts API returned status code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot fetch alerts: {e}")

def demo_graph():
    """Demonstrate system graph functionality"""
    print("🕸️  System Graph Demo")
    print("-" * 20)
    
    try:
        response = requests.get("http://localhost:8005/api/dashboard/graph", timeout=5)
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                graph = data.get("data", {})
                nodes = graph.get("nodes", [])
                edges = graph.get("edges", [])
                
                print(f"System Components: {len(nodes)} nodes")
                print(f"Relationships: {len(edges)} edges")
                print()
                
                if nodes:
                    print("📋 System Components:")
                    for node in nodes[:5]:  # Show first 5 nodes
                        node_id = node.get('id', 'Unknown')
                        node_name = node.get('name', 'Unknown')
                        node_type = node.get('type', 'Unknown')
                        node_status = node.get('status', 'Unknown')
                        
                        print(f"   • {node_name} ({node_type}) - {node_status}")
                    
                    if len(nodes) > 5:
                        print(f"   ... and {len(nodes) - 5} more components")
                    print()
                
                if edges:
                    print("🔗 Key Relationships:")
                    for edge in edges[:3]:  # Show first 3 relationships
                        source = edge.get('source', 'Unknown')
                        target = edge.get('target', 'Unknown')
                        relationship = edge.get('relationship', 'Unknown')
                        
                        print(f"   • {source} → {target} ({relationship})")
                    
                    if len(edges) > 3:
                        print(f"   ... and {len(edges) - 3} more relationships")
            else:
                print("❌ Graph API returned unsuccessful response")
        else:
            print(f"❌ Graph API returned status code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot fetch system graph: {e}")

def demo_streamlit_features():
    """Demonstrate Streamlit dashboard features"""
    print("📊 Streamlit Dashboard Features")
    print("-" * 30)
    
    features = [
        "🖥️  Real-time System Monitoring with interactive gauges",
        "🗄️  Database Analytics with size distribution charts",
        "⚡ Cache Performance with hit/miss rate visualization",
        "🌐 API Analytics with status code distribution",
        "⏰ Cron Job Monitoring with execution statistics",
        "🚨 System Alerts with severity-based color coding",
        "🕸️  Architecture Visualization with component relationships",
        "🔄 Auto-refresh with configurable intervals",
        "📱 Responsive design for desktop and mobile",
        "🎨 Custom theme with professional styling"
    ]
    
    for feature in features:
        print(f"   {feature}")
    
    print()
    print("🎯 To experience these features:")
    print("   1. Start the dashboard server: cd ../ && python dashboard_server.py")
    print("   2. Start the Streamlit app: ./start_dashboard.sh")
    print("   3. Open your browser to: http://localhost:8501")

def main():
    """Main demo function"""
    print_banner()
    
    # Check if dashboard API is running
    try:
        response = requests.get("http://localhost:8005/api/dashboard/health", timeout=5)
        if response.status_code != 200:
            print("⚠️  Dashboard API is not running or not accessible")
            print("💡 Start the dashboard server first: cd ../ && python dashboard_server.py")
            print()
    except requests.exceptions.RequestException:
        print("⚠️  Dashboard API is not running or not accessible")
        print("💡 Start the dashboard server first: cd ../ && python dashboard_server.py")
        print()
    
    # Run demos
    demo_api_endpoints()
    demo_dashboard_data()
    demo_alerts()
    demo_graph()
    demo_streamlit_features()
    
    print("=" * 60)
    print("🎉 Demo completed!")
    print("=" * 60)

if __name__ == "__main__":
    main() 