// Service Worker de Autolimpeza (Self-Destruct) para limpar cache de desenvolvimento
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (e) => {
  // Sempre busca da rede, sem cachear nada durante o desenvolvimento
  e.respondWith(fetch(e.request));
});
