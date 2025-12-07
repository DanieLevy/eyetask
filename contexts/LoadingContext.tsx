'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { logger } from '@/lib/logger';

// Loading types for different scenarios
export type LoadingType = 
  | 'page'           // Full page loading
  | 'navigation'     // Route/page transitions
  | 'data'          // Data fetching
  | 'action'        // Button/form actions
  | 'background'    // Background operations
  | 'component'     // Component-level loading
  | 'overlay';      // Modal/overlay loading

// Loading priority levels
export type LoadingPriority = 'low' | 'medium' | 'high' | 'critical';

// Loading state structure
export interface LoadingState {
  id: string;
  type: LoadingType;
  priority: LoadingPriority;
  message?: string;
  progress?: number; // 0-100 for progress bars
  startTime: number;
  timeout?: number;
  metadata?: Record<string, unknown>;
}

// Loading context interface
interface LoadingContextType {
  // State getters
  isLoading: (type?: LoadingType) => boolean;
  getLoadingStates: (type?: LoadingType) => LoadingState[];
  getHighestPriorityLoading: () => LoadingState | null;
  getCurrentLoadingMessage: () => string | null;
  getLoadingProgress: () => number | null;
  
  // State setters
  startLoading: (
    id: string, 
    type: LoadingType, 
    options?: {
      priority?: LoadingPriority;
      message?: string;
      timeout?: number;
      metadata?: Record<string, unknown>;
    }
  ) => void;
  
  stopLoading: (id: string) => void;
  updateLoading: (
    id: string, 
    updates: {
      message?: string;
      progress?: number;
      metadata?: Record<string, unknown>;
    }
  ) => void;
  
  // Convenience methods
  clearAllLoading: () => void;
  clearLoadingByType: (type: LoadingType) => void;
  
