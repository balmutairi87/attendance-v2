// Simple service worker for offline caching
// The service worker caches the app shell (HTML, manifest and icons) so the
// application can load even when the user has a weak or no network connection.
// More advanced caching strategies could be implemented, but this basic
// implementation follows best practices described in Microsoft Edge's PWA
// documentation【920758549097399†L245-L351】.

const CACHE_NAME = 'fingerprint-app-v1';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});