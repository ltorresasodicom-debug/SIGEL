// =============================================================================
// SIGEL — Carga y enriquecimiento del conjunto de datos (port de data.js)
//
// Los puntajes por dimensión son SINTÉTICOS (derivados de los datos
// electorales mediante un hash determinista) — sirven para demostración. La
// evaluación ciudadana sí usa la fórmula INGEL real (evaluation-engine).
// =============================================================================
import {
  DIMENSIONES,
  calcularIngel,
  calcularIri,
  clasificarNivel,
  semaforizar,
} from '@/evaluation-engine';
import type { DimensionCodigo, Nivel, Semaforo } from '@/evaluation-engine/types';
import { normalize } from '@/lib/normalize';
import { resolveCantonName } from '@/lib/canton-aliases';
import type {
  Asambleista,
  Coord,
  DimScoreMap,
  Gad,
  GeoCollection,
  GeoFeature,
  IndicadorInec,
  SigelData,
  SigelStats,
} from '@/types/sigel';

// Coordenadas aproximadas (capital provincial) para el mapa.
const COORDENADAS: Record<string, Coord> = {
  Azuay: [-2.9, -78.95],
  Bolivar: [-1.6, -79.0],
  Cañar: [-2.7, -78.95],
  Carchi: [0.81, -77.72],
  Cotopaxi: [-0.93, -78.62],
  Chimborazo: [-1.66, -78.65],
  'El Oro': [-3.27, -79.96],
  Esmeraldas: [0.96, -79.65],
  Guayas: [-2.19, -79.88],
  Imbabura: [0.35, -78.13],
  Loja: [-3.99, -79.2],
  'Los Rios': [-1.5, -79.5],
  Manabi: [-1.05, -80.45],
  'Morona Santiago': [-2.31, -78.12],
  Napo: [-0.92, -77.81],
  Pastaza: [-1.49, -77.99],
  Pichincha: [-0.22, -78.51],
  Tungurahua: [-1.25, -78.62],
  'Zamora Chinchipe': [-4.07, -78.95],
  Galapagos: [-0.9, -90.95],
  Sucumbios: [0.08, -76.88],
  Orellana: [-0.46, -76.99],
  'Santo Domingo de los Tsachilas': [-0.25, -79.17],
  'Santa Elena': [-2.23, -80.86],
};
const COORD_DEFAULT: Coord = [-1.5, -78.5];

// ── Scoring sintético (determinista) ────────────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}
function pseudoScore(seed: number, base: number, range: number): number {
  return base + (((seed >>> 0) % 10000) / 10000) * range;
}
function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}
function syntheticDimensionScores(seedKey: string, votosPct: number | null | undefined): DimScoreMap {
  const s = hashStr(seedKey);
  const boost = votosPct ? (votosPct - 0.4) * 25 : 0;
  return {
    transparencia: clamp(pseudoScore(s, 45, 45) + boost),
    finanzas: clamp(pseudoScore(s ^ 0xa1, 50, 40) + boost * 0.5),
    servicios: clamp(pseudoScore(s ^ 0xb2, 50, 40) + boost),
    desarrollo: clamp(pseudoScore(s ^ 0xc3, 45, 45)),
    gestion_institucional: clamp(pseudoScore(s ^ 0xd4, 50, 40)),
    participacion: clamp(pseudoScore(s ^ 0xe5, 40, 50) + boost),
    legitimidad: clamp(pseudoScore(s ^ 0xf6, 35, 55) + boost * 1.5),
    innovacion: clamp(pseudoScore(s ^ 0x77, 30, 60)),
  };
}

function iriDe(dims: DimScoreMap): number {
  return calcularIri({
    transparencia: dims.transparencia,
    finanzas: dims.finanzas,
    endeudamiento: 100 - dims.finanzas,
    corrupcion: 100 - dims.legitimidad,
    participacion: dims.participacion,
  });
}

function gadDesde(
  base: Omit<Gad, 'dims' | 'ingel' | 'nivel' | 'semaforo' | 'iri'>,
  dims: DimScoreMap,
): Gad {
  const ingel = calcularIngel(dims);
  return {
    ...base,
    dims,
    ingel,
    nivel: (clasificarNivel(ingel) ?? 'CRITICO') as Nivel,
    semaforo: (semaforizar(ingel) ?? 'ROJO') as Semaforo,
    iri: iriDe(dims),
  };
}

// ── Tipos crudos de electoral.json ──────────────────────────────────────────
interface RawProvincia {
  provincia: string;
  prefecto: string;
  partido: string;
  alianza: boolean;
}
interface RawCanton {
  provincia: string;
  canton: string;
  alcalde: string;
  partido: string;
  alianza: boolean;
  porcentaje: number | null;
}
interface RawElectoral {
  provincias: RawProvincia[];
  cantones: RawCanton[];
  asambleistas: Asambleista[];
}

function avg(a: number[]): number {
  return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
}
function round(v: number, d = 2): number {
  return Math.round(v * 10 ** d) / 10 ** d;
}

