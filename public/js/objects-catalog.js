// ============================================================
// Catálogo de objetos de Geometry Dash (Update 1.0 → 2.2)
// Fuente: https://geometrydash.wiki.gg/wiki/Objects (+ Transporters + Portals)
//
// Cada objeto usa el MISMO nombre de archivo que la wiki, así que si el
// usuario descarga las imágenes directamente de ahí y las sube a
// assets/gd-imgs/objects/ con el mismo nombre, todo funciona sin tocar código.
//
// Estructura: CATEGORY_TABS = [{ id, label, groups: [{ label, items: [...] }] }]
// Cada item: { key, label, file }
// ============================================================

// Genera una serie "PrefijoNN.png" del "from" al "to" (ambos incluidos)
function seq(prefix, from, to, labelPrefix = prefix) {
  const items = [];
  for (let i = from; i <= to; i++) {
    const n = String(i).padStart(2, "0");
    items.push({ key: `${prefix.toLowerCase()}${n}`, label: `${labelPrefix} ${n}`, file: `${prefix}${n}.png` });
  }
  return items;
}

// Un único objeto suelto (sin numeración, o numeración fija)
function single(key, label, file) {
  return [{ key, label, file }];
}

// Sobreescribe el "file" de un item concreto dentro de un array ya generado
// por seq() — útil cuando solo UNA variante numerada tiene una imagen subida
// con otro nombre/extensión (ej: la 01 en .webp y el resto pendientes en .png)
function overrideFile(items, key, newFile) {
  const item = items.find((i) => i.key === key);
  if (item) item.file = newFile;
  return items;
}

