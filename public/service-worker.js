const CACHE_VERSION = 'v217';
const STATIC_CACHE_NAME = `bdc-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `bdc-runtime-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/pages/search.html',
  '/pages/request-blood.html',
  '/manifest.webmanifest',
  '/assets/css/common.css?v=145',
  '/assets/css/site-navbar.css?v=8',
  '/assets/css/login.css?v=4',
  '/assets/css/footer.css?v=2',
  '/assets/css/about.css?v=5',
  '/assets/js/pages/about-scroll-flow.js?v=1',
  '/assets/css/join.css?v=6',
  '/assets/js/modules/join-form.js?v=6',
  '/assets/css/index.css?v=125',
  '/assets/css/admin-dashboard.css?v=26',
  '/assets/css/request-blood.css?v=7',
  '/assets/css/profile.css?v=6',
  '/assets/css/donor-documents.css?v=1',
  '/assets/js/modules/certificate.js?v=4',
  '/assets/css/home.css?v=4',
  '/assets/css/home-sections.css?v=2',
  '/assets/js/app.js?v=61',
  '/assets/js/pages/blood-request.js?v=6',
  '/assets/js/modules/blood-request-api.js?v=1',
  '/assets/js/pages/static-page.js?v=22',
  '/assets/js/pages/home-preloader.js?v=3',
  '/assets/js/modules/preloader.js?v=5',
  '/assets/js/modules/carousel.js?v=3',
  '/assets/js/modules/dashboard.js?v=3',
  '/assets/js/modules/leaderboard.js?v=5',
  '/assets/js/modules/stats-counter.js?v=3',
  '/assets/js/modules/admin.js?v=10',
  '/assets/js/modules/auth.js?v=16',
  '/assets/js/modules/header.js?v=13',
  '/assets/js/modules/blood-request-admin.js?v=4',
  '/assets/js/modules/footer.js?v=3',
  '/assets/js/modules/back-to-top.js?v=11',
  '/assets/js/profile.js?v=24',
  '/assets/js/modules/auth-errors.js?v=2',
  '/assets/js/modules/birthday-wish.js?v=6',
  '/assets/js/modules/language-ui.js?v=7',
  '/assets/js/modules/language-config.js?v=6',
  '/assets/js/viewport.js',
  '/assets/js/pages/search.js?v=24',
  '/assets/js/modules/search.js?v=3',
  '/assets/js/modules/utils.js',
  '/assets/js/modules/state.js',
  '/image/blood-drop.png',
  '/image/bauet-bdc-logo.webp',
  '/image/female.webp',
  '/image/male.webp'
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
      await cache.put(request, response.clone()).catch(() => {});
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
  const cached = await cache.match(request) || await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    await cache.put(request, response.clone()).catch(() => {});
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

  if (isHtmlRequest) {
    event.respondWith(
      networkFirst(event.request, STATIC_CACHE_NAME).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (isAssetRequest) {
    event.respondWith(
      networkFirst(event.request, STATIC_CACHE_NAME)
        .catch(() => Response.error())
    );
    return;
  }

  event.respondWith(
    cacheFirst(event.request, RUNTIME_CACHE_NAME).catch(() => Response.error())
  );
});
