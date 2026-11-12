/* Arch Pad Service Worker - 100% Native Offline Engine */
const STATIC_CACHE = 'arch-pad-static-v5';
const RUNTIME_CACHE = 'arch-pad-runtime-v5';
const FONTS_CACHE = 'arch-pad-fonts-v5';

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
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      // 1. Fetch index.html and discover any script / css bundles dynamically
      try {
        const indexRes = await fetch('/index.html', { cache: 'no-cache' });
        if (indexRes.ok) {
          const indexHtml = await indexRes.text();
          await cache.put('/index.html', new Response(indexHtml, { headers: { 'Content-Type': 'text/html' } }));
          await cache.put('/', new Response(indexHtml, { headers: { 'Content-Type': 'text/html' } }));

          // Regex to extract all bundle assets from script tags and link stylesheet tags
          const scriptMatches = indexHtml.matchAll(/src=["'](\/assets\/[^"']+)["']/g);
          const linkMatches = indexHtml.matchAll(/href=["'](\/assets\/[^"']+)["']/g);
          const dynamicAssets = [];
          for (const m of scriptMatches) dynamicAssets.push(m[1]);
          for (const m of linkMatches) dynamicAssets.push(m[1]);

          await Promise.allSettled(
            dynamicAssets.map(async (assetUrl) => {
              try {
                const res = await fetch(assetUrl, { cache: 'no-cache' });
                if (res.ok) await cache.put(assetUrl, res);
              } catch (e) {}
            })
          );
        }
      } catch (e) {}

      // 2. Precache static assets with individual resilience
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (assetUrl) => {
          try {
            const response = await fetch(assetUrl, { cache: 'no-cache' });
            if (response.ok) {
              await cache.put(assetUrl, response);
            }
          } catch (err) {}
        })
      );
    })().then(() => self.skipWaiting())
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

  // CRITICAL: NEVER intercept Digital Asset Links verification requests.
  // Android OS must receive the verification response directly with Vercel's headers
  // so domain ownership is verified and the Chrome Custom Tabs (CCT) URL bar is hidden.
  if (url.pathname.startsWith('/.well-known/')) {
    return;
  }

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
        // ALWAYS check cache first for instant native-speed launch
        const cachedIndex = (await caches.match('/index.html')) || (await caches.match('/'));

        // If offline (aeroplane mode) or cache exists, return cached shell immediately
        if (!navigator.onLine && cachedIndex) {
          return cachedIndex;
        }

        // When online, attempt network with very fast fallback to cache
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);

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
        if (cachedIndex) return cachedIndex;

        // Try any cache match
        const anyCached = await caches.match(req);
        if (anyCached) return anyCached;

        // Ultimate offline recovery shell - native UI shell instead of Chrome error
        return new Response(
          '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0,viewport-fit=cover"><title>Arch Pad</title><style>body{margin:0;background:#0c1016;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;overflow:hidden}.card{text-align:center;padding:24px}.btn{margin-top:16px;padding:10px 20px;background:#3b82f6;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer}</style></head><body><div class="card"><svg width="64" height="64" viewBox="0 0 100 100" fill="none"><path d="M15 85 L85 85 L85 15 Z" fill="#1e293b" stroke="#3b82f6" stroke-width="4"/><path d="M40 70 L65 45" stroke="#60a5fa" stroke-width="6" stroke-linecap="round"/></svg><h2 style="margin:16px 0 8px">Arch Pad</h2><p style="color:#94a3b8;font-size:14px">Architectural CAD Sketchbook is ready.</p><button class="btn" onclick="location.reload()">Open Canvas</button></div></body></html>',
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
      (async () => {
        // 1. Try exact match in all caches
        const cached = await caches.match(req);
        if (cached) {
          // If online in background, refresh cache
          if (navigator.onLine) {
            fetch(req)
              .then((netRes) => {
                if (netRes && netRes.ok) {
                  caches.open(RUNTIME_CACHE).then((c) => c.put(req, netRes));
                }
              })
              .catch(() => {});
          }
          return cached;
        }

        // 2. Not cached: fetch from network
        try {
          const netRes = await fetch(req);
          if (netRes && (netRes.ok || netRes.type === 'opaque')) {
            const clone = netRes.clone();
            caches.open(RUNTIME_CACHE).then((c) => c.put(req, clone));
          }
          return netRes;
        } catch (e) {
          // If offline and request is for a js or css file that changed hash, try finding ANY cached js or css
          if (url.pathname.endsWith('.js')) {
            const keys = await caches.keys();
            for (const key of keys) {
              const c = await caches.open(key);
              const requests = await c.keys();
              const match = requests.find((r) => new URL(r.url).pathname.endsWith('.js'));
              if (match) {
                const res = await c.match(match);
                if (res) return res;
              }
            }
          }
          if (url.pathname.endsWith('.css')) {
            const keys = await caches.keys();
            for (const key of keys) {
              const c = await caches.open(key);
              const requests = await c.keys();
              const match = requests.find((r) => new URL(r.url).pathname.endsWith('.css'));
              if (match) {
                const res = await c.match(match);
                if (res) return res;
              }
            }
          }
          return new Response('', { status: 408 });
        }
      })()
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

// Built assets injected by Vite
const BUILT_ASSETS = ["/assets/index-BU0idQL0.css","/assets/index-BwbgtX0c.js"];
if (typeof PRECACHE_ASSETS !== 'undefined') { PRECACHE_ASSETS.push(...BUILT_ASSETS); }
