const CACHE_NAME = "manager-time-off-admin-v1";
const STATIC_ASSETS = [
  "/admin-offline.html",
  "/admin-manifest.webmanifest",
  "/admin-icon-180.png",
  "/admin-icon-192.png",
  "/admin-icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key.startsWith("manager-time-off-admin-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;

  // Live request/approval data must always come from the Worker/D1.
  if(url.pathname.startsWith("/api/")) return;

  // Only provide an offline fallback for the admin app. Public request
  // pages remain normal network pages and are never replaced by admin UI.
  if(
    request.mode === "navigate" &&
    url.pathname === "/admin"
  ){
    event.respondWith(
      fetch(request)
        .catch(() => caches.match("/admin-offline.html"))
    );
    return;
  }

  if(STATIC_ASSETS.includes(url.pathname)){
    event.respondWith(
      caches.match(request)
        .then(cached => cached || fetch(request))
    );
  }
});
