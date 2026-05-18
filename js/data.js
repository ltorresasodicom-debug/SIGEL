// =============================================================================
// SIGEL — Carga y preparación de datos
//
// Datos reales:
// - 23 prefectos + 218 alcaldes + 18 asambleístas (Excel seccionales 2023-2024)
// - 224 cantones con geometrías oficiales (shapefile INEC/IGM, reproyectado de
//   UTM 17S a WGS84, simplificado a ~256KB / 71KB gzipped)
//
// Los scores INGEL son sintéticos (derivados del % de votación) para fines de
// demostración. En producción se alimentan del scraper LOTAIP, SERCOP, etc.
// =============================================================================
import { calcularIngel, calcularIri, clasificarNivel, semaforizar, DIMENSIONES } from './ingel.js';
import { normalize } from './utils/normalize.js';
import { resolveCantonName } from './utils/canton-aliases.js';

let _data = null;
let _geojson = null;

/**
 * Carga combinada de los datasets. Idempotente: se ejecuta una sola vez y
 * cachea el resultado en memoria. El GeoJSON se carga en paralelo con el
 * Excel-data para reducir TTFB.
 */
export async function loadData() {
  if (_data) return _data;
  const [raw, geo] = await Promise.all([
    fetch('./data/electoral.json').then(r => r.json()),
    fetch('./data/cantones-ec.geojson')
      .then(r => r.json())
      .catch(err => {
        console.warn('GeoJSON no disponible — mapa usará marcadores simples', err);
        return null;
      }),
  ]);
  _geojson = geo;
  _data = enrichWithSyntheticScores(raw);
  attachGeoToGads(_data, geo);
  return _data;
}

/**
 * Retorna el FeatureCollection de cantones (puede ser null si falló la carga).
 */
export function getCantonesGeoJSON() {
  return _geojson;
}

// Coordenadas aproximadas (capital de cada provincia) para Leaflet
export const COORDENADAS = {
  'Azuay':                            [-2.90, -78.95],
  'Bolivar':                          [-1.60, -79.00],
  'Cañar':                            [-2.70, -78.95],
  'Carchi':                           [ 0.81, -77.72],
  'Cotopaxi':                         [-0.93, -78.62],
  'Chimborazo':                       [-1.66, -78.65],
  'El Oro':                           [-3.27, -79.96],
  'Esmeraldas':                       [ 0.96, -79.65],
  'Guayas':                           [-2.19, -79.88],
  'Imbabura':                         [ 0.35, -78.13],
  'Loja':                             [-3.99, -79.20],
  'Los Rios':                         [-1.50, -79.50],
  'Manabi':                           [-1.05, -80.45],
  'Morona Santiago':                  [-2.31, -78.12],
  'Napo':                             [-0.92, -77.81],
  'Pastaza':                          [-1.49, -77.99],
  'Pichincha':                        [-0.22, -78.51],
  'Tungurahua':                       [-1.25, -78.62],
  'Zamora Chinchipe':                 [-4.07, -78.95],
  'Galapagos':                        [-0.90, -90.95],
  'Sucumbios':                        [ 0.08, -76.88],
  'Orellana':                         [-0.46, -76.99],
  'Santo Domingo de los Tsachilas':   [-0.25, -79.17],
  'Santa Elena':                      [-2.23, -80.86],
};

// Hash determinístico simple (FNV-1a) para generar pseudo-scores reproducibles
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function pseudoScore(seed, base = 60, range = 35) {
  // Convierte hash a un float en [base, base+range]
  return base + ((seed >>> 0) % 10000) / 10000 * range;
}

