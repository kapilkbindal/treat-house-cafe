const CACHE_NAME = 'thc-dashboard-v4';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([
      './',
      './index.html',
      './order.html',
      './dashboard.html',
      './admin.html',
      './styles.css',
      './script.js',
      './newsletter.js',
      './order.js',
      './dashboard.js',
      './admin.js',
      './api.js',
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