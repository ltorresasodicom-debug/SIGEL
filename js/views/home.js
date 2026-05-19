// SIGEL — Vista Inicio
import { DIMENSIONES } from '../ingel.js';

export function viewHome(state) {
  const s = state.data.stats;
  const top5 = [...state.data.gads].sort((a, b) => b.ingel - a.ingel).slice(0, 5);

  return /*html*/`
  <section class="relative overflow-hidden bg-gradient-to-br from-sigel-primary via-blue-900 to-sigel-secondary text-white">
    <div class="absolute inset-0 opacity-[0.07]" aria-hidden="true"
         style="background-image:radial-gradient(circle at 1px 1px, #fff 1px, transparent 0);background-size:32px 32px"></div>
    <div class="relative max-w-7xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center fade-in">
      <div>
        <span class="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-semibold bg-white/10 border border-white/15 rounded-full px-3 py-1.5">
          <span class="w-1.5 h-1.5 rounded-full bg-sigel-accent"></span>
          Plataforma Nacional de Evaluación Pública
        </span>
        <h1 class="font-display font-extrabold text-4xl md:text-6xl leading-[1.05] mt-5 tracking-tight">
          Evalúa tu alcalde.<br><span class="text-sigel-accent">Evalúa tu prefecto.</span>
        </h1>
        <p class="mt-6 text-lg md:text-xl opacity-90 max-w-xl leading-relaxed">
          SIGEL te permite consultar, comparar y <strong>crear tus propias
          evaluaciones</strong> de los <strong>${s.total} gobiernos locales</strong>
          del Ecuador. Tu opinión cuenta — y la metodología es transparente.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="#/evaluar" class="btn-accent text-base">📋 Crear mi evaluación</a>
          <a href="#/ranking" class="inline-flex items-center justify-center min-h-[44px] bg-white/10 hover:bg-white/20 border border-white/30 px-6 py-3 rounded-lg font-semibold transition">Ver ranking →</a>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div class="stat stat--invert">
          <div class="stat-value">${s.municipales}</div>
          <div class="stat-label">Alcaldes</div>
        </div>
        <div class="stat stat--invert">
          <div class="stat-value">${s.provinciales}</div>
          <div class="stat-label">Prefectos</div>
        </div>
        <div class="stat stat--invert">
          <div class="stat-value">${s.promedio.toFixed(1)}</div>
          <div class="stat-label">INGEL promedio</div>
        </div>
        <div class="stat stat--invert">
          <div class="stat-value">8</div>
          <div class="stat-label">Dimensiones</div>
        </div>
      </div>
    </div>
  </section>

  <section class="max-w-7xl mx-auto px-4 section">
    <div class="text-center max-w-2xl mx-auto mb-12">
      <h2 class="font-display font-bold text-3xl md:text-4xl tracking-tight">¿Qué puedes hacer en SIGEL?</h2>
      <p class="text-slate-600 mt-3 text-lg">Una plataforma ciudadana, transparente y abierta.</p>
    </div>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      ${[
        ['📋', 'Crear tu evaluación', 'Califica a tu autoridad en 8 dimensiones y obtén tu propio puntaje INGEL al instante.', '#/evaluar'],
        ['📊', 'Consultar el ranking', `Compara los ${s.total} GADs del Ecuador ordenados por desempeño.`, '#/ranking'],
        ['🗺️', 'Explorar el mapa', 'Visualiza el desempeño geográfico con coropletas por provincia.', '#/mapa'],
        ['📚', 'Conocer la metodología', 'Basada en ISO 18091, modelo Infoparticipa y Gobierno Abierto.', '#/metodologia'],
        ['💾', 'Guardar tus análisis', 'Tus evaluaciones quedan en tu navegador. Privadas y reutilizables.', '#/evaluar'],
        ['📤', 'Exportar y compartir', 'Descarga tus evaluaciones como PDF institucional para análisis posterior.', '#/evaluar'],
      ].map(([emoji, t, d, href]) => /*html*/`
        <a href="${href}" class="card card--interactive group flex flex-col">
          <div class="grid place-items-center w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 text-2xl mb-4 group-hover:scale-105 transition">${emoji}</div>
          <h3 class="font-display font-semibold text-lg mb-1.5">${t}</h3>
          <p class="text-sm text-slate-600 leading-relaxed flex-1">${d}</p>
          <span class="text-sm font-semibold text-sigel-primary mt-4 inline-flex items-center gap-1 group-hover:gap-2 transition-all">Abrir <span aria-hidden="true">→</span></span>
        </a>
      `).join('')}
    </div>
  </section>

  <section class="bg-white border-y border-slate-200 section--tight">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex flex-wrap items-end justify-between gap-3 mb-8">
        <div>
          <h2 class="font-display font-bold text-3xl md:text-4xl tracking-tight">Top 5 nacional</h2>
          <p class="text-slate-600 mt-2 text-lg">Los GADs con mejor desempeño según el INGEL.</p>
        </div>
        <a href="#/ranking" class="text-sigel-primary font-semibold hover:underline inline-flex items-center gap-1">Ver ranking completo <span aria-hidden="true">→</span></a>
      </div>
      <ol class="space-y-2.5">
        ${top5.map((g, i) => /*html*/`
          <li>
            <a href="#/gad/${g.id}" class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-soft transition">
              <div class="grid place-items-center w-10 h-10 rounded-lg font-display font-extrabold text-lg ${i === 0 ? 'bg-sigel-accent text-white' : 'bg-white border border-slate-200 text-sigel-primary'}">${i + 1}</div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold truncate">${g.nombre}</div>
                <div class="text-xs text-slate-500 truncate">${g.provincia} · ${g.autoridad || '—'}</div>
              </div>
              <div class="text-right">
                <div class="font-display font-extrabold text-2xl text-sigel-primary tabular-nums">${g.ingel.toFixed(1)}</div>
                <span class="badge badge-${g.nivel}">${g.nivel}</span>
              </div>
              <span class="semaforo-dot semaforo-${g.semaforo} ml-1" title="${g.semaforo}" aria-label="Semáforo ${g.semaforo}"></span>
            </a>
          </li>
        `).join('')}
      </ol>
    </div>
  </section>

  <section class="bg-slate-900 text-white section">
    <div class="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h2 class="font-display font-bold text-3xl md:text-4xl tracking-tight">Metodología SIGEL</h2>
        <p class="text-slate-300 mt-4 text-lg leading-relaxed">
          El <strong>Índice Nacional de Gestión Local (INGEL)</strong> mide 8
          dimensiones de la gestión pública y combina:
        </p>
        <div class="mt-7 grid grid-cols-3 gap-3 text-center">
          <div class="bg-white/5 border border-white/10 p-5 rounded-xl">
            <div class="font-display font-extrabold text-3xl text-sigel-accent tabular-nums">60%</div>
            <div class="text-xs uppercase tracking-wider opacity-80 mt-1.5">Datos objetivos</div>
          </div>
          <div class="bg-white/5 border border-white/10 p-5 rounded-xl">
            <div class="font-display font-extrabold text-3xl text-sigel-accent tabular-nums">25%</div>
            <div class="text-xs uppercase tracking-wider opacity-80 mt-1.5">Voz ciudadana</div>
          </div>
          <div class="bg-white/5 border border-white/10 p-5 rounded-xl">
            <div class="font-display font-extrabold text-3xl text-sigel-accent tabular-nums">15%</div>
            <div class="text-xs uppercase tracking-wider opacity-80 mt-1.5">Análisis experto</div>
          </div>
        </div>
        <a href="#/metodologia" class="inline-flex items-center gap-1 mt-7 text-sigel-accent font-semibold hover:gap-2 transition-all">Ver metodología completa <span aria-hidden="true">→</span></a>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
        ${DIMENSIONES.map(d => /*html*/`
          <div class="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-lg hover:bg-white/10 transition">
            <div class="w-2.5 h-8 rounded-full flex-none" style="background:${d.color}"></div>
            <span class="flex-1">${d.nombre}</span>
            <span class="font-display font-bold text-xs opacity-80 tabular-nums">${(d.peso * 100).toFixed(0)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  </section>
  `;
}
