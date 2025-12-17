// Service Worker untuk Virexa Website
const CACHE_VERSION = 'virexa-v1';
const CACHE_ASSETS = [
  '/',
  '/image/logo.png',
  '/image/heroimage.webp',
  '/image/tentang1.webp',
  '/image/tentang2.webp',
  '/Galeri/galeri1.webp',
  '/Galeri/galeri2.webp',
  '/Galeri/galeri3.webp',
  '/Galeri/galeri4.webp',
  '/Galeri/galeri5.webp',
  '/Galeri/galeri6.webp',
  '/Galeri/galeri7.webp',
  '/Galeri/galeri8.webp',
  '/Galeri/galeri9.webp',
  '/Galeri/galeri10.webp',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
];

// Install event - cache assets penting
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      console.log('Caching core assets');
      return cache.addAll(CACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_VERSION) {
            console.log('Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip external domains except CDN
  const url = new URL(event.request.url);
  if (
    url.origin !== location.origin && 
    !url.hostname.includes('cdn') &&
    !url.hostname.includes('fonts')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached version if available
      if (cachedResponse) {
        // Update cache in background (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {
          // Network error, keep using cache
        });
        
        return cachedResponse;
      }

      // Fetch from network and cache it
      return fetch(event.request).then((networkResponse) => {
        // Don't cache if not successful
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // Cache images from /Galeri/ and /image/
        const responseClone = networkResponse.clone();
        if (
          url.pathname.startsWith('/Galeri/') || 
          url.pathname.startsWith('/image/')
        ) {
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return networkResponse;
      }).catch(() => {
        // Network failed, return offline page or placeholder
        return new Response('Offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
    })
  );
});

// Message event - untuk clear cache manual
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => caches.delete(cache))
        );
      }).then(() => {
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        });
      })
    );
  }
});