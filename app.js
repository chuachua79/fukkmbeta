if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}

const dbName = "DrugDB";
const storeName = "Drugs";
let allDrugs = [];

// Open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = function (event) {
            let db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "name" });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Save drug names to IndexedDB
async function saveToDB(data) {
    let db = await openDB();
    let tx = db.transaction(storeName, "readwrite");
    let store = tx.objectStore(storeName);
    data.forEach(name => store.put({ name }));
}

// Load drug names from IndexedDB
async function loadFromDB() {
    let db = await openDB();
    let tx = db.transaction(storeName, "readonly");
    let store = tx.objectStore(storeName);
    return new Promise((resolve) => {
        let request = store.getAll();
        request.onsuccess = () => resolve(request.result.map(drug => drug.name));
    });
}

// Fetch drug names from GAS or IndexedDB
async function loadDrugNames() {
    const scriptURL = "https://script.google.com/macros/s/AKfycbxmDPoeI1_8DAoweqeiEKDd1y02idcemrxim4xrfJKJWj3RDBg78sJEh1ZsqRPPAJ_A/exec?action=getNames";
    
    if (navigator.onLine) {
        try {
            let response = await fetch(scriptURL);
            let data = await response.json();
            allDrugs = data;
            saveToDB(data); // Save for offline use
        } catch (error) {
            console.error("Error fetching drug names:", error);
        }
    } else {
        allDrugs = await loadFromDB();
    }
}

// Search drug and show suggestions
function searchDrug() {
    let input = document.getElementById("search").value.toLowerCase();
    let suggestions = allDrugs.filter(drug => drug.toLowerCase().includes(input));
    
    let suggestionBox = document.getElementById("suggestions");
    suggestionBox.innerHTML = "";
    suggestions.forEach(drug => {
        let div = document.createElement("div");
        div.innerText = drug;
        div.onclick = function() {
            document.getElementById("search").value = drug;
            suggestionBox.innerHTML = "";
            fetchDrugDetails(drug);
        };
        suggestionBox.appendChild(div);
    });
}

// Fetch drug details
async function fetchDrugDetails(drug) {
    const scriptURL = `https://script.google.com/macros/s/AKfycbxmDPoeI1_8DAoweqeiEKDd1y02idcemrxim4xrfJKJWj3RDBg78sJEh1ZsqRPPAJ_A/exec?action=getDetails&drug=${encodeURIComponent(drug)}`;

    if (navigator.onLine) {
        try {
            let response = await fetch(scriptURL);
            let data = await response.json();
            displayResult(data);
        } catch (error) {
            console.error("Error fetching details:", error);
        }
    } else {
        let result = await loadFromDB();
        let found = result.find(d => d.name.toLowerCase() === drug.toLowerCase());
        displayResult(found ? found.details : []);
    }
}

// Display drug details
function displayResult(data) {
    let resultDiv = document.getElementById("result");
    if (!data || data.length === 0) {
        resultDiv.innerHTML = "<p>No details found.</p>";
        return;
    }

    let headers = ["Generic Name", "Brand", "FUKKM System/Group", "MDC", "NEML", "Method of Purchase", "Category", "Indications", "Prescribing Restrictions", "Dosage", "Adverse Reactions", "Contraindications", "Interactions", "Precautions"];
    let formattedText = headers.map((header, i) => `<strong>${header}</strong><br>${data[i]}<br><br>`).join("");

    resultDiv.innerHTML = `<div style='font-family: Arial, sans-serif; line-height: 1.5;'>${formattedText}</div>`;
}

window.onload = loadDrugNames;
