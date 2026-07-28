import { CONFIG } from "./config.js";
import { requireAuth, logout, getCurrentUser } from "./auth.js";
import { fetchAllBlocks, subscribeToBlocks, fetchPresence, subscribeToPresence } from "./supabaseClient.js";
import { Countdown } from "./countdown.js";

// Catálogo de objetos disponibles para el selector.
// El nombre de archivo debe existir en assets/gd-imgs/objects/
const OBJECT_CATALOG = [
  { key: "block_basic", label: "Bloque básico", file: "block_basic.png" },
  { key: "spike", label: "Pincho", file: "spike.png" },
  { key: "orb_yellow", label: "Orbe amarillo", file: "orb_yellow.png" },
  { key: "orb_blue", label: "Orbe azul", file: "orb_blue.png" },
  { key: "portal_cube", label: "Portal cubo", file: "portal_cube.png" },
  { key: "portal_ship", label: "Portal nave", file: "portal_ship.png" },
  { key: "decoration_1", label: "Decoración", file: "decoration_1.png" },
  // Añade aquí el resto de objetos de assets/gd-imgs/objects/
];

const canvasEl = document.getElementById("gd-canvas");
const objectSelectorEl = document.getElementById("object-selector");
const countdownEl = document.getElementById("countdown");
const onlineCountEl = document.getElementById("online-count");
const userLabelEl = document.getElementById("user-label");
const logoutBtn = document.getElementById("logout-btn");

const blocksById = new Map();
let selectedObject = null;

async function init() {
  const user = await requireAuth("/index.html");
  if (!user) return;
  userLabelEl.textContent = user.username;

  buildObjectSelector();
  await loadEventState();
  await loadBlocks();
  subscribeRealtime();
  await refreshPresence();

  logoutBtn.addEventListener("click", async () => {
    await logout();
    window.location.href = "/index.html";
  });
}

function buildObjectSelector() {
  objectSelectorEl.innerHTML = "";
  for (const obj of OBJECT_CATALOG) {
    const btn = document.createElement("button");
    btn.className = "object-selector__item";
    btn.title = obj.label;
    btn.innerHTML = `<img src="${CONFIG.OBJECTS_PATH}${obj.file}" alt="${obj.label}" />`;
    btn.addEventListener("click", () => selectObject(obj, btn));
    objectSelectorEl.appendChild(btn);
  }
}

function selectObject(obj, btnEl) {
  selectedObject = obj;
  document
    .querySelectorAll(".object-selector__item--active")
    .forEach((el) => el.classList.remove("object-selector__item--active"));
  btnEl.classList.add("object-selector__item--active");
  // La colocación real del objeto en el canvas (click, cooldown de 5 min,
  // llamada al Worker) se implementa en la siguiente fase.
}

async function loadEventState() {
  const res = await fetch(`${CONFIG.WORKER_URL}/api/event/state`);
  const { event } = await res.json();

  if (event.status === "pending" && event.starts_at) {
    new Countdown(countdownEl, event.starts_at, () => window.location.reload());
  } else if (event.status === "running" && event.ends_at) {
    new Countdown(countdownEl, event.ends_at, () => window.location.reload());
  } else if (event.status === "finished") {
    countdownEl.innerHTML = "<p class='gd-countdown__finished'>El evento ha terminado</p>";
  } else {
    countdownEl.innerHTML = "<p class='gd-countdown__finished'>Esperando a que el admin inicie el evento…</p>";
  }
}

async function loadBlocks() {
  const blocks = await fetchAllBlocks();
  for (const block of blocks) {
    blocksById.set(block.id, block);
    renderBlock(block);
  }
}

function renderBlock(block) {
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
  const el = document.getElementById(`block-${block.id}`);
  el?.remove();
  blocksById.delete(block.id);
}

function subscribeRealtime() {
  subscribeToBlocks(
    (block) => {
      blocksById.set(block.id, block);
      renderBlock(block);
    },
    (block) => {
      blocksById.set(block.id, block);
      renderBlock(block);
    },
    (block) => removeBlock(block)
  );
  subscribeToPresence(refreshPresence);
}

async function refreshPresence() {
  const presence = await fetchPresence();
  onlineCountEl.textContent = presence.length;
}

init();
