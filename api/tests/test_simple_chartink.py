#!/usr/bin/env python3
"""
Simple ChartInk Test
Test ChartInk API without CSRF token to see if it works
"""

import asyncio
import httpx
import random

async def test_simple_chartink():
    """Test ChartInk API without CSRF token"""
    
    screener_url = "https://chartink.com/screener/process"
    
    user_agents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]
    
    print("🧪 Testing ChartInk API without CSRF token...")
    
    try:
        # Create session with basic headers
        session = httpx.AsyncClient(
            timeout=45.0,
            headers={
                'User-Agent': random.choice(user_agents),
                'Accept': 'application/json, text/javascript, */*; q=0.01',
                'Accept-Language': 'en-US,en;q=0.9',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Referer': 'https://chartink.com/screener',
                'Origin': 'https://chartink.com'
            }
        )
        
        # Simple test query
        test_query = "( {cash} ( latest close > 100 and latest volume > 10000 ) )"
        
        data = {
            'scan_clause': test_query
        }
        
        print(f"🌐 Making POST request to: {screener_url}")
        print(f"📊 Query: {test_query}")
        
        # Make the request
        response = await session.post(screener_url, data=data)
        
        print(f"📥 Response status: {response.status_code}")
        print(f"📊 Content length: {len(response.text)}")
        
        if response.status_code == 200:
            try:
                result = response.json()
                print("✅ Successfully parsed JSON response")
                print(f"📋 Response keys: {list(result.keys())}")
                
                if 'data' in result:
                    stocks = result['data']
                    print(f"🎯 Found {len(stocks)} stocks")
                    if stocks:
                        print(f"📈 First stock: {stocks[0]}")
                    else:
                        print("📊 No stocks returned (empty data array)")
                else:
                    print("❌ No 'data' key in response")
                    print(f"Response: {result}")
                    
            except Exception as json_error:
                print(f"❌ JSON parsing error: {json_error}")
                print(f"Response text: {response.text[:300]}...")
                
        elif response.status_code == 419:
            print("❌ HTTP 419 - CSRF token required")
            
        elif response.status_code == 403:
            print("❌ HTTP 403 - Forbidden (likely needs CSRF token)")
            
        else:
            print(f"❌ HTTP {response.status_code}")
            print(f"Response text: {response.text[:300]}...")
        
        await session.aclose()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_simple_chartink()) 