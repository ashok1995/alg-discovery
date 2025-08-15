import { useState, useEffect, useCallback, useRef } from 'react';
import DataCacheManager from '../services/DataCacheManager';

interface UseBackgroundRefreshOptions {
  autoRefreshInterval?: number;
  timeout?: number;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
  strategy?: string;
  enableCaching?: boolean;
  cacheDuration?: number;
  initialAutoRefresh?: boolean; // new: start auto refresh enabled
}

interface UseBackgroundRefreshReturn {
  loading: boolean;
  error: string | null;
  backgroundRefreshQueue: boolean;
  lastRefreshTime: Date | null;
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  fetchData: (forceRefresh?: boolean) => Promise<void>;
  handleVariantsChange: (variants: Record<string, string>) => void;
  cacheStats: any;
}

export const useBackgroundRefresh = (
  fetchFunction: (forceRefresh?: boolean) => Promise<void>,
  options: UseBackgroundRefreshOptions = {}
): UseBackgroundRefreshReturn => {
  const {
    autoRefreshInterval = 30000,
    timeout = 15000,
    onError,
    maxRetries = 2,
    retryDelay = 2000,
    strategy = 'unknown',
    enableCaching = true,
    initialAutoRefresh = false,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backgroundRefreshQueue, setBackgroundRefreshQueue] = useState<boolean>(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(initialAutoRefresh);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const isMounted = useRef(true);
  const cacheManager = DataCacheManager.getInstance();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const lastFetchTime = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 30000; // 30 seconds minimum between fetches

  const fetchData = useCallback(async (forceRefresh: boolean = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;

    // Log request attempt
    console.log(`🔍 [${new Date().toISOString()}] Background refresh request:`, {
      strategy,
      forceRefresh,
      loading,
      timeSinceLastFetch: `${timeSinceLastFetch/1000}s`,
      autoRefreshEnabled: autoRefresh,
      cacheEnabled: enableCaching,
      selectedVariants
    });

    // Cache check is now handled in the fetchFunction itself
    // This allows the fetchFunction to decide whether to use cache or make API call

    if (loading && !forceRefresh) {
      console.log('⏱️ [Background] Skipping fetch - already loading');
      return;
    }

    if (!isMounted.current) return;
    
    // Rate limit non-forced fetches
    if (!forceRefresh && timeSinceLastFetch < MIN_FETCH_INTERVAL) {
      console.log(`⏱️ [Background] Skipping fetch - too soon (${timeSinceLastFetch/1000}s < ${MIN_FETCH_INTERVAL/1000}s)`);
      return;
    }
    
    // If force refresh and already loading, queue it
    if (loading && forceRefresh) {
      console.log('🔄 [Background] Queueing force refresh');
      setBackgroundRefreshQueue(true);
      return;
    }

    setLoading(true);
    setError(null);
    lastFetchTime.current = now;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timed out')), timeout);
        });

        await Promise.race([fetchFunction(forceRefresh), timeoutPromise]);

        if (isMounted.current) {
          setLastRefreshTime(new Date());
          setError(null);
          
          // Reset refresh timer on successful fetch
          if (enableCaching) {
            cacheManager.resetRefreshTimer(strategy);
          }
        }
        break; // Success, exit retry loop
      } catch (err: any) {
        console.error(`Data fetch attempt ${attempt + 1} failed:`, err);
        if (attempt < maxRetries) {
          await new Promise(res => setTimeout(res, retryDelay * (attempt + 1)));
        } else {
          if (isMounted.current) {
            const errorMessage = err.message || `Failed after ${maxRetries + 1} attempts.`;
            setError(errorMessage);
            if (onError) {
              onError(err);
            }
          }
        }
      }
    }

    if (isMounted.current) {
      setLoading(false);
    }
  }, [loading, fetchFunction, timeout, onError, maxRetries, retryDelay, strategy, selectedVariants, enableCaching, cacheManager, autoRefresh]);

  // Background refresh queue management
  useEffect(() => {
    if (backgroundRefreshQueue && !loading) {
      setBackgroundRefreshQueue(false);
      fetchData(true);
    }
  }, [backgroundRefreshQueue, loading, fetchData]);

  // Auto refresh management
  useEffect(() => {
    if (autoRefresh && autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        if (!loading) {
          fetchData();
        }
      }, autoRefreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, loading, autoRefreshInterval, fetchData]);

  const handleVariantsChange = useCallback((variants: Record<string, string>) => {
    console.log('Variants changed:', variants);
    setSelectedVariants(variants);
    
    // Clear old cache and queue background refresh with new variants - non-blocking
    if (enableCaching) {
      cacheManager.clearCache(strategy, selectedVariants);
    }
    
    if (loading) {
      setBackgroundRefreshQueue(true);
    } else {
      setTimeout(() => {
        fetchData(true);
      }, 100); // Small delay to ensure UI updates first
    }
  }, [loading, fetchData, enableCaching, cacheManager, strategy, selectedVariants]);

  // Initialize refresh timer on mount
  useEffect(() => {
    if (enableCaching) {
      cacheManager.setRefreshTimer(strategy, autoRefreshInterval);
    }
    
    return () => {
      if (enableCaching) {
        cacheManager.stopRefreshTimer(strategy);
      }
    };
  }, [strategy, autoRefreshInterval, enableCaching, cacheManager]);

  return {
    loading,
    error,
    backgroundRefreshQueue,
    lastRefreshTime,
    autoRefresh,
    setAutoRefresh,
    fetchData,
    handleVariantsChange,
    cacheStats: cacheManager.getCacheStats(),
  };
}; 