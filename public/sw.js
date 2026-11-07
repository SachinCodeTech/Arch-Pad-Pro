/* Arch Pad Pro Service Worker - Comprehensive 100% Native Offline Engine */
const STATIC_CACHE = 'arch-pad-static-v4';
const RUNTIME_CACHE = 'arch-pad-runtime-v4';
const FONTS_CACHE = 'arch-pad-fonts-v4';

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
  '/monochrome-512.png',
  '/monochrome-192.png',
  '/icons/monochrome-512.png',
  '/icons/monochrome-192.png',
  '/monochrome.svg',
  '/privacy.html',
  '/terms.html',
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
          .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE && name !== FONTS_CACHE)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Bypass Google Firebase and Auth endpoints so SDK manages its own state
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('identitytoolkit') ||
    url.hostname.includes('apis.google.com') ||
    url.hostname.includes('securetoken.googleapis.com')
  ) {
    return;
  }

  // Handle Google Fonts offline caching
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const networkResponse = await fetch(req);
          if (networkResponse && networkResponse.ok) {
            cache.put(req, networkResponse.clone());
          }
          return networkResponse;
        } catch (e) {
          return cached || new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // 1. Navigation requests (HTML SPA shell) - Aeroplane mode & offline instant load
  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(
      (async () => {
        // If device is offline, serve from cache immediately without network lag
        if (!navigator.onLine) {
          const cachedIndex = (await caches.match('/index.html')) || (await caches.match('/'));
          if (cachedIndex) return cachedIndex;
        }

        // When online or checking network, use fast race or fallback
        try {
          // Timeout fetch after 1500ms to guarantee instant app start in flaky network/aeroplane mode
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);

          const networkResponse = await fetch(req, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put('/index.html', clone.clone());
              cache.put('/', clone);
            });
            return networkResponse;
          }
        } catch (err) {
          // Network failed or timed out (Aeroplane mode)
        }

        // Return cached HTML shell
        const cached = (await caches.match('/index.html')) || (await caches.match('/'));
        if (cached) return cached;

        // Ultimate offline fallback if cache was just cleared
        return new Response(
          '<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Arch Pad</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      })()
    );
    return;
  }

  // 2. Application scripts, styles, modules, and assets - Cache-First for 100% native performance
  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/screenshots/') ||
      url.pathname.startsWith('/src/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.ts') ||
      url.pathname.endsWith('.tsx') ||
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
        // Return instantly from cache if available (native speed in aeroplane mode)
        if (cachedResponse) {
          // In the background if online, revalidate and update cache
          if (navigator.onLine) {
            fetch(req)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  const clone = networkResponse.clone();
                  caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone));
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        // Not in cache: fetch from network and store
        return fetch(req)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const clone = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone));
            }
            return networkResponse;
          })
          .catch(() => {
            return cachedResponse || new Response('', { status: 408 });
          });
      })
    );
    return;
  }

  // 3. Fallback for all other GET requests: Cache-First then Network
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((netRes) => {
          if (netRes && (netRes.status === 200 || netRes.type === 'opaque')) {
            const clone = netRes.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(req, clone));
          }
          return netRes;
        })
        .catch(() => cached || new Response('', { status: 408 }));
    })
  );
});

// Support manual updates or skipWaiting from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
