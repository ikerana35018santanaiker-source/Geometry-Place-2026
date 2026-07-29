import { CONFIG } from "./config.js";
import { requireAuth, logout, fetchPublicUsers, getToken } from "./auth.js";
import {
  fetchAllBlocks, subscribeToBlocks,
  fetchPresence, subscribeToPresence,
  fetchVoteTally, subscribeToVotes,
} from "./supabaseClient.js";
import { Countdown } from "./countdown.js";
import { CATEGORY_TABS, getObjectFile, isBottomAnchored } from "./objects-catalog.js";
import { exportLevelAsGmd, downloadGmdFile } from "./gmd-export.js";

const CANVAS_SIZES = {
  classic: { width: 1920, height: 1080 },
  platformer: { width: 1026, height: 1026 },
};
const COOLDOWN_MS = 5 * 60 * 1000;
const GRID_UNIT_PX = 32; // mismo tamaño que usa el CSS de fondo de cuadrícula y gmd-export.js

// Ajusta unas coordenadas a la casilla de cuadrícula más cercana (como en el
// editor real de Geometry Dash: los objetos se colocan por casillas).
// anchor "center" → punto en el centro de la casilla (bloques, la mayoría de objetos)
// anchor "bottom" → punto en el borde inferior de la casilla (pads: se apoyan
// sobre la superficie en vez de ocupar/centrarse en toda la casilla)
function snapToGrid(x, y, anchor = "center") {
  const snappedX = Math.floor(x / GRID_UNIT_PX) * GRID_UNIT_PX + GRID_UNIT_PX / 2;
  const cellTop = Math.floor(y / GRID_UNIT_PX) * GRID_UNIT_PX;
  const snappedY = anchor === "bottom" ? cellTop + GRID_UNIT_PX : cellTop + GRID_UNIT_PX / 2;
  return { x: snappedX, y: snappedY };
}

let currentUser = null;
let mainViewName = "view-countdown";
const blocksById = new Map();

// Estado del canvas
let canvasMode = null; // 'classic' | 'platformer'
let zoomScale = 1;
let currentTool = "build"; // 'build' | 'edit' | 'delete'
let activeTabId = CATEGORY_TABS[0].id;
let selectedObjectKey = null;
let dragState = null;

// Cooldowns locales (ms restantes), se van descontando cada segundo
const cooldowns = { place: 0, edit: 0, delete: 0 };
let cooldownTickHandle = null;

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
    document.getElementById("admin-nav-btn").style.display = "inline-block";
  }

  wireHeaderButtons();
  wireAdminView();
  wireTestView();
  wireModeSwitch();
  wireZoomButtons();
  wireVoteView();

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
    return;
  }
  if (usernames.length === 0) return;

  renderTicker(document.getElementById("ticker-left"), usernames);
  renderTicker(document.getElementById("ticker-right"), [...usernames].reverse());
}

