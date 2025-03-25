// Check if browser supports service workers
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js');
}

// Open IndexedDB
const dbName = "DrugDB";
const storeName = "Drugs";

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

// Save data to IndexedDB
async function saveToDB(data) {
    let db = await openDB();
    let tx = db.transaction(storeName, "readwrite");
    let store = tx.objectStore(storeName);
    data.forEach(item => store.put({ name: item[0], details: item })); // Store full details (including name)
}

// Load all stored drugs from IndexedDB
async function loadFromDB() {
    let db = await openDB();
    let tx = db.transaction(storeName, "readonly");
    let store = tx.objectStore(storeName);
    return new Promise((resolve) => {
        let request = store.getAll();
        request.onsuccess = () => resolve(request.result); // Return all stored drugs
    });
}

// Fetch drug names from GAS or IndexedDB
async function loadDrugNames() {
    if (navigator.onLine) {
        fetch("https://script.google.com/macros/s/AKfycbz1FVf-bQMlJPCyXOuowz7CVKyX07OOw6l4Q7dfXcPoB7UgUl02oHNz2Y4c-vFFEMZG/exec?action=getNames")
            .then(response => response.json())
            .then(async (latestData) => {
                console.log("Updating IndexedDB with the latest data...");
                await saveToDB(latestData); // Overwrite IndexedDB every time
                allDrugs = latestData.map(drug => drug[0]); // Extract drug names
            })
            .catch(error => console.error("Error fetching drug names:", error));
    } else {
        loadFromDB().then(data => {
            allDrugs = data.map(drug => drug.name);
        });
    }
}

// Search drug
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

// Fetch drug details (online & offline)
function fetchDrugDetails(drug) {
    if (navigator.onLine) {
        fetch(`https://script.google.com/macros/s/AKfycbz1FVf-bQMlJPCyXOuowz7CVKyX07OOw6l4Q7dfXcPoB7UgUl02oHNz2Y4c-vFFEMZG/exec?action=getDetails&drug=${drug}`)
            .then(response => response.json())
            .then(displayResult)
            .catch(error => console.error("Error fetching drug details:", error));
    } else {
        openDB().then(db => {
            let tx = db.transaction(storeName, "readonly");
            let store = tx.objectStore(storeName);
            let request = store.get(drug);
            request.onsuccess = () => {
                if (request.result) {
                    displayResult(request.result.details); // Use stored details
                } else {
                    displayResult([]); // Show "No details found" if not in IndexedDB
                }
            };
            request.onerror = () => displayResult([]);
        });
    }
}

// Display results
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
