// =============================================================================
// SIGEL — "Crea tu evaluación" · asistente ciudadano (wizard)
//
// Rediseño en lenguaje ciudadano: una dimensión por paso, 3 preguntas simples
// por dimensión (escala 1–5), ejemplos cotidianos y baja carga cognitiva.
//
// El INGEL no cambia: cada dimensión = media ponderada de sus 3 preguntas
// (agregarDimension); luego se aplica calcularIngel con los pesos canónicos de
// js/ingel.js. Patrón de wizard espejado de js/views/calculadora.js: estado
// propio del módulo, navegación interna sin router, delegación de eventos.
// =============================================================================
import { DIMENSIONES_CIUDADANAS, TOTAL_PREGUNTAS } from '../data/dimensiones-ciudadanas.js';
import {
  likertA100, calcularIngel, clasificarNivel, semaforizar, calcularIri,
} from '../ingel.js';
import {
  guardarEvaluacion, obtenerEvaluaciones, borrarEvaluacion,
} from '../data.js';
import { exportarEvaluacionPdf } from '../features/pdf/index.js';
import { filterByQuery } from '../utils/fuzzy.js';

const NDIM = DIMENSIONES_CIUDADANAS.length;         // 8
const LAST = NDIM + 1;                              // paso de resultados (9)

