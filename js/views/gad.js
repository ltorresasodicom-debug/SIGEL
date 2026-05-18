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
  <div class="max-w-5xl mx-auto px-4 py-8 fade-in">
    <a href="#/ranking" class="text-sm text-sigel-primary hover:underline">← Volver al ranking</a>

    <header class="card mt-4 grid md:grid-cols-3 gap-6 items-center">
      <div class="md:col-span-2">
        <span class="text-xs uppercase tracking-widest text-slate-500">${g.tipo}</span>
        <h1 class="font-display font-bold text-3xl mt-1">${g.nombre}</h1>
        <p class="text-slate-600 mt-1">${g.provincia}</p>
        <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <div class="text-slate-500 text-xs uppercase tracking-wider">Autoridad</div>
            <div class="font-semibold">${g.autoridad || '—'}</div>
            <div class="text-xs text-slate-500">${g.cargo}</div>
          </div>
          <div>
            <div class="text-slate-500 text-xs uppercase tracking-wider">Partido / Coalición</div>
            <div class="font-semibold">${g.partido || '—'}</div>
            ${g.porcentaje_votos != null
              ? `<div class="text-xs text-slate-500">${(g.porcentaje_votos * 100).toFixed(1)}% en elecciones 2023</div>`
              : ''}
          </div>
        </div>
      </div>
      <div class="text-center bg-slate-50 p-5 rounded-lg">
        <div class="text-xs uppercase tracking-widest text-slate-500">INGEL</div>
        <div class="font-display font-extrabold text-6xl text-sigel-primary mt-1">${g.ingel.toFixed(1)}</div>
        <span class="badge badge-${g.nivel} mt-2">${g.nivel}</span>
        <div class="mt-3">
          <span class="semaforo-dot semaforo-${g.semaforo}" style="width:24px;height:24px"></span>
        </div>
      </div>
    </header>

    <section class="card mt-5">
      <h2 class="font-display font-semibold text-xl mb-4">Perfil por dimensión</h2>
      <div class="space-y-3">
        ${DIMENSIONES.map(d => {
          const v = g.dims[d.codigo] ?? 0;
          return /*html*/`
            <div>
              <div class="flex justify-between text-sm">
                <span><span class="inline-block w-3 h-3 rounded mr-2" style="background:${d.color}"></span>${d.nombre} <span class="text-slate-400 text-xs">(${(d.peso * 100).toFixed(0)}%)</span></span>
                <span class="font-mono font-semibold">${v.toFixed(1)}</span>
              </div>
              <div class="bg-slate-100 rounded-full h-2 mt-1 overflow-hidden">
                <div class="h-full rounded-full" style="width:${v}%;background:${d.color}"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </section>

    <section class="card mt-5">
      <h2 class="font-display font-semibold text-xl mb-3">Índices complementarios</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
        <div class="p-4 bg-slate-50 rounded-lg">
          <div class="text-xs uppercase tracking-wider text-slate-500">INGEL</div>
          <div class="font-display font-bold text-2xl">${g.ingel.toFixed(1)}</div>
        </div>
        <div class="p-4 bg-slate-50 rounded-lg">
          <div class="text-xs uppercase tracking-wider text-slate-500">IRI (riesgo inst.)</div>
          <div class="font-display font-bold text-2xl ${g.iri > 60 ? 'text-red-600' : g.iri > 40 ? 'text-yellow-600' : 'text-green-600'}">${g.iri.toFixed(1)}</div>
        </div>
        <div class="p-4 bg-slate-50 rounded-lg">
          <div class="text-xs uppercase tracking-wider text-slate-500">Transparencia digital</div>
          <div class="font-display font-bold text-2xl">${((g.dims.transparencia + g.dims.innovacion) / 2).toFixed(1)}</div>
        </div>
        <div class="p-4 bg-slate-50 rounded-lg">
          <div class="text-xs uppercase tracking-wider text-slate-500">Calidad democrática</div>
          <div class="font-display font-bold text-2xl">${((g.dims.legitimidad + g.dims.participacion + g.dims.transparencia) / 3).toFixed(1)}</div>
        </div>
      </div>
    </section>

    <section class="mt-6 text-center">
      <a href="#/evaluar?gad=${g.id}" class="btn-accent inline-block">📋 Crear mi evaluación de ${g.nombre.replace(/^GAD .* de /, '')}</a>
    </section>
  </div>
  `;
}
