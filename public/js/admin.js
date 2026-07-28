import { CONFIG } from "./config.js";
import { requireAdmin, getToken, logout } from "./auth.js";

const usersTableBody = document.getElementById("users-table-body");
const startEventBtn = document.getElementById("start-event-btn");
const finishEventBtn = document.getElementById("finish-event-btn");
const eventStatusEl = document.getElementById("event-status");
const logoutBtn = document.getElementById("logout-btn");

async function apiCall(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${CONFIG.WORKER_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error de red");
  return data;
}

async function init() {
  const user = await requireAdmin("/canvas.html");
  if (!user) return;

  await refreshEventState();
  await refreshUsers();

  startEventBtn.addEventListener("click", async () => {
    if (!confirm("¿Seguro que quieres iniciar el evento? Empezará la cuenta atrás de 7 días.")) return;
    await apiCall("/api/admin/start-event", { method: "POST" });
    await refreshEventState();
  });

  finishEventBtn.addEventListener("click", async () => {
    if (!confirm("¿Seguro que quieres FORZAR el fin del evento?")) return;
    await apiCall("/api/admin/finish-event", { method: "POST" });
    await refreshEventState();
  });

  logoutBtn.addEventListener("click", async () => {
    await logout();
    window.location.href = "/index.html";
  });
}

async function refreshEventState() {
  const res = await fetch(`${CONFIG.WORKER_URL}/api/event/state`);
  const { event } = await res.json();
  eventStatusEl.textContent = `Estado: ${event.status}`;
}

async function refreshUsers() {
  const { users } = await apiCall("/api/admin/users");
  usersTableBody.innerHTML = "";
  for (const u of users) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.username}</td>
      <td>${u.email}</td>
      <td>${u.role}</td>
      <td>${u.banned ? `Baneado (${u.ban_reason || "sin motivo"})` : "Activo"}</td>
      <td></td>
    `;
    const actionsCell = tr.querySelector("td:last-child");
    const btn = document.createElement("button");
    btn.textContent = u.banned ? "Desbanear" : "Banear";
    btn.addEventListener("click", async () => {
      if (u.banned) {
        await apiCall("/api/admin/unban", { method: "POST", body: JSON.stringify({ userId: u.id }) });
      } else {
        const reason = prompt("Motivo del baneo (opcional):") || null;
        await apiCall("/api/admin/ban", { method: "POST", body: JSON.stringify({ userId: u.id, reason }) });
      }
      await refreshUsers();
    });
    actionsCell.appendChild(btn);
    usersTableBody.appendChild(tr);
  }
}

init();
