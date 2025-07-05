"""
ChartInk data fetcher with enhanced logging and proper session management
"""

import requests
from bs4 import BeautifulSoup as bs
import pandas as pd
import time
import json
from datetime import datetime
from shared.config.settings import CHARTINK_URL, CHARTINK_REFERER
from utils.logger import get_logger
from config.queries import SWING_QUERIES

logger = get_logger(__name__, group="shared", service="data_chartink")

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