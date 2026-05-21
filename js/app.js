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
import { loadData } from './data.js';
import { debounce } from './utils/fuzzy.js';
import { viewHome } from './views/home.js';
import { viewRanking } from './views/ranking.js';
import { viewMapa, mountMapa } from './views/mapa.js';
import { viewGad } from './views/gad.js';
import { viewEvaluar, mountEvaluar } from './views/evaluar.js';
import { viewMetodologia } from './views/metodologia.js';
import { viewCalculadora, mountCalculadora } from './views/calculadora.js';

const state = {
  data: null,
  route: 'home',
  routeParams: null,
  routeQuery: '',
  filters: { q: '', tipoGad: 'TODOS', provincia: 'TODAS' },
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
  } else if (parts[0] === 'calculadora') {
    state.route = 'calculadora';
    html = viewCalculadora(state);
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
  if (state.route === 'calculadora') {
    mountCalculadora();
  }
  if (state.route === 'evaluar') {
    mountEvaluar(state);
  }
}

// ─── Debounced search handler para el ranking ──────────────────────────────
const _setSearchDebounced = debounce((value) => {
  state.filters.q = value;
  if (state.route === 'ranking') router();
}, 180);

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

  imprimir() { window.print(); },
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

init();
