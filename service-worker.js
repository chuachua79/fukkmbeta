const CACHE_NAME = "drug-search-cache-v1";
const urlsToCache = [
    "/index.html",
    "/app.js"
];

// Install service worker and cache assets
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Fetch assets from cache first, then fallback to network
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

