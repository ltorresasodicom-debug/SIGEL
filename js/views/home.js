// SIGEL — Vista Inicio
import { DIMENSIONES } from '../ingel.js';

export function viewHome(state) {
  const s = state.data.stats;
  const top5 = [...state.data.gads].sort((a, b) => b.ingel - a.ingel).slice(0, 5);

  return /*html*/`
  <section class="bg-gradient-to-br from-sigel-primary via-blue-900 to-sigel-secondary text-white">
    <div class="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center fade-in">
      <div>
        <span class="text-xs uppercase tracking-widest opacity-80">Plataforma Nacional de Evaluación Pública</span>
        <h1 class="font-display font-extrabold text-4xl md:text-6xl leading-tight mt-3">
          Evalúa tu alcalde.<br>Evalúa tu prefecto.
        </h1>
        <p class="mt-5 text-lg opacity-90 max-w-xl">
          SIGEL te permite consultar, comparar y <strong>crear tus propias
          evaluaciones</strong> de los <strong>${s.total} gobiernos locales</strong>
          del Ecuador. Tu opinión cuenta — y la metodología es transparente.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a href="#/evaluar" class="btn-accent">📋 Crear mi evaluación</a>
          <a href="#/ranking" class="bg-white/10 hover:bg-white/20 border border-white/30 px-6 py-3 rounded-lg font-semibold">Ver ranking</a>
        </div>
      </div>
      <div class="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
        <div class="grid grid-cols-2 gap-4 text-center">
          <div class="p-4 bg-white/10 rounded-xl">
            <div class="font-display font-bold text-4xl">${s.municipales}</div>
            <div class="text-xs opacity-80 uppercase tracking-wider mt-1">Alcaldes</div>
          </div>
          <div class="p-4 bg-white/10 rounded-xl">
            <div class="font-display font-bold text-4xl">${s.provinciales}</div>
            <div class="text-xs opacity-80 uppercase tracking-wider mt-1">Prefectos</div>
          </div>
          <div class="p-4 bg-white/10 rounded-xl">
            <div class="font-display font-bold text-4xl">${s.promedio.toFixed(1)}</div>
            <div class="text-xs opacity-80 uppercase tracking-wider mt-1">INGEL promedio</div>
          </div>
          <div class="p-4 bg-white/10 rounded-xl">
            <div class="font-display font-bold text-4xl">8</div>
            <div class="text-xs opacity-80 uppercase tracking-wider mt-1">Dimensiones</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="max-w-7xl mx-auto px-4 py-16">
    <div class="text-center max-w-2xl mx-auto mb-10">
      <h2 class="font-display font-bold text-3xl">¿Qué puedes hacer en SIGEL?</h2>
      <p class="text-slate-600 mt-3">Una plataforma ciudadana, transparente y abierta.</p>
    </div>
    <div class="grid md:grid-cols-3 gap-5">
      ${[
        ['📋', 'Crear tu evaluación', 'Califica a tu autoridad en 8 dimensiones y obtén tu propio puntaje INGEL al instante.', '#/evaluar'],
        ['📊', 'Consultar el ranking', 'Compara los 241 GADs del Ecuador ordenados por desempeño.', '#/ranking'],
        ['🗺️', 'Explorar el mapa', 'Visualiza el desempeño geográfico con coropletas por provincia.', '#/mapa'],
        ['📚', 'Conocer la metodología', 'Basada en ISO 18091, modelo Infoparticipa y Gobierno Abierto.', '#/metodologia'],
        ['💾', 'Guardar tus análisis', 'Tus evaluaciones quedan en tu navegador. Privadas y reutilizables.', '#/evaluar'],
        ['📤', 'Exportar y compartir', 'Descarga tus evaluaciones en JSON para análisis posterior.', '#/evaluar'],
      ].map(([emoji, t, d, href]) => /*html*/`
        <a href="${href}" class="card hover:shadow-lg transition group">
          <div class="text-4xl mb-3">${emoji}</div>
          <h3 class="font-display font-semibold text-lg mb-1">${t}</h3>
          <p class="text-sm text-slate-600">${d}</p>
        </a>
      `).join('')}
    </div>
  </section>

  <section class="bg-white border-y border-slate-200 py-14">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex items-end justify-between mb-6">
        <div>
          <h2 class="font-display font-bold text-3xl">Top 5 nacional</h2>
          <p class="text-slate-600 mt-1">Los GADs con mejor desempeño según el INGEL.</p>
        </div>
        <a href="#/ranking" class="text-sigel-primary font-semibold hover:underline">Ver ranking completo →</a>
      </div>
      <div class="space-y-2">
        ${top5.map((g, i) => /*html*/`
          <a href="#/gad/${g.id}" class="flex items-center gap-4 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
            <div class="font-display font-bold text-2xl text-sigel-primary w-10">${i + 1}</div>
            <div class="flex-1">
              <div class="font-semibold">${g.nombre}</div>
              <div class="text-xs text-slate-500">${g.provincia} · ${g.autoridad || '—'}</div>
            </div>
            <div class="text-right">
              <div class="font-mono font-bold text-2xl">${g.ingel.toFixed(1)}</div>
              <span class="badge badge-${g.nivel}">${g.nivel}</span>
            </div>
            <span class="semaforo-dot semaforo-${g.semaforo} ml-2"></span>
          </a>
        `).join('')}
      </div>
    </div>
  </section>

  <section class="bg-slate-900 text-white py-16">
    <div class="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
      <div>
        <h2 class="font-display font-bold text-3xl">Metodología SIGEL</h2>
        <p class="text-slate-300 mt-4 text-lg">
          El <strong>Índice Nacional de Gestión Local (INGEL)</strong> mide 8
          dimensiones de la gestión pública y combina:
        </p>
        <div class="mt-6 grid grid-cols-3 gap-3 text-center">
          <div class="bg-white/5 p-4 rounded-lg">
            <div class="font-display font-bold text-3xl text-sigel-accent">60%</div>
            <div class="text-xs uppercase tracking-wider opacity-80 mt-1">Datos objetivos</div>
          </div>
          <div class="bg-white/5 p-4 rounded-lg">
            <div class="font-display font-bold text-3xl text-sigel-accent">25%</div>
            <div class="text-xs uppercase tracking-wider opacity-80 mt-1">Voz ciudadana</div>
          </div>
          <div class="bg-white/5 p-4 rounded-lg">
            <div class="font-display font-bold text-3xl text-sigel-accent">15%</div>
            <div class="text-xs uppercase tracking-wider opacity-80 mt-1">Análisis experto</div>
          </div>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2 text-sm">
        ${DIMENSIONES.map(d => /*html*/`
          <div class="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-lg">
            <div class="w-3 h-3 rounded" style="background:${d.color}"></div>
            <span class="flex-1">${d.nombre}</span>
            <span class="font-mono text-xs opacity-70">${(d.peso * 100).toFixed(0)}%</span>
          </div>
        `).join('')}
      </div>
    </div>
  </section>
  `;
}
