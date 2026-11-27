const CACHE_VERSION = 'v242';
const STATIC_CACHE_NAME = `bdc-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `bdc-runtime-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/pages/search.html',
  '/pages/request-blood.html',
  '/manifest.webmanifest',
  '/assets/css/tailwind.css?v=1',
  '/assets/css/common.css?v=147',
  '/assets/css/site-navbar.css?v=11',
  '/assets/css/login.css?v=4',
  '/assets/css/footer.css?v=2',
  '/assets/css/about.css?v=5',
  '/assets/js/pages/about-scroll-flow.js?v=1',
  '/assets/css/join.css?v=7',
  '/assets/js/modules/join-form.js?v=6',
  '/assets/css/index.css?v=125',
  '/assets/css/admin-dashboard.css?v=48',
  '/assets/css/request-blood.css?v=8',
  '/assets/css/profile.css?v=6',
  '/assets/css/donor-documents.css?v=1',
  '/assets/js/modules/certificate.js?v=4',
  '/assets/css/home.css?v=4',
  '/assets/css/home-sections.css?v=2',
  '/assets/js/app.js?v=75',
  '/assets/js/pages/blood-request.js?v=6',
  '/assets/js/modules/blood-request-api.js?v=1',
  '/assets/js/pages/static-page.js?v=26',
  '/assets/js/pages/home-preloader.js?v=5',
  '/assets/js/modules/preloader.js?v=10',
  '/assets/js/modules/carousel.js?v=4',
  '/assets/js/modules/dashboard.js?v=3',
  '/assets/js/modules/leaderboard.js?v=6',
  '/assets/js/modules/stats-counter.js?v=3',
  '/assets/js/modules/admin.js?v=16',
  '/assets/js/modules/auth.js?v=20',
  '/assets/js/modules/header.js?v=17',
  '/assets/js/modules/blood-request-admin.js?v=4',
  '/assets/js/modules/footer.js?v=3',
  '/assets/js/modules/back-to-top.js?v=11',
  '/assets/js/profile.js?v=29',
  '/assets/js/modules/auth-errors.js?v=2',
  '/assets/js/modules/birthday-wish.js?v=6',
  '/assets/js/modules/language-ui.js?v=7',
  '/assets/js/modules/language-config.js?v=6',
  '/assets/js/viewport.js',
  '/assets/js/pages/search.js?v=29',
  '/assets/js/modules/search.js?v=4',
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
    cacheNames
      .filter((name) => /^(bdc-static-|bdc-runtime-)/.test(name) && !validNames.has(name))
      .map((name) => caches.delete(name))
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

async function staleWhileRevalidate(request, cacheName, event) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request) || await caches.match(request);
  const networkUpdate = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    });

  if (cached) {
    event.waitUntil(networkUpdate.catch(() => undefined));
    return cached;
  }

  return networkUpdate;
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
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('Authorization')) return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  const isHtmlRequest =
    request.mode === 'navigate' ||
    request.destination === 'document';
  const isAssetRequest =
    request.destination === 'script' ||
    request.destination === 'style';

  if (isHtmlRequest) {
    event.respondWith(
      networkFirst(request, STATIC_CACHE_NAME).catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (isAssetRequest) {
    event.respondWith(
      staleWhileRevalidate(request, STATIC_CACHE_NAME, event)
        .catch(() => Response.error())
    );
    return;
  }

  // Only media files are cache-first. Fetch/XHR responses use the network.
  if (['image', 'font', 'manifest'].includes(request.destination)) {
    event.respondWith(
      cacheFirst(request, RUNTIME_CACHE_NAME).catch(() => Response.error())
    );
  }
});
