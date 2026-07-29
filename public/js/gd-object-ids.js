// ============================================================
// Mapa: clave de nuestro catálogo (objects-catalog.js) → ID numérico
// REAL de objeto en Geometry Dash.
//
// Fuente principal (fiable y completa): Object IDs de flowvix
// https://flowvix.github.io/gd-info-explorer/ids
// (crédito de esa lista: Alphalaneous y la comunidad)
//
// Con esa lista pude verificar con confianza alta TODOS los objetos
// "core" de jugabilidad: portales, pads, orbes, recogibles y los
// básicos (bloque y pincho regulares). Estos son los que hacen falta
// para construir y probar un mini-nivel jugable de verdad.
//
// Lo que SIGUE sin mapear a propósito: las variantes de estilo de
// bloques/plataformas/pendientes (Grid, Tile, Chipped, Brick,
// Chequered, Cross, Pane...), las decoraciones, sierras y demás.
// La lista de flowvix agrupa esos objetos en "familias" de 6-7 piezas
// (cara completa, borde superior, esquina exterior, esquina interior,
// centro, pilar superior, pilar) en un orden consistente, pero no
// puedo verificar sin ambigüedad qué imagen de la wiki (BlockXX.png)
// corresponde a qué pieza exacta de cada familia sin comparar los
// sprites uno a uno — así que, mismo criterio que antes: mejor
// omitir esos objetos del .gmd que arriesgarme a colocar la pieza
// equivocada en silencio.
//
// Cómo rellenar uno de esos: compara visualmente el sprite en
// https://flowvix.github.io/gd-info-explorer/ids con la imagen de la
// wiki que ya tienes descargada, y añade aquí `clave: NUMERO`.
// ============================================================

export const GD_OBJECT_IDS = {
  // --- Básicos ---
  regular_block_01: 1, // Bloque básico
  regularspike01: 8, // Pincho básico

  // --- Recogibles (pareja: A = objeto recogible, B = "hueco" decorativo que marca el trigger) ---
  key_a: 1275,
  key_b: 1276,
  heart_a: 1587,
  heart_b: 1588,
  flask_a: 1589,
  flask_b: 1590,
  skull_a: 1598,
  skull_b: 1599,
  clock: 3601,
  user_coin_verified: 1329,
  user_coin_unverified: 1329, // mismo objeto que el verificado; la verificación es un dato del save, no otro objeto

  // --- Pads ---
  pad_yellow_jump: 35,
  pad_magenta_jump: 140,
  pad_red_jump: 1332,
  pad_cyan_gravity: 67,
  pad_spider_teleport: 3005,

  // --- Orbes ---
  orb_yellow_jump: 36,
  orb_magenta_jump: 141,
  orb_red_jump: 1333,
  orb_cyan_gravity: 84,
  orb_green_gravity: 1022,
  orb_black_drop: 1330,
  orb_green_dash: 1704,
  orb_magenta_dash: 1751,
  orb_custom_toggle: 1594,
  orb_spider_teleport: 3004,
  orb_teleport_linked: 3027,

  // --- Portales de forma ---
  portal_cube: 12,
  portal_ship: 13,
  portal_ball: 47,
  portal_ufo: 111,
  portal_wave: 660,
  portal_robot: 745,
  portal_spider: 1331,
  portal_swing: 1933,
  // portal_jetpack: sin ID de portal propio (sustituye a la nave en Platformer, no aparece como objeto de portal)

  // --- Portales de manipulación ---
  portal_gravity_a: 11, // amarillo = invierte (activar)
  portal_gravity_b: 10, // azul = normal (desactivar)
  portal_mirror_a: 45, // naranja = activar
  portal_mirror_b: 46, // azul = desactivar
  portal_size_a: 101, // rosa = mini (activar)
  portal_size_b: 99, // verde = normal (desactivar)
  portal_dual_a: 286,
  portal_dual_b: 287,
  portal_teleport_a: 747,
  portal_teleport_b: 747, // mismo objeto que la entrada; la dirección se define con sus propiedades, no con otro ID
  portal_speed_fast: 202, // "Green Fast Speed Portal"
  portal_speed_veryfast: 203, // "Pink Fast Speed Portal"
  portal_speed_extreme: 1334, // "Red Fast Speed Portal"
  // portal_speed_slow / portal_speed_normal: no aparecen con nombre "Speed" en la lista de flowvix,
  // probablemente por compartir sprite con otro objeto ya listado — pendiente de confirmar.
};

export function getGdObjectId(catalogKey) {
  return GD_OBJECT_IDS[catalogKey] ?? null;
}
