/**
 * Safe Data Fetching Hook
 * Provides project-wide protection against infinite loops in React components
 */

import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';
import { safeFetch, useSafeEffect, useSafeCallback, projectGuard } from '@/lib/safeDataFetching';

interface UseSafeDataFetchingOptions {
  enabled?: boolean;
  immediate?: boolean;
  interval?: number;
  retryCount?: number;
  retryDelay?: number;
  staleTime?: number;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
  debugName?: string;
}

interface UseSafeDataFetchingResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
  lastFetch: number | null;
}

export function useSafeDataFetching<T = unknown>(
  url: string | (() => string),
  options: UseSafeDataFetchingOptions = {}
): UseSafeDataFetchingResult<T> {
  const {
    enabled = true,
    immediate = true,
    interval,
    retryCount = 0,
    retryDelay = 1000,
    staleTime = 5 * 60 * 1000, // 5 minutes default
    onSuccess,
    onError,
    debugName = 'useSafeDataFetching'
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchInProgress = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const componentName = useRef(`${debugName}-${Math.random().toString(36).substr(2, 9)}`);

  // Register component with project guard
  useEffect(() => {
    projectGuard.registerComponent(componentName.current);
  }, []);

  const fetchData = useSafeCallback(async (showLoading = true) => {
    if (!enabled || fetchInProgress.current) return;

    const actualUrl = typeof url === 'function' ? url() : url;
    if (!actualUrl) return;

    fetchInProgress.current = true;
    projectGuard.registerFetch(componentName.current);

    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      logger.info('Starting safe data fetch', 'SAFE_DATA_FETCHING', {
        url: actualUrl,
        component: componentName.current,
        debugName
      });

      const result = await safeFetch<T>(actualUrl, {}, {
        component: componentName.current,
        retryCount
      });

      setData(result);
      setLastFetch(Date.now());
      setIsStale(false);
      onSuccess?.(result);

      logger.info('Safe data fetch completed successfully', 'SAFE_DATA_FETCHING', {
        url: actualUrl,
        component: componentName.current,
        debugName
      });

    } catch (err) {
      const error = err as Error;
      setError(error);
      projectGuard.registerError(componentName.current, error);
      onError?.(error);

      logger.error('Safe data fetch failed', 'SAFE_DATA_FETCHING', {
        url: actualUrl,
        component: componentName.current,
        debugName,
        errorMessage: error.message
      }, error);

      // Retry logic
      if (retryCount > 0) {
        setTimeout(() => {
          if (enabled && !fetchInProgress.current) {
            fetchData(false);
          }
        }, retryDelay);
      }
    } finally {
      setLoading(false);
      fetchInProgress.current = false;
    }
  }, [enabled, url, retryCount, retryDelay, onSuccess, onError], debugName);

  const refetch = useSafeCallback(async () => {
    await fetchData(true);
  }, [], `${debugName}-refetch`);

  // Initial fetch
  useSafeEffect(() => {
    if (enabled && immediate) {
      fetchData();
    }
  }, [enabled, immediate], `${debugName}-initial`);

  // Interval fetching
  useSafeEffect(() => {
    if (!interval || !enabled) return;

    intervalRef.current = setInterval(() => {
      if (!fetchInProgress.current) {
        fetchData(false);
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, enabled], `${debugName}-interval`);

  // Stale data checking
  useSafeEffect(() => {
    if (!lastFetch || !staleTime) return;

    const checkStale = () => {
      const now = Date.now();
      const isDataStale = now - lastFetch > staleTime;
      setIsStale(isDataStale);
    };

    // Check immediately
    checkStale();

    // Check periodically
    const staleCheckInterval = setInterval(checkStale, Math.min(staleTime / 4, 60000));

    return () => clearInterval(staleCheckInterval);
  }, [lastFetch, staleTime], `${debugName}-stale-check`);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      fetchInProgress.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
    lastFetch
  };
}

// Specialized hooks for common patterns
export function useSafeHomepageData() {
  return useSafeDataFetching('/api/homepage-data', {
    staleTime: 5 * 60 * 1000, // 5 minutes
    debugName: 'homepage-data'
  });
}

export function useSafeProjectData(projectName: string) {
  return useSafeDataFetching(
    () => projectName ? `/api/project-data/${encodeURIComponent(projectName)}` : '',
    {
      enabled: !!projectName,
      staleTime: 3 * 60 * 1000, // 3 minutes
      debugName: `project-data-${projectName}`
    }
  );
}

export function useSafeDailyUpdates() {
  return useSafeDataFetching('/api/daily-updates', {
    staleTime: 2 * 60 * 1000, // 2 minutes
    interval: 5 * 60 * 1000,  // Refresh every 5 minutes
    debugName: 'daily-updates'
  });
}

// Project health monitoring hook
export function useProjectHealth() {
  const [healthReport, setHealthReport] = useState<Record<string, unknown> | null>(null);

  useSafeEffect(() => {
    const updateReport = () => {
      const report = projectGuard.getHealthReport();
      setHealthReport(report);

      // Log warnings for problematic components
      if (report.problematicComponents.length > 0) {
        logger.warn('Problematic components detected', 'PROJECT_HEALTH', {
          problematicCount: report.problematicComponents.length,
          components: report.problematicComponents
        });
      }
    };

    // Update immediately
    updateReport();

    // Update every minute
    const interval = setInterval(updateReport, 60000);

    return () => clearInterval(interval);
  }, [], 'project-health-monitor');

  return healthReport;
} 