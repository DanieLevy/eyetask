import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithCache, cache, invalidateCache } from '@/lib/cache';
import { logger } from '@/lib/logger';

// Performance tracking utilities
const performanceTracker = {
  startTime: (key: string) => {
    if (typeof window !== 'undefined') {
      console.log(`🚀 [PERF-START] ${key} - ${new Date().toISOString()}`);
      window.performance?.mark(`${key}-start`);
    }
  },
  endTime: (key: string) => {
    if (typeof window !== 'undefined') {
      try {
        window.performance?.mark(`${key}-end`);
        window.performance?.measure(`${key}-duration`, `${key}-start`, `${key}-end`);
        const measure = window.performance?.getEntriesByName(`${key}-duration`)[0];
        if (measure) {
          console.log(`⏱️ [PERF-END] ${key} - Duration: ${Math.round(measure.duration)}ms`);
        }
      } catch (e) {
        console.log(`⏱️ [PERF-END] ${key} - Duration tracking failed`);
      }
    }
  },
  log: (key: string, message: string, data?: any) => {
    console.log(`📊 [PERF-LOG] ${key}: ${message}`, data || '');
  }
};

interface UseOptimizedDataOptions {
  cacheKey?: string;
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnMount?: boolean;
  refetchOnWindowFocus?: boolean;
  backgroundRefetch?: boolean;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

interface UseOptimizedDataResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
  lastFetch: number | null;
}

