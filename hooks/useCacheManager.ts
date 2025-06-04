'use client';

import { useCallback } from 'react';

// Simple cache utilities without automatic checking
export function useCacheUtils() {
  // Force reload the page
  const forceReload = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    // Clear all caches
    clearAllCaches().then(() => {
      // Reload the page
      window.location.reload();
    });
  }, []);

  // Clear all browser caches
  const clearAllCaches = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      // Clear localStorage cache version
      localStorage.removeItem('cache-version');
      
      // Clear service worker caches
      if ('serviceWorker' in navigator && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        
        // Update service worker
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.update();
        }
      }

      // Clear session storage
      sessionStorage.clear();
      
      console.log('All caches cleared successfully');
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }, []);

  // Manual refresh cache
  const refreshCache = useCallback(async () => {
    await clearAllCaches();
    window.location.reload();
  }, [clearAllCaches]);

  return {
    forceReload,
    clearAllCaches,
    refreshCache
  };
}

// Legacy export for backward compatibility
export const useCacheManager = useCacheUtils;
export const useCacheNotifications = useCacheUtils; 