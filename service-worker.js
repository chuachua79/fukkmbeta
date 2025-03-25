const CACHE_NAME = "drug-search-cache-v2"; // Increment version number
const URLS_TO_CACHE = [
    "index.html",
    "app.js"
];

// Install event - Cache files
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
    self.skipWaiting(); // Activate new SW immediately
});

// Activate event - Clear old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cache) => cache !== CACHE_NAME) // Delete old caches
                    .map((cache) => caches.delete(cache))
            );
        })
    );
    self.clients.claim(); // Claim active clients immediately
});

// Fetch event - Network first, fallback to cache
self.addEventListener("fetch", (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, response.clone()); // Update cache with new response
                    return response;
                });
            })
            .catch(() => caches.match(event.request)) // If offline, use cache
    );
});
