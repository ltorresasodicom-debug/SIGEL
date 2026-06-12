// SIGEL — Tipos del modelo de datos enriquecido (runtime).
import type { DimensionCodigo, Nivel, Semaforo } from '@/evaluation-engine/types';

export type TipoGad = 'PROVINCIAL' | 'MUNICIPAL';

/** Coordenada [lat, lng] (formato Leaflet). */
export type Coord = [number, number];

export type DimScoreMap = Record<DimensionCodigo, number>;

/** Sub-índices INEC de un dataset. */
export interface IndicadorDataset {
  indice: number | null;
  institucional: number | null;
  operacion: number | null;
}

/** Indicadores oficiales INEC 2024 de un cantón. */
export interface IndicadorInec {
  canton: string;
  girs: IndicadorDataset | null;
  apa: IndicadorDataset | null;
}

/**
 * Ejecución presupuestaria 2024 publicada vía LOTAIP Núm. 6 (DPE), por GAD.
 * Los montos son la suma de cuentas hoja del clasificador presupuestario; el
 * cómputo y la fuente cruda se documentan en `scripts/build_seed_dpe_finanzas.py`.
 */
export interface FinanzasDpe {
  /** Presupuesto anual asignado en USD. */
  presupuesto: number;
  /** Gasto anual devengado en USD. */
  gasto: number;
  /** Ejecución presupuestaria: devengado / presupuesto * 100. */
  ejecucionPct: number;
  /** Mes (1–12) del corte usado para este cantón. */
  mesCorte: number;
}

/** Gobierno local enriquecido (unidad central del modelo). */
export interface Gad {
  id: string;
  tipo: TipoGad;
  nombre: string;
  provincia: string;
  canton?: string;
  autoridad: string;
  cargo: string;
  partido: string;
  alianza: boolean;
  porcentajeVotos?: number | null;
  coord: Coord;
  dims: DimScoreMap;
  ingel: number;
  nivel: Nivel;
  semaforo: Semaforo;
  iri: number;
  featureId?: string;
  indicadores?: IndicadorInec;
  finanzasDpe?: FinanzasDpe;
}

export interface Asambleista {
  nombre: string;
  provincia: string;
  bancada: string;
  contacto: string;
  redes: string;
}

export interface SigelStats {
  total: number;
  municipales: number;
  provinciales: number;
  asambleistas: number;
  promedio: number;
  max: number;
  min: number;
  std: number;
  verdes: number;
  amarillos: number;
  rojos: number;
}

/** Geometría GeoJSON mínima usada por el mapa. */
export interface GeoFeature {
  type: 'Feature';
  properties: { canton_codigo: string; canton: string; provincia_codigo: string; provincia: string };
  geometry: { type: string; coordinates: unknown };
}
export interface GeoCollection {
  type: 'FeatureCollection';
  features: GeoFeature[];
}

/** Conjunto de datos completo de SIGEL. */
export interface SigelData {
  gads: Gad[];
  provincias: Gad[];
  cantones: Gad[];
  asambleistas: Asambleista[];
  stats: SigelStats;
  geojson: GeoCollection | null;
}
