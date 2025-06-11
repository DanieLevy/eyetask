import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchWithCache, cache, invalidateCache } from '@/lib/cache';
import { logger } from '@/lib/logger';

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

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchInProgress = useRef(false);
  const mountTime = useRef(Date.now());
  const lastFetchTime = useRef(0);
  const requestDedupeKey = useRef('');

  const fetchData = useCallback(async (showLoading = true) => {
    if (!enabled || fetchInProgress.current) return;

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

      logger.info('Data fetched successfully', 'OPTIMIZED_DATA_HOOK', {
        url: fetchUrl,
        cacheKey,
        dataSize: JSON.stringify(result).length
      });

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
    }
  }, [enabled, url, cacheTime, backgroundRefetch, onSuccess, onError, cacheKey]);

  const refetch = useCallback(async () => {
    // Invalidate cache and refetch
    invalidateCache(url, { namespace: 'client_cache' });
    await fetchData(true);
  }, [url, fetchData]);

  // Initial fetch on mount
  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData();
    }
  }, [enabled, refetchOnMount]); // Remove fetchData dependency to prevent infinite loop

  // Check if data is stale
  useEffect(() => {
    if (!lastFetch) return;

    const checkStale = () => {
      const now = Date.now();
      const isDataStale = now - lastFetch > staleTime;
      setIsStale(isDataStale);

      // If data is stale and background refresh is enabled, fetch new data
      if (isDataStale && backgroundRefetch && !fetchInProgress.current) {
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
  }, [lastFetch, staleTime, backgroundRefetch, enabled, url, cacheTime, onSuccess, onError]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      // Only refetch if data is stale or it's been more than 1 minute since mount
      const shouldRefetch = isStale || (Date.now() - mountTime.current > 60000);
      if (shouldRefetch && !fetchInProgress.current) {
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
        namespace: 'client_cache',
        background: true
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
        namespace: 'client_cache',
        background: true
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