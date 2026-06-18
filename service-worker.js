const CACHE_VERSION = 'v2';
const STATIC_CACHE_NAME = `bdc-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `bdc-runtime-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/pages/search.html',
  '/manifest.webmanifest',
  '/assets/css/common.css',
  '/assets/css/index.css',
  '/assets/js/app.js',
  '/assets/js/viewport.js',
  '/assets/js/pages/search.js',
  '/assets/js/modules/search.js',
  '/assets/js/modules/utils.js',
  '/assets/js/modules/state.js',
  '/image/blood-drop.png'
];

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const validNames = new Set([STATIC_CACHE_NAME, RUNTIME_CACHE_NAME]);
  return Promise.all(
    cacheNames.map((cacheName) => {
      if (validNames.has(cacheName)) return Promise.resolve(false);
      return caches.delete(cacheName);
    })
  );
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    cleanupOldCaches().then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const isHtmlRequest =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document';
  const isAssetRequest =
    event.request.destination === 'script' ||
    event.request.destination === 'style';

  if (isHtmlRequest || isAssetRequest) {
    event.respondWith(
      networkFirst(event.request, STATIC_CACHE_NAME).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    cacheFirst(event.request, RUNTIME_CACHE_NAME).catch(() => caches.match('/index.html'))
  );
});
