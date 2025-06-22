'use client';

import { useState, useEffect, useCallback } from 'react';

interface OfflineRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount?: number;
}

interface OfflineStatus {
  isOnline: boolean;
  isOfflineMode: boolean;
  hasQueuedRequests: boolean;
  queuedRequestsCount: number;
  lastSyncAttempt?: Date;
  syncInProgress: boolean;
  isServedFromCache: boolean;
  cacheInfo: {
    hasApiCache: boolean;
    hasStaticCache: boolean;
    lastCacheUpdate: Date | null;
    cacheSize: number;
  };
  networkType: string | null;
  effectiveType: string | null;
}

interface UseOfflineStatusReturn {
  status: OfflineStatus;
  isOnline: boolean;
  syncOfflineQueue: () => Promise<void>;
  retryFailedRequests: () => Promise<void>;
  clearCache: (type?: 'api' | 'static' | 'all') => Promise<void>;
  checkCacheStatus: () => Promise<void>;
  
  // Legacy compatibility
  toggleOfflineMode: () => void;
  clearOfflineQueue: () => Promise<void>;
  addToQueue: (requestData: any) => Promise<string>;
  getQueuedRequests: () => Promise<any[]>;
  removeFromQueue: (requestId: string) => Promise<void>;
  clearApiCache: () => Promise<void>;
  getCacheStatus: () => Promise<Record<string, any>>;
}

// Storage keys
const STORAGE_KEYS = {
  LAST_SYNC: 'drivertasks-last-sync',
  CACHE_INFO: 'drivertasks-cache-info',
  OFFLINE_QUEUE: 'drivertasks-offline-queue'
} as const;

