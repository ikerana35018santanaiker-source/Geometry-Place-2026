// Consola de depuración en pantalla (temporal — quitar antes de publicar).
// Intercepta console.log/info/warn/error y errores no capturados, y los
// guarda en un buffer para poder pintarlos en el panel #console-output.
// Se activa nada más importar este módulo, así que hay que importarlo
// lo antes posible en app.js para no perder los primeros mensajes.

const buffer = [];
const MAX_LINES = 500;
let renderTarget = null; // elemento DOM donde se pintan las líneas si la vista está abierta

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

  if (renderTarget) appendLine(renderTarget, buffer[buffer.length - 1]);
}

function appendLine(container, entry) {
  const line = document.createElement("div");
  line.className = `console-line console-line--${entry.level}`;
  const time = entry.time.toLocaleTimeString();
  line.innerHTML = `<span class="console-line__time">${time}</span>`;
  line.appendChild(document.createTextNode(entry.text));
  container.appendChild(line);
  container.scrollTop = container.scrollHeight;
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

// --- API pública para el panel de consola ---
export function renderConsoleInto(container) {
  renderTarget = container;
  container.innerHTML = "";
  for (const entry of buffer) appendLine(container, entry);
}

export function clearConsole() {
  buffer.length = 0;
  if (renderTarget) renderTarget.innerHTML = "";
}

export function stopRendering() {
  renderTarget = null;
}
