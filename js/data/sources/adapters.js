// =============================================================================
// SIGEL — Adaptadores de datos (ArcGIS REST · CKAN Action API)
//
// Transforman la respuesta cruda de cada API pública estándar en un arreglo
// de registros normalizados:
//   { canton, provincia, metrics: { <campo>: <valor> } }
//
// No conocen IDs de datasets: reciben un descriptor de config.js. Los contratos
// REST usados son los públicos y estables de ArcGIS y CKAN.
// =============================================================================
import { fetchJSON } from './http.js';

/** Construye la URL de consulta de un Feature Service ArcGIS. */
export function arcgisQueryUrl(src) {
  const layer = Number.isInteger(src.layer) ? src.layer : 0;
  const fields = [src.cantonField, src.provinciaField, ...(src.metrics || [])]
    .filter(Boolean).join(',');
  const qs = new URLSearchParams({
    where: '1=1',
    outFields: fields || '*',
    returnGeometry: 'false',
    f: 'json',
    resultRecordCount: '5000',
  });
  return `${src.featureServer.replace(/\/+$/, '')}/${layer}/query?${qs}`;
}

/** Construye la URL de datastore_search de CKAN. */
export function ckanQueryUrl(src) {
  const qs = new URLSearchParams({ resource_id: src.resourceId, limit: '5000' });
  return `${src.ckanBase.replace(/\/+$/, '')}/api/3/action/datastore_search?${qs}`;
}

function pickMetrics(obj, src) {
  const m = {};
  for (const k of src.metrics || []) if (obj[k] !== undefined) m[k] = obj[k];
  return m;
}

/** ArcGIS → registros normalizados (o [] si falla / sin datos). */
export async function arcgisAdapter(src) {
  const json = await fetchJSON(arcgisQueryUrl(src), {
    cacheKey: src.id, ttlMs: (src.ttlHours || 24) * 3600 * 1000,
  });
  const feats = json && Array.isArray(json.features) ? json.features : null;
  if (!feats) return [];
  return feats.map(f => {
    const a = f.attributes || {};
    return {
      canton: a[src.cantonField],
      provincia: src.provinciaField ? a[src.provinciaField] : undefined,
      metrics: pickMetrics(a, src),
    };
  }).filter(r => r.canton);
}

/** CKAN → registros normalizados (o [] si falla / sin datos). */
export async function ckanAdapter(src) {
  const json = await fetchJSON(ckanQueryUrl(src), {
    cacheKey: src.id, ttlMs: (src.ttlHours || 24) * 3600 * 1000,
  });
  const recs = json && json.success && json.result &&
    Array.isArray(json.result.records) ? json.result.records : null;
  if (!recs) return [];
  return recs.map(r => ({
    canton: r[src.cantonField],
    provincia: src.provinciaField ? r[src.provinciaField] : undefined,
    metrics: pickMetrics(r, src),
  })).filter(r => r.canton);
}

export const ADAPTERS = { arcgis: arcgisAdapter, ckan: ckanAdapter };
