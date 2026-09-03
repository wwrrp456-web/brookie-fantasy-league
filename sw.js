const CACHE_NAME = 'brookie-fantasy-v1';
const APP_SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// نتدخل فقط في طلبات نفس الموقع (index.html وmanifest.json والأيقونات) —
// أي شيء خارجي (Firebase، الخطوط، html2canvas من cdnjs...) يمر مباشرة
// للشبكة بدون أي تدخل من الـ service worker، حتى لا نؤثر على المزامنة
// اللحظية أو أي طلب خارجي آخر.
// شبكة أولاً (لضمان أحدث نسخة عند توفر الإنترنت)، والرجوع للنسخة المخزّنة
// فقط عند انقطاع الاتصال.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(req))
  );
});
