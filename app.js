// Configuration
const GAS_URL = 'https://script.google.com/macros/s/AKfycbx9-0yfVJoYePkPl9TQbM4hqYj9vKvFdRn9iu1hJj0KDh5QoXEyQFiVucWRrH4NZlNe/exec';
const DB_NAME = 'MedicationDB';
const DB_VERSION = 1;
const STORE_NAME = 'medications';

let db;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initDB();
  initServiceWorker();
  setupEventListeners();
  checkOnlineStatus();
  
  if (navigator.onLine) syncData();
});

// Service Worker Registration
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.error('SW registration failed:', err));
  }
}

// IndexedDB Setup
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (e) => reject('DB error:', e.target.error);
    
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'Index' });
      }
    };
  });
}

// Online/Offline Detection
function checkOnlineStatus() {
  const isOffline = !navigator.onLine;
  document.getElementById('offlineBadge').style.display = isOffline ? 'block' : 'none';
  return !isOffline;
}

window.addEventListener('online', checkOnlineStatus);
window.addEventListener('offline', checkOnlineStatus);

// Data Synchronization
async function syncData() {
  try {
    const response = await fetch(`${GAS_URL}?action=getAllData`);
    const { headers, medications } = await response.json();
    
    await storeData(medications);
    localStorage.setItem('medHeaders', JSON.stringify(headers));
  } catch (err) {
    console.error('Sync failed:', err);
  }
}

// Store data in IndexedDB
function storeData(medications) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    store.clear();
    medications.forEach(med => store.put(med));
    
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

// Search Functionality
document.getElementById('searchBtn').addEventListener('click', performSearch);
document.getElementById('searchInput').addEventListener('keyup', (e) => {
  if (e.key === 'Enter') performSearch();
});

async function performSearch() {
  const term = document.getElementById('searchInput').value.trim();
  if (!term) return;
  
  const results = await (navigator.onLine ? onlineSearch(term) : offlineSearch(term));
  displayResults(results);
}

async function onlineSearch(term) {
  try {
    const response = await fetch(`${GAS_URL}?action=search&term=${encodeURIComponent(term)}`);
    return await response.json();
  } catch (err) {
    console.log('Falling back to offline search');
    return offlineSearch(term);
  }
}

async function offlineSearch(term) {
  const headers = JSON.parse(localStorage.getItem('medHeaders') || [];
  const meds = await getAllFromDB();
  
  return meds.filter(med => 
    med[headers[0]]?.toString().toLowerCase().includes(term.toLowerCase())
  );
}

function getAllFromDB() {
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    
    request.onsuccess = (e) => resolve(e.target.result || []);
    request.onerror = () => resolve([]);
  });
}

// Display Results
function displayResults(medications) {
  const container = document.getElementById('resultsContainer');
  const headers = JSON.parse(localStorage.getItem('medHeaders')) || [];
  
  if (!medications.length) {
    container.innerHTML = '<div class="alert alert-info">No medications found</div>';
    return;
  }
  
  container.innerHTML = medications.map(med => `
    <div class="card medication-card mb-3">
      <div class="card-body">
        ${headers.map(header => med[header] ? `
          <div class="med-detail">
            <span class="med-header">${header}:</span>
            <span>${med[header]}</span>
          </div>
        ` : '').join('')}
      </div>
    </div>
  `).join('');
}
