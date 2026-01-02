// Vaeloris Service Worker - Fixed for GitHub Pages
const CACHE_NAME = 'vaeloris-v13';

// Install - cache everything needed for offline
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing new version');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './icon-192.png',
        './icon-512.png'
      ]);
    })
  );
  // Take over immediately
  self.skipWaiting();
});

// Activate - clean old caches and notify ALL clients (including installed app)
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating new version');
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => {
          console.log('Service Worker: Deleting old cache', name);
          return caches.delete(name);
        })
      );
    }).then(() => {
      // Claim all clients so the new SW controls them immediately
      return self.clients.claim();
    }).then(() => {
      // Notify all clients (browser tabs AND installed app) about the update
      return self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => {
          console.log('Service Worker: Notifying client of update');
          client.postMessage({ type: 'UPDATE_ACTIVATED' });
        });
      });
    })
  );
});

// Fetch - cache first for offline, then try network for updates
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached immediately for speed
      const fetchPromise = fetch(event.request).then((response) => {
        // Update cache with fresh version
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => {
        // Network failed, that's okay - we have cache
        console.log('Network unavailable, using cache');
      });
      
      // Return cached version immediately, update in background
      return cached || fetchPromise;
    })
  );
});

// Listen for skip waiting message from the app
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
