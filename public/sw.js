const CACHE_NAME = 'eyetask-v3';
const STATIC_CACHE = 'eyetask-static-v3';
const API_CACHE = 'eyetask-api-v3';
const OFFLINE_CACHE = 'eyetask-offline-v3';

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
const OFFLINE_QUEUE_KEY = 'eyetask-offline-queue';

// Helper function to safely cache URLs
async function safeCacheUrls(cache, urls, label = '') {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        await cache.add(url);
        console.log(`Service Worker: Cached ${label} ${url}`);
        return { url, success: true };
      } catch (error) {
        console.warn(`Service Worker: Failed to cache ${label} ${url}:`, error.message);
        return { url, success: false, error: error.message };
      }
    })
  );
  
  const failed = results.filter(r => r.status === 'rejected' || !r.value.success);
  if (failed.length > 0) {
    console.warn(`Service Worker: ${failed.length} ${label} URLs failed to cache`);
  }
  
  return results;
}

// Install event - cache static resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache essential static resources
      caches.open(STATIC_CACHE).then(async (cache) => {
        console.log('Service Worker: Caching essential static resources');
        // Cache essential URLs first (these must succeed)
        await cache.addAll(staticUrlsToCache);
        
        // Cache optional URLs with error handling
        await safeCacheUrls(cache, optionalStaticUrls, 'optional');
        
        return true;
      }),
      
      // Cache offline page
      caches.open(OFFLINE_CACHE).then(async (cache) => {
        console.log('Service Worker: Caching offline page');
        try {
          await cache.add('/offline.html');
        } catch (error) {
          // Create a simple offline page if the file doesn't exist
          console.warn('Service Worker: offline.html not found, creating fallback');
          const offlineResponse = new Response(`
            <!DOCTYPE html>
            <html lang="he" dir="rtl">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>EyeTask - מצב אופליין</title>
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
      console.error('Service Worker: Install failed:', error);
      // Don't prevent installation, just log the error
      return true;
    })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
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
              cacheName.startsWith('eyetask-')
            ) {
              console.log('Service Worker: Deleting old cache:', cacheName);
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
      cacheKey.searchParams.set('_cached', Date.now().toString());
      
      // Store both the original URL and timestamped version
      await Promise.all([
        cache.put(request.url, responseClone.clone()),
        cache.put(cacheKey.toString(), responseClone)
      ]);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for API request:', request.url);
    
    // Fallback to cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('Service Worker: Serving API from cache:', request.url);
        
        // Add cache indicator header
        const modifiedResponse = new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: {
            ...cachedResponse.headers,
            'X-Served-From': 'cache',
            'X-Cache-Date': new Date().toISOString()
          }
        });
        
        return modifiedResponse;
      }
    }
    
    // No cache available, return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No network connection and no cached data available',
        cached: false
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-From': 'offline'
        }
      }
    );
  }
}

// Navigation Request Handler with offline fallback
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Cache successful navigation responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed for navigation:', request.url);
    
    // Try to serve from cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page
    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Static Request Handler - cache first strategy
async function handleStaticRequest(request) {
  try {
    // Check cache first for static assets
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Failed to fetch static asset:', request.url);
    
    // For failed static assets, return a minimal response
    return new Response('Resource not available offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Handle offline requests (POST/PUT/DELETE when offline)
async function handleOfflineRequest(request) {
  console.log('Service Worker: Handling offline request:', request.method, request.url);
  
  try {
    // Store the request for later processing
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' ? await request.text() : null,
      timestamp: Date.now(),
      id: generateRequestId()
    };
    
    await addToOfflineQueue(requestData);
    
    // Return a response indicating the request was queued
    return new Response(
      JSON.stringify({
        success: false,
        queued: true,
        message: 'Request queued for when connection is restored',
        requestId: requestData.id
      }),
      {
        status: 202, // Accepted
        headers: {
          'Content-Type': 'application/json',
          'X-Queued-For-Sync': 'true'
        }
      }
    );
  } catch (error) {
    console.error('Service Worker: Error handling offline request:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to queue request for offline processing'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Offline queue management
async function addToOfflineQueue(requestData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['offline_queue'], 'readwrite');
    const store = transaction.objectStore('offline_queue');
    const request = store.add(requestData);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function processOfflineQueue() {
  if (!navigator.onLine) {
    console.log('Service Worker: Still offline, skipping queue processing');
    return;
  }
  
  console.log('Service Worker: Processing offline queue...');
  
  try {
    const db = await openDB();
    const transaction = db.transaction(['offline_queue'], 'readwrite');
    const store = transaction.objectStore('offline_queue');
    
    const requests = await new Promise((resolve, reject) => {
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
    
    for (const requestData of requests) {
      try {
        // Recreate the request
        const fetchOptions = {
          method: requestData.method,
          headers: requestData.headers
        };
        
        if (requestData.body) {
          fetchOptions.body = requestData.body;
        }
        
        // Attempt to replay the request
        const response = await fetch(requestData.url, fetchOptions);
        
        if (response.ok) {
          // Request successful, remove from queue
          await new Promise((resolve, reject) => {
            const deleteRequest = store.delete(requestData.id);
            deleteRequest.onsuccess = () => resolve(deleteRequest.result);
            deleteRequest.onerror = () => reject(deleteRequest.error);
          });
          
          console.log('Service Worker: Successfully processed queued request:', requestData.url);
          
          // Notify the client about successful sync
          notifyClientsOfSync(requestData.id, true);
        } else {
          console.log('Service Worker: Queued request failed:', requestData.url, response.status);
          // Keep in queue for retry later
        }
      } catch (error) {
        console.error('Service Worker: Error processing queued request:', error);
        // Keep in queue for retry later
      }
    }
  } catch (error) {
    console.error('Service Worker: Error processing offline queue:', error);
  }
}

// IndexedDB setup for offline queue
async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('EyeTaskDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('offline_queue')) {
        const store = db.createObjectStore('offline_queue', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Utility functions
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function notifyClientsOfSync(requestId, success) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        requestId,
        success
      });
    });
  });
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync' || event.tag === 'offline-queue-sync') {
    event.waitUntil(processOfflineQueue());
  }
});

// Message handling from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'CLEAR_API_CACHE':
      event.waitUntil(
        caches.delete(API_CACHE).then(() => {
          console.log('Service Worker: API cache cleared');
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;
      
    case 'CLEAR_ALL_CACHE':
      event.waitUntil(
        Promise.all([
          caches.delete(API_CACHE),
          caches.delete(STATIC_CACHE)
        ]).then(() => {
          console.log('Service Worker: All caches cleared');
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;
      
    case 'PROCESS_OFFLINE_QUEUE':
      event.waitUntil(processOfflineQueue());
      break;
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(
        getCacheStatusForUrl(data?.url).then(status => {
          // Send message back to the specific client
          self.clients.get(event.source.id).then(client => {
            if (client) {
              client.postMessage({ 
                type: 'CACHE_STATUS', 
                isFromCache: status.isFromCache,
                cacheDate: status.cacheDate,
                lastSync: status.lastSync,
                url: data?.url
              });
            }
          }).catch(() => {
            // Fallback: broadcast to all clients
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({ 
                  type: 'CACHE_STATUS', 
                  isFromCache: status.isFromCache,
                  cacheDate: status.cacheDate,
                  lastSync: status.lastSync,
                  url: data?.url
                });
              });
            });
          });
        })
      );
      break;
      
    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

// Enhanced cache status for specific URLs
async function getCacheStatusForUrl(url) {
  if (!url) {
    return { isFromCache: false };
  }

  try {
    // Check if URL exists in any cache
    const cacheNames = await caches.keys();
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const response = await cache.match(url);
      
      if (response) {
        // Try to get cache date from headers
        const cacheDate = response.headers.get('X-Cache-Date') || 
                         response.headers.get('date') ||
                         new Date().toISOString();
        
        return {
          isFromCache: true,
          cacheDate,
          lastSync: localStorage?.getItem('eyetask-last-sync') || null,
          cacheName
        };
      }
    }
    
    return { isFromCache: false };
  } catch (error) {
    console.error('Service Worker: Error checking cache status:', error);
    return { isFromCache: false };
  }
}

// Get cache status for debugging
async function getCacheStatus() {
  const cacheNames = await caches.keys();
  const status = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    status[cacheName] = {
      count: keys.length,
      urls: keys.map(req => req.url).slice(0, 5) // First 5 URLs for debugging
    };
  }
  
  return status;
}

// Listen for online/offline events
self.addEventListener('online', () => {
  console.log('Service Worker: Back online, processing queue...');
  processOfflineQueue();
});

self.addEventListener('offline', () => {
  console.log('Service Worker: Gone offline');
});

console.log('Service Worker: Loaded and ready'); 