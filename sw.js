// Service worker — Finanzas Personales (PWA)
const CACHE = 'finanzas-v3';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png'];
const CDN = [
  'https://cdn.jsdelivr.net/npm/react@18.3.1/umd/react.production.min.js',
  'https://cdn.jsdelivr.net/npm/react-dom@18.3.1/umd/react-dom.production.min.js',
  'https://cdn.jsdelivr.net/npm/@babel/standalone@7.26.4/babel.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    try { await c.addAll(CORE); } catch (_) {}
    await Promise.all(CDN.map(u => fetch(u).then(r => c.put(u, r)).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

function isHTML(req) {
  if (req.mode === 'navigate' || req.destination === 'document') return true;
  try { return /\/(index\.html)?(\?.*)?$/.test(new URL(req.url).pathname); }
  catch (_) { return false; }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // HTML / navegación: RED PRIMERO (siempre trae la versión más nueva)
  if (isHTML(req)) {
    e.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: 'no-store' });
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return res;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Resto (librerías CDN, íconos): CACHÉ PRIMERO
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    } catch (_) {
      return Response.error();
    }
  })());
});
