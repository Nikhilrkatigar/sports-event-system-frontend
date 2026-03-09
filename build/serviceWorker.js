const CACHE_NAME = 'sports-cms-v1';
const ADMIN_ROUTES = ['/admin', '/admin/events', '/admin/registrations', '/admin/leaderboard', '/admin/gallery', '/admin/settings', '/admin/audit', '/admin/users', '/admin/scanner'];
const API_CACHE = 'sports-cms-api-v1';
const IMAGE_CACHE = 'sports-cms-images-v1';

// Assets to cache on install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Fail silently if assets don't exist yet
        console.log('[Service Worker] Some assets not yet available');
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('sports-cms-') && name !== CACHE_NAME && name !== API_CACHE && name !== IMAGE_CACHE)
          .map((name) => {
            console.log('[Service Worker] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - smart caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API calls - Network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response to cache it
          const clonedResponse = response.clone();
          caches.open(API_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
          return response;
        })
        .catch(() => {
          // Return cached API response if offline
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response(
              JSON.stringify({ error: 'Offline - no cached data available' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Images - Cache first, fallback to network
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          return (
            cachedResponse ||
            fetch(request).then((response) => {
              const clonedResponse = response.clone();
              if (response.status === 200) {
                cache.put(request, clonedResponse);
              }
              return response;
            })
          );
        });
      })
    );
    return;
  }

  // HTML pages - Network first, fallback to cache
  if (request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clonedResponse = response.clone();
          if (response.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Return cached page or offline page
          return caches.match(request).catch(() => {
            return caches.match('/');
          });
        })
    );
    return;
  }

  // Static assets (JS, CSS) - Cache first, fallback to network
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          return (
            cachedResponse ||
            fetch(request).then((response) => {
              const clonedResponse = response.clone();
              if (response.status === 200) {
                cache.put(request, clonedResponse);
              }
              return response;
            })
          );
        });
      })
    );
    return;
  }

  // Default strategy - Network first, fallback to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        const clonedResponse = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, clonedResponse);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-admin-data') {
    event.waitUntil(
      fetch('/api/audit', { method: 'POST' })
        .then(() => {
          // Notify all clients that sync is complete
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                data: 'Admin actions synced'
              });
            });
          });
        })
        .catch((err) => {
          console.log('[Service Worker] Sync failed:', err);
        })
    );
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
