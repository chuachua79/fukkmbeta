const NOTICE_GAS_URL = 'https://script.google.com/macros/s/AKfycbwITokde8-cbZWOX1N3mdAw-B_ddFo6o6uwgrssWdgu-45t4q-2I3WigzdhO-qU26wBjg/exec';
let notices = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadNotices();
    displayNoticeList();
});

async function loadNotices() {
    try {
        const response = await fetch(NOTICE_GAS_URL + "?type=notice");
        notices = await response.json();
    } catch (error) {
        console.error("Error fetching notices:", error);
        document.getElementById('noticeList').innerHTML = "<p>Unable to load notices.</p>";
    }
}

function displayNoticeList() {
    const listContainer = document.getElementById("noticeList");
    listContainer.innerHTML = "";

    notices.forEach((notice, index) => {
        let item = document.createElement("div");
        item.className = "notice-item";
        item.textContent = `${notice.Date} - ${notice.Title}`;
        item.onclick = () => showNoticeDetail(index);
        listContainer.appendChild(item);
    });
}

function showNoticeDetail(index) {
    const detailContainer = document.getElementById("noticeDetail");
    const notice = notices[index];

    detailContainer.innerHTML = `
        <h3>${notice.Title}</h3>
        <p><strong>${notice.Date}</strong></p>
        <p>${notice.Detail}</p>
        <button onclick="closeDetail()">Back to list</button>
    `;

    document.getElementById("noticeList").style.display = "none";
    detailContainer.style.display = "block";
}

function closeDetail() {
    document.getElementById("noticeDetail").style.display = "none";
    document.getElementById("noticeList").style.display = "block";
}
