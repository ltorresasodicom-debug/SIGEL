// =============================================================================
// SIGEL — Public demo · Bootstrap del SPA
//
// Mantiene la misma arquitectura: router por hash, estado global mutable y
// handlers expuestos en `window.SIGEL`. Sin build step.
//
// Cambios v2:
//   - setSearch debounceado (~180 ms) para no rerenderizar por cada tecla
//   - exportarPdf (reemplaza el export JSON ciudadano)
//   - setEvalFiltro (filtro fuzzy del selector de GAD en /evaluar)
//   - resetFilters (botón de empty-state en ranking)
// =============================================================================
import { loadData, obtenerEvaluaciones, borrarEvaluacion as _borrar, guardarEvaluacion as _guardar } from './data.js';
import {
  DIMENSIONES, calcularIngel, likertA100,
  clasificarNivel, semaforizar, calcularIri,
} from './ingel.js';
import { debounce } from './utils/fuzzy.js';
import { viewHome } from './views/home.js';
import { viewRanking } from './views/ranking.js';
import { viewMapa, mountMapa } from './views/mapa.js';
import { viewGad } from './views/gad.js';
import { viewEvaluar } from './views/evaluar.js';
import { viewMetodologia } from './views/metodologia.js';
import { exportarEvaluacionPdf } from './features/pdf/index.js';

const state = {
  data: null,
  route: 'home',
  routeParams: null,
  routeQuery: '',
  filters: { q: '', tipoGad: 'TODOS', provincia: 'TODAS' },
  evaluacion: null,
};

// ─── Inicialización ─────────────────────────────────────────────────────────
async function init() {
  try {
    state.data = await loadData();
    window.addEventListener('hashchange', router);
    document.getElementById('menu-mobile-btn')?.addEventListener('click', () => {
      document.getElementById('menu-mobile').classList.toggle('hidden');
    });
    router();
  } catch (err) {
    document.getElementById('app').innerHTML = /*html*/`
      <div class="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 class="font-display font-bold text-2xl text-red-600">Error de carga</h1>
        <p class="text-slate-600 mt-3">No fue posible cargar los datos. Detalle:</p>
        <pre class="text-left bg-red-50 p-4 rounded mt-3 text-xs overflow-auto">${escapeHtml(String(err.message || err))}</pre>
      </div>
    `;
    console.error(err);
  }
}

