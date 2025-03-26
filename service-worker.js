const CACHE_NAME = "drug-info-cache-v1";
const DATA_CACHE_NAME = "drug-data-cache";
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/app.js",
  "/styles.css"
];

// Install Service Worker and Cache Files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate and Cleanup Old Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Handling - Use Cache for Offline Mode
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/exec?action=")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response.json().then((data) => {
            saveToIndexedDB("drugData", data);
            return new Response(JSON.stringify(data), {
              headers: { "Content-Type": "application/json" },
            });
          });
        })
        .catch(() => {
          return getFromIndexedDB("drugData").then((data) => {
            return new Response(JSON.stringify(data || []), {
              headers: { "Content-Type": "application/json" },
            });
          });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// Save Data to IndexedDB
function saveToIndexedDB(storeName, data) {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open("DrugDatabase", 1);
    request.onupgradeneeded = (event) => {
      let db = event.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = (event) => {
      let db = event.target.result;
      let transaction = db.transaction(storeName, "readwrite");
      let store = transaction.objectStore(storeName);
      store.put(data, "data");
      transaction.oncomplete = () => resolve();
    };
    request.onerror = () => reject();
  });
}

// Retrieve Data from IndexedDB
function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open("DrugDatabase", 1);
    request.onsuccess = (event) => {
      let db = event.target.result;
      let transaction = db.transaction(storeName, "readonly");
      let store = transaction.objectStore(storeName);
      let getRequest = store.get("data");
      getRequest.onsuccess = () => resolve(getRequest.result);
      getRequest.onerror = () => reject();
    };
    request.onerror = () => reject();
  });
}