function renderTicker(container, usernames) {
  const track = container.querySelector(".user-ticker__track");
  track.innerHTML = "";
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

  if (event.status === "voting") {
    mainViewName = "view-vote";
    showView("view-vote");
    startVoteView(event.voting_ends_at);
    return;
  }

  if (event.status === "running") {
    mainViewName = "view-canvas";
    showView("view-canvas");
    canvasMode = event.mode || "classic";
    await initCanvasView();
    return;
  }

  mainViewName = "view-countdown";
  showView("view-countdown");
  const countdownEl = document.getElementById("countdown");
  const waitingEl = document.getElementById("countdown-waiting-text");

  if (event.status === "pending" && event.starts_at) {
    waitingEl.textContent = "El evento empieza en:";
    new Countdown(countdownEl, event.starts_at, async () => {
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
    waitingEl.textContent = "Esperando a que el admin programe el evento…";
    pollForSchedule();
  }
}

// Mientras nadie ha programado fecha todavía, comprueba cada 5s si el admin
// ya lo hizo, y recarga la página automáticamente para todos los conectados
// (el estado del evento vive en D1, que no tiene tiempo real como Supabase,
// así que el sondeo periódico es la forma más simple de mantenerlo sincronizado).
function pollForSchedule() {
  const handle = setInterval(async () => {
    try {
      const res = await fetch(`${CONFIG.WORKER_URL}/api/event/state`);
      const { event } = await res.json();
      if (event.status !== "pending" || event.starts_at) {
        clearInterval(handle);
        window.location.reload();
      }
    } catch {
      // si falla la comprobación, se reintenta en el siguiente ciclo
    }
  }, 5000);
}

// ------------------------------------------------------------------
// Vista: Encuesta de modo
// ------------------------------------------------------------------
function wireVoteView() {
  document.getElementById("vote-classic-btn").addEventListener("click", () => castVote("classic"));
  document.getElementById("vote-platformer-btn").addEventListener("click", () => castVote("platformer"));
}

async function castVote(mode) {
  try {
    await authedApiCall("/api/vote/cast", { method: "POST", body: JSON.stringify({ mode }) });
    document.getElementById("vote-classic-btn").classList.toggle("vote-option--selected", mode === "classic");
    document.getElementById("vote-platformer-btn").classList.toggle("vote-option--selected", mode === "platformer");
    document.getElementById("vote-my-choice").textContent =
      `Tu voto: ${mode === "classic" ? "Clásico" : "Plataforma"} (puedes cambiarlo mientras dure la encuesta)`;
  } catch (err) {
    alert(err.message);
  }
}

function startVoteView(votingEndsAt) {
  refreshVoteTally();
  subscribeToVotes(refreshVoteTally);

  const timerEl = document.getElementById("vote-timer");
  const target = new Date(votingEndsAt).getTime();

  const tick = async () => {
    const remaining = target - Date.now();
    if (remaining <= 0) {
      timerEl.textContent = "00:00";
      clearInterval(handle);
      try {
        await fetch(`${CONFIG.WORKER_URL}/api/event/resolve-vote`, { method: "POST" });
      } finally {
        window.location.reload();
      }
      return;
    }
    const totalSeconds = Math.floor(remaining / 1000);
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const s = String(totalSeconds % 60).padStart(2, "0");
    timerEl.textContent = `${m}:${s}`;
  };
  tick();
  const handle = setInterval(tick, 1000);
}

async function refreshVoteTally() {
  try {
    const tally = await fetchVoteTally();
    document.getElementById("vote-count-classic").textContent = tally.classic || 0;
    document.getElementById("vote-count-platformer").textContent = tally.platformer || 0;
  } catch {
    // silencioso — se reintenta en el siguiente cambio
  }
}

// ------------------------------------------------------------------
// Vista: Canvas
// ------------------------------------------------------------------
async function initCanvasView() {
  buildToolsTabs();
  buildToolsGrid();
  applyCanvasSize();
  wireCanvasClicks();

  await loadBlocks();
  subscribeRealtime();
  await refreshPresence();
  await refreshMyCooldowns();
  startCooldownTicker();
}

function wireModeSwitch() {
  document.querySelectorAll(".mode-switch__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentTool = btn.dataset.mode;
      document.querySelectorAll(".mode-switch__btn").forEach((b) =>
        b.classList.toggle("mode-switch__btn--active", b === btn)
      );
      document.getElementById("gd-canvas").classList.remove("mode-build", "mode-edit", "mode-delete");
      document.getElementById("gd-canvas").classList.add(`mode-${currentTool}`);
      updateCooldownDisplay();
    });
  });
}

function wireZoomButtons() {
  document.getElementById("zoom-in-btn").addEventListener("click", () => setZoom(zoomScale * 1.25));
  document.getElementById("zoom-out-btn").addEventListener("click", () => setZoom(zoomScale / 1.25));
}

function setZoom(newScale) {
  zoomScale = Math.min(3, Math.max(0.15, newScale));
  applyCanvasSize();
  for (const block of blocksById.values()) renderBlock(block);
}

function applyCanvasSize() {
  const size = CANVAS_SIZES[canvasMode] || CANVAS_SIZES.classic;
  const canvasEl = document.getElementById("gd-canvas");
  canvasEl.style.width = `${size.width * zoomScale}px`;
  canvasEl.style.height = `${size.height * zoomScale}px`;
  canvasEl.style.backgroundSize = `${GRID_UNIT_PX * zoomScale}px ${GRID_UNIT_PX * zoomScale}px`;
  canvasEl.classList.remove("mode-build", "mode-edit", "mode-delete");
  canvasEl.classList.add(`mode-${currentTool}`);
}

function buildToolsTabs() {
  const tabsEl = document.getElementById("tools-tabs");
  tabsEl.innerHTML = "";
  for (const tab of CATEGORY_TABS) {
    const btn = document.createElement("button");
    btn.textContent = tab.label;
    btn.className = tab.id === activeTabId ? "active" : "";
    btn.addEventListener("click", () => {
      activeTabId = tab.id;
      buildToolsTabs();
      buildToolsGrid();
    });
    tabsEl.appendChild(btn);
  }
}

