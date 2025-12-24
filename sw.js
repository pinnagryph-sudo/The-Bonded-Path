// The Bonded Path - Service Worker
const CACHE_NAME = 'bonded-path-v6';
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install - cache core files
self.addEventListener('install', (event) => {
  console.log('SW: Installing');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_URLS);
    })
  );
  self.skipWaiting();
});

// Activate - clean old caches and notify clients
self.addEventListener('activate', (event) => {
  console.log('SW: Activating');
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => {
          console.log('SW: Deleting old cache', name);
          return caches.delete(name);
        })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      // Notify all clients about the update
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'UPDATE_ACTIVATED' });
        });
      });
    })
  );
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).then((response) => {
      // Update cache with fresh version
      if (response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(() => {
      // Network failed, try cache
      return caches.match(event.request);
    })
  );
});

// Listen for update check messages
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    self.registration.update();
  }
});
