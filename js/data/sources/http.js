// =============================================================================
// SIGEL — Servicio HTTP reutilizable para fuentes externas
//
// fetch optimizado: timeout vía AbortController, caché en memoria + localStorage
// con TTL, y degradación elegante (NUNCA lanza; devuelve null ante cualquier
// fallo: CORS, red, timeout, JSON inválido). Pensado para llamarse en segundo
// plano, sin bloquear la UI.
// =============================================================================

const _mem = new Map();           // cache de sesión: url → {t, data}
const LS_PREFIX = 'sigel.ext.';   // cache persistente por fuente

function lsGet(key) {
  try { return JSON.parse(localStorage.getItem(LS_PREFIX + key) || 'null'); }
  catch { return null; }
}
function lsSet(key, payload) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(payload)); }
  catch { /* cuota llena / modo privado: la caché es best-effort */ }
}

/**
 * GET JSON con timeout y caché TTL. Devuelve el objeto JSON o `null`.
 *
 * @param {string} url
 * @param {object} [opts]
 * @param {string} [opts.cacheKey]  clave estable para caché persistente
 * @param {number} [opts.ttlMs]     vigencia de caché (default 24h)
 * @param {number} [opts.timeoutMs] timeout de red (default 8000)
 * @returns {Promise<any|null>}
 */
export async function fetchJSON(url, opts = {}) {
  const { cacheKey, ttlMs = 24 * 3600 * 1000, timeoutMs = 8000 } = opts;
  const now = Date.now();

  const mem = _mem.get(url);
  if (mem && now - mem.t < ttlMs) return mem.data;

  if (cacheKey) {
    const ls = lsGet(cacheKey);
    if (ls && ls.url === url && now - ls.t < ttlMs) {
      _mem.set(url, { t: ls.t, data: ls.data });
      return ls.data;
    }
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, credentials: 'omit' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    _mem.set(url, { t: now, data });
    if (cacheKey) lsSet(cacheKey, { url, t: now, data });
    return data;
  } catch (err) {
    console.warn('[sources] fetch falló (degradación elegante):', url, err && err.message);
    // Si hay caché vencida la usamos como último recurso (stale-if-error).
    if (cacheKey) {
      const ls = lsGet(cacheKey);
      if (ls && ls.url === url) return ls.data;
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}
