// ============================================================================
// Service Worker (sw.js)
// Smart Classroom QR Attendance System - Offline Asset Caching
// ============================================================================

const CACHE_NAME = 'smart-classroom-qr-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './admin.html',
  './style.css',
  './firebase-init.js',
  './app.js',
  './admin.js',
  './manifest.json',
  './assets/chibi-placeholder.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Sarabun:wght@300;400;500;600;700&display=swap',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

// Install Event: Cache Core Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline shell and assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('[SW] Some assets failed to pre-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up outdated caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network-first with Cache Fallback for dynamic requests, Stale-While-Revalidate for static
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Bypass caching for Firebase backend, Google Auth, and Realtime Database calls
  if (
    requestUrl.origin.includes('firebaseio.com') ||
    requestUrl.origin.includes('googleapis.com') ||
    requestUrl.origin.includes('identitytoolkit') ||
    requestUrl.origin.includes('firebasedatabase.app') ||
    event.request.method !== 'GET'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