  // Loading orchestration
  withLoading: <T,>(
    id: string,
    type: LoadingType,
    operation: () => Promise<T>,
    options?: {
      priority?: LoadingPriority;
      message?: string;
      timeout?: number;
    }
  ) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

// Priority order for display purposes
const PRIORITY_ORDER: Record<LoadingPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps): React.JSX.Element {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current;
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
      timeouts.clear();
    };
  }, []);

  // Stop loading state
  const stopLoading = useCallback((id: string) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      const loadingState = newMap.get(id);
      
      if (loadingState) {
        const duration = Date.now() - loadingState.startTime;
        logger.debug(`Loading stopped: ${id}`, 'LOADING_SYSTEM', { 
          id, 
          type: loadingState.type, 
          duration 
        });
      }
      
      newMap.delete(id);
      return newMap;
    });

    // Clear timeout
    const timeout = timeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(id);
    }
  }, []);

  // Start loading state
  const startLoading = useCallback((
    id: string,
    type: LoadingType,
    options: {
      priority?: LoadingPriority;
      message?: string;
      timeout?: number;
      metadata?: Record<string, unknown>;
    } = {}
  ) => {
    const {
      priority = 'medium',
      message,
      timeout = 30000, // 30 second default timeout
      metadata
    } = options;

    setLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.set(id, {
        id,
        type,
        priority,
        message,
        startTime: Date.now(),
        timeout,
        metadata
      });
      return newMap;
    });

    // Set up timeout if specified
    if (timeout && timeout > 0) {
      const timeoutHandle = setTimeout(() => {
        logger.warn(`Loading timeout for ${id}`, 'LOADING_SYSTEM', { id, type, timeout });
        stopLoading(id);
      }, timeout);
      
      timeoutsRef.current.set(id, timeoutHandle);
    }

    logger.debug(`Loading started: ${id}`, 'LOADING_SYSTEM', { id, type, priority, message });
  }, [stopLoading]);

  // Update loading state
  const updateLoading = useCallback((
    id: string,
    updates: {
      message?: string;
      progress?: number;
      metadata?: Record<string, unknown>;
    }
  ) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(id);
      
      if (existing) {
        newMap.set(id, {
          ...existing,
          ...updates,
          metadata: updates.metadata ? { ...existing.metadata, ...updates.metadata } : existing.metadata
        });
      }
      
      return newMap;
    });
  }, []);

  // Check if loading by type
  const isLoading = useCallback((type?: LoadingType): boolean => {
    if (!type) {
      return loadingStates.size > 0;
    }
    
    for (const state of loadingStates.values()) {
      if (state.type === type) {
        return true;
      }
    }
    
    return false;
  }, [loadingStates]);

  // Get loading states by type
  const getLoadingStates = useCallback((type?: LoadingType): LoadingState[] => {
    const states = Array.from(loadingStates.values());
    
    if (!type) {
      return states;
    }
    
    return states.filter(state => state.type === type);
  }, [loadingStates]);

  // Get highest priority loading state
  const getHighestPriorityLoading = useCallback((): LoadingState | null => {
    const states = Array.from(loadingStates.values());
    
    if (states.length === 0) {
      return null;
    }
    
    return states.reduce((highest, current) => {
      return PRIORITY_ORDER[current.priority] > PRIORITY_ORDER[highest.priority] 
        ? current 
        : highest;
    });
  }, [loadingStates]);

  // Get current loading message
  const getCurrentLoadingMessage = useCallback((): string | null => {
    const highestPriority = getHighestPriorityLoading();
    return highestPriority?.message || null;
  }, [getHighestPriorityLoading]);

  // Get loading progress (average of all progress states)
  const getLoadingProgress = useCallback((): number | null => {
    const states = Array.from(loadingStates.values());
    const statesWithProgress = states.filter(state => state.progress !== undefined);
    
    if (statesWithProgress.length === 0) {
      return null;
    }
    
    const totalProgress = statesWithProgress.reduce((sum, state) => sum + (state.progress || 0), 0);
    return Math.round(totalProgress / statesWithProgress.length);
  }, [loadingStates]);

  // Clear all loading states
  const clearAllLoading = useCallback(() => {
    // Clear all timeouts
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
    
    setLoadingStates(new Map());
    logger.debug('All loading states cleared', 'LOADING_SYSTEM');
  }, []);

  // Clear loading states by type
  const clearLoadingByType = useCallback((type: LoadingType) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      const idsToRemove: string[] = [];
      
      for (const [id, state] of newMap.entries()) {
        if (state.type === type) {
          idsToRemove.push(id);
        }
      }
      
      idsToRemove.forEach(id => {
        newMap.delete(id);
        const timeout = timeoutsRef.current.get(id);
        if (timeout) {
          clearTimeout(timeout);
          timeoutsRef.current.delete(id);
        }
      });
      
      return newMap;
    });
    
    logger.debug(`Loading states cleared for type: ${type}`, 'LOADING_SYSTEM');
  }, []);

  // Higher-order function for automatic loading management
  const withLoading = useCallback(<T,>(
    id: string,
    type: LoadingType,
    operation: () => Promise<T>,
    options: {
      priority?: LoadingPriority;
      message?: string;
      timeout?: number;
    } = {}
  ): Promise<T> => {
    startLoading(id, type, options);
    
    return operation()
      .then(result => {
        stopLoading(id);
        return result;
      })
      .catch(error => {
        stopLoading(id);
        logger.error(`Operation failed during loading: ${id}`, 'LOADING_SYSTEM', { id, type }, error as Error);
        throw error;
      });
  }, [startLoading, stopLoading]);

  const contextValue: LoadingContextType = {
    isLoading,
    getLoadingStates,
    getHighestPriorityLoading,
    getCurrentLoadingMessage,
    getLoadingProgress,
    startLoading,
    stopLoading,
    updateLoading,
    clearAllLoading,
    clearLoadingByType,
    withLoading,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
    </LoadingContext.Provider>
  );
}

// Hook to use loading context
export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Convenient hooks for specific loading types
export function usePageLoading() {
  const { isLoading, startLoading, stopLoading, withLoading } = useLoading();
  
  return {
    isPageLoading: () => isLoading('page'),
    startPageLoading: (id: string, message?: string) => 
      startLoading(id, 'page', { priority: 'high', message }),
    stopPageLoading: (id: string) => stopLoading(id),
    withPageLoading: <T,>(id: string, operation: () => Promise<T>, message?: string) =>
      withLoading(id, 'page', operation, { priority: 'high', message })
  };
}

export function useActionLoading() {
  const { isLoading, startLoading, stopLoading, withLoading, updateLoading } = useLoading();
  
  return {
    isActionLoading: () => isLoading('action'),
    startActionLoading: (id: string, message?: string) => 
      startLoading(id, 'action', { priority: 'medium', message }),
    stopActionLoading: (id: string) => stopLoading(id),
    updateActionLoading: (id: string, message?: string, progress?: number) =>
      updateLoading(id, { message, progress }),
    withActionLoading: <T,>(id: string, operation: () => Promise<T>, message?: string) =>
      withLoading(id, 'action', operation, { priority: 'medium', message })
  };
}

export function useDataLoading() {
  const { isLoading, startLoading, stopLoading, withLoading } = useLoading();
  
  return {
    isDataLoading: () => isLoading('data'),
    startDataLoading: (id: string, message?: string) => 
      startLoading(id, 'data', { priority: 'medium', message }),
    stopDataLoading: (id: string) => stopLoading(id),
    withDataLoading: <T,>(id: string, operation: () => Promise<T>, message?: string) =>
      withLoading(id, 'data', operation, { priority: 'medium', message })
  };
}

 