import { CONFIG } from "./config.js";

// Crea un contador animado tipo Geometry Dash: cada dígito es una imagen
// (assets/gd-imgs/numbers/N.png) y al cambiar de valor hace una transición
// de "puerta" (desliza + funde), como en el gif de referencia.

const UNIT_LABELS = { days: "DÍAS", hours: "HORAS", minutes: "MIN", seconds: "SEG" };

export class Countdown {
  /**
   * @param {HTMLElement} container - elemento donde se renderiza el contador
   * @param {string} targetIso - fecha ISO objetivo (ends_at o starts_at del evento)
   * @param {Function} onFinish - callback cuando el contador llega a 0
   */
  constructor(container, targetIso, onFinish) {
    this.container = container;
    this.target = new Date(targetIso).getTime();
    this.onFinish = onFinish;
    this.previous = { days: null, hours: null, minutes: null, seconds: null };
    this._build();
    this._tick();
    this.interval = setInterval(() => this._tick(), 1000);
  }

  destroy() {
    clearInterval(this.interval);
  }

  _build() {
    this.container.classList.add("gd-countdown");
    this.container.innerHTML = "";
    this.groups = {};
    for (const unit of ["days", "hours", "minutes", "seconds"]) {
      const group = document.createElement("div");
      group.className = "gd-countdown__group";

      const digitsWrap = document.createElement("div");
      digitsWrap.className = "gd-countdown__digit-wrap";
      group.appendChild(digitsWrap);

      const label = document.createElement("span");
      label.className = "gd-countdown__label";
      label.textContent = UNIT_LABELS[unit];
      group.appendChild(label);

      this.container.appendChild(group);
      this.groups[unit] = digitsWrap;
    }
  }

  _tick() {
    const remainingMs = this.target - Date.now();
    if (remainingMs <= 0) {
      this._render({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      clearInterval(this.interval);
      this.onFinish?.();
      return;
    }

    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    this._render({ days, hours, minutes, seconds });
  }

  _render(values) {
    for (const unit of Object.keys(values)) {
      const value = Math.min(values[unit], 200); // el set de imágenes llega hasta 200
      if (this.previous[unit] === value) continue;
      this._animateDigit(this.groups[unit], value, this.previous[unit]);
      this.previous[unit] = value;
    }
  }

  _animateDigit(wrap, value, previousValue) {
    const isFirstRender = previousValue === null;
    const img = document.createElement("img");
    img.src = `${CONFIG.NUMBERS_PATH}img_${value}.png`;
    img.alt = String(value);
    img.className = "gd-countdown__digit gd-countdown__digit--entering";

    wrap.appendChild(img);

    // Fuerza reflow para que la transición CSS se aplique
    // eslint-disable-next-line no-unused-expressions
    img.offsetWidth;
    img.classList.remove("gd-countdown__digit--entering");

    if (isFirstRender) {
      // Sin animación de salida en el primer render, solo aparece
      return;
    }

    const old = wrap.querySelector(".gd-countdown__digit:not(.gd-countdown__digit--entering)");
    if (old && old !== img) {
      old.classList.add("gd-countdown__digit--leaving");
      old.addEventListener("transitionend", () => old.remove(), { once: true });
    }
  }
}
