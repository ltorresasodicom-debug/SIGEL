// SIGEL — Normalización de texto reutilizable (búsqueda, matching, filtros).

/** Quita tildes, pasa a minúsculas, colapsa espacios. */
export function normalize(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Variante "slug" para identificadores estables. */
export function slugify(text: string | null | undefined): string {
  return normalize(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Compara dos strings ignorando tildes / mayúsculas / espacios. */
export function equalsLoose(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}