// Genera scores sintéticos correlacionados con % de votación
// (no tiene base científica — sólo es ilustrativo para el demo).
function syntheticDimensionScores(seedKey, votosPct) {
  const baseSeed = hashStr(seedKey);
  const electoralBoost = votosPct ? (votosPct - 0.40) * 25 : 0;
  return {
    transparencia:         clamp(pseudoScore(baseSeed,           45, 45) + electoralBoost),
    finanzas:              clamp(pseudoScore(baseSeed ^ 0xa1,    50, 40) + electoralBoost * 0.5),
    servicios:             clamp(pseudoScore(baseSeed ^ 0xb2,    50, 40) + electoralBoost),
    desarrollo:            clamp(pseudoScore(baseSeed ^ 0xc3,    45, 45)),
    gestion_institucional: clamp(pseudoScore(baseSeed ^ 0xd4,    50, 40)),
    participacion:         clamp(pseudoScore(baseSeed ^ 0xe5,    40, 50) + electoralBoost),
    legitimidad:           clamp(pseudoScore(baseSeed ^ 0xf6,    35, 55) + electoralBoost * 1.5),
    innovacion:            clamp(pseudoScore(baseSeed ^ 0x77,    30, 60)),
  };
}

function clamp(v, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, v));
}

function enrichWithSyntheticScores(raw) {
  // Provincias / Prefectos
  const provincias = raw.provincias.map((p, idx) => {
    const dims = syntheticDimensionScores(`prov:${p.provincia}`, 0.55);
    const ingel = calcularIngel(dims);
    const nivel = clasificarNivel(ingel);
    const semaforo = semaforizar(ingel);
    const coord = COORDENADAS[p.provincia] || [-1.5, -78.5];
    return {
      id: 'prov-' + idx,
      tipo: 'PROVINCIAL',
      nombre: `Gobierno Provincial de ${p.provincia}`,
      provincia: p.provincia,
      autoridad: p.prefecto,
      cargo: 'PREFECTO',
      partido: p.partido,
      alianza: p.alianza,
      coord,
      dims,
      ingel,
      nivel,
      semaforo,
      iri: calcularIri({
        transparencia: dims.transparencia,
        finanzas: dims.finanzas,
        endeudamiento: 100 - dims.finanzas,
        corrupcion: 100 - dims.legitimidad,
        participacion: dims.participacion,
      }),
    };
  });

  // Cantones / Alcaldes
  const cantones = raw.cantones.map((c, idx) => {
    const dims = syntheticDimensionScores(`cant:${c.provincia}:${c.canton}`, c.porcentaje);
    const ingel = calcularIngel(dims);
    const nivel = clasificarNivel(ingel);
    const semaforo = semaforizar(ingel);
    const coord = COORDENADAS[c.provincia] || [-1.5, -78.5];
    // Jitter para que cada cantón no caiga exactamente en la capital
    const jitter = [
      coord[0] + ((hashStr(c.canton) % 1000) - 500) / 5000,
      coord[1] + ((hashStr(c.canton + 'x') % 1000) - 500) / 5000,
    ];
    return {
      id: 'cant-' + idx,
      tipo: 'MUNICIPAL',
      nombre: `GAD Municipal de ${c.canton}`,
      provincia: c.provincia,
      canton: c.canton,
      autoridad: c.alcalde,
      cargo: 'ALCALDE',
      partido: c.partido,
      alianza: c.alianza,
      porcentaje_votos: c.porcentaje,
      coord: jitter,
      dims,
      ingel,
      nivel,
      semaforo,
      iri: calcularIri({
        transparencia: dims.transparencia,
        finanzas: dims.finanzas,
        endeudamiento: 100 - dims.finanzas,
        corrupcion: 100 - dims.legitimidad,
        participacion: dims.participacion,
      }),
    };
  });

  const gads = [...provincias, ...cantones];

  // Stats agregadas
  const ingels = gads.map(g => g.ingel);
  const stats = {
    total: gads.length,
    municipales: cantones.length,
    provinciales: provincias.length,
    asambleistas: raw.asambleistas.length,
    promedio: round(avg(ingels), 2),
    max: round(Math.max(...ingels), 2),
    min: round(Math.min(...ingels), 2),
    std: round(stddev(ingels), 2),
    verdes: gads.filter(g => g.semaforo === 'VERDE').length,
    amarillos: gads.filter(g => g.semaforo === 'AMARILLO').length,
    rojos: gads.filter(g => g.semaforo === 'ROJO').length,
  };

  return { gads, provincias, cantones, asambleistas: raw.asambleistas, stats };
}

