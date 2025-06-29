import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithCache, cache, invalidateCache } from '@/lib/cache';
import { logger } from '@/lib/logger';

// Performance tracking utilities
const performanceTracker = {
  startTime: (key: string) => {
    if (typeof window !== 'undefined') {
      window.performance?.mark(`${key}-start`);
    }
  },
  endTime: (key: string) => {
    if (typeof window !== 'undefined') {
      try {
        window.performance?.mark(`${key}-end`);
        window.performance?.measure(`${key}-duration`, `${key}-start`, `${key}-end`);
      } catch (e) {
        // Silent error handling
      }
    }
  },
  log: (key: string, message: string, data?: any) => {
    // Silent - no logging
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
    // Silent initialization
  }, []);

  // Track renders
  renderCount.current++;

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
    
    if (!enabled || fetchInProgress.current) {
      return;
    }

    // Prevent rapid successive calls (minimum 1 second between requests)
    const now = Date.now();
    if (now - lastFetchTime.current < 1000) {
      return;
    }

    // Deduplicate identical requests
    const currentDedupeKey = `${url}_${enabled}_${showLoading}`;
    if (requestDedupeKey.current === currentDedupeKey && fetchInProgress.current) {
      return;
    }
    requestDedupeKey.current = currentDedupeKey;
    lastFetchTime.current = now;

    fetchInProgress.current = true;
    performanceTracker.startTime(fetchId);
    
    if (showLoading && !data) {
      setLoading(true);
    }
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
      
      performanceTracker.endTime(fetchId);

    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);
      
      logger.error('Data fetch failed', 'OPTIMIZED_DATA_HOOK', {
        url,
        cacheKey
      }, error);
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
      requestDedupeKey.current = ''; // Reset deduplication key
      performanceTracker.endTime(`${fetchId}-total`);
    }
  }, [enabled, url, cacheTime, backgroundRefetch, onSuccess, onError, cacheKey, data]);

  const refetch = useCallback(async () => {
    // Invalidate cache and refetch
    invalidateCache(url, { namespace: 'client_cache' });
    await fetchData(true);
  }, [url, fetchData]);

  // Mount effect - fetch data on mount if enabled
  useEffect(() => {
    if (enabled && refetchOnMount) {
      const shouldFetch = !data || (lastFetch && Date.now() - lastFetch > staleTime);
      if (shouldFetch) {
        fetchData();
      }
    }
  }, [enabled, refetchOnMount, fetchData, data, lastFetch, staleTime]);

  // Stale data checker
  useEffect(() => {
    if (!lastFetch || !backgroundRefetch) return;

    const checkStale = () => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetch;
      
      if (timeSinceLastFetch > staleTime) {
        setIsStale(true);
        
        if (backgroundRefetch && enabled) {
          // Background fetch without showing loading
          const doBackgroundFetch = async () => {
            try {
              await fetchData(false);
            } catch (error) {
              // Silent background fetch error
            }
          };
          doBackgroundFetch();
        }
      }
    };

    // Check immediately
    checkStale();

    // Set up interval to check periodically
    const interval = setInterval(checkStale, Math.min(staleTime / 2, 30000)); // Check every 30 seconds max

    return () => clearInterval(interval);
  }, [lastFetch, staleTime, backgroundRefetch, enabled, fetchData]);

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      if (data && lastFetch) {
        const timeSinceLastFetch = Date.now() - lastFetch;
        if (timeSinceLastFetch > staleTime / 2) {
          // Background refetch after focus
          const doRefetch = async () => {
            try {
              await fetchData(false);
            } catch (error) {
              // Silent refetch error
            }
          };
          doRefetch();
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, data, lastFetch, staleTime, fetchData]);

  // State logging for debugging
  useEffect(() => {
    // Silent state tracking
  }, [data, loading, error, isStale, lastFetch]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
    lastFetch
  };
}

// Helper function to get cache status
export function getCacheStatus(url: string, namespace = 'client_cache') {
  try {
    const cached = cache.get(url, { namespace });
    return {
      exists: !!cached,
      timestamp: null, // Timestamp metadata not available from cache.get()
      age: null // Age calculation not available without timestamp
    };
  } catch {
    return {
      exists: false,
      timestamp: null,
      age: null
    };
  }
}

// Specialized hooks for different data types
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
      isVisible?: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  success: boolean;
  queryTime?: number;
}

export function useHomepageData() {
  return useOptimizedData<HomepageData>('/api/homepage-data', {
    cacheKey: 'homepage-data',
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    backgroundRefetch: true
  });
}

export function useProjectData(projectName: string, enabled = true) {
  return useOptimizedData<ProjectPageData>(`/api/project-data/${encodeURIComponent(projectName)}`, {
    cacheKey: `project-data-${projectName}`,
    enabled: enabled && !!projectName,
    staleTime: 1 * 60 * 1000, // 1 minute
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    backgroundRefetch: true
  });
}

export function useDataPreloader() {
  const preloadProject = useCallback(async (projectName: string) => {
    if (!projectName) return;

    try {
      const url = `/api/project-data/${encodeURIComponent(projectName)}`;
      await fetchWithCache(url, {
        ttl: 5 * 60 * 1000, // 5 minutes
        namespace: 'client_cache',
        headers: {
          'Cache-Control': 'max-age=300',
          'X-Preload': 'true'
        }
      });
    } catch (error) {
      // Silent preload error
    }
  }, []);

  return { preloadProject };
} 