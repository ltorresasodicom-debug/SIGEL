// =============================================================================
// SIGEL — Orquestador de fuentes externas (capa aditiva, no bloqueante)
//
// Punto de entrada único. Si no hay fuentes activas en config.js NO toca la
// red y resuelve de inmediato. Cuando hay fuentes, las consume en paralelo,
// normaliza la entidad cantón (reutiliza utils/normalize + canton-aliases) y
// adjunta los resultados de forma ADITIVA a cada cantón (`g.fuentesExternas`):
// nunca altera dims/ingel/orden/IDs ni el ranking; si todo falla, no pasa nada.
// =============================================================================
import { SOURCES, EXTERNAL_SOURCES_ENABLED } from './config.js';
import { ADAPTERS } from './adapters.js';
import { normalize } from '../../utils/normalize.js';
import { resolveCantonName } from '../../utils/canton-aliases.js';

const keyOf = (canton, provincia) =>
  (provincia ? normalize(provincia) + '|' : '') + resolveCantonName(canton);

/**
 * Carga todas las fuentes activas. Resultado:
 *   { byCanton: Map<string, Array<{source,label,metrics}>>, status: [...] }
 * `byCanton` se indexa por `provincia|canton` normalizado y también por
 * cantón solo (fallback), para casar con la clave que arma el pipeline.
 */
export async function loadExternalSources() {
  const status = [];
  const byCanton = new Map();
  if (!EXTERNAL_SOURCES_ENABLED) return { byCanton, status };

  const active = SOURCES.filter(s => s && s.enabled && ADAPTERS[s.type]);
  await Promise.all(active.map(async (src) => {
    try {
      const records = await ADAPTERS[src.type](src);
      let n = 0;
      for (const r of records) {
        if (!r.canton) continue;
        const entry = { source: src.id, label: src.label, metrics: r.metrics,
                        provinciaExterna: r.provincia };
        for (const k of [keyOf(r.canton, r.provincia), keyOf(r.canton, '')]) {
          if (!byCanton.has(k)) byCanton.set(k, []);
          byCanton.get(k).push(entry);
        }
        n++;
      }
      status.push({ id: src.id, label: src.label, ok: records.length > 0, count: n });
    } catch (err) {
      status.push({ id: src.id, label: src.label, ok: false, count: 0,
                    error: String(err && err.message || err) });
    }
  }));
  return { byCanton, status };
}

/**
 * Enriquecimiento ADITIVO en segundo plano. Se llama SIN await desde data.js
 * tras construir el dataset: no bloquea el primer render. Muta en sitio
 * `canton.fuentesExternas` sólo cuando hay coincidencia; si no hay fuentes
 * activas retorna sin tocar red ni datos.
 */
export async function enrichExternalSourcesInBackground(data) {
  if (!EXTERNAL_SOURCES_ENABLED || !data || !Array.isArray(data.cantones)) return;
  try {
    const { byCanton, status } = await loadExternalSources();
    data._fuentesStatus = status;
    if (byCanton.size === 0) return;
    let n = 0;
    for (const g of data.cantones) {
      const hit = byCanton.get(keyOf(g.canton, g.provincia)) ||
                  byCanton.get(keyOf(g.canton, ''));
      if (hit && hit.length) {
        g.fuentesExternas = hit;
        // Validación de consistencia provincia (transparencia/calidad de dato)
        g.fuenteValidacion = hit.every(h => !h.provinciaExterna ||
          normalize(h.provinciaExterna) === normalize(g.provincia))
          ? 'consistente' : 'discrepancia';
        n++;
      }
    }
    console.log(`[sources] enriquecidos ${n}/${data.cantones.length} cantones`,
                status);
  } catch (err) {
    console.warn('[sources] enriquecimiento omitido:', err && err.message);
  }
}
