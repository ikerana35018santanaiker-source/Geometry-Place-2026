// ============================================================
// Exportador a .gmd real de Geometry Dash.
//
// Fuentes usadas para este formato (documentación oficial de la comunidad,
// GD Docs — https://boomlings.dev):
// - Object String / Level String:  /resources/client/level-components/level-string
// - Level Start Object (kA*):       /resources/client/level-components/level-start
// - Color String (kS38):            /resources/client/level-components/color-string
// - Encoding (gzip + base64):       /topics/levelstring_encoding_decoding
// - Estructura del nivel (k1..k48): /resources/client/level
//
// Los IDs numéricos de objeto vienen de gd-object-ids.js — solo se exportan
// los objetos que tengan un ID verificado ahí; el resto se omite y se avisa.
// ============================================================

import { getGdObjectId } from "./gd-object-ids.js";

const GRID_UNIT_PX = 32; // tamaño con el que dibujamos los objetos en nuestro canvas
const GD_UNIT = 30; // 1 casilla de cuadrícula en Geometry Dash = 30 unidades

// Convierte nuestras coordenadas de canvas (origen arriba-izquierda, Y hacia abajo)
// a coordenadas de Geometry Dash (origen en el suelo, Y hacia arriba).
// Convierte nuestras coordenadas de canvas (origen arriba-izquierda, Y hacia abajo)
// a coordenadas de Geometry Dash (origen en el suelo, Y hacia arriba).
//
// IMPORTANTE: el alto del canvas (1080 / 1026 px) no es múltiplo exacto de
// GRID_UNIT_PX, así que la última fila (la que toca el suelo) quedaría
// cortada a la mitad si usáramos el alto real tal cual. Para que los
// objetos de la fila inferior queden pegados al suelo (y no floten un
// poco por encima, como pasaba antes), alineamos el "suelo" de referencia
// al múltiplo de 32 más cercano hacia arriba antes de invertir la Y.
function toGdCoords(x, y, canvasHeightPx) {
  const groundAlignedHeight = Math.ceil(canvasHeightPx / GRID_UNIT_PX) * GRID_UNIT_PX;
  const gdX = (x / GRID_UNIT_PX) * GD_UNIT;
  const gdY = ((groundAlignedHeight - y) / GRID_UNIT_PX) * GD_UNIT;
  return { gdX: round2(gdX), gdY: round2(gdY) };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// --- Object String ---------------------------------------------------
// Construye la cadena de objetos: "{obj};{obj};..." donde cada obj es
// "{key},{value},{key},{value},..."
export function buildObjectString(objects, canvasHeightPx) {
  const parts = [];
  const skipped = [];

  for (const obj of objects) {
    const gdId = getGdObjectId(obj.object_type);
    if (gdId === null) {
      skipped.push(obj.object_type);
      continue;
    }

    const { gdX, gdY } = toGdCoords(obj.x, obj.y, canvasHeightPx);
    const props = [1, gdId, 2, gdX, 3, gdY];

    if (obj.rotation) props.push(6, round2(obj.rotation));
    if (obj.scale && obj.scale !== 1) props.push(32, round2(obj.scale));
    // Color: si el objeto pide un color propio, apunta al canal 1 (Color 1) por
    // simplicidad — el canal en sí se define en el color string con ese hex.
    // Siempre se asigna un canal de color válido (Color 1) — si no, Geometry
    // Dash pinta el objeto en negro sólido por no tener canal definido.
    props.push(21, 1);

    parts.push(props.join(","));
  }

  return { objectString: parts.join(";") + (parts.length ? ";" : ""), skipped };
}

// --- Color String ------------------------------------------------------
// Un set mínimo de canales válidos: fondo, suelo, línea y "Color 1" (el que
// usan por defecto los objetos a los que les hemos puesto un color propio).
function hexToRgb(hex) {
  const clean = (hex || "#ffffff").replace("#", "");
  const num = parseInt(clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function colorEntry({ channel, r, g, b, blending = false }) {
  return `1_${r}_2_${g}_3_${b}_4_0_5_${blending ? 1 : 0}_6_${channel}_7_1_8_1_15_1_18_0`;
}

export function buildColorString(customColorHex) {
  const custom = customColorHex ? hexToRgb(customColorHex) : { r: 255, g: 255, b: 255 };
  const channels = [
    colorEntry({ channel: 1000, r: 40, g: 125, b: 255 }), // Fondo
    colorEntry({ channel: 1001, r: 0, g: 102, b: 255 }), // Suelo
    colorEntry({ channel: 1002, r: 255, g: 255, b: 255 }), // Línea
    colorEntry({ channel: 1, r: custom.r, g: custom.g, b: custom.b }), // Color 1 (objetos con color propio)
  ];
  return channels.join("|") + "|";
}

// --- Level Start Object --------------------------------------------------
// kA22 = 1 → modo Plataforma; 0 → modo Clásico
export function buildLevelStartString(mode, colorString) {
  const props = {
    kA2: 0, // gamemode inicial: 0 = cubo
    kA3: 0, // mini mode
    kA4: 1, // velocidad normal
    kA6: 0, // fondo por defecto
    kA7: 0, // suelo por defecto
    kA8: 0, // dual mode
    kA9: 0, // esto es un Level Start, no un Start Pos
    kA10: 0,
    kA11: 0,
    kA13: 0,
    kA15: 0,
    kA16: 0,
    kA17: 0,
    kA18: 0,
    kA20: 0,
    kA22: mode === "platformer" ? 1 : 0,
  };

  const parts = [];
  for (const [key, value] of Object.entries(props)) {
    parts.push(key, value);
  }
  parts.push("kS38", colorString);

  return parts.join(",");
}

// --- Encoding: gzip + base64 (urlsafe) ----------------------------------
// Usa pako (zlib para el navegador) vía CDN, igual que hicimos con supabase-js.
async function gzipAndBase64Url(str) {
  const { gzip } = await import("https://esm.sh/pako@2");
  const compressed = gzip(str); // Uint8Array

  let binary = "";
  for (let i = 0; i < compressed.length; i++) binary += String.fromCharCode(compressed[i]);
  const base64 = btoa(binary);

  // urlsafe: + → -, / → _  (igual que base64.urlsafe_b64encode de Python)
  return base64.replace(/\+/g, "-").replace(/\//g, "_");
}

// --- Envoltorio .gmd (plist) ---------------------------------------------
function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildGmdPlist({ name, description, author, encodedLevelString }) {
  const descriptionB64 = btoa(unescape(encodeURIComponent(description || "")));
  return `<?xml version="1.0"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0" gjver="2.0">
<dict>
	<k>k1</k>
	<i>0</i>
	<k>k2</k>
	<s>${escapeXml(name)}</s>
	<k>k3</k>
	<s>${descriptionB64}</s>
	<k>k4</k>
	<s>${encodedLevelString}</s>
	<k>k5</k>
	<s>${escapeXml(author)}</s>
	<k>k13</k>
	<t />
	<k>k21</k>
	<i>2</i>
	<k>k50</k>
	<i>35</i>
</dict>
</plist>
`;
}

// --- Orquestador ----------------------------------------------------------
// objects: array de { object_type, x, y, rotation, scale, color }
// canvasHeightPx: alto del canvas en px (1080 para clásico, 1026 para plataforma)
export async function exportLevelAsGmd({ mode, objects, canvasHeightPx, name, author }) {
  const { objectString, skipped } = buildObjectString(objects, canvasHeightPx);
  const anyCustomColor = objects.find((o) => o.color)?.color;
  const colorString = buildColorString(anyCustomColor);
  const levelStartString = buildLevelStartString(mode, colorString);

  const fullLevelString = `${levelStartString};${objectString}`;
  const encodedLevelString = await gzipAndBase64Url(fullLevelString);

  const plist = buildGmdPlist({
    name: name || "Geometry Place",
    description: `Exportado desde Geometry Place — modo ${mode}`,
    author: author || "Geometry Place",
    encodedLevelString,
  });

  return { plist, skipped, totalObjects: objects.length, exportedObjects: objects.length - skipped.length };
}

export function downloadGmdFile(plistContent, filename = "level.gmd") {
  const blob = new Blob([plistContent], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
