// SIGEL — Filtro y debounce reutilizables.
// Nota: la búsqueda fuzzy avanzada (Fuse.js) se añadirá al portar el ranking.
import { normalize } from './normalize';

/** Filtra una colección por coincidencia de tokens en los campos indicados. */
export function filterByQuery<T>(items: readonly T[], keys: (keyof T)[], query: string): T[] {
  const q = normalize(query);
  if (!q) return [...items];
  const tokens = q.split(' ').filter(Boolean);
  return items.filter((item) => {
    const haystack = keys.map((k) => normalize(String(item[k] ?? ''))).join(' ');
    return tokens.every((t) => haystack.includes(t));
  });
}

/** Agrupa llamadas rápidas en una sola (para inputs de búsqueda). */
export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms = 180,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
