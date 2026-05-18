// =============================================================================
// SIGEL — Helpers para generación PDF
//
// Utilidades puras (formato, slugs, nombres de archivo). Aisladas del
// template para facilitar testing.
// =============================================================================
import { slugify } from '../../utils/normalize.js';

/**
 * Nombre de archivo siguiendo el formato:
 *   evaluacion-{slug-municipio}-{YYYY-MM-DD}.pdf
 *
 * @example
 *   fileNameFor({ canton: 'Quito' }, { fecha: '2026-05-15T10:30:00Z' })
 *   // → 'evaluacion-quito-2026-05-15.pdf'
 */
export function fileNameFor(gad, evaluacion) {
  const base = gad?.canton || gad?.provincia || 'sin-canton';
  const slug = slugify(base) || 'gad';
  const date = (evaluacion?.fecha ? new Date(evaluacion.fecha) : new Date())
    .toISOString().slice(0, 10);
  return `evaluacion-${slug}-${date}.pdf`;
}

/** Formatea fecha ISO a formato es-EC legible. */
export function formatDate(isoOrDate, includeTime = true) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  const opts = { year: 'numeric', month: 'long', day: '2-digit' };
  if (includeTime) Object.assign(opts, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleString('es-EC', opts);
}

/** Devuelve año (para portada). */
export function formatYear(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  return d.getFullYear();
}

/**
 * Mapea un nivel a un color hex (en sintonía con la paleta del frontend).
 */
export function colorForNivel(nivel) {
  switch (nivel) {
    case 'EXCELENTE': return [34, 134, 58];    // verde oscuro
    case 'ALTO':      return [76, 175, 80];    // verde
    case 'MEDIO':     return [245, 158, 11];   // amarillo
    case 'BAJO':      return [234, 88, 12];    // naranja
    case 'CRITICO':   return [220, 38, 38];    // rojo
    default:          return [100, 116, 139];  // slate
  }
}

/** Color asociado a una semaforización. */
export function colorForSemaforo(semaforo) {
  return {
    VERDE: [22, 163, 74],
    AMARILLO: [245, 158, 11],
    ROJO: [220, 38, 38],
  }[semaforo] || [148, 163, 184];
}

/**
 * Identifica las dimensiones más fuertes y más débiles para el resumen
 * ejecutivo. Devuelve top/bottom 3.
 */
export function identifyStrengthsAndWeaknesses(dims100, dimensionsMeta) {
  const arr = dimensionsMeta.map(d => ({
    codigo: d.codigo,
    nombre: d.nombre,
    peso: d.peso,
    score: dims100[d.codigo] ?? 0,
  }));
  const sorted = arr.slice().sort((a, b) => b.score - a.score);
  return {
    fortalezas: sorted.slice(0, 3),
    debilidades: sorted.slice(-3).reverse(),
  };
}

/** Recorta texto largo añadiendo elipsis. */
export function truncate(str, maxLen = 120) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen - 1) + '…' : str;
}