function buildToolsGrid() {
  const gridEl = document.getElementById("tools-grid");
  gridEl.innerHTML = "";
  const tab = CATEGORY_TABS.find((t) => t.id === activeTabId);
  for (const group of tab.groups) {
    for (const item of group.items) {
      const btn = document.createElement("button");
      btn.className = "tools-panel__item" + (item.key === selectedObjectKey ? " tools-panel__item--active" : "");
      btn.title = item.label;
      btn.innerHTML = `<img src="${CONFIG.OBJECTS_PATH}${item.file}" alt="${item.label}" />`;
      btn.addEventListener("click", () => {
        selectedObjectKey = item.key;
        buildToolsGrid();
      });
      gridEl.appendChild(btn);
    }
  }
}

// --- Coordenadas: pantalla → canvas (sin escalar), usando scroll + zoom ---
function screenToCanvas(clientX, clientY) {
  const viewport = document.getElementById("gd-canvas-viewport");
  const rect = viewport.getBoundingClientRect();
  const xInViewport = clientX - rect.left + viewport.scrollLeft;
  const yInViewport = clientY - rect.top + viewport.scrollTop;
  return { x: xInViewport / zoomScale, y: yInViewport / zoomScale };
}

function wireCanvasClicks() {
  const canvasEl = document.getElementById("gd-canvas");
  canvasEl.addEventListener("click", async (e) => {
    if (currentTool !== "build" || !selectedObjectKey) return;
    if (cooldowns.place > 0) return;
    const raw = screenToCanvas(e.clientX, e.clientY);
    const { x, y } = snapToGrid(raw.x, raw.y, isBottomAnchored(selectedObjectKey) ? "bottom" : "center");
    try {
      const data = await authedApiCall("/api/blocks/place", {
        method: "POST",
        body: JSON.stringify({ object_type: selectedObjectKey, x, y }),
      });
      blocksById.set(data.block.id, data.block);
      renderBlock(data.block);
      cooldowns.place = COOLDOWN_MS;
      updateCooldownDisplay();
    } catch (err) {
      if (err.retry_after_ms) {
        cooldowns.place = err.retry_after_ms;
        updateCooldownDisplay();
      } else {
        alert(err.message);
      }
    }
  });
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
    attachBlockHandlers(el, block);
  }
  const file = getObjectFile(block.object_type);
  el.src = file ? `${CONFIG.OBJECTS_PATH}${file}` : "";
  el.style.left = `${block.x * zoomScale}px`;
  el.style.top = `${block.y * zoomScale}px`;
  const baseSize = 32 * zoomScale * (block.scale || 1);
  el.style.width = `${baseSize}px`;
  el.style.height = `${baseSize}px`;
  const originY = isBottomAnchored(block.object_type) ? "-100%" : "-50%";
  el.style.transform = `translate(-50%, ${originY}) rotate(${block.rotation || 0}deg)`;
  el.style.zIndex = block.z_index || 0;
  if (block.color) el.style.filter = `drop-shadow(0 0 0 ${block.color})`;
  el._block = block;
}

function removeBlock(block) {
  document.getElementById(`block-${block.id}`)?.remove();
  blocksById.delete(block.id);
}

function attachBlockHandlers(el, block) {
  el.addEventListener("pointerdown", (e) => {
    const current = el._block || block;
    if (currentTool === "delete") {
      e.stopPropagation();
      handleDeleteClick(current);
    } else if (currentTool === "edit") {
      e.stopPropagation();
      startDrag(e, el, current);
    }
  });
}

async function handleDeleteClick(block) {
  if (cooldowns.delete > 0) return;
  if (!confirm("¿Borrar este objeto? Tendrás que esperar 5 minutos para volver a borrar otro.")) return;
  try {
    await authedApiCall("/api/blocks/delete", { method: "POST", body: JSON.stringify({ id: block.id }) });
    removeBlock(block);
    cooldowns.delete = COOLDOWN_MS;
    updateCooldownDisplay();
  } catch (err) {
    if (err.retry_after_ms) {
      cooldowns.delete = err.retry_after_ms;
      updateCooldownDisplay();
    } else {
      alert(err.message);
    }
  }
}

