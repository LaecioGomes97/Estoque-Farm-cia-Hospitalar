const CACHE_NAME = 'estoque-farmacia-pwa-v1';
const APP_SHELL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png'
];
const OPTIONAL_CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'
];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    // Mantém cópias de contingência das bibliotecas externas, se disponíveis na instalação.
    await Promise.all(OPTIONAL_CDN.map(async url => {
      try {
        const response = await fetch(url, { mode: 'no-cors', cache: 'reload' });
        if (response && (response.type === 'opaque' || response.ok)) await cache.put(url, response);
      } catch (_) { /* As cópias locais já estão incluídas no pacote. */ }
    }));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin || OPTIONAL_CDN.includes(event.request.url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request) || await cache.match(event.request.url);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response && (response.ok || response.type === 'opaque')) cache.put(event.request, response.clone());
        return response;
      } catch (error) {
        if (sameOrigin && event.request.mode === 'navigate') {
          return (await cache.match('./index.html')) || Response.error();
        }
        throw error;
      }
    })());
  }
});
