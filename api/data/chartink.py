"""
ChartInk data fetcher with enhanced logging and proper session management
"""

import requests
from bs4 import BeautifulSoup as bs
import pandas as pd
import time
import json
from datetime import datetime
from config.settings import CHARTINK_URL, CHARTINK_REFERER
from utils.logger import get_logger
from config.queries import SWING_QUERIES

logger = get_logger(__name__)

# Track API calls to avoid rate limiting
LAST_API_CALL = None
MIN_CALL_INTERVAL = 2  # seconds

# Cache for recent query results to avoid duplicate calls
QUERY_CACHE = {}
CACHE_EXPIRY = 30  # seconds (5 minutes)

# Track connectivity status
CONNECTIVITY_STATUS = {
    "last_check": 0,
    "status": False,
    "check_interval": 300  # 5 minutes
}

def check_chartink_connectivity():
    """
    Check ChartInk connectivity by verifying we can access the site
    
    Returns:
        bool: True if connection successful, False otherwise
    """
    global CONNECTIVITY_STATUS
    
    current_time = time.time()
    time_since_last_check = current_time - CONNECTIVITY_STATUS["last_check"]
    
    # If we checked recently, return cached status
    if time_since_last_check < CONNECTIVITY_STATUS["check_interval"]:
        logger.debug(f"Using cached connectivity status (age: {time_since_last_check:.1f}s)")
        return CONNECTIVITY_STATUS["status"]
    
    logger.info("Checking ChartInk connectivity")
    
    try:
        # Just check if we can access the site and get a 200 response
        with requests.Session() as session:
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
            })
            
            start_time = time.time()
            response = session.get(CHARTINK_REFERER)
            elapsed = time.time() - start_time
            
            status_code = response.status_code
            
            # Update connectivity status
            CONNECTIVITY_STATUS["last_check"] = current_time
            CONNECTIVITY_STATUS["status"] = (status_code == 200)
            
            if status_code == 200:
                logger.info(f"✅ ChartInk connectivity check SUCCESS: HTTP {status_code} in {elapsed:.2f}s")
                return True
            else:
                logger.error(f"❌ ChartInk connectivity check FAILED: HTTP {status_code} in {elapsed:.2f}s")
                return False
                
    except Exception as e:
        logger.error(f"❌ ChartInk connectivity check FAILED: {str(e)}")
        
        # Update connectivity status
        CONNECTIVITY_STATUS["last_check"] = current_time
        CONNECTIVITY_STATUS["status"] = False
        
        return False

def get_chartink_data(query):
    """
    Fetch stock data from ChartInk using the query
    
    Args:
        query: ChartInk query string
        
    Returns:
        DataFrame with stock data
    """
    try:
        data = {
            'scan_clause': query
        }

        with requests.Session() as s:
            r = s.get(CHARTINK_REFERER)
            soup = bs(r.content, 'html.parser')
            s.headers['X-CSRF-TOKEN'] = soup.select_one('[name=csrf-token]')['content']
            r = s.post(CHARTINK_URL, data=data).json()
            
            df = pd.DataFrame(r['data'])
            
            if df.empty:
                logger.warning(f"No data found for query: {query[:50]}...")
                return None
                
            return df
    except Exception as e:
        logger.error(f"Error fetching data from ChartInk: {e}")
        return None