function startDrag(e, el, block) {
  if (cooldowns.edit > 0) return;
  el.setPointerCapture(e.pointerId);
  el.classList.add("gd-canvas__object--selected");
  dragState = { el, block, newX: null, newY: null };

  const onMove = (ev) => {
    const { x, y } = screenToCanvas(ev.clientX, ev.clientY);
    el.style.left = `${x * zoomScale}px`;
    el.style.top = `${y * zoomScale}px`;
    dragState.newX = x;
    dragState.newY = y;
  };

  const onUp = async () => {
    el.removeEventListener("pointermove", onMove);
    el.removeEventListener("pointerup", onUp);
    el.classList.remove("gd-canvas__object--selected");

    if (dragState.newX == null) {
      dragState = null;
      return;
    }
    try {
      const data = await authedApiCall("/api/blocks/edit", {
        method: "POST",
        body: JSON.stringify({ id: block.id, x: dragState.newX, y: dragState.newY }),
      });
      blocksById.set(data.block.id, data.block);
      renderBlock(data.block);
      cooldowns.edit = COOLDOWN_MS;
      updateCooldownDisplay();
    } catch (err) {
      renderBlock(block); // revertir visualmente
      if (err.retry_after_ms) {
        cooldowns.edit = err.retry_after_ms;
        updateCooldownDisplay();
      } else {
        alert(err.message);
      }
    }
    dragState = null;
  };

  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
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

async function refreshMyCooldowns() {
  try {
    const data = await authedApiCall("/api/blocks/my-cooldowns", { method: "GET" });
    cooldowns.place = data.place_remaining_ms;
    cooldowns.edit = data.edit_remaining_ms;
    cooldowns.delete = data.delete_remaining_ms;
    updateCooldownDisplay();
  } catch {
    // si falla, se queda en 0 (asume que puede actuar) y el servidor lo validará igualmente
  }
}

function startCooldownTicker() {
  if (cooldownTickHandle) clearInterval(cooldownTickHandle);
  cooldownTickHandle = setInterval(() => {
    for (const key of Object.keys(cooldowns)) {
      cooldowns[key] = Math.max(0, cooldowns[key] - 1000);
    }
    updateCooldownDisplay();
  }, 1000);
}

function updateCooldownDisplay() {
  const labelEl = document.getElementById("cooldown-label");
  const timeEl = document.getElementById("cooldown-time");
  const displayEl = document.querySelector(".cooldown-display");

  labelEl.textContent = currentTool.toUpperCase();
  const remaining = cooldowns[currentTool] || 0;
  const totalSeconds = Math.ceil(remaining / 1000);
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const s = String(totalSeconds % 60).padStart(2, "0");
  timeEl.textContent = `${m}:${s}`;
  displayEl.classList.toggle("cooldown-display--ready", remaining <= 0);
}

// ------------------------------------------------------------------
// Llamadas autenticadas genéricas al Worker
// ------------------------------------------------------------------
async function authedApiCall(path, options = {}) {
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
  if (!res.ok) {
    const err = new Error(data.error || "Error de red");
    Object.assign(err, data);
    throw err;
  }
  return data;
}

// ------------------------------------------------------------------
// Vista admin
// ------------------------------------------------------------------
function wireAdminView() {
  document.getElementById("schedule-event-btn").addEventListener("click", async () => {
    const val = document.getElementById("schedule-date").value;
    if (!val) return alert("Elige primero la fecha y hora de inicio");
    if (!confirm("¿Programar el inicio del contador para esa fecha?")) return;
    try {
      await authedApiCall("/api/admin/schedule-event", {
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
    await authedApiCall("/api/admin/finish-event", { method: "POST" });
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
  document.getElementById("event-status").textContent =
    `Estado: ${event.status}${event.mode ? ` (${event.mode})` : ""}`;
}

async function refreshAdminUsers() {
  const { users } = await authedApiCall("/api/admin/users");
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
        await authedApiCall("/api/admin/unban", { method: "POST", body: JSON.stringify({ userId: u.id }) });
      } else {
        const reason = prompt("Motivo del baneo (opcional):") || null;
        await authedApiCall("/api/admin/ban", { method: "POST", body: JSON.stringify({ userId: u.id, reason }) });
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

  wireTestCanvasSandbox();
}

// ------------------------------------------------------------------
// Sandbox de pruebas (temporal — quitar antes de publicar)
// Canvas 100% local: no llama a Supabase ni al Worker, no tiene cooldown.
// Sirve para probar el editor y generar un level.json de prueba.
// ------------------------------------------------------------------
const testState = {
  mode: "classic",
  zoom: 1,
  tool: "build",
  activeTabId: CATEGORY_TABS[0].id,
  selectedObjectKey: null,
  blocks: new Map(), // id -> { id, object_type, x, y, rotation, scale, color, z_index }
};

function wireTestCanvasSandbox() {
  buildTestTabs();
  buildTestGrid();
  applyTestCanvasSize();
  wireTestCanvasClicks();

  document.querySelectorAll('input[name="test-canvas-mode"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (!e.target.checked) return;
      testState.mode = e.target.value;
      applyTestCanvasSize();
    });
  });

  document.querySelectorAll("#test-mode-switch .mode-switch__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      testState.tool = btn.dataset.mode;
      document.querySelectorAll("#test-mode-switch .mode-switch__btn").forEach((b) =>
        b.classList.toggle("mode-switch__btn--active", b === btn)
      );
      const canvasEl = document.getElementById("test-canvas");
      canvasEl.classList.remove("mode-build", "mode-edit", "mode-delete");
      canvasEl.classList.add(`mode-${testState.tool}`);
    });
  });

  document.getElementById("test-zoom-in-btn").addEventListener("click", () => setTestZoom(testState.zoom * 1.25));
  document.getElementById("test-zoom-out-btn").addEventListener("click", () => setTestZoom(testState.zoom / 1.25));

  document.getElementById("test-canvas-reset-btn").addEventListener("click", () => {
    if (!confirm("¿Vaciar todo el canvas de pruebas?")) return;
    testState.blocks.clear();
    document.getElementById("test-canvas").innerHTML = "";
    updateTestObjectCount();
  });

  document.getElementById("test-canvas-export-btn").addEventListener("click", exportTestLevelJson);
  document.getElementById("test-canvas-export-gmd-btn").addEventListener("click", exportTestLevelGmd);
}

