// Service worker: offline cache + reminder notifications.
// Bump CACHE_NAME on every release so phones pick up the new version.
const CACHE_NAME = 'fingerprint-app-v5';
const FILES_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // Pages: network first so updates show up, cache when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE_NAME).then((c) => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }
  event.respondWith(caches.match(req).then((res) => res || fetch(req)));
});

// Reminders pushed by the server arrive here even when the app is closed.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { body: event.data ? event.data.text() : '' }; }
  event.waitUntil(self.registration.showNotification(d.title || 'نظام البصمة', {
    body: d.body || '',
    icon: './icons/icon-192x192.png',
    badge: './icons/icon-192x192.png',
    tag: d.tag || 'basma',
    renotify: true,
    actions: d.tag === 'basma-stamp' ? [{ action: 'stamped', title: '✓ بصمت التواجد' }] : [],
    requireInteraction: true,
    vibrate: [600, 200, 600, 200, 900],
    data: { url: './index.html' }
  }));
});

// Tapping a reminder opens (or focuses) the app.
// The «بصمت التواجد» action also stops the repeating stamp reminders on the server.
const PUSH_API = 'https://basma-push.basma-awqaf.workers.dev';
self.addEventListener('notificationclick', (event) => {
  const stamped = event.action === 'stamped';
  event.notification.close();
  event.waitUntil((async () => {
    if (stamped) {
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (sub) await fetch(PUSH_API + '/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sub: sub.toJSON(), rids: ['stamp'] }) });
      } catch (e) {}
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of open) { c.postMessage({ type: 'stamped' }); if ('focus' in c) return c.focus(); }
      return self.clients.openWindow('./index.html?stamped=1');
    }
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./index.html');
  })());
});