def get_chartink_scans(query, debug=True, use_cache=True):
    """
    Fetch scan results from ChartInk with detailed logging and proper session handling
    
    Args:
        query: ChartInk query string
        debug: Enable detailed logging
        use_cache: Whether to use cached results if available
        
    Returns:
        DataFrame with scan results
    """
    global LAST_API_CALL, QUERY_CACHE
    
    # Check connectivity first
    if not check_chartink_connectivity():
        logger.error("ChartInk connectivity check failed, aborting scan")
        return pd.DataFrame()
    
    # Check cache first if enabled
    if use_cache and query in QUERY_CACHE:
        cache_entry = QUERY_CACHE[query]
        cache_age = time.time() - cache_entry['timestamp']
        
        if cache_age < CACHE_EXPIRY:
            logger.info(f"Using cached results for query (age: {cache_age:.1f}s)")
            return cache_entry['data'].copy()
        else:
            logger.info(f"Cache expired for query (age: {cache_age:.1f}s)")
    
    # Generate a unique request ID for tracking in logs
    request_id = int(datetime.now().timestamp() * 1000) % 100000
    
    logger.info(f"[CHARTINK-{request_id}] 🚀 Preparing ChartInk API request")
    
    # Check if we need to throttle API calls
    if LAST_API_CALL is not None:
        elapsed = time.time() - LAST_API_CALL
        if elapsed < MIN_CALL_INTERVAL:
            sleep_time = MIN_CALL_INTERVAL - elapsed
            logger.info(f"[CHARTINK-{request_id}] Rate limiting: Sleeping for {sleep_time:.2f}s")
            time.sleep(sleep_time)
    
    try:
        # Create a session for maintaining cookies and headers
        with requests.Session() as session:
            # Step 1: Get the CSRF token from the referer page
            logger.info(f"[CHARTINK-{request_id}] 🔑 Fetching CSRF token from {CHARTINK_REFERER}")
            
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml',
                'Accept-Language': 'en-US,en;q=0.9'
            })
            
            # Get the referer page to obtain CSRF token and cookies
            referer_response = session.get(CHARTINK_REFERER)
            
            if referer_response.status_code != 200:
                logger.error(f"[CHARTINK-{request_id}] ❌ Failed to access referer page: HTTP {referer_response.status_code}")
                return pd.DataFrame()
            
            # Parse the HTML to extract the CSRF token
            soup = bs(referer_response.text, 'html.parser')
            csrf_token = soup.select_one('meta[name="csrf-token"]')
            
            if not csrf_token or not csrf_token.get('content'):
                logger.error(f"[CHARTINK-{request_id}] ❌ CSRF token not found in referer page")
                if debug:
                    html_sample = referer_response.text[:200] + "..." if len(referer_response.text) > 200 else referer_response.text
                    logger.error(f"[CHARTINK-{request_id}] HTML sample: {html_sample}")
                return pd.DataFrame()
            
            csrf_token = csrf_token['content']
            logger.info(f"[CHARTINK-{request_id}] ✅ CSRF token obtained successfully")
            
            # Step 2: Prepare and send the API request with the CSRF token
            session.headers.update({
                'X-CSRF-TOKEN': csrf_token,
                'X-Requested-With': 'XMLHttpRequest',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Referer': CHARTINK_REFERER,
                'Origin': 'https://chartink.com'
            })
            
            # Log the request details
            logger.info(f"[CHARTINK-{request_id}] 📤 Sending request to {CHARTINK_URL}")
            if debug:
                query_log = query.replace('\n', ' ').strip()
                logger.info(f"[CHARTINK-{request_id}] Query: {query_log}")
            
            # Record the API call time
            LAST_API_CALL = time.time()
            start_time = time.time()
            
            # Make the request
            logger.info(f"[CHARTINK-{request_id}] ⏱️ API call started at {datetime.now().strftime('%H:%M:%S.%f')[:-3]}")
            
            # Prepare the payload
            payload = {'scan_clause': query}
            
            # Send the POST request
            response = session.post(CHARTINK_URL, data=payload)
            elapsed = time.time() - start_time
            
            # Log the response details
            logger.info(f"[CHARTINK-{request_id}] ⬇️ Received response in {elapsed:.2f}s with status code {response.status_code}")
            
            # Handle the response
            if response.status_code == 200:
                # Parse the response content
                try:
                    result = response.json()
                    if debug:
                        logger.info(f"[CHARTINK-{request_id}] Response type: {type(result).__name__}")
                        if isinstance(result, dict) and 'data' in result:
                            logger.info(f"[CHARTINK-{request_id}] Data entries: {len(result['data'])}")
                    
                    if 'data' in result:
                        df = pd.DataFrame(result['data'])
                        logger.info(f"[CHARTINK-{request_id}] ✅ SUCCESS: Parsed {len(df)} rows from ChartInk")
                        
                        if debug and not df.empty:
                            logger.info(f"[CHARTINK-{request_id}] Columns: {list(df.columns)}")
                            if 'nsecode' in df.columns and not df['nsecode'].empty:
                                logger.info(f"[CHARTINK-{request_id}] First few symbols: {', '.join(df['nsecode'].head(3).tolist())}")
                        
                        # Cache the results
                        if use_cache:
                            QUERY_CACHE[query] = {
                                'data': df.copy(),
                                'timestamp': time.time()
                            }
                        
                        return df
                    else:
                        logger.error(f"[CHARTINK-{request_id}] ❌ ERROR: 'data' key not found in response")
                        if debug:
                            logger.error(f"[CHARTINK-{request_id}] Response keys: {list(result.keys())}")
                        return pd.DataFrame()
                except Exception as e:
                    logger.error(f"[CHARTINK-{request_id}] ❌ ERROR parsing JSON: {str(e)}")
                    return pd.DataFrame()
            else:
                logger.error(f"[CHARTINK-{request_id}] ❌ ERROR: HTTP {response.status_code}")
                if debug:
                    # Log response text for debugging
                    text_sample = response.text[:200] + "..." if len(response.text) > 200 else response.text
                    logger.error(f"[CHARTINK-{request_id}] Response: {text_sample}")
                return pd.DataFrame()
    
    except Exception as e:
        logger.error(f"[CHARTINK-{request_id}] ❌ EXCEPTION: {str(e)}")
        if debug:
            logger.exception(f"[CHARTINK-{request_id}] Full exception:")
        return pd.DataFrame()

def get_stocks_with_fallback(queries_dict=None):
    """
    Get stock scan results from ChartInk API with fallback mechanisms
    
    Args:
        queries_dict (dict): Dictionary of queries to try, format {"query_name": "query_string"}
        
    Returns:
        tuple: (DataFrame of stocks, name of query used)
    """
    if queries_dict is None:
        queries_dict = SWING_QUERIES
    
    # Check connectivity first
    if not check_chartink_connectivity():
        logger.error("ChartInk connectivity check failed, aborting stock fetch")
        return pd.DataFrame(), "none"
    
    # Try each query in order until we get results
    for query_name, query_data in queries_dict.items():
        try:
            logger.info(f"Trying query: {query_name}")
            
            # Handle both old format (dict with 'query' key) and new format (direct string)
            if isinstance(query_data, dict) and "query" in query_data:
                query = query_data["query"]
            elif isinstance(query_data, str):
                query = query_data
            else:
                logger.warning(f"Invalid query format for {query_name}: {type(query_data)}")
                continue
            
            # Use the new function to fetch results
            df = get_chartink_scans(query)
            
            # If we got results, return them along with the query name
            if not df.empty:
                logger.info(f"Found {len(df)} stocks using {query_name}")
                
                # Ensure Buy column exists and is properly formatted
                if 'buy' not in df.columns:
                    df['buy'] = "Yes"
                    logger.info("Added default 'buy' column to results")
                
                # Add query name to the dataframe for reference
                df['query_used'] = query_name
                
                return df, query_name
        
        except Exception as e:
            logger.error(f"Error with query {query_name}: {str(e)}")
    
    # If all queries failed, return empty DataFrame
    logger.warning("All queries failed")
    return pd.DataFrame(), "none" 

"""
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
