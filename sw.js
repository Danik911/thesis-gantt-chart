// Service Worker for Thesis GANTT Chart - Offline Support
const CACHE_NAME = 'thesis-gantt-chart-v1.0.0';
const STATIC_CACHE_NAME = 'thesis-gantt-static-v1.0.0';
const RUNTIME_CACHE_NAME = 'thesis-gantt-runtime-v1.0.0';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

// API endpoints and dynamic content patterns
const RUNTIME_PATTERNS = [
  /^https:\/\/api\.github\.com\//,
  /^https:\/\/.*\.github\.io\//,
  /\/api\//
];

// Image patterns for caching
const IMAGE_PATTERNS = [
  /\.(?:png|gif|jpg|jpeg|svg|webp)$/,
  /^https:\/\/avatars\.githubusercontent\.com\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== RUNTIME_CACHE_NAME
            ) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Take control of all pages
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  event.respondWith(handleFetch(request));
});

// Main fetch handler with different strategies
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // Strategy 1: Static assets - Cache First
    if (STATIC_ASSETS.some(asset => url.pathname.endsWith(asset))) {
      return await cacheFirst(request, STATIC_CACHE_NAME);
    }
    
    // Strategy 2: Images - Cache First with fallback
    if (IMAGE_PATTERNS.some(pattern => pattern.test(url.href))) {
      return await cacheFirstWithFallback(request, RUNTIME_CACHE_NAME);
    }
    
    // Strategy 3: API requests - Network First
    if (RUNTIME_PATTERNS.some(pattern => pattern.test(url.href))) {
      return await networkFirst(request, RUNTIME_CACHE_NAME);
    }
    
    // Strategy 4: HTML pages - Network First with offline fallback
    if (request.destination === 'document') {
      return await networkFirstWithOfflineFallback(request);
    }
    
    // Strategy 5: Everything else - Network First
    return await networkFirst(request, RUNTIME_CACHE_NAME);
    
  } catch (error) {
    console.log('[SW] Fetch failed:', error);
    return await getOfflineFallback(request);
  }
}

// Cache First strategy
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  const response = await fetch(request);
  if (response.status === 200) {
    cache.put(request, response.clone());
  }
  
  return response;
}

// Cache First with fallback image
async function cacheFirstWithFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return a fallback image for failed image requests
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f3f4f6"/><text x="100" y="100" text-anchor="middle" dominant-baseline="middle" fill="#9ca3af" font-family="sans-serif" font-size="14">Image not available</text></svg>',
      {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// Network First strategy
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Network First with offline fallback for HTML
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful HTML responses
    if (response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Try to find cached version
    const cache = await caches.open(RUNTIME_CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return offline page
    return getOfflinePage();
  }
}

// Get offline fallback
async function getOfflineFallback(request) {
  if (request.destination === 'document') {
    return getOfflinePage();
  }
  
  // For other requests, try cache first
  const cache = await caches.open(RUNTIME_CACHE_NAME);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  // Return empty response for failed requests
  return new Response('', { status: 408, statusText: 'Request Timeout' });
}

// Generate offline page
function getOfflinePage() {
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Offline - Thesis GANTT Chart</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          margin: 0;
          padding: 20px;
          background-color: #f9fafb;
          color: #374151;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
        }
        .container {
          text-align: center;
          max-width: 400px;
          padding: 40px 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .icon {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 700;
        }
        p {
          margin: 0 0 24px 0;
          color: #6b7280;
          line-height: 1.5;
        }
        .retry-btn {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
          min-height: 48px;
          touch-action: manipulation;
        }
        .retry-btn:hover {
          background: #2563eb;
        }
        @media (max-width: 480px) {
          .container {
            margin: 20px;
            padding: 32px 16px;
          }
          h1 {
            font-size: 20px;
          }
          .icon {
            font-size: 40px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">📋</div>
        <h1>You're Offline</h1>
        <p>
          It looks like you're not connected to the internet. 
          Some features may not be available until you reconnect.
        </p>
        <button class="retry-btn" onclick="window.location.reload()">
          Try Again
        </button>
      </div>
    </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  });
}

// Background sync for uploading data when back online
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  console.log('[SW] Performing background sync...');
  // Here you would sync any pending data
  // For example, upload pending form submissions, sync notes, etc.
}

// Push notification support
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Details',
        icon: '/logo192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/logo192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Thesis GANTT Chart', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received.');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service worker script loaded'); 