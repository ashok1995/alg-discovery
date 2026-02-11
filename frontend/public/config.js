// Runtime configuration for AlgoDiscovery frontend
// This file is loaded at runtime to determine API URLs

(function() {
  'use strict';
  
  // Get the current domain
  var currentDomain = window.location.origin;
  
  // API configuration
  window.ALGODISCOVERY_CONFIG = {
    // Base URLs - use current domain for production
    API_BASE_URL: currentDomain,
    RECOMMENDATION_API_BASE_URL: currentDomain,
    THEME_API_BASE_URL: currentDomain,
    STRATEGY_API_BASE_URL: currentDomain,
    DASHBOARD_API_BASE_URL: currentDomain,
    INTRADAY_API_BASE_URL: currentDomain,
    LONG_TERM_API_BASE_URL: currentDomain,
    SWING_API_BASE_URL: currentDomain,
    SHORT_TERM_API_BASE_URL: currentDomain,
    UNIFIED_STRATEGY_API_BASE_URL: currentDomain,
    VARIANTS_API_BASE_URL: currentDomain,
    VALIDATION_API_BASE_URL: currentDomain,
    MISC_API_BASE_URL: currentDomain,
    FACTS_API_BASE_URL: currentDomain,
    CANDIDATE_QUERY_REGISTRY_API_BASE_URL: currentDomain,
    STOCK_CANDIDATE_POPULATOR_API_BASE_URL: currentDomain,
    STOCK_MAPPING_API_BASE_URL: currentDomain,
    ZERODHA_API_BASE_URL: currentDomain,
    ZERODHA_TEST_API_BASE_URL: currentDomain,
    CONTAINER_CONFIG_API_BASE_URL: currentDomain,
    
    // Environment info
    ENVIRONMENT: 'production',
    DOMAIN: currentDomain,
    IS_PRODUCTION: currentDomain !== 'http://localhost:3000'
  };
  
  console.log('AlgoDiscovery runtime config loaded:', window.ALGODISCOVERY_CONFIG);
})();
