// Weatherow service worker — keeps the page itself on the phone so it opens fast.
//
// • The page (index.html): try the network first so updates show up straight away,
//   but if the network is slow (> 3 s) or down, use the copy saved on the phone.
// • Logo, venue icons and fonts: use the saved copy instantly and refresh it in the background.
// • Weather data (Open-Meteo, BOM proxy) is never cached here — the page handles that itself.
//
// After changing this file, bump VERSION so phones pick up the new copy.
const VERSION = 'weatherow-v1';
const PAGE_TIMEOUT_MS = 3000;

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => cache.addAll(['./', './index.html']).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache live weather data
  if (url.hostname.endsWith('open-meteo.com') || url.hostname.endsWith('workers.dev') ||
      url.hostname.endsWith('bom.gov.au')) return;

  // The page: network first, saved copy if the network is slow or down
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }

  // Same-site images/files and Google Fonts: saved copy first, refresh in the background
  if (url.origin === self.location.origin ||
      url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(req, event));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  const network = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  });
  const timeout = new Promise(resolve => setTimeout(resolve, PAGE_TIMEOUT_MS, null));
  try {
    const res = await Promise.race([network, timeout]);
    if (res) return res;
  } catch (e) { /* offline — fall through to the saved copy */ }
  const saved = await cache.match(req) || await cache.match('./index.html') || await cache.match('./');
  return saved || network; // nothing saved yet: keep waiting for the network
}

async function staleWhileRevalidate(req, event) {
  const cache = await caches.open(VERSION);
  const saved = await cache.match(req);
  const network = fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  }).catch(() => saved);
  if (saved) {
    event.waitUntil(network);
    return saved;
  }
  return network;
}
