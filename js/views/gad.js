// SIGEL — Vista ficha de un GAD individual
import { DIMENSIONES, COLOR_SEMAFORO } from '../ingel.js';

export function viewGad(state, gadId) {
  const g = state.data.gads.find(x => x.id === gadId);
  if (!g) return /*html*/`
    <div class="max-w-3xl mx-auto px-4 py-16 text-center">
      <h1 class="font-display font-bold text-2xl">GAD no encontrado</h1>
      <p class="text-slate-600 mt-3"><a href="#/ranking" class="text-sigel-primary">Volver al ranking →</a></p>
    </div>`;

  return /*html*/`
  <div class="max-w-5xl mx-auto px-4 py-10 fade-in">
    <a href="#/ranking" class="inline-flex items-center gap-1 text-sm font-semibold text-sigel-primary hover:gap-2 transition-all"><span aria-hidden="true">←</span> Volver al ranking</a>

    <header class="card mt-4 grid md:grid-cols-3 gap-6 items-center">
      <div class="md:col-span-2">
        <span class="chip text-xs"><span class="dot" style="background:var(--sigel-primary)"></span>${g.tipo}</span>
        <h1 class="font-display font-extrabold text-3xl md:text-4xl mt-3 tracking-tight">${g.nombre}</h1>
        <p class="text-slate-600 mt-1">${g.provincia}</p>
        <div class="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div class="text-slate-500 text-xs uppercase tracking-wider font-semibold">Autoridad</div>
            <div class="font-semibold mt-0.5">${g.autoridad || '—'}</div>
            <div class="text-xs text-slate-500">${g.cargo}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase tracking-wider font-semibold">Partido / Coalición</div>
            <div class="font-semibold mt-0.5">${g.partido || '—'}</div>
            ${g.porcentaje_votos != null
              ? `<div class="text-xs text-slate-500">${(g.porcentaje_votos * 100).toFixed(1)}% en elecciones 2023</div>`
              : ''}
          </div>
        </div>
      </div>
      <div class="text-center bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-6 rounded-xl">
        <div class="text-xs uppercase tracking-widest text-slate-500 font-semibold">INGEL</div>
        <div class="font-display font-extrabold text-6xl text-sigel-primary mt-1 tabular-nums">${g.ingel.toFixed(1)}</div>
        <span class="badge badge-${g.nivel} mt-3">${g.nivel}</span>
        <div class="mt-3 semaforo-label justify-center">
          <span class="semaforo-dot semaforo-${g.semaforo}" style="width:20px;height:20px"></span>${g.semaforo}
        </div>
      </div>
    </header>

    <section class="card mt-5">
      <h2 class="font-display font-bold text-xl mb-5">Perfil por dimensión</h2>
      <div class="space-y-4">
        ${DIMENSIONES.map(d => {
          const v = g.dims[d.codigo] ?? 0;
          return /*html*/`
            <div>
              <div class="flex justify-between items-center text-sm mb-1.5">
                <span class="flex items-center gap-2"><span class="inline-block w-2.5 h-2.5 rounded-full" style="background:${d.color}"></span><span class="font-medium">${d.nombre}</span> <span class="text-slate-400 text-xs">(${(d.peso * 100).toFixed(0)}%)</span></span>
                <span class="font-display font-bold tabular-nums">${v.toFixed(1)}</span>
              </div>
              <div class="bg-slate-100 rounded-full h-2.5 overflow-hidden" role="progressbar" aria-valuenow="${v.toFixed(0)}" aria-valuemin="0" aria-valuemax="100" aria-label="${d.nombre}">
                <div class="h-full rounded-full transition-all" style="width:${Math.max(0, Math.min(100, v))}%;background:${d.color}"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>

    <section class="mt-5">
      <h2 class="font-display font-bold text-xl mb-4">Índices complementarios</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="stat">
          <div class="stat-label">INGEL</div>
          <div class="stat-value text-3xl">${g.ingel.toFixed(1)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">IRI · riesgo inst.</div>
          <div class="stat-value text-3xl ${g.iri > 60 ? '!text-red-600' : g.iri > 40 ? '!text-amber-600' : '!text-green-600'}">${g.iri.toFixed(1)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Transparencia digital</div>
          <div class="stat-value text-3xl">${((g.dims.transparencia + g.dims.innovacion) / 2).toFixed(1)}</div>
        </div>
        <div class="stat">
          <div class="stat-label">Calidad democrática</div>
          <div class="stat-value text-3xl">${((g.dims.legitimidad + g.dims.participacion + g.dims.transparencia) / 3).toFixed(1)}</div>
        </div>
      </div>
    </section>

    <section class="mt-6 text-center">
      <a href="#/evaluar?gad=${g.id}" class="btn-accent inline-block">📋 Crear mi evaluación de ${g.nombre.replace(/^GAD .* de /, '')}</a>
    </section>
  </div>
  `;
}
