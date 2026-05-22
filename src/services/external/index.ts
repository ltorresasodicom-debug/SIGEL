// SIGEL — Adaptadores de fuentes externas (INEC, SIL/ArcGIS, datosabiertos/CKAN).
// Capa preparada; los adaptadores concretos se portan en una iteración posterior.

export interface FuenteExterna {
  id: string;
  label: string;
  tipo: 'arcgis' | 'ckan';
}

/** Registro de fuentes externas (vacío hasta configurar endpoints verificados). */
export const FUENTES_EXTERNAS: readonly FuenteExterna[] = [];
