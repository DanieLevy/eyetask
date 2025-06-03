const CACHE_NAME = 'eyetask-v2';
const STATIC_CACHE = 'eyetask-static-v2';
const API_CACHE = 'eyetask-api-v2';

const staticUrlsToCache = [
  '/',
  '/manifest.json',
  '/admin',
];

const apiEndpoints = [
  '/api/tasks',
  '/api/projects', 
  '/api/admin/dashboard',
  '/api/analytics'
];

// Install event - cache static resources only
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(staticUrlsToCache);
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Fetch event - different strategies for different types of requests
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  
  // Handle API requests - always fetch from network first
  if (requestUrl.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(event.request));
    return;
  }
  
  // Handle static assets - cache first
  if (event.request.method === 'GET') {
    event.respondWith(handleStaticRequest(event.request));
    return;
  }
  
  // For all other requests, just fetch from network
  event.respondWith(fetch(event.request));
});

// API Request Handler - Network first, cache as fallback
async function handleApiRequest(request) {
  try {
    // Always try network first for API calls
    const networkResponse = await fetch(request);
    
    // Clone response for caching
    const responseClone = networkResponse.clone();
    
    // Only cache successful GET responses
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      // Set short cache expiration by adding timestamp
      const cacheKey = new URL(request.url);
      cacheKey.searchParams.set('_cached', Date.now().toString());
      await cache.put(cacheKey.toString(), responseClone);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);
    
    // Only fallback to cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }
    
    throw error;
  }
}

// Static Request Handler - Cache first, network fallback
async function handleStaticRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages immediately
      self.clients.claim()
    ])
  );
});

// Clear API cache periodically (every 5 minutes)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_API_CACHE') {
    event.waitUntil(
      caches.delete(API_CACHE).then(() => {
        console.log('API cache cleared');
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Handle any pending offline actions
  console.log('Background sync triggered');
} 