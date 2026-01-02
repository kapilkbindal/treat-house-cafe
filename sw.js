self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('thc-dashboard-v1').then((cache) => cache.addAll([
      './dashboard.html',
      './dashboard.js',
      './api.js',
      './manifest.json'
    ]))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});