// ─── Router por hash ────────────────────────────────────────────────────────
function router() {
  const hash = window.location.hash.slice(1) || '/';
  const [path, query] = hash.split('?');
  state.routeQuery = query || '';

  const parts = path.split('/').filter(Boolean);
  document.querySelectorAll('[data-route]').forEach(a => a.classList.remove('active'));

  let html;
  if (parts.length === 0 || parts[0] === '') {
    state.route = 'home';
    html = viewHome(state);
  } else if (parts[0] === 'ranking') {
    state.route = 'ranking';
    html = viewRanking(state);
  } else if (parts[0] === 'mapa') {
    state.route = 'mapa';
    html = viewMapa(state);
  } else if (parts[0] === 'gad' && parts[1]) {
    state.route = 'gad';
    state.routeParams = { id: parts[1] };
    html = viewGad(state, parts[1]);
  } else if (parts[0] === 'evaluar') {
    state.route = 'evaluar';
    html = viewEvaluar(state);
  } else if (parts[0] === 'metodologia') {
    state.route = 'metodologia';
    html = viewMetodologia();
  } else {
    html = /*html*/`<div class="max-w-2xl mx-auto px-4 py-16 text-center">
      <h1 class="font-display font-bold text-2xl">404 — Ruta no encontrada</h1>
      <p class="text-slate-600 mt-3"><a href="#/" class="text-sigel-primary">Volver al inicio →</a></p>
    </div>`;
  }

  document.getElementById('app').innerHTML = html;
  window.scrollTo(0, 0);
  document.querySelectorAll(`[data-route="${state.route}"]`).forEach(a => a.classList.add('active'));

  if (state.route === 'mapa') {
    mountMapa(state).catch(console.error);
  }
  if (state.route === 'evaluar') {
    // Reposicionar foco en el filtro si el usuario estaba escribiendo
    if (state.evaluacion?.filtroGad && document.getElementById('filter-gad')) {
      const el = document.getElementById('filter-gad');
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }
}

// ─── Debounced search handler para el ranking ──────────────────────────────
const _setSearchDebounced = debounce((value) => {
  state.filters.q = value;
  if (state.route === 'ranking') router();
}, 180);

const _setEvalFiltroDebounced = debounce((value) => {
  state.evaluacion = state.evaluacion || { gadId: '', likert: {}, comentario: '', filtroGad: '' };
  state.evaluacion.filtroGad = value;
  if (state.route === 'evaluar') router();
}, 150);

// ─── API global para handlers inline ───────────────────────────────────────
window.SIGEL = {
  setFilter(key, value) {
    state.filters[key] = value;
    if (state.route === 'ranking') router();
  },
  setSearch(value) { _setSearchDebounced(value); },
  resetFilters() {
    state.filters = { q: '', tipoGad: 'TODOS', provincia: 'TODAS' };
    if (state.route === 'ranking') router();
  },

  setEvalGad(gadId) {
    state.evaluacion.gadId = gadId;
    router();
  },
  setEvalFiltro(value) { _setEvalFiltroDebounced(value); },
  setLikert(codigo, valor) {
    state.evaluacion.likert[codigo] = valor;
    router();
  },
  setEvalComentario(texto) {
    state.evaluacion.comentario = texto;
    // No re-render para preservar foco del textarea
  },

  guardarEvaluacion() {
    const ev = state.evaluacion;
    if (!ev.gadId) { alert('Selecciona un GAD primero.'); return; }
    const dims100 = Object.fromEntries(
      DIMENSIONES.map(d => [d.codigo, likertA100(ev.likert[d.codigo])])
    );
    const ingel = calcularIngel(dims100);
    const nivel = clasificarNivel(ingel);
    const semaforo = semaforizar(ingel);
    const iri = calcularIri({
      transparencia: dims100.transparencia,
      finanzas: dims100.finanzas,
      endeudamiento: 100 - dims100.finanzas,
      corrupcion: 100 - dims100.legitimidad,
      participacion: dims100.participacion,
    });
    _guardar({
      gadId: ev.gadId,
      likert: { ...ev.likert },
      dims100,
      comentario: ev.comentario || '',
      ingel, nivel, semaforo, iri,
    });
    // Reset
    state.evaluacion = {
      gadId: '',
      likert: Object.fromEntries(DIMENSIONES.map(d => [d.codigo, null])),
      comentario: '',
      filtroGad: '',
    };
    router();
    setTimeout(() => alert('✅ Evaluación guardada en tu navegador.'), 50);
  },

  borrarEvaluacion(id) {
    if (!confirm('¿Eliminar esta evaluación?')) return;
    _borrar(id);
    router();
  },

  /**
   * Exporta una evaluación a PDF institucional. Muestra overlay con spinner,
   * mensaje de progreso y manejo de errores.
   */
  async exportarPdf(evalId) {
    const overlay = document.getElementById('pdf-overlay');
    const msg = document.getElementById('pdf-overlay-msg');
    const showOverlay = () => overlay?.classList.replace('hidden', 'flex');
    const hideOverlay = () => overlay?.classList.replace('flex', 'hidden');
    const updateMsg = (m) => { if (msg) msg.textContent = m; };

    const evaluacion = obtenerEvaluaciones().find(e => e.id === evalId);
    if (!evaluacion) { alert('Evaluación no encontrada.'); return; }
    const gad = state.data.gads.find(g => g.id === evaluacion.gadId);

    showOverlay();
    try {
      const filename = await exportarEvaluacionPdf(evaluacion, gad, (m) => updateMsg(m));
      updateMsg(`✅ ${filename}`);
      setTimeout(hideOverlay, 800);
    } catch (err) {
      console.error('Error generando PDF:', err);
      updateMsg('❌ Error al generar el PDF');
      setTimeout(() => {
        hideOverlay();
        alert(`No fue posible generar el PDF.\n\nDetalle: ${err.message || err}`);
      }, 1500);
    }
  },

  imprimir() { window.print(); },
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

init();
