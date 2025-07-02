#!/usr/bin/env python3
"""
Fix for ChartInk HTTP 419 Error
This script addresses the "Authentication Timeout" or "Session Expired" issues
"""

import os
import sys
import time
import random
import logging
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_enhanced_chartink_client():
    """
    Create enhanced ChartInk client with better session handling
    """
    
    enhanced_client_code = '''"""
Enhanced ChartInk Client with HTTP 419 Error Fix
This module provides better session handling and anti-bot measures
"""

import requests
import time
import random
import logging
from bs4 import BeautifulSoup as bs
import pandas as pd
from datetime import datetime
import urllib.parse

logger = logging.getLogger(__name__)

class EnhancedChartinkClient:
    """Enhanced ChartInk client with HTTP 419 error fixes"""
    
    def __init__(self):
        self.base_url = "https://chartink.com"
        self.screener_url = f"{self.base_url}/screener/process"
        self.referer_url = f"{self.base_url}/screener"
        
        # Session management
        self.session = None
        self.csrf_token = None
        self.last_request_time = 0
        self.min_request_interval = 3.0  # Increased to 3 seconds
        
        # User agents for rotation
        self.user_agents = [
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
        ]
        
        self._initialize_session()
    
    def _initialize_session(self):
        """Initialize a new session with proper headers"""
        if self.session:
            self.session.close()
        
        self.session = requests.Session()
        
        # Set comprehensive headers
        self.session.headers.update({
            'User-Agent': random.choice(self.user_agents),
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
        })
        
        logger.info("✅ Initialized new session with enhanced headers")
    
    def _get_csrf_token(self):
        """Get fresh CSRF token from ChartInk"""
        try:
            logger.info("🔑 Fetching fresh CSRF token...")
            
            # Add small delay before CSRF request
            time.sleep(random.uniform(1.0, 2.0))
            
            # Get the main screener page
            response = self.session.get(self.referer_url, timeout=30)
            
            if response.status_code != 200:
                logger.error(f"❌ Failed to get CSRF token page: HTTP {response.status_code}")
                return False
            
            # Parse HTML to find CSRF token
            soup = bs(response.text, 'html.parser')
            csrf_meta = soup.find('meta', {'name': 'csrf-token'})
            
            if not csrf_meta or not csrf_meta.get('content'):
                logger.error("❌ CSRF token not found in page")
                return False
            
            self.csrf_token = csrf_meta['content']
            logger.info(f"✅ CSRF token obtained: {self.csrf_token[:16]}...")
            
            # Update session headers with CSRF token
            self.session.headers.update({
                'X-CSRF-TOKEN': self.csrf_token,
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': self.referer_url,
                'Origin': self.base_url
            })
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error getting CSRF token: {e}")
            return False
    
    def _rate_limit(self):
        """Implement rate limiting"""
        current_time = time.time()
        elapsed = current_time - self.last_request_time
        
        if elapsed < self.min_request_interval:
            sleep_time = self.min_request_interval - elapsed + random.uniform(0.5, 1.5)
            logger.info(f"⏱️ Rate limiting: sleeping for {sleep_time:.2f}s")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def scan_stocks(self, query, max_retries=3):
        """
        Scan stocks using ChartInk with enhanced error handling
        
        Args:
            query (str): ChartInk query string
            max_retries (int): Maximum retry attempts
            
        Returns:
            pd.DataFrame: Stock scan results
        """
        for attempt in range(max_retries):
            try:
                logger.info(f"🔍 Scan attempt {attempt + 1}/{max_retries}")
                
                # Rate limiting
                self._rate_limit()
                
                # Initialize fresh session for each attempt if needed
                if attempt > 0:
                    logger.info("🔄 Reinitializing session for retry...")
                    self._initialize_session()
                    time.sleep(random.uniform(2.0, 4.0))
                
                # Get fresh CSRF token
                if not self._get_csrf_token():
                    logger.warning(f"⚠️ Failed to get CSRF token on attempt {attempt + 1}")
                    continue
                
                # Prepare request data
                data = {
                    'scan_clause': query
                }
                
                # Additional headers for this specific request
                request_headers = {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                }
                
                logger.info(f"📤 Sending POST request to ChartInk...")
                logger.info(f"📊 Query length: {len(query)} characters")
                
                # Make the request
                response = self.session.post(
                    self.screener_url,
                    data=data,
                    headers=request_headers,
                    timeout=45
                )
                
                logger.info(f"📥 Response: HTTP {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        result = response.json()
                        
                        if 'data' in result:
                            df = pd.DataFrame(result['data'])
                            logger.info(f"✅ SUCCESS: Retrieved {len(df)} stocks")
                            return df
                        else:
                            logger.warning("⚠️ No 'data' key in response")
                            logger.info(f"Response keys: {list(result.keys())}")
                            return pd.DataFrame()
                            
                    except Exception as json_error:
                        logger.error(f"❌ JSON parsing error: {json_error}")
                        logger.info(f"Response content preview: {response.text[:200]}...")
                        return pd.DataFrame()
                
                elif response.status_code == 419:
                    logger.warning(f"⚠️ HTTP 419 on attempt {attempt + 1} - Session expired")
                    # Force session refresh on next attempt
                    self.session = None
                    time.sleep(random.uniform(3.0, 6.0))
                    continue
                
                elif response.status_code == 429:
                    wait_time = random.uniform(5.0, 10.0)
                    logger.warning(f"⚠️ HTTP 429 - Rate limited. Waiting {wait_time:.1f}s")
                    time.sleep(wait_time)
                    continue
                
                else:
                    logger.error(f"❌ HTTP {response.status_code}: {response.text[:200]}...")
                    time.sleep(random.uniform(2.0, 4.0))
                    continue
                    
            except requests.exceptions.Timeout:
                logger.warning(f"⚠️ Request timeout on attempt {attempt + 1}")
                time.sleep(random.uniform(3.0, 5.0))
                continue
                
            except requests.exceptions.ConnectionError:
                logger.warning(f"⚠️ Connection error on attempt {attempt + 1}")
                time.sleep(random.uniform(5.0, 8.0))
                continue
                
            except Exception as e:
                logger.error(f"❌ Unexpected error on attempt {attempt + 1}: {e}")
                time.sleep(random.uniform(2.0, 4.0))
                continue
        
        logger.error(f"❌ All {max_retries} attempts failed")
        return pd.DataFrame()
    
    def test_connection(self):
        """Test connection to ChartInk"""
        try:
            logger.info("🧪 Testing ChartInk connection...")
            
            # Simple test query
            test_query = "( {cash} ( latest close > 100 ) )"
            df = self.scan_stocks(test_query)
            
            if not df.empty:
                logger.info(f"✅ Connection test successful - {len(df)} results")
                return True
            else:
                logger.warning("⚠️ Connection test returned no results")
                return False
                
        except Exception as e:
            logger.error(f"❌ Connection test failed: {e}")
            return False
    
    def close(self):
        """Close the session"""
        if self.session:
            self.session.close()
            logger.info("🔐 Session closed")

# Global instance
chartink_client = None

def get_chartink_client():
    """Get or create the global ChartInk client"""
    global chartink_client
    
    if chartink_client is None:
        chartink_client = EnhancedChartinkClient()
    
    return chartink_client

def enhanced_get_chartink_scans(query, debug=True, use_cache=True):
    """
    Enhanced version of get_chartink_scans with HTTP 419 fix
    
    Args:
        query (str): ChartInk query string
        debug (bool): Enable debug logging
        use_cache (bool): Use caching (placeholder for future implementation)
        
    Returns:
        pd.DataFrame: Stock scan results
    """
    client = get_chartink_client()
    return client.scan_stocks(query)

def enhanced_check_chartink_connectivity():
    """
    Enhanced connectivity check
    
    Returns:
        bool: True if ChartInk is accessible
    """
    client = get_chartink_client()
    return client.test_connection()
'''
    
    return enhanced_client_code

