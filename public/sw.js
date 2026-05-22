self.addEventListener('install', (event) => {
  console.log('SW installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('SW activated');
});

self.addEventListener('fetch', (event) => {
  // Always respond with network — ensures POST bodies are forwarded correctly.
  // An empty handler without respondWith() can silently drop large POST bodies
  // in some browsers when the service worker is active.
  event.respondWith(fetch(event.request));
});
