import { CONFIG } from "./config.js";
import { requireAuth, logout, fetchPublicUsers, getToken } from "./auth.js";
import { fetchAllBlocks, subscribeToBlocks, fetchPresence, subscribeToPresence } from "./supabaseClient.js";
import { Countdown } from "./countdown.js";

// ------------------------------------------------------------------
// Catálogo de objetos del selector (canvas). Añade aquí el resto de
// objetos de assets/gd-imgs/objects/
// ------------------------------------------------------------------
const OBJECT_CATALOG = [
  { key: "block_basic", label: "Bloque básico", file: "block_basic.png" },
  { key: "spike", label: "Pincho", file: "spike.png" },
  { key: "orb_yellow", label: "Orbe amarillo", file: "orb_yellow.png" },
  { key: "orb_blue", label: "Orbe azul", file: "orb_blue.png" },
  { key: "portal_cube", label: "Portal cubo", file: "portal_cube.png" },
  { key: "portal_ship", label: "Portal nave", file: "portal_ship.png" },
  { key: "decoration_1", label: "Decoración", file: "decoration_1.png" },
];

let currentUser = null;
let mainViewName = "view-countdown"; // a qué vista volver desde admin/test
let countdownInstance = null;
const blocksById = new Map();

// ------------------------------------------------------------------
// Navegación entre vistas
// ------------------------------------------------------------------
function showView(name) {
  document.querySelectorAll(".view").forEach((el) => el.classList.add("view--hidden"));
  document.getElementById(name).classList.remove("view--hidden");
}

// ------------------------------------------------------------------
// Init
// ------------------------------------------------------------------
async function init() {
  currentUser = await requireAuth("/index.html");
  if (!currentUser) return;

  document.getElementById("username-label").textContent = currentUser.username;
  document.getElementById("account-icon").src = CONFIG.ACCOUNT_ICON_PATH;

  if (currentUser.role === "admin") {
    document.getElementById("admin-nav-btn").classList.remove("view--hidden-inline");
    document.getElementById("admin-nav-btn").style.display = "inline-block";
  }

  wireHeaderButtons();
  wireAdminView();
  wireTestView();

  await loadUserTickers();
  await loadEventStateAndRoute();
}

function wireHeaderButtons() {
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await logout();
    window.location.href = "/index.html";
  });

  document.getElementById("admin-nav-btn").addEventListener("click", () => showView("view-admin"));
  document.getElementById("test-nav-btn").addEventListener("click", () => showView("view-test"));
  document.getElementById("admin-back-btn").addEventListener("click", () => showView(mainViewName));
  document.getElementById("test-back-btn").addEventListener("click", () => showView(mainViewName));
}

// ------------------------------------------------------------------
// Listas laterales de usuarios registrados (contador)
// ------------------------------------------------------------------
async function loadUserTickers() {
  let usernames = [];
  try {
    usernames = await fetchPublicUsers();
  } catch {
    return; // si falla, simplemente se quedan vacías
  }
  if (usernames.length === 0) return;

  renderTicker(document.getElementById("ticker-left"), usernames);
  renderTicker(document.getElementById("ticker-right"), [...usernames].reverse());
}

function renderTicker(container, usernames) {
  const track = container.querySelector(".user-ticker__track");
  track.innerHTML = "";

  // Duplicamos la lista para que el scroll infinito (translateY -50%) sea continuo
  const doubled = [...usernames, ...usernames];
  doubled.forEach((name, i) => {
    const item = document.createElement("div");
    item.className = "user-ticker__item";
    item.textContent = name;
    item.style.animationDelay = `${(i % usernames.length) * 0.08}s`;
    track.appendChild(item);
  });
}

// ------------------------------------------------------------------
// Estado del evento → decide qué vista principal mostrar
// ------------------------------------------------------------------
async function loadEventStateAndRoute() {
  const res = await fetch(`${CONFIG.WORKER_URL}/api/event/state`);
  const { event } = await res.json();

  const waitingEl = document.getElementById("countdown-waiting-text");

  if (event.status === "running") {
    mainViewName = "view-canvas";
    showView("view-canvas");
    await initCanvasView();
    return;
  }

  // pending o finished → vista contador
  mainViewName = "view-countdown";
  showView("view-countdown");

  const countdownEl = document.getElementById("countdown");

  if (event.status === "pending" && event.starts_at) {
    waitingEl.textContent = "El evento empieza en:";
    countdownInstance = new Countdown(countdownEl, event.starts_at, async () => {
      try {
        await fetch(`${CONFIG.WORKER_URL}/api/event/auto-start`, { method: "POST" });
      } finally {
        window.location.reload();
      }
    });
  } else if (event.status === "finished") {
    countdownEl.innerHTML = "";
    waitingEl.textContent = "El evento ha terminado.";
  } else {
    countdownEl.innerHTML = "";
    waitingEl.textContent = "Esperando a que el admin inicie el evento…";
  }
}

// ------------------------------------------------------------------
// Vista canvas
// ------------------------------------------------------------------
async function initCanvasView() {
  buildObjectSelector();
  await loadBlocks();
  subscribeRealtime();
  await refreshPresence();
}