def backup_original_file(file_path):
    """Create a backup of the original file"""
    backup_path = f"{file_path}.backup"
    if os.path.exists(file_path) and not os.path.exists(backup_path):
        import shutil
        shutil.copy2(file_path, backup_path)
        logger.info(f"✅ Backup created: {backup_path}")

def update_chartink_module():
    """Update the ChartInk module with enhanced client"""
    
    chartink_file = Path("api/data/chartink.py")
    
    if not chartink_file.exists():
        logger.error(f"❌ ChartInk file not found: {chartink_file}")
        return False
    
    # Create backup
    backup_original_file(str(chartink_file))
    
    # Read current file
    with open(chartink_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Create enhanced client code
    enhanced_code = create_enhanced_chartink_client()
    
    # Add enhanced client to the existing file
    updated_content = content + "\n\n" + enhanced_code
    
    # Write updated file
    with open(chartink_file, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    logger.info(f"✅ Updated {chartink_file} with enhanced client")
    return True

def create_chartink_fix_patch():
    """Create a patch file for the ChartInk services"""
    
    patch_content = '''"""
ChartInk Service Patch for HTTP 419 Error Fix
Apply this patch to services that use ChartInk
"""

import logging
logger = logging.getLogger(__name__)

# Import the enhanced client
try:
    from api.data.chartink import enhanced_get_chartink_scans, enhanced_check_chartink_connectivity
    
    # Replace the original functions
    import api.data.chartink as chartink_module
    chartink_module.get_chartink_scans = enhanced_get_chartink_scans
    chartink_module.check_chartink_connectivity = enhanced_check_chartink_connectivity
    
    logger.info("✅ ChartInk service patched with HTTP 419 fix")
    
except ImportError as e:
    logger.warning(f"⚠️ Could not apply ChartInk patch: {e}")
'''
    
    patch_file = Path("api/chartink_patch.py")
    with open(patch_file, 'w', encoding='utf-8') as f:
        f.write(patch_content)
    
    logger.info(f"✅ Created patch file: {patch_file}")
    return str(patch_file)

def main():
    """Main function to apply the ChartInk fix"""
    
    logger.info("🔧 Starting ChartInk HTTP 419 Error Fix...")
    
    # Update the ChartInk module
    if update_chartink_module():
        logger.info("✅ ChartInk module updated successfully")
    else:
        logger.error("❌ Failed to update ChartInk module")
        return False
    
    # Create patch file
    patch_file = create_chartink_fix_patch()
    logger.info(f"✅ Patch file created: {patch_file}")
    
    logger.info("🎉 ChartInk HTTP 419 fix applied successfully!")
    logger.info("📋 Next steps:")
    logger.info("   1. Restart the swing server: ./manage_servers.sh restart swing")
    logger.info("   2. Test the API: ./test_endpoints.sh")
    logger.info("   3. Monitor logs: tail -f api/logs/swing.log")
    
    return True

if __name__ == "__main__":
    main() 