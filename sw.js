// sw.js — PWA 서비스 워커
// 앱 셸: cache-first (오프라인 동작)
// 데이터(kits.json/meta.json): network-first (새 데이터 우선, 실패 시 캐시 폴백)

const SHELL_CACHE = 'gunpla-shell-v1';
const DATA_CACHE = 'gunpla-data-v1';
const SHELL = ['index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== SHELL_CACHE && k !== DATA_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  const isData = url.pathname.endsWith('kits.json') || url.pathname.endsWith('meta.json');

  if (isData) {
    // network-first: 최신 데이터 우선, 실패 시 캐시
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(DATA_CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
  } else {
    // cache-first: 앱 셸
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if (e.request.method === 'GET' && res.status === 200) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('index.html')))
    );
  }
});
