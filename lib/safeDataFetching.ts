/**
 * Safe Data Fetching Utilities
 * Provides project-wide protection against infinite loops and performance issues
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getCircuitBreaker } from './circuitBreaker';
import { logger } from './logger';

// Global request tracking to prevent system-wide infinite loops
const globalRequestTracker = new Map<string, {
  lastRequest: number;
  requestCount: number;
  isBlocked: boolean;
}>();

// Global configuration
const GLOBAL_CONFIG = {
  MIN_REQUEST_INTERVAL: 1000,        // 1 second minimum between identical requests
  MAX_REQUESTS_PER_MINUTE: 60,       // Maximum 60 requests per minute per endpoint
  REQUEST_BURST_THRESHOLD: 5,        // Block after 5 rapid requests
  BURST_DETECTION_WINDOW: 5000,      // 5 seconds window for burst detection
  CLEANUP_INTERVAL: 300000,          // Clean up tracking data every 5 minutes
};

// Request deduplication and throttling
class RequestGuard {
  private static instance: RequestGuard;
  private requestCounters = new Map<string, number[]>();
  private activeRequests = new Set<string>();

  static getInstance() {
    if (!RequestGuard.instance) {
      RequestGuard.instance = new RequestGuard();
    }
    return RequestGuard.instance;
  }

  constructor() {
    // Periodic cleanup
    setInterval(() => {
      this.cleanup();
    }, GLOBAL_CONFIG.CLEANUP_INTERVAL);
  }

  private cleanup() {
    const now = Date.now();
    const cutoff = now - GLOBAL_CONFIG.CLEANUP_INTERVAL;

    // Clean up old request counters
    for (const [key, timestamps] of this.requestCounters.entries()) {
      const recentRequests = timestamps.filter(ts => ts > cutoff);
      if (recentRequests.length === 0) {
        this.requestCounters.delete(key);
      } else {
        this.requestCounters.set(key, recentRequests);
      }
    }

    // Clean up global tracker
    for (const [key, data] of globalRequestTracker.entries()) {
      if (now - data.lastRequest > GLOBAL_CONFIG.CLEANUP_INTERVAL) {
        globalRequestTracker.delete(key);
      }
    }
  }

  canMakeRequest(requestKey: string): { allowed: boolean; reason?: string } {
    const now = Date.now();

    // Check if request is already active
    if (this.activeRequests.has(requestKey)) {
      return { allowed: false, reason: 'Duplicate request in progress' };
    }

    // Check global tracking
    const globalData = globalRequestTracker.get(requestKey);
    if (globalData) {
      // Check if blocked
      if (globalData.isBlocked && now - globalData.lastRequest < 60000) {
        return { allowed: false, reason: 'Request blocked due to abuse' };
      }

      // Check minimum interval
      if (now - globalData.lastRequest < GLOBAL_CONFIG.MIN_REQUEST_INTERVAL) {
        return { allowed: false, reason: 'Too soon since last request' };
      }
    }

    // Check burst detection
    const timestamps = this.requestCounters.get(requestKey) || [];
    const recentRequests = timestamps.filter(ts => now - ts < GLOBAL_CONFIG.BURST_DETECTION_WINDOW);

    if (recentRequests.length >= GLOBAL_CONFIG.REQUEST_BURST_THRESHOLD) {
      // Block this request pattern
      globalRequestTracker.set(requestKey, {
        lastRequest: now,
        requestCount: (globalData?.requestCount || 0) + 1,
        isBlocked: true
      });

      logger.warn('Request burst detected and blocked', 'REQUEST_GUARD', {
        requestKey,
        burstCount: recentRequests.length
      });

      return { allowed: false, reason: 'Request burst detected' };
    }

    return { allowed: true };
  }

  registerRequest(requestKey: string) {
    const now = Date.now();

    // Add to active requests
    this.activeRequests.add(requestKey);

    // Update counters
    const timestamps = this.requestCounters.get(requestKey) || [];
    timestamps.push(now);
    this.requestCounters.set(requestKey, timestamps);

    // Update global tracker
    const globalData = globalRequestTracker.get(requestKey);
    globalRequestTracker.set(requestKey, {
      lastRequest: now,
      requestCount: (globalData?.requestCount || 0) + 1,
      isBlocked: false
    });
  }

  unregisterRequest(requestKey: string) {
    this.activeRequests.delete(requestKey);
  }
}

// Safe fetch wrapper with comprehensive protection
export async function safeFetch<T = any>(
  url: string, 
  options: RequestInit = {},
  metadata: { component?: string; retryCount?: number } = {}
): Promise<T> {
  const { component = 'unknown', retryCount = 0 } = metadata;
  const requestKey = `${url}_${JSON.stringify(options)}`;
  const guard = RequestGuard.getInstance();
  const circuitBreaker = getCircuitBreaker(url);

  // Check if request is allowed
  const { allowed, reason } = guard.canMakeRequest(requestKey);
  if (!allowed) {
    const error = new Error(`Request blocked: ${reason}`);
    logger.warn('Request blocked by guard', 'SAFE_FETCH', {
      url,
      component,
      reason,
      retryCount
    });
    throw error;
  }

  // Register the request
  guard.registerRequest(requestKey);

  try {
    // Use circuit breaker for additional protection
    const result = await circuitBreaker.execute(async () => {
      logger.info('Making safe request', 'SAFE_FETCH', {
        url,
        component,
        retryCount
      });

      const response = await fetch(url, {
        ...options,
        headers: {
          'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          'X-Component': component,
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    });

    logger.info('Safe request completed successfully', 'SAFE_FETCH', {
      url,
      component,
      retryCount
    });

    return result;
  } finally {
    // Always unregister the request
    guard.unregisterRequest(requestKey);
  }
}

// Safe useEffect wrapper that prevents dependency loops
export function useSafeEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  debugName?: string
) {
  const prevDepsRef = useRef<React.DependencyList | undefined>(undefined);
  const executionCountRef = useRef(0);
  const lastExecutionRef = useRef(0);

  useEffect(() => {
    const now = Date.now();
    executionCountRef.current++;

    // Detect rapid re-executions (potential infinite loop)
    if (now - lastExecutionRef.current < 100) {
      logger.warn('Rapid useEffect re-execution detected', 'SAFE_EFFECT', {
        debugName,
        executionCount: executionCountRef.current,
        timeSinceLastExecution: now - lastExecutionRef.current
      });

      // Block execution if too rapid
      if (executionCountRef.current > 10) {
        logger.error('useEffect execution blocked due to potential infinite loop', 'SAFE_EFFECT', {
          debugName,
          executionCount: executionCountRef.current
        });
        return;
      }
    }

    lastExecutionRef.current = now;

    // Log dependency changes for debugging
    if (debugName && prevDepsRef.current) {
      const changedDeps = deps.filter((dep, index) => 
        dep !== prevDepsRef.current![index]
      );
      
      if (changedDeps.length > 0) {
        logger.debug('useEffect dependencies changed', 'SAFE_EFFECT', {
          debugName,
          changedDepsCount: changedDeps.length,
          executionCount: executionCountRef.current
        });
      }
    }

    prevDepsRef.current = deps;
    return effect();
  }, deps);
}

// Safe useCallback wrapper that prevents function recreation loops
export function useSafeCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  debugName?: string
): T {
  const recreationCountRef = useRef(0);
  const lastRecreationRef = useRef(0);

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    
    // Track function recreations
    if (now - lastRecreationRef.current < 100) {
      recreationCountRef.current++;
      
      if (recreationCountRef.current > 5) {
        logger.warn('Frequent useCallback recreation detected', 'SAFE_CALLBACK', {
          debugName,
          recreationCount: recreationCountRef.current
        });
      }
    } else {
      recreationCountRef.current = 0;
    }
    
    lastRecreationRef.current = now;
    
    return callback(...args);
  }, deps) as T;
}

// Safe useState wrapper that prevents rapid state changes
export function useSafeState<T>(
  initialState: T | (() => T),
  debugName?: string
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState(initialState);
  const updateCountRef = useRef(0);
  const lastUpdateRef = useRef(0);

  const safeSetState = useCallback<React.Dispatch<React.SetStateAction<T>>>((value) => {
    const now = Date.now();
    updateCountRef.current++;

    // Detect rapid state updates
    if (now - lastUpdateRef.current < 50) {
      if (updateCountRef.current > 20) {
        logger.warn('Rapid state updates detected - potential infinite loop', 'SAFE_STATE', {
          debugName,
          updateCount: updateCountRef.current,
          timeSinceLastUpdate: now - lastUpdateRef.current
        });
        
        // Still allow the update but with throttling
        setTimeout(() => setState(value), 100);
        return;
      }
    } else {
      updateCountRef.current = 0;
    }

    lastUpdateRef.current = now;
    setState(value);
  }, []);

  return [state, safeSetState];
}

// Project-wide monitoring and alerting
export class ProjectGuard {
  private static instance: ProjectGuard;
  private componentMetrics = new Map<string, {
    renderCount: number;
    fetchCount: number;
    errorCount: number;
    lastActivity: number;
  }>();

  static getInstance() {
    if (!ProjectGuard.instance) {
      ProjectGuard.instance = new ProjectGuard();
    }
    return ProjectGuard.instance;
  }

  registerComponent(componentName: string) {
    const existing = this.componentMetrics.get(componentName);
    this.componentMetrics.set(componentName, {
      renderCount: (existing?.renderCount || 0) + 1,
      fetchCount: existing?.fetchCount || 0,
      errorCount: existing?.errorCount || 0,
      lastActivity: Date.now()
    });

    // Alert on excessive renders
    const metrics = this.componentMetrics.get(componentName)!;
    if (metrics.renderCount > 50) {
      logger.error('Component excessive renders detected', 'PROJECT_GUARD', {
        componentName,
        renderCount: metrics.renderCount
      });
    }
  }

  registerFetch(componentName: string) {
    const existing = this.componentMetrics.get(componentName);
    if (existing) {
      existing.fetchCount++;
      existing.lastActivity = Date.now();

      // Alert on excessive fetches
      if (existing.fetchCount > 100) {
        logger.error('Component excessive fetches detected', 'PROJECT_GUARD', {
          componentName,
          fetchCount: existing.fetchCount
        });
      }
    }
  }

  registerError(componentName: string, error: Error) {
    const existing = this.componentMetrics.get(componentName);
    if (existing) {
      existing.errorCount++;
      existing.lastActivity = Date.now();
    }

    logger.error('Component error registered', 'PROJECT_GUARD', {
      componentName,
      errorMessage: error.message
    }, error);
  }

  getHealthReport() {
    const report = {
      totalComponents: this.componentMetrics.size,
      problematicComponents: [],
      totalRequests: 0,
      totalErrors: 0
    };

    for (const [name, metrics] of this.componentMetrics.entries()) {
      report.totalRequests += metrics.fetchCount;
      report.totalErrors += metrics.errorCount;

      if (metrics.renderCount > 20 || metrics.fetchCount > 50 || metrics.errorCount > 5) {
        (report.problematicComponents as any[]).push({
          name,
          ...metrics
        });
      }
    }

    return report;
  }
}

// Export guard instance for global use
export const projectGuard = ProjectGuard.getInstance(); 