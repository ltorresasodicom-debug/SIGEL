// =============================================================================
// SIGEL — Vista de evaluación ciudadana
//
// Mejoras v2:
//   - Filtro de búsqueda fuzzy sobre el selector de GAD (Fuse.js).
//   - Reemplaza export JSON por export PDF institucional.
//   - Botón individual "📄 Exportar PDF" por evaluación.
// =============================================================================
import {
  DIMENSIONES, calcularIngel, likertA100,
  clasificarNivel, semaforizar, calcularIri,
} from '../ingel.js';
import {
  guardarEvaluacion as _guardar,
  obtenerEvaluaciones,
  borrarEvaluacion as _borrar,
} from '../data.js';
import { searchInput } from '../components/search-input.js';
import { filterByQuery } from '../utils/fuzzy.js';

export function viewEvaluar(state) {
  const params = new URLSearchParams(state.routeQuery || '');
  const preselectId = params.get('gad') || '';
  const evaluaciones = obtenerEvaluaciones();

  // Estado de evaluación (en memoria)
  state.evaluacion = state.evaluacion || {
    gadId: preselectId,
    likert: Object.fromEntries(DIMENSIONES.map(d => [d.codigo, null])),
    comentario: '',
    filtroGad: '',
  };
  const filtroGad = state.evaluacion.filtroGad || '';

  // Selector con filtro fuzzy aplicado
  const prefecturas = filterByQuery(
    state.data.provincias,
    ['provincia', 'autoridad'],
    filtroGad,
  );
  const cantones = filterByQuery(
    state.data.cantones.slice().sort((a, b) => a.canton.localeCompare(b.canton)),
    ['canton', 'provincia', 'autoridad'],
    filtroGad,
  );

  // Preview INGEL en vivo
  const likert = state.evaluacion.likert;
  const dims100 = Object.fromEntries(
    DIMENSIONES.map(d => [d.codigo, likertA100(likert[d.codigo])])
  );
  const completas = Object.values(likert).filter(v => v != null).length;
  const todasResp = completas === DIMENSIONES.length;
  const ingelPreview = todasResp ? calcularIngel(dims100) : null;
  const nivel = ingelPreview != null ? clasificarNivel(ingelPreview) : null;
  const sem = ingelPreview != null ? semaforizar(ingelPreview) : null;
  const iri = todasResp ? calcularIri({
    transparencia: dims100.transparencia,
    finanzas: dims100.finanzas,
    endeudamiento: 100 - dims100.finanzas,
    corrupcion: 100 - dims100.legitimidad,
    participacion: dims100.participacion,
  }) : null;

  const totalGadsFiltrados = prefecturas.length + cantones.length;

  return /*html*/`
  <div class="max-w-5xl mx-auto px-4 py-10 fade-in">
    <header class="mb-7">
      <h1 class="font-display font-extrabold text-3xl md:text-4xl tracking-tight">📋 Crea tu evaluación</h1>
      <p class="text-slate-600 mt-2 text-lg max-w-2xl leading-relaxed">
        Califica del 1 al 5 cada una de las 8 dimensiones SIGEL. El INGEL se
        calcula al instante. Tu evaluación se guarda <strong>solo en tu
        navegador</strong> — es privada y puedes descargarla como PDF
        profesional cuando quieras.
      </p>
    </header>

    <div class="grid lg:grid-cols-3 gap-6">
      <!-- ── Formulario ── -->
      <div class="lg:col-span-2 space-y-4">
        <div class="card">
          <label class="block font-semibold mb-2" for="filter-gad">Selecciona el GAD a evaluar</label>

          <div class="mb-2">
            ${searchInput({
              value: filtroGad,
              placeholder: 'Filtrar cantones: "qui" → Quito, "rio" → Río Verde…',
              ariaLabel: 'Filtrar lista de GADs',
              onInput: 'window.SIGEL.setEvalFiltro',
              onClear: 'window.SIGEL.setEvalFiltro',
              id: 'filter-gad',
            })}
          </div>

          <select
            id="select-gad"
            aria-label="Selecciona el GAD a evaluar"
            size="${filtroGad ? Math.min(8, Math.max(3, totalGadsFiltrados + 2)) : 1}"
            onchange="window.SIGEL.setEvalGad(this.value)"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary focus:outline-none focus:border-sigel-primary"
          >
            <option value="">— Elige un GAD —</option>
            ${prefecturas.length > 0 ? /*html*/`
              <optgroup label="Prefecturas (provincial) · ${prefecturas.length}">
                ${prefecturas.map(p => /*html*/`
                  <option value="${p.id}" ${state.evaluacion.gadId === p.id ? 'selected' : ''}>
                    ${p.provincia} — ${p.autoridad}
                  </option>
                `).join('')}
              </optgroup>` : ''}
            ${cantones.length > 0 ? /*html*/`
              <optgroup label="Cantones (municipal) · ${cantones.length}">
                ${cantones.map(c => /*html*/`
                  <option value="${c.id}" ${state.evaluacion.gadId === c.id ? 'selected' : ''}>
                    ${c.canton} (${c.provincia}) — ${c.autoridad}
                  </option>
                `).join('')}
              </optgroup>` : ''}
            ${totalGadsFiltrados === 0 ? /*html*/`
              <option disabled>Sin resultados para "${escapeHtml(filtroGad)}"</option>
            ` : ''}
          </select>
          ${filtroGad ? /*html*/`
            <p class="text-xs text-slate-500 mt-2">
              ${totalGadsFiltrados} GAD${totalGadsFiltrados === 1 ? '' : 's'} encontrado${totalGadsFiltrados === 1 ? '' : 's'}.
            </p>` : ''}
        </div>

        ${DIMENSIONES.map(d => {
          const v = likert[d.codigo];
          return /*html*/`
          <div class="card">
            <div class="flex justify-between items-start mb-2">
              <div>
                <div class="font-semibold">
                  <span class="inline-block w-3 h-3 rounded mr-2 align-middle" style="background:${d.color}"></span>
                  ${d.nombre}
                </div>
                <p class="text-xs text-slate-500 mt-1">Peso en el INGEL: ${(d.peso * 100).toFixed(0)}%</p>
              </div>
              ${v != null ? /*html*/`<span class="font-mono text-2xl font-bold">${v}/5</span>` : ''}
            </div>
            <div class="likert" role="radiogroup" aria-label="${d.nombre}">
              ${[1, 2, 3, 4, 5].map(n => /*html*/`
                <button
                  type="button"
                  role="radio"
                  aria-checked="${v === n}"
                  onclick="window.SIGEL.setLikert('${d.codigo}', ${n})"
                  class="${v === n ? 'selected' : ''}"
                  aria-label="${d.nombre} - ${n} de 5">
                  ${n}
                </button>
              `).join('')}
            </div>
            <div class="flex justify-between text-xs text-slate-500 mt-1.5 px-1">
              <span>Muy malo</span><span>Muy bueno</span>
            </div>
          </div>
        `;
        }).join('')}

        <div class="card">
          <label class="block font-semibold mb-2" for="textarea-comentario">Comentario (opcional)</label>
          <textarea
            id="textarea-comentario"
            rows="4"
            placeholder="Comparte el contexto de tu evaluación: qué observas, qué propones, etc."
            oninput="window.SIGEL.setEvalComentario(this.value)"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary focus:outline-none focus:border-sigel-primary"
          >${escapeHtml(state.evaluacion.comentario || '')}</textarea>
        </div>

        <button
          ${(!todasResp || !state.evaluacion.gadId) ? 'disabled' : ''}
          onclick="window.SIGEL.guardarEvaluacion()"
          class="btn-primary w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Guardar evaluación">
          💾 Guardar mi evaluación
        </button>
      </div>

      <!-- ── Preview INGEL en vivo ── -->
      <aside class="lg:col-span-1">
        <div class="card lg:sticky lg:top-24">
          <h2 class="font-display font-bold text-lg mb-3">Tu INGEL en vivo</h2>

          <div class="text-center bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-6 mb-4">
            <div class="text-xs uppercase tracking-widest text-slate-500 font-semibold">Puntaje INGEL</div>
            <div class="font-display font-extrabold text-6xl mt-1 tabular-nums ${ingelPreview == null ? 'text-slate-300' : 'text-sigel-primary'}"
                 aria-live="polite">
              ${ingelPreview != null ? ingelPreview.toFixed(1) : '—'}
            </div>
            ${nivel ? /*html*/`<span class="badge badge-${nivel} mt-2">${nivel}</span>` : ''}
            ${sem ? /*html*/`<div class="mt-3"><span class="semaforo-dot semaforo-${sem}" style="width:24px;height:24px"></span></div>` : ''}
          </div>

          <div class="text-xs text-slate-500 mb-3">
            Progreso: <strong>${completas} / ${DIMENSIONES.length}</strong> dimensiones evaluadas
          </div>
          <div class="bg-slate-100 rounded-full h-2 overflow-hidden mb-4" role="progressbar"
               aria-valuenow="${completas}" aria-valuemin="0" aria-valuemax="${DIMENSIONES.length}">
            <div class="bg-sigel-primary h-full rounded-full transition-all" style="width:${(completas / DIMENSIONES.length) * 100}%"></div>
          </div>

          ${iri != null ? /*html*/`
            <div class="text-sm space-y-1">
              <div class="flex justify-between">
                <span class="text-slate-500">IRI (riesgo)</span>
                <span class="font-mono font-semibold ${iri > 60 ? 'text-red-600' : iri > 40 ? 'text-yellow-600' : 'text-green-600'}">
                  ${iri.toFixed(1)}
                </span>
              </div>
            </div>` : ''}

          <p class="text-xs text-slate-400 mt-4">
            INGEL = Σ(dimensión × peso). Tu Likert 1-5 se normaliza a una escala 0-100.
          </p>
        </div>
      </aside>
    </div>

    <!-- ── Evaluaciones guardadas ── -->
    <section class="mt-12">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 class="font-display font-bold text-2xl">Mis evaluaciones guardadas</h2>
          ${evaluaciones.length > 0 ? /*html*/`<p class="text-sm text-slate-500 mt-1">${evaluaciones.length} evaluacion${evaluaciones.length === 1 ? '' : 'es'} en este navegador.</p>` : ''}
        </div>
      </div>

      ${evaluaciones.length === 0 ? /*html*/`
        <div class="card text-center text-slate-500 py-8">
          Aún no has guardado evaluaciones. Completa el formulario arriba y haz clic en "Guardar".
        </div>
      ` : /*html*/`
        <div class="space-y-3">
          ${evaluaciones.slice().reverse().map(e => {
            const gad = state.data.gads.find(g => g.id === e.gadId);
            return /*html*/`
              <div class="card card--interactive flex flex-wrap items-center gap-3">
                <div class="flex-1 min-w-[240px]">
                  <div class="font-semibold">${gad ? gad.nombre : 'GAD desconocido'}</div>
                  <div class="text-xs text-slate-500 mt-0.5">
                    ${new Date(e.fecha).toLocaleString('es-EC')} · INGEL ciudadano:
                    <strong class="text-sigel-primary">${e.ingel != null ? e.ingel.toFixed(1) : '—'}</strong>
                  </div>
                  ${e.comentario ? /*html*/`<p class="text-xs text-slate-600 mt-1.5 italic border-l-2 border-slate-200 pl-2">"${escapeHtml(e.comentario)}"</p>` : ''}
                </div>
                <span class="badge badge-${e.nivel}">${e.nivel}</span>
                <span class="semaforo-label"><span class="semaforo-dot semaforo-${e.semaforo}"></span>${e.semaforo}</span>
                <button onclick="window.SIGEL.exportarPdf('${e.id}')"
                        aria-label="Exportar evaluación a PDF"
                        class="text-sm px-3 py-1.5 bg-sigel-primary hover:bg-blue-900 text-white rounded font-semibold inline-flex items-center gap-1">
                  📄 Exportar PDF
                </button>
                <button onclick="window.SIGEL.borrarEvaluacion('${e.id}')"
                        aria-label="Eliminar evaluación"
                        class="text-red-600 hover:bg-red-50 px-2 py-1.5 rounded">🗑️</button>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </section>

    <!-- Loading overlay for PDF generation -->
    <div id="pdf-overlay" class="fixed inset-0 bg-black/40 hidden items-center justify-center z-50 backdrop-blur-sm" role="status" aria-live="polite">
      <div class="bg-white rounded-xl p-8 shadow-2xl max-w-sm mx-4 text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sigel-primary border-t-transparent mb-4"></div>
        <p class="font-semibold text-lg">Generando PDF…</p>
        <p class="text-sm text-slate-500 mt-1" id="pdf-overlay-msg">Preparando documento institucional</p>
      </div>
    </div>
  </div>
  `;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
