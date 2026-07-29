// Consola de depuración en pantalla (temporal — quitar antes de publicar).
// Intercepta console.log/info/warn/error y errores no capturados, y los
// guarda en un buffer para poder pintarlos en un panel flotante propio.
//
// IMPORTANTE: este overlay se construye a sí mismo con su propio HTML/CSS,
// inyectado directamente en <body>, y NO depende de app.html ni de que el
// resto de app.js llegue a arrancar. Así, si algo revienta antes de que se
// conecten los botones normales, la consola igualmente aparece sola.

const buffer = [];
const MAX_LINES = 500;
let panelBody = null;
let toggleBtn = null;
let hasAutoOpened = false;

function ensureUI() {
  if (panelBody) return;

  const style = document.createElement("style");
  style.textContent = `
    #__devconsole_toggle {
      position: fixed; bottom: 14px; right: 14px; z-index: 999999;
      background: #1c2a4a; color: #e8f0ff; border: 1px solid #3a5aa8;
      border-radius: 999px; padding: 10px 16px; font-family: monospace;
      font-size: 13px; cursor: pointer; box-shadow: 0 2px 10px rgba(0,0,0,0.4);
    }
    #__devconsole_toggle--error { background: #7a1f1f; border-color: #ff6b6b; }
    #__devconsole_panel {
      position: fixed; inset: 0; z-index: 999998; display: none;
      background: rgba(5,7,12,0.97); color: #e8f0ff;
      font-family: "Courier New", monospace; font-size: 12px;
      flex-direction: column;
    }
    #__devconsole_panel--open { display: flex; }
    #__devconsole_header {
      display: flex; gap: 10px; align-items: center; padding: 10px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.15); flex: none;
    }
    #__devconsole_header button {
      background: #1c2a4a; color: #e8f0ff; border: 1px solid #3a5aa8;
      border-radius: 6px; padding: 6px 12px; cursor: pointer; font-family: inherit;
    }
    #__devconsole_body { flex: 1; overflow-y: auto; padding: 10px 14px; }
    .__devconsole_line { padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.06); white-space: pre-wrap; word-break: break-word; }
    .__devconsole_line--log { color: #cfe0ff; }
    .__devconsole_line--info { color: #7fb0ff; }
    .__devconsole_line--warn { color: #ffd166; }
    .__devconsole_line--error { color: #ff6b6b; }
    .__devconsole_time { opacity: 0.5; margin-right: 8px; }
  `;
  document.head.appendChild(style);

  toggleBtn = document.createElement("button");
  toggleBtn.id = "__devconsole_toggle";
  toggleBtn.textContent = "🐞 Consola";
  document.body.appendChild(toggleBtn);

  const panel = document.createElement("div");
  panel.id = "__devconsole_panel";
  panel.innerHTML = `
    <div id="__devconsole_header">
      <strong>Consola (temporal)</strong>
      <button id="__devconsole_clear">Limpiar</button>
      <button id="__devconsole_close">Cerrar</button>
    </div>
    <div id="__devconsole_body"></div>
  `;
  document.body.appendChild(panel);

  panelBody = panel.querySelector("#__devconsole_body");
  toggleBtn.addEventListener("click", () => openPanel());
  panel.querySelector("#__devconsole_close").addEventListener("click", () => closePanel());
  panel.querySelector("#__devconsole_clear").addEventListener("click", () => {
    buffer.length = 0;
    panelBody.innerHTML = "";
  });

  for (const entry of buffer) appendLine(entry);
}

function openPanel() {
  document.getElementById("__devconsole_panel").classList.add("__devconsole_panel--open");
  toggleBtn.classList.remove("__devconsole_toggle--error");
}
function closePanel() {
  document.getElementById("__devconsole_panel").classList.remove("__devconsole_panel--open");
}

function appendLine(entry) {
  if (!panelBody) return;
  const line = document.createElement("div");
  line.className = `__devconsole_line __devconsole_line--${entry.level}`;
  const time = entry.time.toLocaleTimeString();
  line.innerHTML = `<span class="__devconsole_time">${time}</span>`;
  line.appendChild(document.createTextNode(entry.text));
  panelBody.appendChild(line);
  panelBody.scrollTop = panelBody.scrollHeight;
}

function push(level, args) {
  const text = args
    .map((a) => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === "object") {
        try {
          return JSON.stringify(a);
        } catch {
          return String(a);
        }
      }
      return String(a);
    })
    .join(" ");

  buffer.push({ level, text, time: new Date() });
  if (buffer.length > MAX_LINES) buffer.shift();
  appendLine(buffer[buffer.length - 1]);

  // Cualquier error abre la consola sola la primera vez, aunque nadie
  // haya pulsado el botón — así no dependes de que el resto de la UI cargue.
  if (level === "error") {
    toggleBtn?.classList.add("__devconsole_toggle--error");
    if (!hasAutoOpened) {
      hasAutoOpened = true;
      openPanel();
    }
  }
}

// Construye el overlay en cuanto el DOM esté listo (o inmediatamente si ya lo está)
if (document.body) {
  ensureUI();
} else {
  document.addEventListener("DOMContentLoaded", ensureUI);
}

// --- Parchea los métodos de console, preservando el comportamiento original ---
const original = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

console.log = (...args) => { original.log(...args); push("log", args); };
console.info = (...args) => { original.info(...args); push("info", args); };
console.warn = (...args) => { original.warn(...args); push("warn", args); };
console.error = (...args) => { original.error(...args); push("error", args); };

// --- Errores no capturados y promesas rechazadas sin catch ---
window.addEventListener("error", (e) => {
  push("error", [`Uncaught: ${e.message} (${e.filename}:${e.lineno}:${e.colno})`]);
});
window.addEventListener("unhandledrejection", (e) => {
  push("error", [`Promise rechazada sin capturar: ${e.reason?.stack || e.reason}`]);
});

