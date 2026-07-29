// ============================================================
// Mapa: clave de nuestro catálogo (objects-catalog.js) → ID numérico
// REAL de objeto en Geometry Dash.
//
// IMPORTANTE — léelo antes de tocar este archivo:
// Solo hay un puñado de IDs que se pueden dar por buenos ahora mismo,
// porque aparecen corroborados en fuentes de la comunidad. El resto del
// catálogo (todas las variantes numeradas de bloques, plataformas,
// pendientes, decoración...) NO tiene un listado público fiable e
// indexado — inventar un número aquí dejaría el nivel roto en silencio
// (el objeto se colocaría con el sprite/hitbox equivocado, o ni
// siquiera existiría ese ID). Por eso, todo lo que no está verificado
// se deja como `null` a propósito: el exportador de .gmd omite esos
// objetos y te avisa en vez de fingir que funciona.
//
// Cómo rellenar un ID que falte:
// 1. Abre https://flowvix.github.io/gd-info-explorer/props
// 2. Busca el objeto por nombre (o compáralo visualmente con su sprite)
// 3. Copia el "Object ID" que te da la herramienta
// 4. Añádelo aquí como `clave_del_catalogo: NUMERO`
//
// Fuente de los IDs ya verificados: cruce entre la wiki oficial de GD,
// el repositorio comunitario GD-Level-Generator (entity12208/GD-Level-Generator)
// y menciones consistentes en varias guías de la comunidad.
// ============================================================

export const GD_OBJECT_IDS = {
  // --- Verificados ---
  regular_block_01: 1, // Bloque básico
  pad_magenta_jump: 140, // Pad de salto rosa
  pad_yellow_jump: 35, // (sin verificar del todo — revisar con la herramienta)
  orb_yellow_jump: 36, // Orbe de salto amarillo
  portal_size_a: 101, // Portal de tamaño mini
  portal_size_b: 99, // Portal de tamaño normal
  user_coin_verified: 1329, // Moneda de usuario

  // --- El resto del catálogo (bloques, plataformas, pendientes, contornos,
  // pinchos, fosos, sierras, monstruos, la mayoría de pads/orbes/portales,
  // pickups y las 5 categorías de decoración) NO está verificado todavía.
  // No se listan aquí a propósito — getGdObjectId() devuelve null para
  // cualquier clave que no aparezca arriba, y el exportador las omite.
};

export function getGdObjectId(catalogKey) {
  return GD_OBJECT_IDS[catalogKey] ?? null;
}