function setTestZoom(newZoom) {
  testState.zoom = Math.min(3, Math.max(0.15, newZoom));
  applyTestCanvasSize();
  for (const block of testState.blocks.values()) renderTestBlock(block);
}

function applyTestCanvasSize() {
  const size = CANVAS_SIZES[testState.mode] || CANVAS_SIZES.classic;
  const canvasEl = document.getElementById("test-canvas");
  canvasEl.style.width = `${size.width * testState.zoom}px`;
  canvasEl.style.height = `${size.height * testState.zoom}px`;
  canvasEl.style.backgroundSize = `${GRID_UNIT_PX * testState.zoom}px ${GRID_UNIT_PX * testState.zoom}px`;
  canvasEl.classList.remove("mode-build", "mode-edit", "mode-delete");
  canvasEl.classList.add(`mode-${testState.tool}`);
}

function buildTestTabs() {
  const tabsEl = document.getElementById("test-tools-tabs");
  tabsEl.innerHTML = "";
  for (const tab of CATEGORY_TABS) {
    const btn = document.createElement("button");
    btn.textContent = tab.label;
    btn.className = tab.id === testState.activeTabId ? "active" : "";
    btn.addEventListener("click", () => {
      testState.activeTabId = tab.id;
      buildTestTabs();
      buildTestGrid();
    });
    tabsEl.appendChild(btn);
  }
}

function buildTestGrid() {
  const gridEl = document.getElementById("test-tools-grid");
  gridEl.innerHTML = "";
  const tab = CATEGORY_TABS.find((t) => t.id === testState.activeTabId);
  for (const group of tab.groups) {
    for (const item of group.items) {
      const btn = document.createElement("button");
      btn.className =
        "tools-panel__item" + (item.key === testState.selectedObjectKey ? " tools-panel__item--active" : "");
      btn.title = item.label;
      btn.innerHTML = `<img src="${CONFIG.OBJECTS_PATH}${item.file}" alt="${item.label}" />`;
      btn.addEventListener("click", () => {
        testState.selectedObjectKey = item.key;
        buildTestGrid();
      });
      gridEl.appendChild(btn);
    }
  }
}

function screenToTestCanvas(clientX, clientY) {
  const viewport = document.getElementById("test-canvas-viewport");
  const rect = viewport.getBoundingClientRect();
  const xInViewport = clientX - rect.left + viewport.scrollLeft;
  const yInViewport = clientY - rect.top + viewport.scrollTop;
  return { x: xInViewport / testState.zoom, y: yInViewport / testState.zoom };
}

