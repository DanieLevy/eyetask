'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

  // Register the refresh function when the component mounts
  const { setPageRefresh } = context;
  
  // Use useCallback to prevent unnecessary re-registrations
  const stableRefreshFn = useCallback(refreshFn, []);
  
  // Register the function
  React.useEffect(() => {
    setPageRefresh(stableRefreshFn);
    
    // Cleanup on unmount
    return () => setPageRefresh(() => {});
  }, [setPageRefresh, stableRefreshFn]);
}

export function useRefreshTrigger() {
  const context = useContext(RefreshContext);
  
  if (!context) {
    throw new Error('useRefreshTrigger must be used within a RefreshProvider');
  }

  return context.triggerRefresh;
} 