let st = newState();
function newState() {
  return { paso: 0, gadId: '', filtroGad: '', respuestas: {}, comentario: '' };
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Score 0–100 de una dimensión = media ponderada de sus preguntas. */
function agregarDimension(dim, respuestas) {
  let s = 0;
  for (const q of dim.preguntas) s += likertA100(respuestas[q.id]) * q.peso;
  return s;
}

// ── Render ──────────────────────────────────────────────────────────────────
function progress(n) {
  const pct = Math.round((n / NDIM) * 100);
  return `<div class="mb-5" aria-hidden="true">
    <div class="flex justify-between text-xs text-slate-500 mb-1">
      <span>Dimensión ${n} de ${NDIM}</span><span>${pct}%</span></div>
    <div class="bg-slate-100 rounded-full h-2 overflow-hidden">
      <div class="h-full rounded-full transition-all" style="width:${pct}%;background:var(--sigel-primary)"></div>
    </div></div>`;
}

function likertGroup(qid) {
  return `<div class="likert" role="radiogroup" aria-label="Escala del 1 al 5" data-lk="${qid}">
    ${[1,2,3,4,5].map(v => `<button type="button" role="radio" aria-checked="false"
      class="likert-btn" data-q="${qid}" data-v="${v}" aria-label="${v} de 5">${v}</button>`).join('')}
  </div>
  <div class="flex justify-between text-xs text-slate-500 mt-1.5 px-1">
    <span>En desacuerdo</span><span>De acuerdo</span>
  </div>`;
}

function stepDimension(dim, idx) {
  const n = idx + 1;
  return `
  <div class="step" data-step="${n}">
    ${progress(n)}
    <div class="card">
      <div class="flex items-center gap-2 mb-1">
        <span class="inline-block w-2.5 h-2.5 rounded-full" style="background:var(--sigel-primary)"></span>
        <span class="text-xs uppercase tracking-wider text-slate-400">${esc(dim.dimension)}</span>
      </div>
      <h2 class="font-display font-bold text-2xl tracking-tight">${esc(dim.tituloCiudadano)}</h2>
      <p class="text-slate-600 mt-2 leading-relaxed">${esc(dim.descripcionCorta)}</p>
      <details class="mt-2">
        <summary class="text-sm font-semibold text-sigel-primary cursor-pointer">Ver explicación completa</summary>
        <p class="text-sm text-slate-600 mt-2 leading-relaxed">${esc(dim.descripcionExpandida)}</p>
      </details>
      <p class="text-sm text-slate-600 bg-slate-50 border-l-2 border-sigel-accent rounded px-3 py-2 mt-3">
        <strong>Ejemplo:</strong> ${esc(dim.ejemplo)}
      </p>
      <div class="chip text-xs mt-3"><span class="dot" style="background:var(--sigel-primary)"></span>Responde del 1 (en desacuerdo) al 5 (de acuerdo)</div>
      <div class="mt-1 divide-y divide-slate-100">
        ${dim.preguntas.map((q, i) => `
          <div class="py-4">
            <div class="text-sm font-medium flex gap-2">
              <span class="badge badge-ALTO" style="min-width:1.6rem;text-align:center">${i + 1}</span>
              <span>${esc(q.texto)}</span>
            </div>
            <p class="text-xs text-slate-500 mt-1.5 mb-1">${esc(q.helperText)}</p>
            ${likertGroup(q.id)}
          </div>`).join('')}
      </div>
      <div class="err hidden mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
        Responde las 3 preguntas antes de continuar.
      </div>
    </div>
    <div class="flex gap-2 mt-4">
      <button type="button" class="btn-primary !bg-white !text-slate-600 border border-slate-300" data-act="back" data-to="${n - 1}">← Atrás</button>
      <button type="button" class="btn-primary flex-1" data-act="next" data-step="${n}">${n === NDIM ? 'Ver resultados →' : 'Siguiente →'}</button>
    </div>
  </div>`;
}

export function viewEvaluar() {
  return /*html*/`
  <div class="max-w-3xl mx-auto px-4 py-10 fade-in" id="evaluar-root">
    <header class="mb-6">
      <h1 class="font-display font-extrabold text-3xl md:text-4xl tracking-tight">📋 Crea tu evaluación</h1>
      <p class="text-slate-600 mt-2 text-lg leading-relaxed max-w-2xl">
        Evalúa a tu gobierno local en 8 temas, con preguntas simples del día a
        día. Toma pocos minutos y <strong>tus respuestas se guardan solo en tu
        navegador</strong>.
      </p>
    </header>

    <!-- Paso 0: elegir GAD -->
    <div class="step" data-step="0">
      <div class="card">
        <h2 class="font-display font-bold text-xl mb-1">¿A qué gobierno local vas a evaluar?</h2>
        <p class="text-sm text-slate-500 mb-4">Busca tu cantón (alcaldía) o tu provincia (prefectura).</p>
        <input type="search" id="ev-filtro" placeholder="Escribe el nombre: «Quito», «Manabí»…"
          autocomplete="off" spellcheck="false"
          class="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary/40 focus:border-sigel-primary outline-none transition mb-2">
        <label for="ev-gad" class="sr-only">Gobierno local a evaluar</label>
        <select id="ev-gad" size="8"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary/40 focus:border-sigel-primary outline-none transition"></select>
        <div class="err hidden mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
          Elige un gobierno local para comenzar.
        </div>
      </div>
      <button type="button" class="btn-accent w-full mt-4" data-act="comenzar">Comenzar evaluación →</button>

      <section class="mt-10">
        <h2 class="font-display font-bold text-xl mb-3">Mis evaluaciones guardadas</h2>
        <div id="ev-guardadas"></div>
      </section>
    </div>

    ${DIMENSIONES_CIUDADANAS.map((d, i) => stepDimension(d, i)).join('')}

    <!-- Paso resultados -->
    <div class="step" data-step="${LAST}">
      <div id="ev-resultado"></div>
    </div>

    <!-- Overlay de generación de PDF -->
    <div id="pdf-overlay" class="fixed inset-0 bg-black/40 hidden items-center justify-center z-50 backdrop-blur-sm" role="status" aria-live="polite">
      <div class="bg-white rounded-xl p-8 shadow-2xl max-w-sm mx-4 text-center">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sigel-primary border-t-transparent mb-4"></div>
        <p class="font-semibold text-lg">Generando PDF…</p>
        <p class="text-sm text-slate-500 mt-1" id="pdf-overlay-msg">Preparando documento institucional</p>
      </div>
    </div>
  </div>`;
}

// ── Mount: cablea el asistente ──────────────────────────────────────────────
export function mountEvaluar(state) {
  st = newState();
  const root = document.getElementById('evaluar-root');
  if (!root) return;
  const gads = state.data.gads;

  // Preselección vía #/evaluar?gad=<id>
  const pre = new URLSearchParams(state.routeQuery || '').get('gad');
  if (pre && gads.some(g => g.id === pre)) st.gadId = pre;

  const steps = root.querySelectorAll('.step');
  const show = (n) => {
    st.paso = n;
    steps.forEach(s => s.classList.toggle('hidden', +s.dataset.step !== n));
    if (n === LAST) renderResultado();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const showErr = (n, on) => {
    const e = root.querySelector(`.step[data-step="${n}"] .err`);
    if (e) e.classList.toggle('hidden', !on);
  };

  // ── Selector de GAD ──
  const sel = root.querySelector('#ev-gad');
  const renderOpts = () => {
    const f = st.filtroGad;
    const pref = filterByQuery(state.data.provincias, ['provincia', 'autoridad'], f);
    const cant = filterByQuery(
      [...state.data.cantones].sort((a, b) => a.canton.localeCompare(b.canton)),
      ['canton', 'provincia', 'autoridad'], f);
    sel.innerHTML =
      (pref.length ? `<optgroup label="Prefecturas · ${pref.length}">${pref.map(p =>
        `<option value="${p.id}" ${st.gadId === p.id ? 'selected' : ''}>${esc(p.provincia)} — ${esc(p.autoridad || '')}</option>`).join('')}</optgroup>` : '') +
      (cant.length ? `<optgroup label="Cantones · ${cant.length}">${cant.map(c =>
        `<option value="${c.id}" ${st.gadId === c.id ? 'selected' : ''}>${esc(c.canton)} (${esc(c.provincia)}) — ${esc(c.autoridad || '')}</option>`).join('')}</optgroup>` : '') +
      (!pref.length && !cant.length ? `<option disabled>Sin resultados para «${esc(f)}»</option>` : '');
  };
  renderOpts();

  // ── Lista de evaluaciones guardadas ──
  const renderGuardadas = () => {
    const box = root.querySelector('#ev-guardadas');
    const evs = obtenerEvaluaciones();
    if (!evs.length) {
      box.innerHTML = `<div class="card text-center text-slate-500 py-8">
        Aún no has guardado evaluaciones. Completa el asistente y guárdala.</div>`;
      return;
    }
    box.innerHTML = `<div class="space-y-3">${evs.slice().reverse().map(e => {
      const gad = gads.find(g => g.id === e.gadId);
      return `<div class="card card--interactive flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-[220px]">
          <div class="font-semibold">${esc(gad ? gad.nombre : 'GAD desconocido')}</div>
          <div class="text-xs text-slate-500 mt-0.5">${new Date(e.fecha).toLocaleString('es-EC')} · INGEL ciudadano: <strong class="text-sigel-primary">${e.ingel != null ? e.ingel.toFixed(1) : '—'}</strong></div>
          ${e.comentario ? `<p class="text-xs text-slate-600 mt-1.5 italic border-l-2 border-slate-200 pl-2">"${esc(e.comentario)}"</p>` : ''}
        </div>
        <span class="badge badge-${e.nivel}">${e.nivel}</span>
        <span class="semaforo-label"><span class="semaforo-dot semaforo-${e.semaforo}"></span>${e.semaforo}</span>
        <button type="button" data-act="exportar" data-id="${e.id}" class="text-sm px-3 py-1.5 bg-sigel-primary hover:bg-blue-900 text-white rounded font-semibold">📄 PDF</button>
        <button type="button" data-act="borrar" data-id="${e.id}" aria-label="Eliminar" class="text-red-600 hover:bg-red-50 px-2 py-1.5 rounded">🗑️</button>
      </div>`;
    }).join('')}</div>`;
  };
  renderGuardadas();

  // ── Resultados ──
  function renderResultado() {
    const dims100 = {};
    for (const d of DIMENSIONES_CIUDADANAS) dims100[d.id] = agregarDimension(d, st.respuestas);
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
    const gad = gads.find(g => g.id === st.gadId);
    const box = root.querySelector('#ev-resultado');
    box.innerHTML = `
      <div class="card text-center">
        <div class="text-xs text-slate-500">Tu evaluación de</div>
        <div class="font-display font-bold text-xl">${esc(gad ? gad.nombre : '')}</div>
        <div class="font-display font-extrabold text-6xl tabular-nums mt-2 text-sigel-primary">${ingel.toFixed(1)}</div>
        <div class="text-xs text-slate-500">INGEL ciudadano (0–100)</div>
        <div class="mt-2 flex items-center justify-center gap-3">
          <span class="badge badge-${nivel}">${nivel}</span>
          <span class="semaforo-label"><span class="semaforo-dot semaforo-${semaforo}"></span>${semaforo}</span>
        </div>
        <div class="text-sm text-slate-500 mt-2">Índice de riesgo institucional (IRI): <strong>${iri.toFixed(1)}</strong></div>
      </div>
      <div class="card mt-4">
        <div class="font-semibold mb-3">Desglose por dimensión</div>
        <div class="space-y-4">
          ${DIMENSIONES_CIUDADANAS.map(d => {
            const v = dims100[d.id];
            const bc = v >= 70 ? '#16A34A' : v >= 50 ? '#F59E0B' : '#DC2626';
            const interp = v >= 60 ? d.interpretacionScore.alta : d.interpretacionScore.baja;
            return `<div>
              <div class="flex justify-between items-center text-sm mb-1">
                <span class="font-medium">${esc(d.tituloCiudadano)}</span>
                <span class="font-display font-bold tabular-nums">${v.toFixed(1)}</span>
              </div>
              <div class="bg-slate-100 rounded-full h-2 overflow-hidden" role="progressbar" aria-valuenow="${v.toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(d.tituloCiudadano)}">
                <div class="h-full rounded-full" style="width:${Math.max(0, Math.min(100, v))}%;background:${bc}"></div>
              </div>
              <p class="text-xs text-slate-500 mt-1">${esc(interp)}</p>
            </div>`;
          }).join('')}
        </div>
      </div>
      <div class="card mt-4">
        <label for="ev-comentario" class="block font-semibold mb-2">Comentario (opcional)</label>
        <textarea id="ev-comentario" rows="3" placeholder="¿Algo que quieras añadir sobre tu evaluación?"
          class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sigel-primary/40 focus:border-sigel-primary outline-none transition">${esc(st.comentario)}</textarea>
      </div>
      <div id="ev-guardar-zona" class="mt-4">
        <button type="button" class="btn-primary w-full py-3 text-lg" data-act="guardar">💾 Guardar mi evaluación</button>
      </div>
      <div class="flex gap-2 mt-2">
        <button type="button" class="btn-primary !bg-white !text-slate-600 border border-slate-300" data-act="back" data-to="${NDIM}">← Atrás</button>
        <button type="button" class="btn-primary flex-1 !bg-white !text-slate-600 border border-slate-300" data-act="reiniciar">Evaluar otro GAD</button>
      </div>`;
  }

  // ── Validación de paso ──
  function nextFrom(n) {
    const dim = DIMENSIONES_CIUDADANAS[n - 1];
    const faltan = dim.preguntas.filter(q => st.respuestas[q.id] == null);
    if (faltan.length) {
      showErr(n, true);
      faltan.forEach(q => root.querySelectorAll(`.likert-btn[data-q="${q.id}"]`)
        .forEach(b => b.style.borderColor = '#DC2626'));
      return;
    }
    showErr(n, false);
    show(n === NDIM ? LAST : n + 1);
  }

  function guardar() {
    const dims100 = {};
    for (const d of DIMENSIONES_CIUDADANAS) dims100[d.id] = agregarDimension(d, st.respuestas);
    const ingel = calcularIngel(dims100);
    guardarEvaluacion({
      gadId: st.gadId,
      respuestas: { ...st.respuestas },
      dims100,
      comentario: st.comentario || '',
      ingel,
      nivel: clasificarNivel(ingel),
      semaforo: semaforizar(ingel),
      iri: calcularIri({
        transparencia: dims100.transparencia,
        finanzas: dims100.finanzas,
        endeudamiento: 100 - dims100.finanzas,
        corrupcion: 100 - dims100.legitimidad,
        participacion: dims100.participacion,
      }),
    });
    const zona = root.querySelector('#ev-guardar-zona');
    if (zona) zona.innerHTML = `<div class="bg-green-50 border border-green-200 text-green-800 rounded-lg px-4 py-3 text-sm font-medium text-center">
      ✓ Evaluación guardada en tu navegador.</div>`;
    renderGuardadas();
  }

  async function exportar(id) {
    const overlay = root.querySelector('#pdf-overlay');
    const msg = root.querySelector('#pdf-overlay-msg');
    const ev = obtenerEvaluaciones().find(e => e.id === id);
    if (!ev) return;
    const gad = gads.find(g => g.id === ev.gadId);
    overlay.classList.replace('hidden', 'flex');
    try {
      await exportarEvaluacionPdf(ev, gad, (m) => { if (msg) msg.textContent = m; });
      setTimeout(() => overlay.classList.replace('flex', 'hidden'), 700);
    } catch (err) {
      if (msg) msg.textContent = '❌ No se pudo generar el PDF';
      setTimeout(() => overlay.classList.replace('flex', 'hidden'), 1600);
      console.error(err);
    }
  }

  // ── Eventos (delegación) ──
  root.addEventListener('click', (ev) => {
    const lb = ev.target.closest('.likert-btn');
    if (lb) {
      const q = lb.dataset.q, v = +lb.dataset.v;
      st.respuestas[q] = v;
      lb.closest('.likert').querySelectorAll('.likert-btn').forEach(b => {
        const on = +b.dataset.v === v;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.style.borderColor = '';
      });
      return;
    }
    const a = ev.target.closest('[data-act]');
    if (!a) return;
    switch (a.dataset.act) {
      case 'comenzar':
        if (!st.gadId) { showErr(0, true); return; }
        showErr(0, false); show(1); break;
      case 'next': nextFrom(+a.dataset.step); break;
      case 'back': show(+a.dataset.to); break;
      case 'guardar': guardar(); break;
      case 'reiniciar': st = newState(); show(0); renderOpts(); renderGuardadas(); break;
      case 'exportar': exportar(a.dataset.id); break;
      case 'borrar':
        if (confirm('¿Eliminar esta evaluación?')) { borrarEvaluacion(a.dataset.id); renderGuardadas(); }
        break;
    }
  });
  root.addEventListener('keydown', (ev) => {
    const lb = ev.target.closest('.likert-btn');
    if (lb && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); lb.click(); }
  });
  root.querySelector('#ev-filtro').addEventListener('input', (ev) => {
    st.filtroGad = ev.target.value; renderOpts();
  });
  sel.addEventListener('change', () => { st.gadId = sel.value; });
  root.addEventListener('input', (ev) => {
    if (ev.target.id === 'ev-comentario') st.comentario = ev.target.value;
  });

  steps.forEach(s => s.classList.toggle('hidden', +s.dataset.step !== 0));
  show(0);
}
