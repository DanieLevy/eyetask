'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';

interface RefreshContextType {
  setPageRefresh: (refreshFn: () => Promise<void> | void) => void;
  triggerRefresh: () => Promise<void>;
}

const RefreshContext = createContext<RefreshContextType | null>(null);

export function RefreshProvider({ children }: { children: ReactNode }) {
  const [currentRefreshFn, setCurrentRefreshFn] = useState<(() => Promise<void> | void) | null>(null);

  const setPageRefresh = useCallback((refreshFn: () => Promise<void> | void) => {
    setCurrentRefreshFn(() => refreshFn);
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (currentRefreshFn) {
      await currentRefreshFn();
    }
  }, [currentRefreshFn]);

  return (
    <RefreshContext.Provider value={{ setPageRefresh, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function usePageRefresh(refreshFn: () => Promise<void> | void) {
  const context = useContext(RefreshContext);
  
  if (!context) {
    throw new Error('usePageRefresh must be used within a RefreshProvider');
  }

  const { setPageRefresh } = context;
  
  // Use a ref to store the latest refresh function without triggering re-renders
  const refreshFnRef = useRef(refreshFn);
  
  // Update the ref when refreshFn changes, but don't trigger effect re-run
  useEffect(() => {
    refreshFnRef.current = refreshFn;
  }, [refreshFn]);
  
  // Register a stable wrapper function that calls the latest refreshFn
  useEffect(() => {
    const stableRefreshFn = () => refreshFnRef.current();
    setPageRefresh(stableRefreshFn);
    
    // Cleanup on unmount
    return () => setPageRefresh(() => {});
  }, [setPageRefresh]); // Only depend on setPageRefresh, not refreshFn
}

export function useRefreshTrigger() {
  const context = useContext(RefreshContext);
  
  if (!context) {
    throw new Error('useRefreshTrigger must be used within a RefreshProvider');
  }

  return context.triggerRefresh;
} 