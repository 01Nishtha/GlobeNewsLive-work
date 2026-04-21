const CACHE_NAME = 'globenews-v1';
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/manifest.json'
];

const API_CACHE_NAME = 'globenews-api-v1';
const API_ROUTES = [
  '/api/signals',
  '/api/brief',
  '/api/markets',
  '/api/predictions',
  '/api/earthquakes',
  '/api/conflicts'
];
const MAX_API_AGE = 24 * 60 * 60 * 1000; // 24 hours

// Install: cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate: claim clients immediately and clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Helper to trim signals array for cache storage
async function trimSignalsForCache(response) {
  const clone = response.clone();
  try {
    const data = await clone.json();
    if (data && Array.isArray(data.signals)) {
      data.signals = data.signals.slice(0, 50);
      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
  } catch (e) {}
  return response.clone();
}

// Fetch: cache strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API caching
  if (API_ROUTES.includes(url.pathname)) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            let responseToCache = networkResponse.clone();
            if (url.pathname === '/api/signals') {
              responseToCache = await trimSignalsForCache(networkResponse);
            }
            cache.put(request, responseToCache);
          }
          return networkResponse;
        } catch (err) {
          // Return cached version if offline
          const cached = await cache.match(request);
          if (cached) return cached;
          // Fallback empty response
          const fallback = url.pathname === '/api/signals' ? { signals: [] } : { error: 'Offline' };
          return new Response(JSON.stringify(fallback), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
    );
    return;
  }

  // Static assets: stale-while-revalidate
  if (request.mode === 'navigate' || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Same-origin assets: cache-first with network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return cached || fetch(request).catch(() => cached);
      })
    );
  }
});

// Push event handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'GlobeNews Alert', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'globenews-alert',
      requireInteraction: data.requireInteraction ?? true,
      data: data.data || {},
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
