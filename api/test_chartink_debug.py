#!/usr/bin/env python3
"""
ChartInk Debug Script
Test ChartInk connection and CSRF token extraction
"""

import asyncio
import httpx
import random
from bs4 import BeautifulSoup as bs

async def debug_chartink():
    """Debug ChartInk connection and CSRF token extraction"""
    
    base_url = "https://chartink.com"
    referer_url = f"{base_url}/screener"
    
    user_agents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]
    
    print("🧪 Testing ChartInk connection and CSRF extraction...")
    
    try:
        # Create session with enhanced headers
        session = httpx.AsyncClient(
            timeout=45.0,
            headers={
                'User-Agent': random.choice(user_agents),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            }
        )
        
        print(f"🌐 Making request to: {referer_url}")
        
        # Get the screener page
        response = await session.get(referer_url)
        
        print(f"📥 Response status: {response.status_code}")
        print(f"📊 Content length: {len(response.text)}")
        
        if response.status_code == 200:
            # Look for CSRF token patterns
            html_content = response.text
            
            # Try different CSRF token patterns
            patterns_to_check = [
                'name="csrf-token"',
                'name="_token"',
                '"csrf_token"',
                'csrf-token',
                '_token',
                'csrfToken',
                'CSRF_TOKEN'
            ]
            
            print("\n🔍 Searching for CSRF token patterns...")
            for pattern in patterns_to_check:
                count = html_content.count(pattern)
                if count > 0:
                    print(f"✅ Found '{pattern}': {count} occurrences")
                    
                    # Extract lines containing the pattern
                    lines = html_content.split('\n')
                    matching_lines = [line.strip() for line in lines if pattern in line]
                    for line in matching_lines[:3]:  # Show first 3 matches
                        print(f"   📝 {line}")
                else:
                    print(f"❌ Not found: '{pattern}'")
            
            # Parse with BeautifulSoup
            print("\n🔍 Parsing with BeautifulSoup...")
            soup = bs(html_content, 'html.parser')
            
            # Look for meta tags
            meta_tags = soup.find_all('meta')
            print(f"📋 Found {len(meta_tags)} meta tags")
            
            csrf_candidates = []
            for meta in meta_tags:
                name = meta.get('name', '').lower()
                if 'csrf' in name or 'token' in name:
                    content = meta.get('content', '')
                    csrf_candidates.append((name, content))
                    print(f"✅ Potential CSRF: name='{name}', content='{content[:20]}...'")
            
            # Look for input tags with CSRF
            input_tags = soup.find_all('input')
            for inp in input_tags:
                name = inp.get('name', '').lower()
                if 'csrf' in name or 'token' in name:
                    value = inp.get('value', '')
                    csrf_candidates.append((name, value))
                    print(f"✅ Input CSRF: name='{name}', value='{value[:20]}...'")
            
            # Look in script tags
            script_tags = soup.find_all('script')
            print(f"📋 Found {len(script_tags)} script tags")
            
            for script in script_tags[:5]:  # Check first 5 scripts
                script_text = script.get_text()
                if script_text and ('csrf' in script_text.lower() or 'token' in script_text.lower()):
                    print(f"✅ Script contains CSRF/token: {script_text[:100]}...")
            
            if not csrf_candidates:
                print("❌ No CSRF token found with any method")
                # Show first 500 chars of HTML for debugging
                print(f"\n📝 HTML Preview:\n{html_content[:500]}...")
            else:
                print(f"\n🎯 Found {len(csrf_candidates)} CSRF candidates")
                
        else:
            print(f"❌ Failed to get page: HTTP {response.status_code}")
            print(f"Response text: {response.text[:200]}...")
        
        await session.aclose()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(debug_chartink()) 