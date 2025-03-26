document.addEventListener("DOMContentLoaded", () => {
    const searchBar = document.getElementById("searchBar");
    const resultsDiv = document.getElementById("results");
    let drugData = JSON.parse(localStorage.getItem("drugData")) || [];

    function displayResults(filteredData) {
        resultsDiv.innerHTML = "";
        
        if (filteredData.length === 0) {
            resultsDiv.innerHTML = "<p>No results found</p>";
            return;
        }
        
        filteredData.forEach(drug => {
            Object.keys(drug).forEach(key => {
                let title = document.createElement("div");
                title.classList.add("title");
                title.textContent = key;
                
                let data = document.createElement("div");
                data.classList.add("data");
                data.textContent = drug[key];
                
                resultsDiv.appendChild(title);
                resultsDiv.appendChild(data);
            });
            resultsDiv.appendChild(document.createElement("br"));
        });
    }

    function filterResults() {
        let query = searchBar.value.toLowerCase();
        let filteredData = drugData.filter(drug => 
            drug["Generic Name"].toLowerCase().includes(query));
        displayResults(filteredData);
    }

    searchBar.addEventListener("input", filterResults);

    displayResults(drugData); // Show all data initially
});