export const CATEGORY_TABS = [
  // ---------------------------------------------------------
  {
    id: "blocks",
    label: "Bloques",
    groups: [
      { label: "Regular", items: single("regular_block_01", "Bloque regular", "RegularBlock01.webp") },
      { label: "Grid", items: seq("GridBlock", 1, 8, "Grid") },
      { label: "Tile", items: seq("TileBlock", 1, 7, "Tile") },
      { label: "Chipped", items: seq("ChippedBlock", 1, 6, "Chipped") },
      { label: "Black", items: seq("BlackBlock", 1, 7, "Black") },
      { label: "Brick", items: seq("BrickBlock", 1, 7, "Brick") },
      { label: "Chequered", items: seq("ChequeredBlock", 1, 14, "Chequered") },
      { label: "Destructible", items: single("destructible_block_01", "Bloque destructible", "DestructibleBlock01.png") },
      { label: "Beam", items: seq("BeamBlock", 1, 7, "Beam") },
      { label: "Patterned", items: seq("PatternedBlock", 1, 7, "Patterned") },
      { label: "Cross", items: seq("CrossBlock", 1, 15, "Cross") },
      { label: "Pane", items: seq("PaneBlock", 1, 4, "Pane") },
      { label: "Transparent grass", items: seq("TransparentGrassBlock", 1, 16, "T. Grass") },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "platforms",
    label: "Otras plataformas",
    groups: [
      { label: "Regular", items: seq("RegularPlatform", 1, 5, "Regular") },
      { label: "Wavy", items: seq("WavyPlatform", 1, 6, "Wavy") },
      { label: "Metallic", items: seq("MetallicPlatform", 1, 10, "Metallic") },
      { label: "Pane", items: seq("PanePlatform", 1, 9, "Pane") },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "slopes",
    label: "Pendientes",
    groups: [
      { label: "Grid", items: seq("GridSlope", 1, 2, "Grid") },
      { label: "Tile", items: seq("TileSlope", 1, 2, "Tile") },
      { label: "Chipped", items: seq("ChippedSlope", 1, 2, "Chipped") },
      { label: "Black", items: seq("BlackSlope", 1, 2, "Black") },
      { label: "Brick", items: seq("BrickSlope", 1, 2, "Brick") },
      { label: "Checkered", items: seq("CheckeredSlope", 1, 5, "Checkered") },
      { label: "Wavy", items: seq("WavySlope", 1, 4, "Wavy") },
      { label: "Metallic", items: seq("MetallicSlope", 1, 4, "Metallic") },
      { label: "Beam", items: seq("BeamSlope", 1, 2, "Beam") },
      { label: "Patterned", items: seq("PatternedSlope", 1, 2, "Patterned") },
      { label: "Cross", items: seq("CrossSlope", 1, 2, "Cross") },
      { label: "Pane", items: seq("PaneSlope", 1, 8, "Pane") },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "outlines",
    label: "Contornos",
    groups: [
      { label: "Bloque", items: overrideFile(seq("BlockOutline", 1, 5, "Contorno"), "blockoutline01", "BlockOutline01.webp") },
      { label: "Otras plataformas", items: seq("PlatformOutline", 1, 8, "Contorno") },
      { label: "Pendiente", items: seq("SlopeOutline", 1, 2, "Contorno") },
      { label: "Esquinas", items: seq("Cornerpiece", 1, 4, "Esquina") },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "spikes-pits",
    label: "Pinchos y fosos",
    groups: [
      { label: "Pincho regular", items: overrideFile(seq("RegularSpike", 1, 4, "Pincho"), "regularspike01", "RegularSpike01.webp") },
      { label: "Pincho de color", items: seq("ColourSpike", 1, 4, "Pincho color") },
      { label: "Pincho contorno", items: seq("OutlineSpike", 1, 3, "Pincho contorno") },
      { label: "Pincho falso", items: seq("FakeSpike", 1, 4, "Pincho falso") },
      { label: "Foso de espinas", items: seq("ThornPit", 1, 6, "Foso espinas") },
      { label: "Foso ondulado", items: seq("WavyPit", 1, 6, "Foso ondulado") },
      { label: "Foso de enredaderas", items: seq("VinePit", 1, 4, "Foso enredaderas") },
      { label: "Foso dentado", items: seq("JaggedPit", 1, 3, "Foso dentado") },
      { label: "Foso curvo", items: seq("CurvedPit", 1, 2, "Foso curvo") },
      { label: "Foso serrado", items: seq("SerratedPit", 1, 4, "Foso serrado") },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "hazards-animated",
    label: "Sierras y monstruos",
    groups: [
      { label: "Monstruos", items: seq("Monster", 1, 6, "Monstruo") },
      { label: "Bola de fuego", items: seq("Fireball", 1, 2, "Fireball") },
      { label: "Sierra regular", items: seq("RegularSawblade", 1, 3, "Sierra") },
      { label: "Sierra bulbo con pinchos", items: seq("SpikedBulbSawblade", 1, 3, "Sierra bulbo") },
      { label: "Sierra de engranaje", items: seq("GearSawblade", 1, 3, "Sierra engranaje") },
      { label: "Sierra contorno", items: seq("OutlineSawblade", 1, 3, "Sierra contorno") },
      { label: "Sierra de color", items: seq("ColourSawblade", 1, 3, "Sierra color") },
      { label: "Sierra guadaña", items: seq("ScytheSawblade", 1, 2, "Sierra guadaña") },
      { label: "Obstáculo con pinchos", items: seq("SpikedObstacle", 1, 3, "Obstáculo pinchos") },
      { label: "Sierra puntiaguda", items: seq("PointedSawblade", 1, 3, "Sierra puntiaguda") },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "pads-orbs",
    label: "Pads y orbes",
    groups: [
      {
        label: "Pads (contacto directo)",
        items: [
          { key: "pad_yellow_jump", label: "Pad salto amarillo", file: "YellowJumpPad.png" },
          { key: "pad_magenta_jump", label: "Pad salto magenta", file: "MagentaJumpPad.png" },
          { key: "pad_red_jump", label: "Pad salto rojo", file: "RedJumpPad.png" },
          { key: "pad_cyan_gravity", label: "Pad gravedad cian", file: "CyanGravityPad.png" },
          { key: "pad_spider_teleport", label: "Pad teletransporte araña", file: "TeleportationPad.png" },
        ],
      },
      {
        label: "Orbes (requieren click/tap)",
        items: [
          { key: "orb_yellow_jump", label: "Orbe salto amarillo", file: "YellowJumpRing.png" },
          { key: "orb_magenta_jump", label: "Orbe salto magenta", file: "MagentaJumpRing.png" },
          { key: "orb_red_jump", label: "Orbe salto rojo", file: "RedJumpRing.png" },
          { key: "orb_cyan_gravity", label: "Orbe gravedad cian", file: "CyanGravityRing.png" },
          { key: "orb_green_gravity", label: "Orbe gravedad verde", file: "GreenGravityRing.png" },
          { key: "orb_black_drop", label: "Orbe de caída negro", file: "BlackGravityRing.png" },
          { key: "orb_green_dash", label: "Orbe dash verde", file: "GreenDashRing.png" },
          { key: "orb_magenta_dash", label: "Orbe dash magenta", file: "MagentaDashRing.png" },
          { key: "orb_custom_toggle", label: "Orbe personalizado (toggle)", file: "ToggleRing.png" },
          { key: "orb_spider_teleport", label: "Orbe teletransporte araña", file: "TeleportationRing.png" },
          { key: "orb_teleport_linked", label: "Orbe de teletransporte a grupo", file: "LinkedTeleportationRing.png" },
        ],
      },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "portals",
    label: "Portales",
    groups: [
      {
        label: "Portales de forma",
        items: [
          { key: "portal_cube", label: "Portal Cubo", file: "CubePortal.png" },
          { key: "portal_ship", label: "Portal Nave", file: "ShipPortal.png" },
          { key: "portal_jetpack", label: "Jetpack (sustituye a la nave)", file: "Jetpack001.png" },
          { key: "portal_ball", label: "Portal Bola", file: "BallPortal.png" },
          { key: "portal_ufo", label: "Portal UFO", file: "UFOPortal.png" },
          { key: "portal_wave", label: "Portal Onda", file: "WavePortal.png" },
          { key: "portal_robot", label: "Portal Robot", file: "RobotPortal.png" },
          { key: "portal_spider", label: "Portal Araña", file: "SpiderPortal.png" },
          { key: "portal_swing", label: "Portal Columpio", file: "SwingPortal.png" },
        ],
      },
      {
        label: "Portales de manipulación",
        items: [
          { key: "portal_gravity_a", label: "Gravedad (activar)", file: "GravityPortalA.png" },
          { key: "portal_gravity_b", label: "Gravedad (desactivar)", file: "GravityPortalB.png" },
          { key: "portal_gravity_c", label: "Gravedad (toggle)", file: "GravityPortalC.png" },
          { key: "portal_mirror_a", label: "Espejo (activar)", file: "MirrorPortalA.png" },
          { key: "portal_mirror_b", label: "Espejo (desactivar)", file: "MirrorPortalB.png" },
          { key: "portal_size_a", label: "Tamaño mini (activar)", file: "SizePortalA.png" },
          { key: "portal_size_b", label: "Tamaño normal (desactivar)", file: "SizePortalB.png" },
          { key: "portal_speed_slow", label: "Velocidad lenta", file: "SpeedPortalSlow.png" },
          { key: "portal_speed_normal", label: "Velocidad normal", file: "SpeedPortalNormal.png" },
          { key: "portal_speed_fast", label: "Velocidad rápida", file: "SpeedPortalFast.png" },
          { key: "portal_speed_veryfast", label: "Velocidad muy rápida", file: "SpeedPortalVeryFast.png" },
          { key: "portal_speed_extreme", label: "Velocidad extrema", file: "SpeedPortalExtreme.png" },
          { key: "portal_dual_a", label: "Dual (activar)", file: "DualPortalA.png" },
          { key: "portal_dual_b", label: "Dual (desactivar)", file: "DualPortalB.png" },
          { key: "portal_teleport_a", label: "Teletransporte (entrada)", file: "TeleportationPortalA.png" },
          { key: "portal_teleport_b", label: "Teletransporte (salida)", file: "TeleportationPortalB.png" },
        ],
      },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "pickups-misc",
    label: "Recogibles",
    groups: [
      {
        label: "Pick-ups",
        items: [
          { key: "key_a", label: "Llave A", file: "KeyA.png" },
          { key: "key_b", label: "Llave B", file: "KeyB.png" },
          { key: "heart_a", label: "Corazón A", file: "HeartA.png" },
          { key: "heart_b", label: "Corazón B", file: "HeartB.png" },
          { key: "flask_a", label: "Frasco A", file: "FlaskA.png" },
          { key: "flask_b", label: "Frasco B", file: "FlaskB.png" },
          { key: "skull_a", label: "Calavera A", file: "SkullA.png" },
          { key: "skull_b", label: "Calavera B", file: "SkullB.png" },
          { key: "clock", label: "Reloj", file: "Clock.png" },
          { key: "token", label: "Ficha", file: "Token.png" },
        ],
      },
      {
        label: "Misceláneo",
        items: [
          { key: "user_coin_unverified", label: "Moneda de usuario (sin verificar)", file: "UserCoinUnverified.png" },
          { key: "user_coin_verified", label: "Moneda de usuario (verificada)", file: "UserCoinVerified.png" },
          { key: "game_text", label: "Texto", file: "GameText.webp" },
        ],
      },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "decor-animated",
    label: "Decoración animada",
    groups: [
      { label: "Onda", items: seq("WaveAnimatedDecor", 1, 4, "Onda") },
      { label: "Franjas", items: seq("StripeAnimatedDecor", 1, 2, "Franjas") },
      { label: "Llama", items: seq("FlameAnimatedDecor", 1, 4, "Llama") },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "decor-ground",
    label: "Decoración de suelo",
    groups: [
      { label: "Espinas", items: seq("ThornGroundDecor", 1, 4, "Espinas") },
      { label: "Nube", items: seq("CloudGroundDecor", 1, 2, "Nube") },
      { label: "Columnas", items: seq("ColumnsGroundDecor", 1, 3, "Columnas") },
      { label: "Ondulado", items: seq("WavyGroundDecor", 1, 3, "Ondulado") },
      { label: "Angular", items: seq("AngledGroundDecor", 1, 3, "Angular") },
      { label: "Dentado", items: seq("JaggedGroundDecor", 1, 3, "Dentado") },
      { label: "Curvo", items: seq("CurvedGroundDecor", 1, 2, "Curvo") },
      { label: "Pilas", items: seq("StacksGroundDecor", 1, 3, "Pilas") },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "decor-regular",
    label: "Decoración normal",
    groups: [
      { label: "Cadena", items: seq("ChainDecor", 1, 4, "Cadena") },
      { label: "Eslabón", items: seq("ChainLinkDecor", 1, 2, "Eslabón") },
      { label: "Nube", items: seq("CloudDecor", 1, 3, "Nube") },
      { label: "Enredadera", items: seq("VineDecor", 1, 6, "Enredadera") },
      { label: "Cadena estilizada", items: seq("StylisedChain", 1, 2, "Cadena estilizada") },
      { label: "Cabeza puntiaguda", items: seq("PointedHead", 1, 3, "Cabeza") },
      { label: "Línea curva", items: seq("CurvedLineDecor", 1, 2, "Línea curva") },
      { label: "Línea dentada", items: seq("JaggedLineDecor", 1, 2, "Línea dentada") },
      { label: "Tubo grueso", items: seq("ThickTubeDecor", 1, 2, "Tubo grueso") },
      { label: "Viga", items: seq("BeamDecor", 1, 5, "Viga") },
      { label: "Tubo", items: seq("TubeDecor", 1, 5, "Tubo") },
      { label: "Bloque decorativo", items: seq("BlockDecor", 1, 5, "Bloque decor.") },
      { label: "Plataforma decorativa", items: seq("PlatformDecor", 1, 2, "Plataforma decor.") },
      { label: "Plataforma estilizada", items: seq("PlatformStylisedDecor", 1, 2, "Plataforma estil.") },
      { label: "Plataforma negra", items: seq("PlatformBlackDecor", 1, 2, "Plataforma negra") },
      { label: "Hierba", items: seq("GrassDecor", 1, 5, "Hierba") },
      { label: "Piedras", items: seq("StonesDecor", 1, 4, "Piedras") },
      { label: "Junco", items: seq("ReedDecor", 1, 3, "Junco") },
      { label: "Viga con bulbo", items: seq("BulbBeamDecor", 1, 5, "Viga bulbo") },
      { label: "Viga con bulbo negra", items: seq("BulbBeamBlackDecor", 1, 5, "Viga bulbo negra") },
      { label: "Tallo", items: seq("StemDecor", 1, 5, "Tallo") },
      { label: "Fondo serrado", items: seq("SerratedBackdropDecor", 1, 6, "Fondo serrado") },
      { label: "Línea serrada", items: seq("SerratedLineDecor", 1, 4, "Línea serrada") },
      { label: "Píxel", items: seq("PixelDecor", 1, 2, "Píxel") },
      { label: "Arcoíris", items: seq("RainbowDecor", 1, 2, "Arcoíris") },
      { label: "Nube estilizada", items: seq("StylisedCloudDecor", 1, 3, "Nube estilizada") },
      { label: "Flor", items: single("flower_decor_01", "Flor", "FlowerDecor01.png") },
      { label: "Pane bloque", items: seq("PaneBlockDecor", 1, 7, "Pane bloque") },
      { label: "Pane pendiente", items: seq("PaneSlopeDecor", 1, 6, "Pane pendiente") },
      { label: "Pane marco", items: seq("PaneFrameDecor", 1, 6, "Pane marco") },
      { label: "Pane línea", items: seq("PaneLineDecor", 1, 2, "Pane línea") },
      { label: "Línea ondulada", items: seq("SquigglyLineDecor", 1, 6, "Línea ondulada") },
      { label: "Línea ondulada (pendiente)", items: seq("SquigglySlopeLineDecor", 1, 5, "Línea ond. pend.") },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "decor-pulsating",
    label: "Decoración pulsante",
    groups: [
      { label: "Baliza", items: seq("Beacon", 1, 3, "Baliza") },
      { label: "Pulsador pequeño", items: seq("SmallPulsator", 1, 9, "Pulsador peq.") },
      { label: "Pulsador grande", items: seq("LargePulsator", 1, 10, "Pulsador grande") },
    ],
  },
  // ---------------------------------------------------------
  {
    id: "decor-rotating",
    label: "Decoración giratoria",
    groups: [
      { label: "Engranaje", items: seq("GearRotator", 1, 4, "Engranaje") },
      { label: "Engranaje invertido", items: seq("InvertedGearRotator", 1, 3, "Engranaje inv.") },
      { label: "Puntiagudo", items: seq("PointedRotator", 1, 3, "Puntiagudo") },
      { label: "Voltereta", items: seq("CartwheelRotator", 1, 3, "Voltereta") },
      { label: "Cabeza de flor", items: seq("FlowerheadRotator", 1, 3, "Cabeza flor") },
      { label: "Péndulo", items: seq("PendulumRotator", 1, 4, "Péndulo") },
      { label: "Hexágono", items: seq("HexagonRotator", 1, 3, "Hexágono") },
      { label: "Objetivo", items: seq("TargetLockRotator", 1, 4, "Objetivo") },
      { label: "Iluminación", items: seq("IlluminationRotator", 1, 3, "Iluminación") },
      { label: "Orbital", items: seq("OrbitalRotator", 1, 3, "Orbital") },
      { label: "Remolino", items: seq("SwirlRotator", 1, 4, "Remolino") },
    ],
  },
];

// Claves de objetos que, a diferencia de un bloque, se apoyan SOBRE la
// superficie en vez de ocupar toda la casilla — su punto de referencia debe
// quedar pegado al borde inferior de la casilla, no centrado en ella.
export const BOTTOM_ANCHORED_KEYS = new Set([
  "pad_yellow_jump",
  "pad_magenta_jump",
  "pad_red_jump",
  "pad_cyan_gravity",
  "pad_spider_teleport",
]);

export function isBottomAnchored(key) {
  return BOTTOM_ANCHORED_KEYS.has(key);
}

// Índice plano key → item, útil para renderizar un bloque ya colocado
// sin tener que recorrer todas las categorías cada vez.
export const OBJECT_INDEX = new Map();
for (const tab of CATEGORY_TABS) {
  for (const group of tab.groups) {
    for (const item of group.items) {
      OBJECT_INDEX.set(item.key, item);
    }
  }
}

export function getObjectFile(key) {
  return OBJECT_INDEX.get(key)?.file || null;
}
