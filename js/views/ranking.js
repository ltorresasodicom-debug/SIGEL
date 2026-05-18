// =============================================================================
// SIGEL — Vista Ranking
//
// Listado de los 241 GADs ordenados por INGEL con:
//   - búsqueda fuzzy (Fuse.js, tolerante a tildes/typos/orden de palabras)
//   - filtros combinables (tipo GAD, provincia)
//   - debounce de 180ms para evitar render por cada tecla
// =============================================================================
import { searchInput } from '../components/search-input.js';
import { createSearcher } from '../utils/fuzzy.js';

let _searcher = null;
let _searcherDataRef = null;

/** Construye/cachea el searcher Fuse.js. Se reconstruye si cambia el dataset. */
function getSearcher(gads) {
  if (_searcher && _searcherDataRef === gads) return _searcher;
  _searcher = createSearcher(
    gads,
    ['nombre', 'autoridad', 'provincia', 'canton', 'partido'],
    { threshold: 0.32 }
  );
  _searcherDataRef = gads;
  return _searcher;
}

export function viewRanking(state) {
  const filtro = state.filters?.tipoGad || 'TODOS';
  const provincia = state.filters?.provincia || 'TODAS';
  const q = (state.filters?.q || '').trim();

  // Pipeline: fuzzy search → filtros estructurados → ordenar
  const searcher = getSearcher(state.data.gads);
  let lista = q ? searcher(q) : state.data.gads.slice();
  if (filtro !== 'TODOS') lista = lista.filter(g => g.tipo === filtro);
  if (provincia !== 'TODAS') lista = lista.filter(g => g.provincia === provincia);
  // Fuse ya ordena por relevancia cuando hay query; si no, ordenamos por INGEL
  if (!q) lista.sort((a, b) => b.ingel - a.ingel);

  const provincias = [...new Set(state.data.gads.map(g => g.provincia))].sort();

  return /*html*/`
  <div class="max-w-7xl mx-auto px-4 py-8 fade-in">
    <header class="mb-6">
      <h1 class="font-display font-bold text-3xl">Ranking Nacional INGEL</h1>
      <p class="text-slate-600 mt-2">
        Los <strong>${state.data.gads.length} GADs</strong> del Ecuador
        ordenados por el Índice Nacional de Gestión Local.
      </p>
    </header>

    <div class="card mb-6">
      <div class="grid md:grid-cols-3 gap-3">
        ${searchInput({
          value: q,
          placeholder: 'Buscar por GAD, autoridad, cantón o partido…',
          ariaLabel: 'Buscar en el ranking',
          onInput: 'window.SIGEL.setSearch',
          onClear: 'window.SIGEL.setSearch',
          id: 'ranking-search',
        })}
        <select
          aria-label="Filtrar por tipo de GAD"
          onchange="window.SIGEL.setFilter('tipoGad', this.value)"
          class="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary focus:outline-none focus:border-sigel-primary">
          <option value="TODOS" ${filtro === 'TODOS' ? 'selected' : ''}>Todos los GADs</option>
          <option value="MUNICIPAL" ${filtro === 'MUNICIPAL' ? 'selected' : ''}>Solo cantones</option>
          <option value="PROVINCIAL" ${filtro === 'PROVINCIAL' ? 'selected' : ''}>Solo prefecturas</option>
        </select>
        <select
          aria-label="Filtrar por provincia"
          onchange="window.SIGEL.setFilter('provincia', this.value)"
          class="px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary focus:outline-none focus:border-sigel-primary">
          <option value="TODAS" ${provincia === 'TODAS' ? 'selected' : ''}>Todas las provincias</option>
          ${provincias.map(p => /*html*/`<option value="${p}" ${provincia === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
      </div>
      <p class="text-xs text-slate-500 mt-3" aria-live="polite">
        Mostrando <strong>${lista.length}</strong> de ${state.data.gads.length} GADs.
        ${q ? ` · Buscando: «${escapeHtml(q)}»` : ''}
      </p>
    </div>

    ${lista.length === 0 ? renderEmptyState(q) : renderTable(lista, !q)}
  </div>
  `;
}

function renderTable(lista, withRank) {
  return /*html*/`
  <div class="card p-0 overflow-x-auto">
    <table class="min-w-full text-sm">
      <thead class="bg-slate-100 text-slate-700 sticky top-0">
        <tr>
          <th class="px-4 py-3 text-left">#</th>
          <th class="px-4 py-3 text-left">GAD</th>
          <th class="px-4 py-3 text-left">Autoridad</th>
          <th class="px-4 py-3 text-left hidden md:table-cell">Provincia</th>
          <th class="px-4 py-3 text-right">INGEL</th>
          <th class="px-4 py-3 text-center hidden sm:table-cell">Nivel</th>
          <th class="px-4 py-3 text-center">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${lista.map((g, i) => /*html*/`
          <tr class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer focus-within:bg-slate-50"
              tabindex="0"
              role="button"
              aria-label="Ver perfil de ${g.nombre}"
              onclick="location.hash='#/gad/${g.id}'"
              onkeypress="if(event.key==='Enter')location.hash='#/gad/${g.id}'">
            <td class="px-4 py-3 font-mono text-slate-500">${withRank ? i + 1 : '·'}</td>
            <td class="px-4 py-3 font-medium">
              <div>${g.nombre}</div>
              <div class="text-xs text-slate-400 md:hidden">${g.provincia}</div>
            </td>
            <td class="px-4 py-3 text-slate-600">${g.autoridad || '—'}</td>
            <td class="px-4 py-3 text-slate-600 hidden md:table-cell">${g.provincia}</td>
            <td class="px-4 py-3 text-right font-mono font-bold">${g.ingel.toFixed(1)}</td>
            <td class="px-4 py-3 text-center hidden sm:table-cell">
              <span class="badge badge-${g.nivel}">${g.nivel}</span>
            </td>
            <td class="px-4 py-3 text-center">
              <span class="semaforo-dot semaforo-${g.semaforo}" title="${g.semaforo}"></span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  `;
}

function renderEmptyState(q) {
  return /*html*/`
  <div class="card text-center py-16">
    <div class="text-5xl mb-4">🔍</div>
    <h2 class="font-display font-bold text-xl mb-2">No se encontraron resultados</h2>
    <p class="text-slate-600">
      ${q ? `No hay GADs que coincidan con "<strong>${escapeHtml(q)}</strong>".` : 'Ajusta los filtros para ver más resultados.'}
    </p>
    <button onclick="window.SIGEL.resetFilters()" class="mt-4 btn-primary">
      Limpiar filtros
    </button>
  </div>
  `;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
