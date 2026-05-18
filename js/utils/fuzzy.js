// =============================================================================
// SIGEL — Búsqueda fuzzy reutilizable
//
// Adaptador delgado sobre Fuse.js (cargado vía CDN como UMD) que normaliza
// el texto antes de indexar/buscar. Permite encontrar:
//   - palabras completas, parciales, múltiples palabras
//   - errores leves de escritura ("sto domingo" → "Santo Domingo")
//   - búsqueda insensible a tildes y mayúsculas
//
// Si Fuse.js no está disponible (offline, fallo de CDN), cae a un matcher
// por substring + tokens, manteniendo la API.
// =============================================================================
import { normalize } from './normalize.js';

const FUSE_DEFAULTS = {
  threshold: 0.35,        // 0 = exacto, 1 = todo coincide
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: false,
  shouldSort: true,
  useExtendedSearch: false,
};

/**
 * Crea un buscador fuzzy sobre una colección. La colección se indexa una vez
 * y la búsqueda es O(log n) gracias a Fuse.js.
 *
 * @param {Array<object>} items   - colección a indexar
 * @param {string[]} keys         - rutas a campos buscables (e.g. 'nombre')
 * @param {object} [opts]         - overrides de Fuse
 * @returns {(query: string) => Array<object>}
 *
 * @example
 *   const search = createSearcher(gads, ['nombre', 'autoridad', 'provincia']);
 *   search('sto dom') // → [Santo Domingo de los Tsachilas, ...]
 */
export function createSearcher(items, keys, opts = {}) {
  // Pre-cómputo de campos normalizados para evitar tildes/mayúsculas.
  const indexed = items.map(item => {
    const normalized = {};
    for (const k of keys) {
      normalized[`_norm_${k}`] = normalize(item[k]);
    }
    return Object.assign({}, item, normalized);
  });
  const normalizedKeys = keys.map(k => `_norm_${k}`);

  if (typeof window !== 'undefined' && window.Fuse) {
    const fuse = new window.Fuse(indexed, {
      ...FUSE_DEFAULTS,
      ...opts,
      keys: normalizedKeys,
    });
    return query => {
      const q = normalize(query);
      if (!q) return items;
      return fuse.search(q).map(r => stripNormFields(r.item));
    };
  }

  // Fallback: matcher por substring + tokens.
  return query => fallbackSearch(indexed, normalizedKeys, query).map(stripNormFields);
}

/**
 * Filtro instantáneo sin pre-indexar — útil para listas pequeñas (cantones).
 */
export function filterByQuery(items, keys, query) {
  const q = normalize(query);
  if (!q) return items;
  const tokens = q.split(' ').filter(Boolean);
  return items.filter(item => {
    const haystack = keys.map(k => normalize(item[k])).join(' ');
    return tokens.every(t => haystack.includes(t));
  });
}

function fallbackSearch(indexed, normalizedKeys, query) {
  const q = normalize(query);
  if (!q) return indexed;
  const tokens = q.split(' ').filter(Boolean);
  return indexed.filter(item => {
    const haystack = normalizedKeys.map(k => item[k]).join(' ');
    return tokens.every(t => haystack.includes(t));
  });
}

function stripNormFields(item) {
  const out = {};
  for (const k of Object.keys(item)) {
    if (!k.startsWith('_norm_')) out[k] = item[k];
  }
  return out;
}

/**
 * Debounce simple — agrupa llamadas rápidas en una sola. Se usa para
 * encadenar al evento `input` sin disparar render por cada tecla.
 */
export function debounce(fn, ms = 180) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
