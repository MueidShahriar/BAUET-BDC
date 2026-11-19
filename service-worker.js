const CACHE_VERSION = 'v201';
const STATIC_CACHE_NAME = `bdc-static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `bdc-runtime-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/pages/search.html',
  '/manifest.webmanifest',
  '/assets/css/common.css?v=145',
  '/assets/css/site-navbar.css?v=8',
  '/assets/css/login.css?v=4',
  '/assets/css/footer.css?v=2',
  '/assets/css/about.css?v=5',
  '/assets/js/pages/about-scroll-flow.js?v=1',
  '/assets/css/join.css?v=6',
  '/assets/js/modules/join-form.js?v=5',
  '/assets/css/index.css?v=125',
  '/assets/css/admin-dashboard.css?v=19',
  '/assets/css/profile.css?v=5',
  '/assets/css/donor-documents.css?v=1',
  '/assets/js/modules/certificate.js?v=3',
  '/assets/css/home.css?v=4',
  '/assets/css/home-sections.css?v=2',
  '/assets/js/app.js?v=53',
  '/assets/js/pages/home-preloader.js?v=2',
  '/assets/js/modules/preloader.js?v=3',
  '/assets/js/modules/carousel.js?v=2',
  '/assets/js/modules/dashboard.js?v=3',
  '/assets/js/modules/leaderboard.js?v=4',
  '/assets/js/modules/stats-counter.js?v=3',
  '/assets/js/modules/admin.js?v=9',
  '/assets/js/modules/auth.js?v=13',
  '/assets/js/modules/header.js?v=9',
  '/assets/js/modules/footer.js?v=2',
  '/assets/js/modules/back-to-top.js?v=11',
  '/assets/js/profile.js?v=21',
  '/assets/js/modules/auth-errors.js?v=1',
  '/assets/js/modules/birthday-wish.js?v=5',
  '/assets/js/modules/language-ui.js?v=4',
  '/assets/js/modules/language-ui.js?v=6',
  '/assets/js/modules/language-config.js?v=5',
  '/assets/js/viewport.js',
  '/assets/js/pages/search.js?v=22',
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

function staleWhileRevalidate(event, request, cacheName) {
  const cachePromise = caches.open(cacheName);
  const updatePromise = fetch(request).then(async (response) => {
    if (response && response.ok) {
      const cache = await cachePromise;
      await cache.put(request, response.clone());
    }
    return response;
  });

  event.waitUntil(updatePromise.then(() => undefined, () => undefined));
  return cachePromise.then(async (cache) => {
    const cached = await cache.match(request);
    return cached || updatePromise;
  });
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
      staleWhileRevalidate(event, event.request, STATIC_CACHE_NAME)
        .catch(() => Response.error())
    );
    return;
  }

  event.respondWith(
    cacheFirst(event.request, RUNTIME_CACHE_NAME).catch(() => Response.error())
  );
});