export function useOfflineStatus(): UseOfflineStatusReturn {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: true,
    isOfflineMode: false,
    hasQueuedRequests: false,
    queuedRequestsCount: 0,
    syncInProgress: false,
    isServedFromCache: false,
    cacheInfo: {
      hasApiCache: false,
      hasStaticCache: false,
      lastCacheUpdate: null,
      cacheSize: 0
    },
    networkType: null,
    effectiveType: null
  });

  // Check network connection details
  const checkNetworkInfo = useCallback(() => {
    if (typeof window === 'undefined') return;

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    const networkInfo = {
      networkType: connection?.type || null,
      effectiveType: connection?.effectiveType || null
    };

    setStatus(prev => ({
      ...prev,
      ...networkInfo
    }));
  }, []);

  // Check cache status
  const checkCacheStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      const apiCache = cacheNames.find(name => name.includes('api'));
      const staticCache = cacheNames.find(name => name.includes('static'));

      let totalSize = 0;
      let lastUpdate: Date | null = null;

      // Calculate cache size and get latest update time
      for (const cacheName of cacheNames) {
        if (cacheName.includes('drivertasks')) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          
          for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
              const cacheDate = response.headers.get('X-Cache-Date') || 
                              response.headers.get('date');
              if (cacheDate) {
                const date = new Date(cacheDate);
                if (!lastUpdate || date > lastUpdate) {
                  lastUpdate = date;
                }
              }
              
              // Estimate size (rough approximation)
              totalSize += (response.headers.get('content-length') || '1000').length;
            }
          }
        }
      }

      const cacheInfo = {
        hasApiCache: !!apiCache,
        hasStaticCache: !!staticCache,
        lastCacheUpdate: lastUpdate,
        cacheSize: totalSize
      };

      // Store cache info for persistence
      localStorage.setItem(STORAGE_KEYS.CACHE_INFO, JSON.stringify({
        ...cacheInfo,
        lastCacheUpdate: lastUpdate?.toISOString()
      }));

      setStatus(prev => ({
        ...prev,
        cacheInfo
      }));
    } catch (error) {
      console.error('Failed to check cache status:', error);
    }
  }, []);

  // Check offline queue
  const checkOfflineQueue = useCallback(async () => {
    if (typeof window === 'undefined') return;

    try {
      // Check IndexedDB queue
      const db = await openDB();
      const transaction = db.transaction(['offline_queue'], 'readonly');
      const store = transaction.objectStore('offline_queue');
      
      const requests = await new Promise<any[]>((resolve, reject) => {
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });

      setStatus(prev => ({
        ...prev,
        hasQueuedRequests: requests.length > 0,
        queuedRequestsCount: requests.length
      }));
    } catch (error) {
      // Fallback to localStorage
      const queueJson = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      const queue = queueJson ? JSON.parse(queueJson) : [];
      
      setStatus(prev => ({
        ...prev,
        hasQueuedRequests: queue.length > 0,
        queuedRequestsCount: queue.length
      }));
    }
  }, []);

  // Open IndexedDB
  const openDB = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('DriverTasksDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('offline_queue')) {
          const store = db.createObjectStore('offline_queue', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }, []);

  // Sync offline queue
  const syncOfflineQueue = useCallback(async () => {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    setStatus(prev => ({ ...prev, syncInProgress: true }));

    try {
      // Send message to service worker to process queue
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'PROCESS_OFFLINE_QUEUE'
        });
      }

      // Update last sync time
      const now = new Date();
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, now.toISOString());
      
      setStatus(prev => ({
        ...prev,
        lastSyncAttempt: now,
        syncInProgress: false
      }));

      // Recheck queue status after sync
      setTimeout(checkOfflineQueue, 1000);
    } catch (error) {
      setStatus(prev => ({ ...prev, syncInProgress: false }));
      throw error;
    }
  }, [checkOfflineQueue]);

  // Retry failed requests (alias for syncOfflineQueue)
  const retryFailedRequests = useCallback(async () => {
    return syncOfflineQueue();
  }, [syncOfflineQueue]);

  // Clear cache
  const clearCache = useCallback(async (type: 'api' | 'static' | 'all' = 'all') => {
    if (!('caches' in window)) return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const messageChannel = new MessageChannel();
        
        return new Promise<void>((resolve, reject) => {
          messageChannel.port1.onmessage = (event) => {
            if (event.data.success) {
              resolve();
              checkCacheStatus(); // Refresh cache status
            } else {
              reject(new Error('Failed to clear cache'));
            }
          };

          navigator.serviceWorker.controller?.postMessage({
            type: type === 'all' ? 'CLEAR_ALL_CACHE' : 
                  type === 'api' ? 'CLEAR_API_CACHE' : 'CLEAR_STATIC_CACHE'
          }, [messageChannel.port2]);
        });
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }, [checkCacheStatus]);

  // Initialize and set up event listeners
  useEffect(() => {
    // Initial status check
    const initialOnlineStatus = navigator.onLine;
    setStatus(prev => ({ ...prev, isOnline: initialOnlineStatus }));
    
    // Load persisted data
    const lastSyncStr = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    const cacheInfoStr = localStorage.getItem(STORAGE_KEYS.CACHE_INFO);
    
    if (lastSyncStr) {
      setStatus(prev => ({
        ...prev,
        lastSyncAttempt: new Date(lastSyncStr)
      }));
    }
    
    if (cacheInfoStr) {
      try {
        const cacheInfo = JSON.parse(cacheInfoStr);
        setStatus(prev => ({
          ...prev,
          cacheInfo: {
            ...cacheInfo,
            lastCacheUpdate: cacheInfo.lastCacheUpdate ? 
              new Date(cacheInfo.lastCacheUpdate) : null
          }
        }));
      } catch (error) {
        console.error('Failed to parse cache info:', error);
      }
    }

    // Set up event listeners
    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      checkNetworkInfo();
      
      // Auto-sync when coming back online
      setTimeout(() => {
        syncOfflineQueue().catch(console.error);
      }, 1000);
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
    };

    // Service Worker messages
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        checkOfflineQueue();
      } else if (event.data.type === 'CACHE_STATUS') {
        setStatus(prev => ({
          ...prev,
          isServedFromCache: event.data.isFromCache
        }));
      }
    };

    // Connection change handler
    const handleConnectionChange = () => {
      checkNetworkInfo();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    // Initial checks
    checkNetworkInfo();
    checkCacheStatus();
    checkOfflineQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
      
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, [checkNetworkInfo, checkCacheStatus, checkOfflineQueue, syncOfflineQueue]);

  // Toggle offline mode
  const toggleOfflineMode = useCallback(() => {
    setStatus(prev => ({
      ...prev,
      isOfflineMode: !prev.isOfflineMode
    }));
  }, []);

  // Clear offline queue
  const clearOfflineQueue = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['offline_queue'], 'readwrite');
      const store = transaction.objectStore('offline_queue');
      
      return new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
          checkOfflineQueue();
          resolve();
        };
        clearRequest.onerror = () => reject(clearRequest.error);
      });
    } catch (error) {
      console.error('Error clearing offline queue:', error);
      throw error;
    }
  }, [checkOfflineQueue]);

  // Add request to offline queue
  const addToQueue = useCallback(async (requestData: any) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['offline_queue'], 'readwrite');
      const store = transaction.objectStore('offline_queue');
      
      const dataWithId = {
        ...requestData,
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        timestamp: Date.now()
      };

      return new Promise<string>((resolve, reject) => {
        const addRequest = store.add(dataWithId);
        addRequest.onsuccess = () => {
          checkOfflineQueue();
          resolve(dataWithId.id);
        };
        addRequest.onerror = () => reject(addRequest.error);
      });
    } catch (error) {
      console.error('Error adding to queue:', error);
      throw error;
    }
  }, [checkOfflineQueue, openDB]);

  // Get queued requests
  const getQueuedRequests = useCallback(async () => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['offline_queue'], 'readonly');
      const store = transaction.objectStore('offline_queue');
      
      return new Promise<any[]>((resolve, reject) => {
        const getAllRequest = store.getAll();
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      });
    } catch (error) {
      console.error('Error getting queued requests:', error);
      // Fallback to localStorage
      const queueJson = localStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return queueJson ? JSON.parse(queueJson) : [];
    }
  }, [openDB]);

  // Remove from queue
  const removeFromQueue = useCallback(async (requestId: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['offline_queue'], 'readwrite');
      const store = transaction.objectStore('offline_queue');

      return new Promise<void>((resolve, reject) => {
        const deleteRequest = store.delete(requestId);
        deleteRequest.onsuccess = () => {
          checkOfflineQueue();
          resolve();
        };
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
    } catch (error) {
      console.error('Error removing from queue:', error);
      throw error;
    }
  }, [checkOfflineQueue, openDB]);

  // Clear API cache (legacy)
  const clearApiCache = useCallback(async () => {
    return clearCache('api');
  }, [clearCache]);

  // Get cache status (legacy)
  const getCacheStatus = useCallback(async () => {
    if (!('caches' in window)) return {};

    try {
      const cacheNames = await caches.keys();
      const status: Record<string, any> = {};
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        status[cacheName] = {
          count: keys.length,
          urls: keys.map(req => req.url).slice(0, 5)
        };
      }
      
      return status;
    } catch (error) {
      console.error('Error getting cache status:', error);
      return {};
    }
  }, []);

  return {
    status,
    isOnline: status.isOnline,
    syncOfflineQueue,
    retryFailedRequests,
    clearCache,
    checkCacheStatus,
    toggleOfflineMode,
    clearOfflineQueue,
    addToQueue,
    getQueuedRequests,
    removeFromQueue,
    clearApiCache,
    getCacheStatus
  };
}

// Utility functions
function generateRequestId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DriverTasksDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('offline_queue')) {
        const store = db.createObjectStore('offline_queue', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Helper hook for offline-aware API calls
export function useOfflineAwareApi() {
  const { status, addToQueue } = useOfflineStatus();

  const fetchWithOfflineSupport = useCallback(async (
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> => {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      // If offline and it's a mutation request, queue it
      if (!status.isOnline && options.method && options.method !== 'GET') {
        const requestId = await addToQueue({
          url,
          method: options.method,
          headers: options.headers ? Object.fromEntries(
            Object.entries(options.headers)
          ) : {},
          body: options.body ? options.body.toString() : undefined
        });

        // Return a response indicating the request was queued
        return new Response(
          JSON.stringify({
            success: false,
            queued: true,
            message: 'Request queued for when connection is restored',
            requestId
          }),
          {
            status: 202,
            headers: {
              'Content-Type': 'application/json',
              'X-Queued-For-Sync': 'true'
            }
          }
        );
      }
      
      throw error;
    }
  }, [status.isOnline, addToQueue]);

  return { fetchWithOfflineSupport };
} 