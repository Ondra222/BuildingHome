// Jednoduchý offline režim: aplikace funguje i bez signálu na stavbě.
const C = 'stavba-v5';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'steps.js', 'design.js', 'house3d.js', 'siteai.js', 'vendor/three.module.min.js', 'vendor/OrbitControls.js', 'sample.js', 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', e => e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
