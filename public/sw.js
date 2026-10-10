/* Arch Pad Pro Service Worker - Comprehensive Offline Engine & Asset Caching */
const STATIC_CACHE = 'arch-pad-static-v2';
const RUNTIME_CACHE = 'arch-pad-runtime-v2';

// Core UI shell & offline fallback assets
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/maskable-192.png',
  '/maskable-512.png',
  '/icon-48.png',
  '/icon-72.png',
  '/icon-96.png',
  '/icon-144.png',
  '/icon-152.png',
  '/icon-192.png',
  '/icon-256.png',
  '/icon-384.png',
  '/icon-512.png',
  '/icons/icon-48.png',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-256.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/screenshots/screenshot-desktop.png',
  '/screenshots/screenshot-mobile.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Precache assets with individual resilience
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (assetUrl) => {
          try {
            const response = await fetch(assetUrl, { cache: 'no-cache' });
            if (response.ok) {
              await cache.put(assetUrl, response);
            }
          } catch (err) {
            // Silently continue if an individual asset is unavailable during build
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Bypass Google Firebase, Auth, and Cloud sync endpoints so SDK manages its own state
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('apis.google.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // 1. Navigation requests (HTML SPA shell) - Network First with immediate Offline Cache Fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const cloned = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put('/index.html', cloned);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html').then((cachedIndex) => {
            return cachedIndex || caches.match('/');
          });
        })
    );
    return;
  }

  // 2. Drawing engine scripts, UI styles, fonts, and assets - Cache-First / Stale-While-Revalidate
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/screenshots/') ||
      url.pathname.startsWith('/src/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.svg') ||
      url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.woff') ||
      url.pathname.endsWith('.woff2') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.ico'));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        // If found in cache, serve immediately while revalidating in background
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(req, clone);
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Fallback for all other GET requests: try cache first, then network
  event.respondWith(
    caches.match(req).then((cached) => {
      return (
        cached ||
        fetch(req).then((netRes) => {
          if (netRes && (netRes.status === 200 || netRes.type === 'opaque')) {
            const clone = netRes.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(req, clone);
            });
          }
          return netRes;
        })
      );
    })
  );
});

// Support manual updates or skipWaiting from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
