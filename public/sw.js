// Our Little World service worker: push reminders, and a safe offline cache. Bump VERSION to refresh every cache.
const VERSION = 'v1';
const SHELL = `olw-shell-${VERSION}`; // the page itself
const FILES = `olw-files-${VERSION}`; // hashed build files and sprites

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.add(new Request(self.registration.scope, { cache: 'reload' }))).catch(() => undefined).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('olw-') && k !== SHELL && k !== FILES).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

const sameOrigin = (url) => new URL(url).origin === self.location.origin;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !sameOrigin(req.url)) return; // never touch Supabase or other sites
  const url = new URL(req.url);
  if (req.mode === 'navigate') {
    // the page: network first, the last copy when offline
    event.respondWith(
      fetch(req).then((res) => {
        if (res.ok) caches.open(SHELL).then((c) => c.put(self.registration.scope, res.clone()));
        return res;
      }).catch(() => caches.match(self.registration.scope).then((r) => r || caches.match(req))),
    );
    return;
  }
  if (/\/assets\/[^/]+-[A-Za-z0-9_-]{6,}\.(js|css)$/.test(url.pathname)) {
    // hashed build files never change, so the cache wins
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) caches.open(FILES).then((c) => c.put(req, res.clone()));
      return res;
    })));
    return;
  }
  // sprites and everything else on this site: show the saved copy now, refresh it in the background
  event.respondWith(caches.open(FILES).then((c) => c.match(req).then((hit) => {
    const fresh = fetch(req).then((res) => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || fresh;
  })));
});

self.addEventListener('push', (event) => {
  let d = {};
  try {
    d = event.data ? event.data.json() : {};
  } catch {
    d = { body: event.data ? event.data.text() : '' };
  }
  const icon = new URL('icon-192.png', self.registration.scope).href;
  event.waitUntil(
    self.registration.showNotification(d.title || 'Our Little World', { body: d.body || 'Something is waiting for you.', tag: d.tag || 'olw', icon, badge: icon, data: { url: d.url || './' }, renotify: false }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.registration.scope));
      if (open) return open.focus();
      return self.clients.openWindow(target);
    }),
  );
});
