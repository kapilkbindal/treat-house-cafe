const CACHE_NAME = 'treat-house-cafe-v1.09';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      './',
      './index.html',
      './pages/order.html',
      './pages/dashboard-order.html',
      './pages/dashboard.html',
      './pages/admin.html',
      './pages/privacy-policy.html',
      './pages/terms.html',
      './styles/styles.css',
      './scripts/pricing.js',
      './scripts/script.js',
      './scripts/newsletter.js',
      './scripts/order.js',
      './scripts/dashboard.js',
      './scripts/admin.js',
      './scripts/api.js',
      './manifest.json'
    ]))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});