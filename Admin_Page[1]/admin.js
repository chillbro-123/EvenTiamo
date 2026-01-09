// admin.js

const API_URL = "https://script.google.com/macros/s/AKfycbx522tu-XcrE1Nv9aYGlQUhHnip27oYCHPUTiSqpT3-SUCAuiNDfejAxW9W2WsbnKUrDw/exec";
const ADMIN_PIN = "9999";

let tableData = []; // will store fetched rows

function validateLogin() {
  const pin = document.getElementById("pinInput").value;
  if (pin === ADMIN_PIN) {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    loadAllData();
    setInterval(loadAllData, 10000); // auto-refresh every 10 seconds
  } else {
    alert("Incorrect PIN");
  }
}

async function loadAllData() {
  try {
    const statsRaw = await fetch(API_URL + "?admin=stats");
    const stats = await statsRaw.json();
    renderStats(stats);

    const sheetRaw = await fetch(API_URL + "?admin=sheet");
    const sheet = await sheetRaw.json();
    tableData = sheet;
    renderTable(sheet);
    renderCharts(sheet, stats);
    renderEventSummary(stats);
  } catch (err) {
    console.error("Error loading data:", err);
  }
}

function renderStats(stats) {
  document.getElementById("statTotal").textContent = "Total: " + stats.total;
  document.getElementById("statChecked").textContent = "Checked-In: " + stats.checked;
  document.getElementById("statNotChecked").textContent = "Pending: " + stats.notChecked;
}

function renderEventSummary(stats) {
  const container = document.getElementById("eventsSummary");
  container.innerHTML = "";
  for (let ev in stats.events) {
    const card = document.createElement("div");
    card.className = "event-card";
    card.innerHTML = `
      <b style="color: gold; font-size: 18px;">${ev}</b><br>
      Total: ${stats.events[ev].total}<br>
      Checked: ${stats.events[ev].checked}
    `;
    container.appendChild(card);
  }
}

function applyFilters() {
  const search = document.getElementById("searchInput").value.toLowerCase();
  const evFilter = document.getElementById("eventFilter").value;
  const statusFilter = document.getElementById("statusFilter").value;

  const filtered = tableData.filter(r => {
    const matchSearch =
      r.name.toLowerCase().includes(search) ||
      r.email.toLowerCase().includes(search) ||
      r.ticket.toLowerCase().includes(search);
    const matchEvent = evFilter === "" || r.event === evFilter;
    const matchStatus = statusFilter === "" || r.status === statusFilter;
    return matchSearch && matchEvent && matchStatus;
  });

  renderTable(filtered);
  renderCharts(filtered, null); // pass null to compute chart from filtered data
}

function resetFilters() {
  document.getElementById("searchInput").value = "";
  document.getElementById("eventFilter").value = "";
  document.getElementById("statusFilter").value = "";
  renderTable(tableData);
  renderCharts(tableData, null);
}

function renderTable(data) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  data.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.name}</td>
      <td>${r.email}</td>
      <td>${r.phone}</td>
      <td>${r.event}</td>
      <td>${r.ticket}</td>
      <td>${r.status}</td>
      <td>
        <button class="action-btn btn-resend" onclick="resend('${r.ticket}')">Resend</button>
        <button class="action-btn btn-force" onclick="forceCheckin('${r.ticket}')">Force</button>
        <button class="action-btn btn-undo" onclick="undoCheckin('${r.ticket}')">Undo</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function resend(ticket) {
  if (!confirm("Resend ticket PDF to user?")) return;
  const res = await fetch(API_URL + `?admin=resend&ticket=${encodeURIComponent(ticket)}`);
  const data = await res.json();
  alert(data.success ? "Resent!" : "Error: " + data.error);
}

async function forceCheckin(ticket) {
  if (!confirm("Mark as Checked-In?")) return;
  const res = await fetch(API_URL + `?admin=force&ticket=${encodeURIComponent(ticket)}`);
  const data = await res.json();
  if (data.success) loadAllData();
  else alert("Error: " + data.error);
}

async function undoCheckin(ticket) {
  if (!confirm("Undo check-in?")) return;
  const res = await fetch(API_URL + `?admin=undo&ticket=${encodeURIComponent(ticket)}`);
  const data = await res.json();
  if (data.success) loadAllData();
  else alert("Error: " + data.error);
}

function renderCharts(data, stats) {
  // Prepare data
  const counts = { Checked: 0, NotChecked: 0 };
  const byEvent = {};

  data.forEach(r => {
    const status = r.status === "Checked" ? "Checked" : "NotChecked";
    counts[status] = (counts[status] || 0) + 1;

    byEvent[r.event] = byEvent[r.event] || { total: 0, checked: 0 };
    byEvent[r.event].total++;
    if (r.status === "Checked") byEvent[r.event].checked++;
  });

  // Pie chart for status
  const pieCtx = document.getElementById("pieChart").getContext("2d");
  new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: ['Checked', 'Not Checked'],
      datasets: [{
        data: [counts.Checked, counts.NotChecked],
        backgroundColor: ['#00cc44', '#cc0000']
      }]
    },
    options: { responsive: true }
  });

  // Bar chart for event-wise total & checked
  const barCtx = document.getElementById("barChart").getContext("2d");
  const evNames = Object.keys(byEvent);
  const totalArr = evNames.map(ev => byEvent[ev].total);
  const checkedArr = evNames.map(ev => byEvent[ev].checked);

  new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: evNames,
      datasets: [
        { label: 'Total', data: totalArr, backgroundColor: '#4444ff' },
        { label: 'Checked', data: checkedArr, backgroundColor: '#00cc44' }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function downloadCSV() {
  const rows = tableData;
  if (!rows.length) return alert("No data to export");

  const header = ["Name","Email","Phone","Event","TicketID","Status"];
  const csv = [
    header.join(","),
    ...rows.map(r => [r.name, r.email, r.phone, r.event, r.ticket, r.status].map(v => `"${v}"`).join(","))
  ].join("\n");

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "EvenTiamo_Registrations.csv";
  a.click();
  URL.revokeObjectURL(url);
}
