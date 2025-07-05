#!/usr/bin/env python3
"""
Test Script for Long-Term API Endpoints
Demonstrates how to integrate with Streamlit app
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8001"

def test_health_check():
    """Test the health check endpoint"""
    print("🏥 Testing Health Check...")
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Server Status: {data['status']}")
            print(f"📊 Algorithm Type: {data['algorithm_type']}")
            print(f"📈 Market Focus: {data['market_focus']}")
            print(f"⚙️ Config Loaded: {data['config_loaded']}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
        return False

def test_available_variants():
    """Test getting available query variants"""
    print("\n📚 Testing Available Variants...")
    try:
        response = requests.get(f"{BASE_URL}/api/longterm/available-variants")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Total Categories: {data['total_categories']}")
            print(f"🔢 Total Combinations: {data['total_combinations']}")
            
            print("\n📋 Available Variants:")
            for category, variants in data['variants'].items():
                print(f"\n🎯 {category.upper()}:")
                for version, info in variants.items():
                    print(f"   {version}: {info['name']} (weight: {info['weight']})")
            return data
        else:
            print(f"❌ Failed to get variants: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error getting variants: {e}")
        return None

def test_long_buy_recommendations(combination=None):
    """Test the main long buy recommendations endpoint"""
    print("\n🚀 Testing Long Buy Recommendations...")
    
    # Prepare request
    request_data = {
        "limit_per_query": 20,
        "min_score": 0.5,
        "top_recommendations": 5
    }
    
    if combination:
        request_data["combination"] = combination
        print(f"🔧 Using custom combination: {combination}")
    else:
        print("🎯 Using default combination")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/longterm/long-buy-recommendations",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Status: {data['status']}")
            print(f"🎯 Combination Used: {data['combination_used']}")
            print(f"📊 Total Recommendations: {data['total_recommendations']}")
            
            # Show performance metrics
            metrics = data.get('performance_metrics', {})
            print(f"\n📈 Performance Metrics:")
            print(f"   Unique Stocks: {metrics.get('unique_stocks', 'N/A')}")
            print(f"   Multi-Category Stocks: {metrics.get('multi_category_stocks', 'N/A')}")
            print(f"   Diversity Score: {metrics.get('diversity_score', 'N/A')}%")
            print(f"   Performance Score: {metrics.get('performance_score', 'N/A')}")
            
            # Show top recommendations
            recommendations = data.get('long_buy_recommendations', [])
            if recommendations:
                print(f"\n🏆 Top {len(recommendations)} Recommendations:")
                for i, stock in enumerate(recommendations):
                    categories = ', '.join(stock.get('categories', []))
                    print(f"   {i+1}. {stock['symbol']:12s} - Score: {stock['score']:5.2f} - Categories: {categories}")
                    print(f"      Price: ₹{stock.get('price', 'N/A'):>8s} - Appearances: {stock.get('appearances', 0)}x")
            
            return data
        else:
            print(f"❌ Failed to get recommendations: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error getting recommendations: {e}")
        return None

def test_custom_combination():
    """Test with a custom combination"""
    print("\n🧪 Testing Custom Combination...")
    
    # Test with experimental combination
    custom_combination = {
        "fundamental": "v2.0",
        "momentum": "v2.0", 
        "value": "v1.2",
        "quality": "v1.2"
    }
    
    request_data = {
        "fundamental_version": "v2.0",
        "momentum_version": "v2.0",
        "value_version": "v1.2",
        "quality_version": "v1.2",
        "limit_per_query": 15
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/longterm/test-combination",
            json=request_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Test Status: {data['status']}")
            
            results = data.get('test_results', {})
            metrics = results.get('metrics', {})
            print(f"📊 Test Results:")
            print(f"   Performance Score: {metrics.get('performance_score', 'N/A')}")
            print(f"   Unique Stocks: {metrics.get('unique_stocks', 'N/A')}")
            print(f"   Diversity Score: {metrics.get('diversity_score', 'N/A')}%")
            
            # Show category breakdown
            category_results = results.get('category_results', {})
            print(f"\n🎯 Category Breakdown:")
            for category, result in category_results.items():
                success = "✅" if result.get('query_success', False) else "❌"
                print(f"   {success} {category}: {result.get('stocks_found', 0)} stocks ({result.get('name', 'N/A')})")
            
            return data
        else:
            print(f"❌ Failed to test combination: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error testing combination: {e}")
        return None

def streamlit_integration_example():
    """Show how this would integrate with Streamlit"""
    print("\n🎨 Streamlit Integration Example:")
    print("""
