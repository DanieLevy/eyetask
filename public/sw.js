const CACHE_NAME = 'drivertasks-v3';
const STATIC_CACHE = 'drivertasks-static-v3';
const API_CACHE = 'drivertasks-api-v3';
const OFFLINE_CACHE = 'drivertasks-offline-v3';

// URLs to cache for offline functionality - only valid URLs
const staticUrlsToCache = [
  '/',
  '/manifest.json',
  '/admin'
];

// Critical resources to try caching (with error handling)
const optionalStaticUrls = [
  '/favicon.ico',
  '/offline.html'
];

// API endpoints that need caching
const apiEndpoints = [
  '/api/tasks',
  '/api/projects', 
  '/api/admin/dashboard',
  '/api/analytics',
  '/api/daily-updates'
];

// Offline task queue storage key
const OFFLINE_QUEUE_KEY = 'drivertasks-offline-queue';

// Helper function to safely cache URLs
async function safeCacheUrls(cache, urls, label = '') {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        await cache.add(url);
        return { url, success: true };
      } catch (error) {
        return { url, success: false, error: error.message };
      }
    })
  );
  
  return results;
}

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache essential static resources
      caches.open(STATIC_CACHE).then(async (cache) => {
        // Cache essential URLs first (these must succeed)
        await cache.addAll(staticUrlsToCache);
        
        // Cache optional URLs with error handling
        await safeCacheUrls(cache, optionalStaticUrls, 'optional');
        
        return true;
      }),
      
      // Cache offline page
      caches.open(OFFLINE_CACHE).then(async (cache) => {
        try {
          await cache.add('/offline.html');
        } catch (error) {
          // Create a simple offline page if the file doesn't exist
          const offlineResponse = new Response(`
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Driver Tasks - מצב אופליין</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                .container { max-width: 400px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                .icon { font-size: 48px; margin-bottom: 20px; }
                h1 { color: #333; margin-bottom: 10px; }
                p { color: #666; margin-bottom: 20px; }
                button { background: #6366f1; color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; }
                button:hover { background: #5856eb; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">📱</div>
                <h1>מצב אופליין</h1>
                <p>אין חיבור לאינטרנט. הנתונים המוצגים עשויים להיות לא מעודכנים.</p>
                <button onclick="window.location.reload()">נסה שוב</button>
              </div>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
          await cache.put('/offline.html', offlineResponse);
        }
        return true;
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ]).catch(error => {
      // Don't prevent installation, just log the error
      return true;
    })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE && 
              cacheName !== API_CACHE && 
              cacheName !== OFFLINE_CACHE &&
              cacheName.startsWith('drivertasks-')
            ) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim(),
      // Process any queued offline actions
      processOfflineQueue()
    ])
  );
});

// Fetch event - comprehensive offline handling
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Skip non-GET requests for caching (except for offline queue)
  if (event.request.method !== 'GET') {
    // Handle offline POST/PUT/DELETE requests
    if (!navigator.onLine) {
      event.respondWith(handleOfflineRequest(event.request));
      return;
    }
    
    // Online POST/PUT/DELETE - let them through normally
    return;
  }
  
  // Handle API requests
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Handle navigation requests (pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event.request));
    return;
  }
  
  // Handle static assets
  event.respondWith(handleStaticRequest(event.request));
});

// Enhanced API Request Handler with offline support
async function handleApiRequest(request) {
  try {
    // Always try network first for API calls
    const networkResponse = await fetch(request);
    
    // Clone response for caching
    const responseClone = networkResponse.clone();
    
    // Only cache successful GET responses
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      
      // Add timestamp to track cache freshness
      const cacheKey = new URL(request.url);
      cacheKey.searchParams.set('cached_at', Date.now().toString());
      
      try {
        await cache.put(request, responseClone);
      } catch (cacheError) {
        // Caching failed, but we still have the network response
      }
    }
    
    return networkResponse;
    
  } catch (networkError) {
    // Network failed, try cache
    const cache = await caches.open(API_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      // Add stale indicator to cached responses
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache-offline');
      response.headers.set('X-Cache-Time', new Date().toISOString());
      return response;
    }
    
    // No cache available, return error response
    return new Response(
      JSON.stringify({
        error: 'Network unavailable and no cached data',
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
          'X-Served-From': 'offline-fallback'
        }
      }
    );
  }
}

// Navigation Request Handler - serve pages with offline fallback
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful page responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone()).catch(() => {
        // Caching failed, but we have the response
      });
    }
    
    return networkResponse;
    
  } catch (networkError) {
    // Network failed, try cache
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // No cached page, serve offline page
    const offlineCache = await caches.open(OFFLINE_CACHE);
    const offlinePage = await offlineCache.match('/offline.html');
    
    return offlinePage || new Response('Offline - No cached content available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Static Request Handler - cache-first for static assets
async function handleStaticRequest(request) {
  try {
    // Try cache first for static assets
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone()).catch(() => {
        // Caching failed, but we have the response
      });
    }
    
    return networkResponse;
    
  } catch (networkError) {
    // Both cache and network failed
    return new Response('Resource not available offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Offline Request Handler - queue non-GET requests for later
async function handleOfflineRequest(request) {
  const requestData = {
    id: generateRequestId(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: null,
    timestamp: Date.now()
  };
  
  // Get request body if present
  try {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestData.body = await request.text();
    }
  } catch (error) {
    // Body reading failed
  }
  
  // Add to offline queue
  await addToOfflineQueue(requestData);
  
  // Return immediate response indicating the request was queued
  return new Response(
    JSON.stringify({
      queued: true,
      requestId: requestData.id,
      message: 'Request queued for when connection is restored',
      timestamp: new Date().toISOString()
    }),
    {
      status: 202,
      statusText: 'Accepted',
      headers: {
        'Content-Type': 'application/json',
        'X-Offline-Queued': 'true',
        'X-Request-ID': requestData.id
      }
    }
  );
}

// Add request to offline queue using IndexedDB
async function addToOfflineQueue(requestData) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    await store.add(requestData);
  } catch (error) {
    // Fallback to localStorage if IndexedDB fails
    try {
      const existingQueue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      existingQueue.push(requestData);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(existingQueue));
    } catch (storageError) {
      // Both storage methods failed
    }
  }
}

// Process offline queue when connection is restored
async function processOfflineQueue() {
  if (!navigator.onLine) {
    return;
  }
  
  try {
    // Try IndexedDB first
    const db = await openDB();
    const transaction = db.transaction(['offlineQueue'], 'readwrite');
    const store = transaction.objectStore('offlineQueue');
    const requests = await store.getAll();
    
    for (const requestData of requests) {
      try {
        const response = await fetch(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        // Notify clients of successful sync
        notifyClientsOfSync(requestData.id, true);
        
        // Remove from queue
        await store.delete(requestData.id);
        
      } catch (error) {
        // Request failed, leave in queue for retry
        notifyClientsOfSync(requestData.id, false);
      }
    }
    
  } catch (error) {
    // Fallback to localStorage
    try {
      const queueData = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (!queueData) return;
      
      const requests = JSON.parse(queueData);
      const remainingRequests = [];
      
      for (const requestData of requests) {
        try {
          const response = await fetch(requestData.url, {
            method: requestData.method,
            headers: requestData.headers,
            body: requestData.body
          });
          
          notifyClientsOfSync(requestData.id, true);
          
        } catch (error) {
          // Request failed, keep in queue
          remainingRequests.push(requestData);
          notifyClientsOfSync(requestData.id, false);
        }
      }
      
      // Update localStorage with remaining requests
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remainingRequests));
      
    } catch (storageError) {
      // Both storage methods failed
    }
  }
}

// Open IndexedDB for offline queue
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('DriverTasksDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offlineQueue')) {
        const store = db.createObjectStore('offlineQueue', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Generate unique request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Notify clients about sync status
function notifyClientsOfSync(requestId, success) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SYNC',
        requestId,
        success,
        timestamp: Date.now()
      });
    });
  }).catch(() => {
    // Client notification failed
  });
}

// Listen for online/offline events
self.addEventListener('online', () => {
  processOfflineQueue();
});

// Background sync (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    if (event.tag === 'offline-queue-sync') {
      event.waitUntil(processOfflineQueue());
    }
  });
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_STATUS') {
    event.ports[0].postMessage(getCacheStatus());
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.filter(name => name.startsWith('drivertasks-'))
                    .map(name => caches.delete(name))
        );
      }).then(() => {
        event.ports[0].postMessage({ cleared: true });
      })
    );
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Helper function to get cache status for specific URL
async function getCacheStatusForUrl(url) {
  try {
    const cacheNames = [STATIC_CACHE, API_CACHE, OFFLINE_CACHE];
    const status = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const response = await cache.match(url);
      status[cacheName] = {
        cached: !!response,
        timestamp: response ? response.headers.get('date') : null
      };
    }
    
    return status;
  } catch (error) {
    return { error: error.message };
  }
}

// Helper function to get overall cache status
async function getCacheStatus() {
  try {
    const cacheNames = await caches.keys();
    const drivertasksCaches = cacheNames.filter(name => name.startsWith('drivertasks-'));
    
    const status = {
      caches: drivertasksCaches,
      online: navigator.onLine,
      timestamp: new Date().toISOString(),
      lastSync: localStorage?.getItem('drivertasks-last-sync') || null,
    };
    
    // Get queue status
    try {
      const db = await openDB();
      const transaction = db.transaction(['offlineQueue'], 'readonly');
      const store = transaction.objectStore('offlineQueue');
      const count = await store.count();
      status.queuedRequests = count;
    } catch (error) {
      // Fallback to localStorage
      const queueData = localStorage.getItem(OFFLINE_QUEUE_KEY);
      status.queuedRequests = queueData ? JSON.parse(queueData).length : 0;
    }
    
    return status;
  } catch (error) {
    return { error: error.message };
  }
}

// Handle push events
self.addEventListener('push', function(event) {
  if (!event.data) {
    console.error('[SW Push] No data in push event');
    return;
  }

  try {
    const payload = event.data.json();
    console.log('[SW Push] Received notification:', payload);
    
    // iOS specific check
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    console.log('[SW Push] iOS device:', isIOS);

    const options = {
      body: payload.body || payload.message || '',
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [200, 100, 200],
      data: {
        dateOfArrival: Date.now(),
        ...payload.data
      },
      tag: payload.tag || 'default',
      requireInteraction: false, // iOS doesn't support this well
      silent: false
    };

    // iOS-specific adjustments
    if (isIOS) {
      delete options.vibrate; // iOS doesn't support vibrate
      delete options.requireInteraction;
    }

    const notificationPromise = self.registration.showNotification(
      payload.title || 'EyeTask Notification',
      options
    );

    event.waitUntil(notificationPromise.catch(error => {
      console.error('[SW Push] Error showing notification:', error);
      // Fallback notification
      return self.registration.showNotification(
        'EyeTask',
        {
          body: 'You have a new notification',
          icon: '/icons/icon-192x192.png'
        }
      );
    }));
  } catch (error) {
    console.error('[SW Push] Error processing push event:', error);
  }
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification.tag);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  const url = data.url || '/';
  
  // Handle action clicks
  if (event.action) {
    console.log('[SW] Action clicked:', event.action);
    // Handle specific actions here
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus().then(() => {
              // Navigate to URL if needed
              if (url !== '/' && client.navigate) {
                return client.navigate(url);
              }
            });
          }
        }
        // Open new window if none found
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
      .then(() => {
        // Track click
        if (data.notificationId) {
          return fetch('/api/push/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notificationId: data.notificationId,
              event: 'clicked'
            })
          }).catch(err => console.error('[SW] Failed to track click:', err));
        }
      })
  );
});

// Push subscription change event
self.addEventListener('pushsubscriptionchange', event => {
  console.log('[SW] Push subscription changed');
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription.options.applicationServerKey
    })
    .then(subscription => {
      // Send new subscription to server
      return fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          oldEndpoint: event.oldSubscription.endpoint
        })
      });
    })
    .catch(err => {
      console.error('[SW] Failed to resubscribe:', err);
    })
  );
}); 