export function useOptimizedData<T>(
  url: string,
  options: UseOptimizedDataOptions = {}
): UseOptimizedDataResult<T> {
  const {
    cacheKey = url, // Use URL as default cache key
    enabled = true,
    staleTime = 2 * 60 * 1000, // 2 minutes
    cacheTime = 5 * 60 * 1000, // 5 minutes
    refetchOnMount = true,
    refetchOnWindowFocus = false,
    backgroundRefetch = true,
    onSuccess,
    onError
  } = options;

  // Add performance tracking ID
  const hookId = useRef(`hook-${Math.random().toString(36).substr(2, 9)}`);
  const renderCount = useRef(0);
  
  // Track hook initialization
  useEffect(() => {
    console.log(`🔄 [HOOK-INIT] ${hookId.current} initialized for URL: ${url}`);
    console.log(`⚙️ [HOOK-CONFIG] ${hookId.current}:`, {
      cacheKey,
      enabled,
      staleTime: `${staleTime/1000}s`,
      cacheTime: `${cacheTime/1000}s`,
      refetchOnMount,
      refetchOnWindowFocus,
      backgroundRefetch
    });
  }, []);

  // Track renders
  renderCount.current++;
  if (renderCount.current > 1) {
    console.log(`🔄 [HOOK-RENDER] ${hookId.current} - Render #${renderCount.current}`);
  }

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchInProgress = useRef(false);
  const mountTime = useRef(Date.now());
  const lastFetchTime = useRef(0);
  const requestDedupeKey = useRef('');
  const fetchCallCount = useRef(0);

  const fetchData = useCallback(async (showLoading = true) => {
    fetchCallCount.current++;
    const fetchId = `fetch-${hookId.current}-${fetchCallCount.current}`;
    
    console.log(`🚀 [FETCH-START] ${fetchId} - URL: ${url}`);
    console.log(`📋 [FETCH-STATE] ${fetchId}:`, {
      enabled,
      fetchInProgress: fetchInProgress.current,
      showLoading,
      lastFetchTime: lastFetchTime.current ? `${Date.now() - lastFetchTime.current}ms ago` : 'never',
      callNumber: fetchCallCount.current
    });

    if (!enabled || fetchInProgress.current) {
      console.log(`⚠️ [FETCH-BLOCKED] ${fetchId} - ${!enabled ? 'Disabled' : 'Already in progress'}`);
      return;
    }

    // Prevent rapid successive calls (minimum 1 second between requests)
    const now = Date.now();
    if (now - lastFetchTime.current < 1000) {
      console.log(`⚠️ [FETCH-THROTTLED] ${fetchId} - Too soon (${now - lastFetchTime.current}ms < 1000ms)`);
      return;
    }

    // Deduplicate identical requests
    const currentDedupeKey = `${url}_${enabled}_${showLoading}`;
    if (requestDedupeKey.current === currentDedupeKey && fetchInProgress.current) {
      console.log(`⚠️ [FETCH-DEDUPE] ${fetchId} - Identical request already in progress`);
      return;
    }
    requestDedupeKey.current = currentDedupeKey;
    lastFetchTime.current = now;

    fetchInProgress.current = true;
    performanceTracker.startTime(fetchId);
    
    if (showLoading && !data) {
      console.log(`🔄 [LOADING-START] ${fetchId} - Setting loading=true`);
      setLoading(true);
    }
    setError(null);

    try {
      const timestamp = Date.now();
      const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`;
      
      console.log(`🌐 [HTTP-REQUEST] ${fetchId} - Making request to: ${fetchUrl}`);
      
      const result = await fetchWithCache<T>(fetchUrl, {
        ttl: cacheTime,
        namespace: 'client_cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      console.log(`✅ [FETCH-SUCCESS] ${fetchId} - Data received:`, {
        dataSize: JSON.stringify(result).length,
        hasData: !!result,
        timestamp: new Date().toISOString()
      });

      setData(result);
      setLastFetch(Date.now());
      setIsStale(false);
      onSuccess?.(result);
      
      performanceTracker.endTime(fetchId);

    } catch (err) {
      const error = err as Error;
      console.error(`❌ [FETCH-ERROR] ${fetchId} - Error:`, error);
      setError(error);
      onError?.(error);
      
      logger.error('Data fetch failed', 'OPTIMIZED_DATA_HOOK', {
        url,
        cacheKey
      }, error);
    } finally {
      console.log(`🔄 [LOADING-END] ${fetchId} - Setting loading=false`);
      setLoading(false);
      fetchInProgress.current = false;
      requestDedupeKey.current = ''; // Reset deduplication key
      performanceTracker.endTime(`${fetchId}-total`);
    }
  }, [enabled, url, cacheTime, backgroundRefetch, onSuccess, onError, cacheKey, data]);

  const refetch = useCallback(async () => {
    console.log(`🔄 [MANUAL-REFETCH] ${hookId.current} - Manual refetch triggered`);
    // Invalidate cache and refetch
    invalidateCache(url, { namespace: 'client_cache' });
    await fetchData(true);
  }, [url, fetchData]);

  // Initial fetch on mount
  useEffect(() => {
    console.log(`🏠 [MOUNT-EFFECT] ${hookId.current} - Mount effect triggered:`, {
      enabled,
      refetchOnMount,
      shouldFetch: enabled && refetchOnMount
    });
    
    if (enabled && refetchOnMount) {
      console.log(`🚀 [MOUNT-FETCH] ${hookId.current} - Initiating mount fetch`);
      fetchData();
    }
  }, [enabled, refetchOnMount]); // Remove fetchData dependency to prevent infinite loop

  // Check if data is stale
  useEffect(() => {
    console.log(`⏰ [STALE-CHECK-EFFECT] ${hookId.current} - Stale check effect triggered:`, {
      lastFetch: lastFetch ? new Date(lastFetch).toISOString() : 'never',
      staleTime: `${staleTime/1000}s`,
      backgroundRefetch
    });

    if (!lastFetch) return;

    const checkStale = () => {
      const now = Date.now();
      const isDataStale = now - lastFetch > staleTime;
      const wasStale = isStale;
      
      if (isDataStale !== wasStale) {
        console.log(`📊 [STALE-STATUS] ${hookId.current} - Stale status changed: ${wasStale} → ${isDataStale}`);
        setIsStale(isDataStale);
      }

      // If data is stale and background refresh is enabled, fetch new data
      if (isDataStale && backgroundRefetch && !fetchInProgress.current) {
        console.log(`🔄 [BACKGROUND-REFRESH] ${hookId.current} - Initiating background refresh`);
        
        // Use a fresh fetchData call to avoid dependency issues
        const doBackgroundFetch = async () => {
          if (!enabled || fetchInProgress.current) return;

          fetchInProgress.current = true;
          setError(null);

          try {
            const timestamp = Date.now();
            const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`;
            
            const result = await fetchWithCache<T>(fetchUrl, {
              ttl: cacheTime,
              namespace: 'client_cache',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });

            setData(result);
            setLastFetch(Date.now());
            setIsStale(false);
            onSuccess?.(result);

          } catch (err) {
            const error = err as Error;
            setError(error);
            onError?.(error);
          } finally {
            fetchInProgress.current = false;
      }
    };

        doBackgroundFetch();
      }
    };

    const interval = setInterval(checkStale, 60000); // Check every 60 seconds instead of 30
    checkStale(); // Check immediately

    return () => clearInterval(interval);
  }, [lastFetch, staleTime, backgroundRefetch, enabled, url, cacheTime, onSuccess, onError, isStale]);

  // Refetch on window focus
  useEffect(() => {
    console.log(`👁️ [FOCUS-EFFECT] ${hookId.current} - Focus effect setup:`, {
      refetchOnWindowFocus,
      enabled: refetchOnWindowFocus
    });

    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      // Only refetch if data is stale or it's been more than 1 minute since mount
      const shouldRefetch = isStale || (Date.now() - mountTime.current > 60000);
      console.log(`👁️ [WINDOW-FOCUS] ${hookId.current} - Window focus detected:`, {
        isStale,
        timeSinceMount: `${Math.round((Date.now() - mountTime.current)/1000)}s`,
        shouldRefetch
      });
      
      if (shouldRefetch && !fetchInProgress.current) {
        console.log(`🔄 [FOCUS-REFETCH] ${hookId.current} - Refetching due to focus`);
        
        // Directly call fetchData to avoid dependency issues
        const doRefetch = async () => {
          if (!enabled || fetchInProgress.current) return;

          fetchInProgress.current = true;
          setError(null);

          try {
            const timestamp = Date.now();
            const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`;
            
            const result = await fetchWithCache<T>(fetchUrl, {
              ttl: cacheTime,
              namespace: 'client_cache',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });

            setData(result);
            setLastFetch(Date.now());
            setIsStale(false);
            onSuccess?.(result);

          } catch (err) {
            const error = err as Error;
            setError(error);
            onError?.(error);
          } finally {
            fetchInProgress.current = false;
          }
        };

        doRefetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, enabled, url, cacheTime, backgroundRefetch, onSuccess, onError]);

  // Log final state on each render
  console.log(`📊 [HOOK-STATE] ${hookId.current} - Current state:`, {
    hasData: !!data,
    loading,
    hasError: !!error,
    isStale,
    lastFetch: lastFetch ? new Date(lastFetch).toISOString() : null,
    fetchInProgress: fetchInProgress.current,
    renderCount: renderCount.current
  });

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
    lastFetch
  };
}

// Type definitions for homepage data
interface Project {
  _id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  taskCount?: number;
  highPriorityCount?: number;
}

interface Task {
  _id: string;
  title: string;
  projectId: string;
  priority: number;
  isVisible: boolean;
  type: string;
  locations: string[];
  dayTime: string[];
  targetCar: string;
  lidar: string;
  amountNeeded: number;
  datacoNumber: string;
  description: string;
  subtitle?: string;
  images?: string[];
  createdAt: string;
  updatedAt: string;
}

interface HomepageData {
  projects: Project[];
  tasks: Task[];
  success: boolean;
  queryTime?: number;
}

// Type definitions for project page data (matching component interfaces)
interface ProjectPageData {
  project: {
    _id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  tasks: Array<{
    _id: string;
    title: string;
    subtitle?: string;
    images?: string[];
    datacoNumber: string;
    description: {
      main: string;
      howToExecute: string;
    };
    projectId: string;
    type: ('events' | 'hours')[];
    locations: string[];
    amountNeeded: number;
    targetCar: string[];
    lidar: boolean;
    dayTime: ('day' | 'night' | 'dusk' | 'dawn')[];
    priority: number;
    isVisible: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  subtasks: {
    [taskId: string]: Array<{
      _id: string;
      taskId: string;
      title: string;
      subtitle?: string;
      images?: string[];
      datacoNumber: string;
      type: 'events' | 'hours';
      amountNeeded: number;
      labels: string[];
      targetCar: string[];
      weather: string;
      scene: string;
      dayTime: string[];
      createdAt: string;
      updatedAt: string;
    }>;
  };
  success: boolean;
  queryTime?: number;
}

// Specialized hook for homepage data
export function useHomepageData() {
  return useOptimizedData<HomepageData>('/api/homepage-data', {
    cacheKey: 'homepage-data',
    staleTime: 5 * 60 * 1000, // 5 minutes for homepage (increased to reduce requests)
    cacheTime: 10 * 60 * 1000, // 10 minutes cache
    refetchOnMount: true,
    refetchOnWindowFocus: false, // Disable to reduce requests
    backgroundRefetch: true
  });
}

// Specialized hook for project data
export function useProjectData(projectName: string, enabled = true) {
  return useOptimizedData<ProjectPageData>(`/api/project-data/${encodeURIComponent(projectName)}`, {
    cacheKey: `project-data-${projectName}`,
    enabled: enabled && !!projectName,
    staleTime: 60000, // 2 minutes for project pages
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    backgroundRefetch: true
  });
}

// Hook for preloading data
export function useDataPreloader() {
  const preloadHomepage = useCallback(async () => {
    try {
      await fetchWithCache('/api/homepage-data', {
        ttl: 3 * 60 * 1000,
        namespace: 'client_cache'
      });
      logger.info('Homepage data preloaded', 'DATA_PRELOADER');
    } catch (error) {
      logger.error('Failed to preload homepage data', 'DATA_PRELOADER', undefined, error as Error);
    }
  }, []);

  const preloadProject = useCallback(async (projectName: string) => {
    try {
      await fetchWithCache(`/api/project-data/${encodeURIComponent(projectName)}`, {
        ttl: 5 * 60 * 1000,
        namespace: 'client_cache'
      });
      logger.info('Project data preloaded', 'DATA_PRELOADER', { projectName });
    } catch (error) {
      logger.error('Failed to preload project data', 'DATA_PRELOADER', { projectName }, error as Error);
    }
  }, []);

  return {
    preloadHomepage,
    preloadProject
  };
} 