function buildObjectSelector() {
  const el = document.getElementById("object-selector");
  el.innerHTML = "";
  for (const obj of OBJECT_CATALOG) {
    const btn = document.createElement("button");
    btn.className = "object-selector__item";
    btn.title = obj.label;
    btn.innerHTML = `<img src="${CONFIG.OBJECTS_PATH}${obj.file}" alt="${obj.label}" />`;
    btn.addEventListener("click", () => selectObject(btn));
    el.appendChild(btn);
  }
}

function selectObject(btnEl) {
  document
    .querySelectorAll(".object-selector__item--active")
    .forEach((el) => el.classList.remove("object-selector__item--active"));
  btnEl.classList.add("object-selector__item--active");
  // Colocar el objeto en el canvas (cooldown de 5 min, llamada al Worker) → siguiente fase
}

async function loadBlocks() {
  const blocks = await fetchAllBlocks();
  for (const block of blocks) {
    blocksById.set(block.id, block);
    renderBlock(block);
  }
}

function renderBlock(block) {
  const canvasEl = document.getElementById("gd-canvas");
  let el = document.getElementById(`block-${block.id}`);
  if (!el) {
    el = document.createElement("img");
    el.id = `block-${block.id}`;
    el.className = "gd-canvas__object";
    canvasEl.appendChild(el);
  }
  el.src = `${CONFIG.OBJECTS_PATH}${block.object_type}.png`;
  el.style.left = `${block.x}px`;
  el.style.top = `${block.y}px`;
  el.style.transform = `rotate(${block.rotation}deg) scale(${block.scale})`;
  el.style.zIndex = block.z_index;
  if (block.color) el.style.filter = `drop-shadow(0 0 0 ${block.color})`;
}

function removeBlock(block) {
  document.getElementById(`block-${block.id}`)?.remove();
  blocksById.delete(block.id);
}

function subscribeRealtime() {
  subscribeToBlocks(
    (block) => { blocksById.set(block.id, block); renderBlock(block); },
    (block) => { blocksById.set(block.id, block); renderBlock(block); },
    (block) => removeBlock(block)
  );
  subscribeToPresence(refreshPresence);
}

async function refreshPresence() {
  const presence = await fetchPresence();
  document.getElementById("online-count").textContent = presence.length;
}

// ------------------------------------------------------------------
// Vista admin
// ------------------------------------------------------------------
async function adminApiCall(path, options = {}) {
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

function wireAdminView() {
  document.getElementById("schedule-event-btn").addEventListener("click", async () => {
    const val = document.getElementById("schedule-date").value;
    if (!val) return alert("Elige primero la fecha y hora de inicio");
    if (!confirm("¿Programar el inicio del evento para esa fecha? Durará 7 días desde entonces.")) return;
    try {
      await adminApiCall("/api/admin/schedule-event", {
        method: "POST",
        body: JSON.stringify({ starts_at: new Date(val).toISOString() }),
      });
      await refreshAdminEventState();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById("finish-event-btn").addEventListener("click", async () => {
    if (!confirm("¿Seguro que quieres FORZAR el fin del evento?")) return;
    await adminApiCall("/api/admin/finish-event", { method: "POST" });
    await refreshAdminEventState();
  });

  document.getElementById("admin-nav-btn").addEventListener("click", async () => {
    await refreshAdminEventState();
    await refreshAdminUsers();
  });
}

async function refreshAdminEventState() {
  const res = await fetch(`${CONFIG.WORKER_URL}/api/event/state`);
  const { event } = await res.json();
  document.getElementById("event-status").textContent = `Estado: ${event.status}`;
}

async function refreshAdminUsers() {
  const { users } = await adminApiCall("/api/admin/users");
  const body = document.getElementById("users-table-body");
  body.innerHTML = "";
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
    btn.className = "btn";
    btn.textContent = u.banned ? "Desbanear" : "Banear";
    btn.addEventListener("click", async () => {
      if (u.banned) {
        await adminApiCall("/api/admin/unban", { method: "POST", body: JSON.stringify({ userId: u.id }) });
      } else {
        const reason = prompt("Motivo del baneo (opcional):") || null;
        await adminApiCall("/api/admin/ban", { method: "POST", body: JSON.stringify({ userId: u.id, reason }) });
      }
      await refreshAdminUsers();
    });
    actionsCell.appendChild(btn);
    body.appendChild(tr);
  }
}

// ------------------------------------------------------------------
// Vista test (temporal — quitar antes de publicar)
// ------------------------------------------------------------------
function wireTestView() {
  document.getElementById("test-countdown-btn").addEventListener("click", () => {
    const val = document.getElementById("test-date").value;
    if (!val) return alert("Elige una fecha primero");
    const container = document.getElementById("test-countdown-container");
    new Countdown(container, new Date(val).toISOString());
  });

  document.getElementById("ping-worker-btn").addEventListener("click", async () => {
    const out = document.getElementById("ping-result");
    out.textContent = "Cargando…";
    try {
      const res = await fetch(`${CONFIG.WORKER_URL}/api/event/state`);
      out.textContent = JSON.stringify(await res.json(), null, 2);
    } catch (err) {
      out.textContent = "Error: " + err.message;
    }
  });

  document.getElementById("check-session-btn").addEventListener("click", async () => {
    const out = document.getElementById("session-result");
    out.textContent = "Cargando…";
    try {
      const res = await fetch(`${CONFIG.WORKER_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${getToken() || ""}` },
      });
      out.textContent = JSON.stringify(await res.json(), null, 2);
    } catch (err) {
      out.textContent = "Error: " + err.message;
    }
  });
}

init();
