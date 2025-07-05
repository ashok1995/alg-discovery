import asyncio
import httpx
import random
from bs4 import BeautifulSoup as bs
import re

async def test_robust_chartink():
    """Test ChartInk CSRF token extraction with multiple methods."""
    
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
    ]
    
    timeout = httpx.Timeout(30.0, connect=10.0)
    
    for attempt, user_agent in enumerate(user_agents, 1):
        print(f"\n🔄 Attempt {attempt}: Testing with User-Agent: {user_agent[:50]}...")
        
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                # Method 1: Standard headers with compression support
                headers1 = {
                    'User-Agent': user_agent,
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Cache-Control': 'max-age=0'
                }
                
                print(f"  📡 Method 1: Standard headers with compression...")
                response = await client.get('https://chartink.com/screener', headers=headers1)
                csrf_token = await extract_csrf_token(response, "Method 1")
                
                if csrf_token:
                    await test_api_with_token(client, csrf_token, user_agent)
                    return csrf_token
                
                # Method 2: No compression
                await asyncio.sleep(2)
                headers2 = {
                    'User-Agent': user_agent,
                    'Accept': 'text/html',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'identity',  # No compression
                    'Connection': 'keep-alive',
                    'Cache-Control': 'no-cache'
                }
                
                print(f"  📡 Method 2: No compression...")
                response = await client.get('https://chartink.com/screener', headers=headers2)
                csrf_token = await extract_csrf_token(response, "Method 2")
                
                if csrf_token:
                    await test_api_with_token(client, csrf_token, user_agent)
                    return csrf_token
                
                # Method 3: Try different endpoint
                await asyncio.sleep(2)
                print(f"  📡 Method 3: Different endpoint...")
                response = await client.get('https://chartink.com/', headers=headers1)
                csrf_token = await extract_csrf_token(response, "Method 3")
                
                if csrf_token:
                    await test_api_with_token(client, csrf_token, user_agent)
                    return csrf_token
                    
        except Exception as e:
            print(f"  ❌ Error with attempt {attempt}: {e}")
            continue
    
    print(f"\n❌ All attempts failed to get CSRF token")
    return None

async def extract_csrf_token(response, method_name):
    """Extract CSRF token from response using multiple methods."""
    try:
        print(f"    📊 {method_name} - Status: {response.status_code}, Content-Length: {len(response.content)}")
        
        if response.status_code != 200:
            print(f"    ❌ {method_name} - Bad status code")
            return None
        
        html_content = response.text
        print(f"    📊 {method_name} - HTML length: {len(html_content)}")
        
        # Check if content looks valid
        if len(html_content) < 1000:
            print(f"    ⚠️ {method_name} - Content too short")
            return None
            
        if not html_content.strip().startswith('<'):
            print(f"    ⚠️ {method_name} - Content doesn't look like HTML")
            print(f"    📊 {method_name} - Content preview: {html_content[:100]}")
            return None
        
        # Parse HTML
        soup = bs(html_content, 'html.parser')
        print(f"    📊 {method_name} - Parsed HTML: {len(soup.find_all())} tags total")
        
        # Try multiple CSRF extraction methods
        csrf_token = None
        
        # Method A: Standard meta tag
        csrf_meta = soup.find('meta', {'name': 'csrf-token'})
        if csrf_meta and csrf_meta.get('content'):
            csrf_token = csrf_meta['content']
            print(f"    ✅ {method_name} - CSRF token found via meta tag: {csrf_token[:16]}...")
            return csrf_token
        
        # Method B: Alternative meta tag names
        for meta_name in ['_token', 'csrfmiddlewaretoken', 'authenticity_token']:
            csrf_meta = soup.find('meta', {'name': meta_name})
            if csrf_meta and csrf_meta.get('content'):
                csrf_token = csrf_meta['content']
                print(f"    ✅ {method_name} - CSRF token found via {meta_name}: {csrf_token[:16]}...")
                return csrf_token
        
        # Method C: Hidden input fields
        for input_name in ['_token', 'csrf_token', 'authenticity_token']:
            csrf_input = soup.find('input', {'name': input_name})
            if csrf_input and csrf_input.get('value'):
                csrf_token = csrf_input['value']
                print(f"    ✅ {method_name} - CSRF token found via input {input_name}: {csrf_token[:16]}...")
                return csrf_token
        
        # Method D: Search in script tags
        script_tags = soup.find_all('script')
        print(f"    📊 {method_name} - Found {len(script_tags)} script tags")
        
        for i, script in enumerate(script_tags):
            script_text = script.get_text()
            if script_text and len(script_text) > 50:
                patterns = [
                    r'csrf["\']?\s*[:=]\s*["\']([a-zA-Z0-9\-_]{20,})["\']',
                    r'_token["\']?\s*[:=]\s*["\']([a-zA-Z0-9\-_]{20,})["\']',
                    r'window\.csrf\s*=\s*["\']([a-zA-Z0-9\-_]{20,})["\']',
                    r'Laravel\.csrf\s*=\s*["\']([a-zA-Z0-9\-_]{20,})["\']'
                ]
                for pattern in patterns:
                    match = re.search(pattern, script_text, re.IGNORECASE)
                    if match:
                        csrf_token = match.group(1)
                        print(f"    ✅ {method_name} - CSRF token found in script {i}: {csrf_token[:16]}...")
                        return csrf_token
        
        print(f"    ❌ {method_name} - No CSRF token found")
        print(f"    📊 {method_name} - Meta tags: {len(soup.find_all('meta'))}")
        print(f"    📊 {method_name} - Input tags: {len(soup.find_all('input'))}")
        
        return None
        
    except Exception as e:
        print(f"    ❌ {method_name} - Error extracting CSRF: {e}")
        return None

async def test_api_with_token(client, csrf_token, user_agent):
    """Test the ChartInk API with the obtained CSRF token."""
    try:
        print(f"  🧪 Testing API with CSRF token...")
        
        headers = {
            'User-Agent': user_agent,
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.5',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'X-CSRF-TOKEN': csrf_token,
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': 'https://chartink.com',
            'Referer': 'https://chartink.com/screener',
            'Connection': 'keep-alive'
        }
        
        data = {
            'scan_clause': '( {33489} ( latest close > 100 and latest volume > 10000 ) )',
            'csrf_token': csrf_token
        }
        
        response = await client.post(
            'https://chartink.com/screener/process',
            headers=headers,
            data=data
        )
        
        print(f"  📊 API Response: Status {response.status_code}, Length: {len(response.content)}")
        
        if response.status_code == 200:
            try:
                json_data = response.json()
                if 'data' in json_data:
                    print(f"  ✅ API SUCCESS! Found {len(json_data['data'])} stocks")
                    return True
                else:
                    print(f"  ⚠️ API returned data but no 'data' key: {list(json_data.keys())}")
            except:
                print(f"  ⚠️ API returned non-JSON data: {response.text[:100]}")
        elif response.status_code == 419:
            print(f"  ❌ API returned 419 - CSRF token invalid or expired")
        else:
            print(f"  ❌ API returned {response.status_code}: {response.text[:100]}")
            
        return False
        
    except Exception as e:
        print(f"  ❌ Error testing API: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing robust ChartInk CSRF token extraction...")
    result = asyncio.run(test_robust_chartink())
    
    if result:
        print(f"\n✅ SUCCESS! CSRF token obtained: {result[:16]}...")
    else:
        print(f"\n❌ FAILED to obtain CSRF token") 