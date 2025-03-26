const API_URL = "https://script.google.com/macros/s/AKfycbz1FVf-bQMlJPCyXOuowz7CVKyX07OOw6l4Q7dfXcPoB7UgUl02oHNz2Y4c-vFFEMZG/exec";

document.addEventListener("DOMContentLoaded", () => {
  fetchDrugNames();
});

function fetchDrugNames() {
  fetch(API_URL + "?action=getNames")
    .then(response => response.json())
    .then(data => {
      saveToIndexedDB("drugNames", data);
      displayDrugList(data);
    })
    .catch(() => {
      getFromIndexedDB("drugNames").then(displayDrugList);
    });
}

function displayDrugList(data) {
  let drugList = document.getElementById("drugList");
  drugList.innerHTML = "";
  data.forEach(drug => {
    let li = document.createElement("li");
    li.textContent = drug;
    li.onclick = () => fetchDrugDetails(drug);
    drugList.appendChild(li);
  });
}

function fetchDrugDetails(drug) {
  fetch(API_URL + "?action=getDetails&drug=" + encodeURIComponent(drug))
    .then(response => response.json())
    .then(data => {
      saveToIndexedDB("drugDetails_" + drug, data);
      displayDrugDetails(data);
    })
    .catch(() => {
      getFromIndexedDB("drugDetails_" + drug).then(displayDrugDetails);
    });
}

function displayDrugDetails(data) {
  let detailsDiv = document.getElementById("drugDetails");
  detailsDiv.innerHTML = `<h2>${data[0]}</h2><p>${data.slice(1).join(", ")}</p>`;
}

function filterDrugs() {
  let query = document.getElementById("searchBox").value.toLowerCase();
  getFromIndexedDB("drugNames").then(data => {
    let filtered = data.filter(drug => drug.toLowerCase().includes(query));
    displayDrugList(filtered);
  });
}

// IndexedDB Helper Functions
function saveToIndexedDB(storeName, data) {
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
  };
}

function getFromIndexedDB(storeName) {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open("DrugDatabase", 1);
    request.onsuccess = (event) => {
      let db = event.target.result;
      let transaction = db.transaction(storeName, "readonly");
      let store = transaction.objectStore(storeName);
      let getRequest = store.get("data");
      getRequest.onsuccess = () => resolve(getRequest.result || []);
      getRequest.onerror = () => reject();
    };
  });
}
