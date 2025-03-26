// Database variables
let db;
const DB_NAME = 'MedicationDB';
const DB_VERSION = 1;
const STORE_NAME = 'medications';

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initDB();
  checkOnlineStatus();
  
  // Setup event listeners
  document.getElementById('searchButton').addEventListener('click', handleSearch);
  document.getElementById('searchInput').addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  
  // Load data from Google Sheets when online
  if (navigator.onLine) {
    loadDataFromGoogleSheets();
  }
});

// Check online status and update UI
function checkOnlineStatus() {
  const offlineBadge = document.getElementById('offlineBadge');
  if (navigator.onLine) {
    offlineBadge.style.display = 'none';
  } else {
    offlineBadge.style.display = 'block';
  }
}

// Listen for online/offline events
window.addEventListener('online', function() {
  checkOnlineStatus();
  loadDataFromGoogleSheets();
});

window.addEventListener('offline', function() {
  checkOnlineStatus();
});

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = function(event) {
      console.error('Database error:', event.target.error);
      reject('Database error');
    };
    
    request.onsuccess = function(event) {
      db = event.target.result;
      console.log('Database initialized');
      resolve(db);
    };
    
    request.onupgradeneeded = function(event) {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'Index' });
        console.log('Database store created');
      }
    };
  });
}

// Load data from Google Sheets and store in IndexedDB
function loadDataFromGoogleSheets() {
  google.script.run.withSuccessHandler(function(response) {
    if (response && response.medications && response.headers) {
      // Store data in IndexedDB
      storeMedicationsInDB(response.medications);
      
      // Store headers in localStorage for offline use
      localStorage.setItem('medicationHeaders', JSON.stringify(response.headers));
    }
  }).withFailureHandler(function(error) {
    console.error('Error loading data from Google Sheets:', error);
  }).getAllMedicationData();
}

// Store medications in IndexedDB
function storeMedicationsInDB(medications) {
  if (!db) {
    console.error('Database not initialized');
    return;
  }
  
  const transaction = db.transaction([STORE_NAME], 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  
  // Clear existing data
  store.clear();
  
  // Add new data
  medications.forEach(med => {
    store.put(med);
  });
  
  transaction.oncomplete = function() {
    console.log('All medications stored in IndexedDB');
  };
  
  transaction.onerror = function(event) {
    console.error('Error storing medications:', event.target.error);
  };
}

// Handle search functionality
function handleSearch() {
  const searchTerm = document.getElementById('searchInput').value.trim();
  
  if (searchTerm === '') {
    document.getElementById('searchResults').innerHTML = '<p>Please enter a search term</p>';
    return;
  }
  
  if (navigator.onLine) {
    // Online - search via Google Apps Script
    google.script.run.withSuccessHandler(function(results) {
      displayResults(results);
    }).withFailureHandler(function(error) {
      console.error('Error searching online:', error);
      // Fallback to offline search
      searchMedicationsInDB(searchTerm);
    }).searchMedications(searchTerm);
  } else {
    // Offline - search in IndexedDB
    searchMedicationsInDB(searchTerm);
  }
}

// Search medications in IndexedDB
function searchMedicationsInDB(searchTerm) {
  if (!db) {
    console.error('Database not initialized');
    return;
  }
  
  const transaction = db.transaction([STORE_NAME], 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const request = store.getAll();
  
  request.onsuccess = function(event) {
    const allMedications = event.target.result;
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    // Get headers from localStorage
    const headers = JSON.parse(localStorage.getItem('medicationHeaders')) || [];
    
    // Filter medications
    const results = allMedications.filter(med => {
      return med[headers[0]] && med[headers[0]].toString().toLowerCase().includes(lowerSearchTerm);
    });
    
    displayResults(results);
  };
  
  request.onerror = function(event) {
    console.error('Error searching in IndexedDB:', event.target.error);
    document.getElementById('searchResults').innerHTML = '<p>Error searching medications</p>';
  };
}

// Display search results
function displayResults(medications) {
  const resultsContainer = document.getElementById('searchResults');
  
  if (medications.length === 0) {
    resultsContainer.innerHTML = '<p>No medications found</p>';
    return;
  }
  
  // Get headers from localStorage or use default
  const headers = JSON.parse(localStorage.getItem('medicationHeaders')) || 
    ['Index', 'Name', 'Generic Name', 'Class', 'Indication', 'Dosage', 'Administration', 
     'Contraindications', 'Side Effects', 'Precautions', 'Interactions', 'Pregnancy', 
     'Monitoring', 'Notes'];
  
  let html = '';
  
  medications.forEach(med => {
    html += `<div class="medication-card">`;
    
    // Display each field in its own row
    headers.forEach(header => {
      if (med[header] !== undefined && med[header] !== '') {
        html += `
          <div class="medication-detail">
            <span class="medication-header">${header}:</span>
            <span>${med[header]}</span>
          </div>
        `;
      }
    });
    
    html += `</div>`;
  });
  
  resultsContainer.innerHTML = html;
}
