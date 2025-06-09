'use client';

import { useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

interface UseRealtimeOptions {
  interval?: number;
  enabled?: boolean;
  immediate?: boolean;
}

export function useRealtime(
  callback: () => Promise<void> | void,
  options: UseRealtimeOptions = {}
) {
  const {
    interval = 30000, // 30 seconds default
    enabled = true,
    immediate = true
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      try {
        logger.info(`Realtime update triggered`, 'USE_REALTIME', { interval });
        await callbackRef.current();
      } catch (error) {
        console.error('Realtime update error:', error);
      }
    }, interval);
  }, [interval]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const triggerUpdate = useCallback(async () => {
    try {
      await callbackRef.current();
    } catch (error) {
      console.error('Manual update error:', error);
    }
  }, []);

  useEffect(() => {
    if (enabled) {
      if (immediate) {
        triggerUpdate();
      }
      startInterval();
    } else {
      stopInterval();
    }

    return () => {
      stopInterval();
    };
  }, [enabled, immediate, startInterval, stopInterval, triggerUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopInterval();
    };
  }, [stopInterval]);

  return {
    triggerUpdate,
    startInterval,
    stopInterval
  };
}

// Specific realtime hooks for different data types - these just do periodic refreshing
export function useTasksRealtime(refreshCallback: () => Promise<void> | void, options?: UseRealtimeOptions) {
  return useRealtime(refreshCallback, { interval: 300000, ...options });
}

export function useProjectsRealtime(refreshCallback: () => Promise<void> | void, options?: UseRealtimeOptions) {
  return useRealtime(refreshCallback, { interval: 30000, ...options });
}

export function useSubtasksRealtime(taskId: string, refreshCallback: () => Promise<void> | void, options?: UseRealtimeOptions) {
  return useRealtime(refreshCallback, { interval: 10000, ...options });
} 