# Streamlit App Integration Example

import streamlit as st
import requests

def get_long_buy_recommendations(combination=None, limit=10):
    '''Call the long buy API endpoint'''
    url = "http://localhost:8001/api/longterm/long-buy-recommendations"
    
    payload = {
        "limit_per_query": 30,
        "min_score": 0.6,
        "top_recommendations": limit
    }
    
    if combination:
        payload["combination"] = combination
    
    response = requests.post(url, json=payload)
    return response.json() if response.status_code == 200 else None

# Streamlit UI
st.title("📊 Long-Term Stock Recommendations")

# Sidebar for combination selection
st.sidebar.header("🎯 Strategy Selection")
fundamental = st.sidebar.selectbox("Fundamental", ["v1.0", "v1.1", "v2.0"])
momentum = st.sidebar.selectbox("Momentum", ["v1.0", "v1.1", "v2.0"])
value = st.sidebar.selectbox("Value", ["v1.0", "v1.1", "v1.2"])
quality = st.sidebar.selectbox("Quality", ["v1.0", "v1.1", "v1.2"])

combination = {
    "fundamental": fundamental,
    "momentum": momentum,
    "value": value,
    "quality": quality
}

if st.button("🚀 Get Recommendations"):
    with st.spinner("Analyzing market data..."):
        results = get_long_buy_recommendations(combination, limit=10)
        
        if results and results.get('status') == 'success':
            recommendations = results.get('long_buy_recommendations', [])
            
            # Display metrics
            metrics = results.get('performance_metrics', {})
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Unique Stocks", metrics.get('unique_stocks', 0))
            with col2:
                st.metric("Diversity Score", f"{metrics.get('diversity_score', 0):.1f}%")
            with col3:
                st.metric("Performance Score", f"{metrics.get('performance_score', 0):.1f}")
            
            # Display recommendations
            st.subheader("🏆 Top Recommendations")
            for i, stock in enumerate(recommendations):
                with st.expander(f"{i+1}. {stock['symbol']} - Score: {stock['score']:.2f}"):
                    col1, col2 = st.columns(2)
                    with col1:
                        st.write(f"**Price:** ₹{stock.get('price', 'N/A')}")
                        st.write(f"**Categories:** {', '.join(stock.get('categories', []))}")
                    with col2:
                        st.write(f"**Appearances:** {stock.get('appearances', 0)}x")
                        st.write(f"**Volume:** {stock.get('volume', 'N/A')}")
        else:
            st.error("Failed to get recommendations. Please try again.")
    """)

def main():
    """Run all tests"""
    print("🧪 Long-Term API Integration Tests")
    print("=" * 50)
    
    # Test health check first
    if not test_health_check():
        print("❌ Server not available. Please start the server first.")
        return
    
    # Test available variants
    variants = test_available_variants()
    
    # Test default recommendations
    test_long_buy_recommendations()
    
    # Test custom combination
    test_custom_combination()
    
    # Show Streamlit integration example
    streamlit_integration_example()
    
    print("\n✅ All tests completed!")
    print("\n🎯 Key API Endpoints for Streamlit:")
    print("   • GET  /health - Check server status")
    print("   • GET  /api/longterm/available-variants - Get all query variants")
    print("   • POST /api/longterm/long-buy-recommendations - Get buy recommendations")
    print("   • POST /api/longterm/test-combination - Test custom combinations")

if __name__ == "__main__":
    main() 