function wireTestCanvasClicks() {
  const canvasEl = document.getElementById("test-canvas");
  canvasEl.addEventListener("click", (e) => {
    if (testState.tool !== "build" || !testState.selectedObjectKey) return;
    const raw = screenToTestCanvas(e.clientX, e.clientY);
    const { x, y } = snapToGrid(raw.x, raw.y, isBottomAnchored(testState.selectedObjectKey) ? "bottom" : "center");
    const block = {
      id: crypto.randomUUID(),
      object_type: testState.selectedObjectKey,
      x, y,
      rotation: 0,
      scale: 1,
      color: null,
      z_index: 0,
    };
    testState.blocks.set(block.id, block);
    renderTestBlock(block);
    updateTestObjectCount();
  });
}

function renderTestBlock(block) {
  const canvasEl = document.getElementById("test-canvas");
  let el = document.getElementById(`test-block-${block.id}`);
  if (!el) {
    el = document.createElement("img");
    el.id = `test-block-${block.id}`;
    el.className = "gd-canvas__object";
    canvasEl.appendChild(el);
    attachTestBlockHandlers(el, block);
  }
  const file = getObjectFile(block.object_type);
  el.src = file ? `${CONFIG.OBJECTS_PATH}${file}` : "";
  el.style.left = `${block.x * testState.zoom}px`;
  el.style.top = `${block.y * testState.zoom}px`;
  const baseSize = 32 * testState.zoom * (block.scale || 1);
  el.style.width = `${baseSize}px`;
  el.style.height = `${baseSize}px`;
  const originY = isBottomAnchored(block.object_type) ? "-100%" : "-50%";
  el.style.transform = `translate(-50%, ${originY}) rotate(${block.rotation || 0}deg)`;
  el._block = block;
}

function attachTestBlockHandlers(el, block) {
  el.addEventListener("pointerdown", (e) => {
    const current = el._block || block;
    if (testState.tool === "delete") {
      e.stopPropagation();
      testState.blocks.delete(current.id);
      el.remove();
      updateTestObjectCount();
    } else if (testState.tool === "edit") {
      e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      const onMove = (ev) => {
        const { x, y } = screenToTestCanvas(ev.clientX, ev.clientY);
        current.x = x;
        current.y = y;
        renderTestBlock(current);
      };
      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    }
  });
}

function updateTestObjectCount() {
  document.getElementById("test-object-count").textContent = `${testState.blocks.size} objetos`;
}

// Exporta el canvas de pruebas como level.json — mismo formato que se usará
// para el nivel final real al terminar el evento de verdad.
function exportTestLevelJson() {
  const size = CANVAS_SIZES[testState.mode];
  const payload = {
    mode: testState.mode,
    canvas_width: size.width,
    canvas_height: size.height,
    exported_at: new Date().toISOString(),
    objects: [...testState.blocks.values()].map((b) => ({
      object_type: b.object_type,
      x: b.x,
      y: b.y,
      rotation: b.rotation,
      scale: b.scale,
      color: b.color,
      z_index: b.z_index,
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "level.json";
  a.click();
  URL.revokeObjectURL(url);
}

// Exporta el canvas de pruebas como .gmd real de Geometry Dash (ver
// gmd-export.js). Solo los objetos con ID verificado en gd-object-ids.js
// se incluyen — el resto se omite y se avisa cuántos faltan.
async function exportTestLevelGmd() {
  const size = CANVAS_SIZES[testState.mode];
  const objects = [...testState.blocks.values()];

  if (objects.length === 0) {
    alert("El canvas de pruebas está vacío.");
    return;
  }

  const { plist, skipped, totalObjects, exportedObjects } = await exportLevelAsGmd({
    mode: testState.mode,
    objects,
    canvasHeightPx: size.height,
    name: "Geometry Place (prueba)",
    author: currentUser?.username || "Geometry Place",
  });

  downloadGmdFile(plist, "level.gmd");

  if (skipped.length > 0) {
    const uniqueSkipped = [...new Set(skipped)];
    alert(
      `Exportados ${exportedObjects} de ${totalObjects} objetos.\n\n` +
      `${skipped.length} objetos se omitieron porque todavía no tienen un ID de ` +
      `Geometry Dash verificado en gd-object-ids.js:\n\n` +
      uniqueSkipped.join(", ")
    );
  }
}

init();
