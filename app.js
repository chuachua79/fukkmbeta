const GAS_URL = 'https://script.google.com/macros/s/AKfycbwITokde8-cbZWOX1N3mdAw-B_ddFo6o6uwgrssWdgu-45t4q-2I3WigzdhO-qU26wBjg/exec';  
const DB_NAME = "DrugDB";
const STORE_NAME = "drugs";
let drugData = [];
let dropdown = document.getElementById('dropdown');
let searchBar = document.getElementById('searchBar');
let resultsDiv = document.getElementById('results');

document.addEventListener("DOMContentLoaded", async () => {
    await loadData();
    registerServiceWorker();
});

async function loadData() {
    if (navigator.onLine) {
        try {
            const response = await fetch(GAS_URL);
            drugData = await response.json();
            saveToIndexedDB(drugData);
        } catch (error) {
            console.error('Error fetching data:', error);
            loadFromIndexedDB();
        }
    } else {
        loadFromIndexedDB();
    }
}

function saveToIndexedDB(data) {
    const dbRequest = indexedDB.open(DB_NAME, 1);
    dbRequest.onupgradeneeded = event => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: "GenericName" });
        }
    };

    dbRequest.onsuccess = event => {
        const db = event.target.result;
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        data.forEach(item => store.put(item));
    };
}

function loadFromIndexedDB() {
    const dbRequest = indexedDB.open(DB_NAME, 1);
    dbRequest.onsuccess = event => {
        const db = event.target.result;
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
            drugData = getAllRequest.result;
        };
    };
}

function filterResults() {
    let query = searchBar.value.toLowerCase();
    dropdown.innerHTML = '';

    if (!query) {
        dropdown.style.display = 'none';
        return;
    }

    let filteredData = drugData.filter(drug => drug.GenericName.toLowerCase().startsWith(query));

    if (filteredData.length === 0) {
        dropdown.style.display = 'none';
        return;
    }

    dropdown.style.display = 'block';
    filteredData.forEach(drug => {
        let item = document.createElement('div');
        item.textContent = drug.GenericName;
        item.onclick = () => selectDrug(drug);
        dropdown.appendChild(item);
    });
}

function selectDrug(drug) {
    dropdown.style.display = 'none';
    searchBar.value = drug.GenericName;

    resultsDiv.innerHTML = "";
    Object.keys(drug).forEach(key => {
        const title = document.createElement("div");
        title.className = "title";
        title.textContent = key.replace(/([A-Z])/g, " $1").trim();

        const data = document.createElement("div");
        data.className = "data";
        data.textContent = drug[key];

        resultsDiv.appendChild(title);
        resultsDiv.appendChild(data);
    });

    resultsDiv.style.display = 'block';
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js')
            .then(() => console.log("Service Worker Registered"))
            .catch(error => console.error("Service Worker Registration Failed:", error));
    }
}

