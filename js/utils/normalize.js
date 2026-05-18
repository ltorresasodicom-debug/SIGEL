// =============================================================================
// SIGEL — Normalización de texto reutilizable
//
// Centraliza la limpieza de strings para que la búsqueda, el matching de
// cantones (entre datos electorales y GeoJSON) y los filtros usen la misma
// función. Evita inconsistencias por tildes, mayúsculas, espacios, etc.
// =============================================================================

/**
 * Quita tildes, pasa a minúsculas, colapsa espacios y elimina caracteres
 * no alfanuméricos básicos. Reutilizable para búsqueda y lookup.
 *
 * @example
 *   normalize('Santo Domingo de los Tsáchilas') // → 'santo domingo de los tsachilas'
 *   normalize('  Río   Verde  ')                 // → 'rio verde'
 */
export function normalize(text) {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // tildes
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Variante "slug" para usar como clave/identificador (sin espacios).
 *
 * @example slugify('San Miguel de los Bancos') // → 'san-miguel-de-los-bancos'
 */
export function slugify(text) {
  return normalize(text).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Compara dos strings ignorando tildes / mayúsculas / espacios extras.
 */
export function equalsLoose(a, b) {
  return normalize(a) === normalize(b);
}

/**
 * Quita prefijos comunes ("GAD Municipal de", "Gobierno Provincial de", "Cantón")
 * para que la búsqueda funcione contra el nombre simple.
 */
export function stripGadPrefix(text) {
  return (text || '')
    .replace(/^GAD\s+(municipal|provincial|parroquial)\s+de\s+/i, '')
    .replace(/^Gobierno\s+(municipal|provincial|parroquial)\s+de\s+/i, '')
    .replace(/^Cant[oó]n\s+/i, '')
    .trim();
}