function avg(arr) { return arr.reduce((a, b) => a + b, 0) / arr.length; }
function stddev(arr) {
  const m = avg(arr);
  return Math.sqrt(avg(arr.map(x => (x - m) ** 2)));
}
function round(v, dec = 2) { return Math.round(v * 10 ** dec) / 10 ** dec; }

// ─────────────────────────────────────────────────────────────────────────────
// Asociación GAD ↔ feature GeoJSON
//
// El shapefile usa nombres con tildes y mayúsculas distintas a los del Excel
// (e.g. "GUARANDA" vs "Guaranda"; "SANTO DOMINGO DE LOS TSACHILAS" vs
// "Santo Domingo de los Tsachilas"). Se hace match por nombre normalizado
// (provincia + cantón) que elimina tildes, mayúsculas y espacios extras.
// ─────────────────────────────────────────────────────────────────────────────
function attachGeoToGads(data, geo) {
  if (!geo || !geo.features) return;

  // Índice: clave "<provincia>|<canton>" normalizada → feature
  const featureIndex = new Map();
  for (const f of geo.features) {
    const key = `${normalize(f.properties.provincia)}|${normalize(f.properties.canton)}`;
    featureIndex.set(key, f);
    // Índice secundario por solo canton (último recurso si la provincia
    // difiere por estructura de DPA)
    const cantonKey = normalize(f.properties.canton);
    if (!featureIndex.has(cantonKey)) featureIndex.set(cantonKey, f);
  }

  let matched = 0;
  for (const g of data.cantones) {
    const resolved = resolveCantonName(g.canton);
    const keyA = `${normalize(g.provincia)}|${resolved}`;
    const keyB = resolved;
    const feat = featureIndex.get(keyA) || featureIndex.get(keyB);
    if (feat) {
      g.feature_id = feat.properties.canton_codigo;
      // Centroide aproximado (promedio bbox de la geometría)
      const c = featureCentroid(feat.geometry);
      if (c) g.coord = c;
      matched++;
    }
  }

  // Prefecturas: usan centroide de su provincia (promedio de todos sus cantones)
  for (const p of data.provincias) {
    const provFeatures = geo.features.filter(
      f => normalize(f.properties.provincia) === normalize(p.provincia)
    );
    if (provFeatures.length) {
      const centroids = provFeatures.map(f => featureCentroid(f.geometry)).filter(Boolean);
      if (centroids.length) {
        p.coord = [
          centroids.reduce((a, c) => a + c[0], 0) / centroids.length,
          centroids.reduce((a, c) => a + c[1], 0) / centroids.length,
        ];
      }
    }
  }

  console.log(`GeoJSON joined: ${matched}/${data.cantones.length} cantones con geometría`);
}

/** Centroide aproximado (bbox-center) — suficiente para popups y zoom. */
function featureCentroid(geom) {
  if (!geom || !geom.coordinates) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const visit = (c) => {
    if (typeof c[0] === 'number') {
      if (c[0] < minX) minX = c[0];
      if (c[1] < minY) minY = c[1];
      if (c[0] > maxX) maxX = c[0];
      if (c[1] > maxY) maxY = c[1];
    } else {
      c.forEach(visit);
    }
  };
  visit(geom.coordinates);
  if (!isFinite(minX)) return null;
  // Devuelve [lat, lng] (formato Leaflet)
  return [(minY + maxY) / 2, (minX + maxX) / 2];
}

// ─────────────────────────────────────────────────────────────────────────────
// Almacenamiento de evaluaciones ciudadanas en localStorage
// ─────────────────────────────────────────────────────────────────────────────
const LS_KEY = 'sigel.evaluaciones.v1';

export function guardarEvaluacion(evaluacion) {
  const todas = obtenerEvaluaciones();
  todas.push({
    id: 'eval-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
    fecha: new Date().toISOString(),
    ...evaluacion,
  });
  localStorage.setItem(LS_KEY, JSON.stringify(todas));
  return todas[todas.length - 1];
}

export function obtenerEvaluaciones() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function borrarEvaluacion(id) {
  const todas = obtenerEvaluaciones().filter(e => e.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(todas));
}

export function exportarEvaluaciones() {
  return JSON.stringify(obtenerEvaluaciones(), null, 2);
}
