import { useState, useEffect, useCallback, useRef } from 'react';
import { cachedFetch, cacheManager } from '@/lib/cache';
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

  const fetchData = useCallback(async (showLoading = true) => {
    if (!enabled || fetchInProgress.current) return;

    fetchInProgress.current = true;
    
    if (showLoading && !data) {
      setLoading(true);
    }
    setError(null);

    try {
      const timestamp = Date.now();
      const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}_t=${timestamp}`;
      
      const result = await cachedFetch<T>(fetchUrl, {
        ttl: cacheTime,
        version: '1',
        background: backgroundRefetch,
        staleWhileRevalidate: true,
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
    }
  }, [enabled, url, cacheTime, backgroundRefetch, data, onSuccess, onError, cacheKey]);

  const refetch = useCallback(async () => {
    // Invalidate cache and refetch
    cacheManager.invalidate(url);
    await fetchData(true);
  }, [fetchData, url]);

  // Initial fetch on mount
  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData();
    }
  }, [enabled, refetchOnMount, fetchData]);

  // Check if data is stale
  useEffect(() => {
    if (!lastFetch) return;

    const checkStale = () => {
      const now = Date.now();
      const isDataStale = now - lastFetch > staleTime;
      setIsStale(isDataStale);

      // If data is stale and background refresh is enabled, fetch new data
      if (isDataStale && backgroundRefetch && !fetchInProgress.current) {
        fetchData(false); // Don't show loading for background refresh
      }
    };

    const interval = setInterval(checkStale, 30000); // Check every 30 seconds
    checkStale(); // Check immediately

    return () => clearInterval(interval);
  }, [lastFetch, staleTime, backgroundRefetch, fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      // Only refetch if data is stale or it's been more than 1 minute since mount
      const shouldRefetch = isStale || (Date.now() - mountTime.current > 60000);
      if (shouldRefetch && !fetchInProgress.current) {
        fetchData(false);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, isStale, fetchData]);

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
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
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
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  tasks: Array<{
    id: string;
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
      id: string;
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
    staleTime: 1 * 60 * 1000, // 1 minute for homepage
    cacheTime: 3 * 60 * 1000, // 3 minutes cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    backgroundRefetch: true
  });
}

// Specialized hook for project data
export function useProjectData(projectName: string, enabled = true) {
  return useOptimizedData<ProjectPageData>(`/api/project-data/${encodeURIComponent(projectName)}`, {
    cacheKey: `project-data-${projectName}`,
    enabled: enabled && !!projectName,
    staleTime: 2 * 60 * 1000, // 2 minutes for project pages
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
      await cachedFetch('/api/homepage-data', {
        ttl: 3 * 60 * 1000,
        version: '1',
        background: true
      });
      logger.info('Homepage data preloaded', 'DATA_PRELOADER');
    } catch (error) {
      logger.error('Failed to preload homepage data', 'DATA_PRELOADER', undefined, error as Error);
    }
  }, []);

  const preloadProject = useCallback(async (projectName: string) => {
    try {
      await cachedFetch(`/api/project-data/${encodeURIComponent(projectName)}`, {
        ttl: 5 * 60 * 1000,
        version: '1',
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