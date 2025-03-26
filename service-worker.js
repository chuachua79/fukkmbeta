const CACHE_NAME = "drug-search-cache-v3"; // Increment version number
const URLS_TO_CACHE = [
    "index.html",
    "app.js"
];

// Install event - Cache essential files
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
    self.clients.claim(); // Ensure new SW is active
});

// Fetch event - Cache-first for static assets, network-first for API calls
self.addEventListener("fetch", (event) => {
    if (event.request.url.includes("exec?action=")) {
        // Network-first for API calls (Google Apps Script)
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, response.clone()); // Store latest API response
                        return response;
                    });
                })
                .catch(() => caches.match(event.request) || new Response("No cached data available", { status: 503 }))
        );
    } else {
        // Cache-first for static assets (index.html, app.js)
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request).then((fetchResponse) => {
                    return caches.open(CACHE_NAME).then((cache) => {
                        if (event.request.method === "GET") {
                            cache.put(event.request, fetchResponse.clone()); // Store response only for GET requests
                        }
                        return fetchResponse;
                    });
                });
            }).catch(() => caches.match("index.html")) // Fallback if all else fails
        );
    }
});
