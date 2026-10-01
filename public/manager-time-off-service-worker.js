const CACHE_NAME = "manager-time-off-pwa-v2";
const STATIC_ASSETS = [
  "/admin-offline.html",
  "/admin-manifest.webmanifest",
  "/admin-icon-180.png",
  "/admin-icon-192.png",
  "/admin-icon-512.png",
  "/request-offline.html",
  "/request-manifest.webmanifest",
  "/request-icon-180.png",
  "/request-icon-192.png",
  "/request-icon-512.png"
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
          .filter(key => key.startsWith("manager-time-off-") && key !== CACHE_NAME)
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

  // API responses and live request data always come from Worker/D1.
  if(url.pathname.startsWith("/api/")) return;

  if(request.mode === "navigate"){
    if(url.pathname === "/admin"){
      event.respondWith(
        fetch(request).catch(() => caches.match("/admin-offline.html"))
      );
      return;
    }

    if(
      url.pathname === "/rothwell" ||
      url.pathname === "/rothwell/" ||
      url.pathname === "/request/rothwell-a14-eastbound"
    ){
      event.respondWith(
        fetch(request).catch(() => caches.match("/request-offline.html"))
      );
      return;
    }
  }

  if(STATIC_ASSETS.includes(url.pathname)){
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
  }
});