// ── Centroide bbox de una geometría GeoJSON ─────────────────────────────────
function featureCentroid(coordinates: unknown): Coord | null {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const visit = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number') {
      minX = Math.min(minX, c[0]);
      minY = Math.min(minY, c[1]);
      maxX = Math.max(maxX, c[0]);
      maxY = Math.max(maxY, c[1]);
    } else if (Array.isArray(c)) {
      c.forEach(visit);
    }
  };
  visit(coordinates);
  if (!Number.isFinite(minX)) return null;
  return [(minY + maxY) / 2, (minX + maxX) / 2];
}

function attachGeo(data: SigelData, geo: GeoCollection | null): void {
  if (!geo) return;
  const index = new Map<string, GeoFeature>();
  for (const f of geo.features) {
    const p = f.properties;
    index.set(`${normalize(p.provincia)}|${normalize(p.canton)}`, f);
    const ck = normalize(p.canton);
    if (!index.has(ck)) index.set(ck, f);
  }
  for (const g of data.cantones) {
    const resolved = resolveCantonName(g.canton ?? '');
    const feat =
      index.get(`${normalize(g.provincia)}|${resolved}`) ?? index.get(resolved);
    if (feat) {
      g.featureId = feat.properties.canton_codigo;
      const c = featureCentroid(feat.geometry.coordinates);
      if (c) g.coord = c;
    }
  }
  for (const p of data.provincias) {
    const feats = geo.features.filter(
      (f) => normalize(f.properties.provincia) === normalize(p.provincia),
    );
    const centroids = feats
      .map((f) => featureCentroid(f.geometry.coordinates))
      .filter((c): c is Coord => c != null);
    if (centroids.length) {
      p.coord = [
        avg(centroids.map((c) => c[0])),
        avg(centroids.map((c) => c[1])),
      ];
    }
  }
}

interface IndicadoresJson {
  byCode: Record<string, IndicadorInec>;
}
function attachIndicadores(data: SigelData, indic: IndicadoresJson | null): void {
  if (!indic?.byCode) return;
  for (const g of data.cantones) {
    const rec = g.featureId ? indic.byCode[g.featureId] : undefined;
    if (rec) g.indicadores = rec;
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url} (HTTP ${res.status})`);
  return (await res.json()) as T;
}

/** Carga electoral.json + geojson + indicadores y construye el dataset SIGEL. */
export async function cargarSigelData(): Promise<SigelData> {
  const [raw, geo, indic] = await Promise.all([
    fetchJson<RawElectoral>('/data/electoral.json'),
    fetchJson<GeoCollection>('/data/cantones-ec.geojson').catch(() => null),
    fetchJson<IndicadoresJson>('/data/indicadores_inec_2024.json').catch(() => null),
  ]);

  const provincias: Gad[] = raw.provincias.map((p, idx) =>
    gadDesde(
      {
        id: `prov-${idx}`,
        tipo: 'PROVINCIAL',
        nombre: `Gobierno Provincial de ${p.provincia}`,
        provincia: p.provincia,
        autoridad: p.prefecto,
        cargo: 'PREFECTO',
        partido: p.partido,
        alianza: p.alianza,
        coord: COORDENADAS[p.provincia] ?? COORD_DEFAULT,
      },
      syntheticDimensionScores(`prov:${p.provincia}`, 0.55),
    ),
  );

  const cantones: Gad[] = raw.cantones.map((c, idx) => {
    const base = COORDENADAS[c.provincia] ?? COORD_DEFAULT;
    const jitter: Coord = [
      base[0] + ((hashStr(c.canton) % 1000) - 500) / 5000,
      base[1] + ((hashStr(c.canton + 'x') % 1000) - 500) / 5000,
    ];
    return gadDesde(
      {
        id: `cant-${idx}`,
        tipo: 'MUNICIPAL',
        nombre: `GAD Municipal de ${c.canton}`,
        provincia: c.provincia,
        canton: c.canton,
        autoridad: c.alcalde,
        cargo: 'ALCALDE',
        partido: c.partido,
        alianza: c.alianza,
        porcentajeVotos: c.porcentaje,
        coord: jitter,
      },
      syntheticDimensionScores(`cant:${c.provincia}:${c.canton}`, c.porcentaje),
    );
  });

  const gads = [...provincias, ...cantones];
  const ingels = gads.map((g) => g.ingel);
  const m = avg(ingels);
  const stats: SigelStats = {
    total: gads.length,
    municipales: cantones.length,
    provinciales: provincias.length,
    asambleistas: raw.asambleistas.length,
    promedio: round(m),
    max: round(Math.max(...ingels)),
    min: round(Math.min(...ingels)),
    std: round(Math.sqrt(avg(ingels.map((x) => (x - m) ** 2)))),
    verdes: gads.filter((g) => g.semaforo === 'VERDE').length,
    amarillos: gads.filter((g) => g.semaforo === 'AMARILLO').length,
    rojos: gads.filter((g) => g.semaforo === 'ROJO').length,
  };

  const data: SigelData = {
    gads,
    provincias,
    cantones,
    asambleistas: raw.asambleistas,
    stats,
    geojson: geo,
  };
  attachGeo(data, geo);
  attachIndicadores(data, indic);
  return data;
}

/** Lista de dimensiones canónicas (re-export para vistas). */
export { DIMENSIONES };
export type { DimensionCodigo };
