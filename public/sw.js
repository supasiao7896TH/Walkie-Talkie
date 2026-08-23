// bump CACHE_NAME ทุกครั้งที่แก้ index.html/src/** เพื่อบังคับ client ดึงไฟล์ใหม่
const CACHE_NAME = 'wt-tracker-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// network-first: ออนไลน์ได้โค้ดล่าสุดเสมอ, ออฟไลน์ค่อย fallback ไป cache ที่เคยเก็บไว้
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
