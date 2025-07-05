#!/usr/bin/env python3
"""
Test Script for Streamlit Dashboard
===================================

This script tests the Streamlit dashboard functionality
by simulating API responses and checking dashboard features.
"""

import requests
import json
import time
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def test_dashboard_api_connection():
    """Test connection to dashboard API"""
    print("🔍 Testing Dashboard API connection...")
    
    try:
        response = requests.get("http://localhost:8005/api/dashboard/health", timeout=5)
        if response.status_code == 200:
            print("✅ Dashboard API is running and accessible")
            return True
        else:
            print(f"❌ Dashboard API returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to Dashboard API: {e}")
        return False

def test_dashboard_endpoints():
    """Test all dashboard endpoints"""
    print("\n🔍 Testing Dashboard API endpoints...")
    
    endpoints = [
        "/",
        "/health", 
        "/alerts",
        "/graph"
    ]
    
    base_url = "http://localhost:8005/api/dashboard"
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ {endpoint}: {response.status_code} - {data.get('message', 'OK')}")
            else:
                print(f"❌ {endpoint}: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ {endpoint}: Connection error - {e}")

def test_streamlit_dependencies():
    """Test if Streamlit dependencies are available"""
    print("\n🔍 Testing Streamlit dependencies...")
    
    required_packages = [
        "streamlit",
        "requests", 
        "pandas",
        "plotly",
        "altair"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}: Available")
        except ImportError:
            print(f"❌ {package}: Missing")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n⚠️  Missing packages: {', '.join(missing_packages)}")
        print("💡 Install missing packages with: pip install -r requirements.txt")
        return False
    else:
        print("✅ All required packages are available")
        return True

def test_dashboard_data_structure():
    """Test dashboard data structure"""
    print("\n🔍 Testing dashboard data structure...")
    
    try:
        response = requests.get("http://localhost:8005/api/dashboard/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            if data.get("success"):
                dashboard_data = data.get("data", {})
                
                # Check required sections
                required_sections = ["system", "database", "cache", "api", "cron"]
                missing_sections = []
                
                for section in required_sections:
                    if section in dashboard_data:
                        print(f"✅ {section}: Available")
                    else:
                        print(f"❌ {section}: Missing")
                        missing_sections.append(section)
                
                if missing_sections:
                    print(f"\n⚠️  Missing data sections: {', '.join(missing_sections)}")
                    return False
                else:
                    print("✅ All required data sections are available")
                    return True
            else:
                print("❌ Dashboard API returned unsuccessful response")
                return False
        else:
            print(f"❌ Dashboard API returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot test data structure: {e}")
        return False

def test_streamlit_app():
    """Test Streamlit app functionality"""
    print("\n🔍 Testing Streamlit app...")
    
    # Check if app file exists
    app_file = "streamlit_app.py"
    if os.path.exists(app_file):
        print(f"✅ {app_file}: Found")
        
        # Check if app can be imported
        try:
            import streamlit_app
            print("✅ Streamlit app: Can be imported")
            return True
        except ImportError as e:
            print(f"❌ Streamlit app: Import error - {e}")
            return False
    else:
        print(f"❌ {app_file}: Not found")
        return False

def main():
    """Main test function"""
    print("🧪 AlgoDiscovery Streamlit Dashboard Test Suite")
    print("=" * 50)
    
    # Test results
    tests = {
        "API Connection": test_dashboard_api_connection(),
        "API Endpoints": test_dashboard_endpoints(),
        "Dependencies": test_streamlit_dependencies(),
        "Data Structure": test_dashboard_data_structure(),
        "Streamlit App": test_streamlit_app()
    }
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary")
    print("=" * 50)
    
    passed = 0
    total = len(tests)
    
    for test_name, result in tests.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Dashboard is ready to use.")
        print("\n🚀 To start the dashboard:")
        print("   ./start_dashboard.sh")
    else:
        print("⚠️  Some tests failed. Please check the issues above.")
        print("\n💡 Common solutions:")
        print("   1. Start the dashboard server: cd ../ && python dashboard_server.py")
        print("   2. Install dependencies: pip install -r requirements.txt")
        print("   3. Check if all required services are running")

if __name__ == "__main__":
    main() 