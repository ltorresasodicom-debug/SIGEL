// SIGEL — Vista metodología
import { DIMENSIONES } from '../ingel.js';

export function viewMetodologia() {
  return /*html*/`
  <div class="max-w-4xl mx-auto px-4 py-8 fade-in prose prose-slate">
    <h1 class="font-display font-bold text-3xl">Metodología SIGEL</h1>

    <p class="text-slate-600 text-lg mt-3">
      El modelo SIGEL se fundamenta en estándares internacionales de gobierno
      abierto y mejora continua. No es un instrumento sancionador, sino una
      herramienta de evaluación para la <strong>mejora continua de la gestión
      pública local</strong>.
    </p>

    <h2 class="font-display font-bold text-2xl mt-8">Marco conceptual</h2>
    <ul class="mt-3 space-y-1 text-slate-700">
      <li>📘 <strong>ISO 18091</strong> — Sistemas de gestión de calidad en gobiernos locales</li>
      <li>📘 <strong>ISO 9001</strong> — Calidad institucional</li>
      <li>📘 <strong>Modelo Infoparticipa</strong> — Transparencia y acceso a información</li>
      <li>📘 <strong>LOTAIP</strong> — Ley Orgánica de Transparencia y Acceso a Información Pública del Ecuador</li>
      <li>📘 <strong>PHVA</strong> — Planificar-Hacer-Verificar-Actuar (mejora continua)</li>
    </ul>

    <h2 class="font-display font-bold text-2xl mt-8">Fórmula INGEL</h2>
    <div class="bg-slate-100 rounded-lg p-5 font-mono text-sm my-4">
      INGEL = Σ(Dimensión<sub>i</sub> × Ponderación<sub>i</sub>)<br><br>
      Cada dimensión combina:<br>
      &nbsp;&nbsp;60% evaluación objetiva (datos administrativos / scraping)<br>
      &nbsp;&nbsp;25% percepción ciudadana (encuestas Likert 1-5)<br>
      &nbsp;&nbsp;15% análisis experto (panel técnico)
    </div>

    <h2 class="font-display font-bold text-2xl mt-8">Las 8 dimensiones</h2>
    <div class="grid gap-3 mt-4">
      ${DIMENSIONES.map(d => /*html*/`
        <div class="card flex items-center gap-4">
          <div class="w-3 h-12 rounded" style="background:${d.color}"></div>
          <div class="flex-1">
            <div class="font-semibold">${d.nombre}</div>
            <div class="text-xs text-slate-500">Código: <code>${d.codigo}</code></div>
          </div>
          <div class="font-mono font-bold text-2xl text-slate-700">${(d.peso * 100).toFixed(0)}%</div>
        </div>
      `).join('')}
    </div>

    <h2 class="font-display font-bold text-2xl mt-8">Clasificación de desempeño</h2>
    <table class="w-full mt-4 text-sm">
      <thead>
        <tr class="bg-slate-100">
          <th class="text-left p-3">Puntaje</th>
          <th class="text-left p-3">Nivel</th>
          <th class="text-left p-3">Semáforo</th>
          <th class="text-left p-3">Interpretación</th>
        </tr>
      </thead>
      <tbody>
        <tr class="border-t border-slate-200"><td class="p-3 font-mono">90–100</td><td class="p-3"><span class="badge badge-EXCELENTE">EXCELENTE</span></td><td class="p-3"><span class="semaforo-dot semaforo-VERDE"></span></td><td class="p-3">Referente nacional</td></tr>
        <tr class="border-t border-slate-200"><td class="p-3 font-mono">75–89</td><td class="p-3"><span class="badge badge-ALTO">ALTO</span></td><td class="p-3"><span class="semaforo-dot semaforo-VERDE"></span></td><td class="p-3">Buena gestión</td></tr>
        <tr class="border-t border-slate-200"><td class="p-3 font-mono">60–74</td><td class="p-3"><span class="badge badge-MEDIO">MEDIO</span></td><td class="p-3"><span class="semaforo-dot semaforo-AMARILLO"></span></td><td class="p-3">Aspectos por mejorar</td></tr>
        <tr class="border-t border-slate-200"><td class="p-3 font-mono">40–59</td><td class="p-3"><span class="badge badge-BAJO">BAJO</span></td><td class="p-3"><span class="semaforo-dot semaforo-ROJO"></span></td><td class="p-3">Riesgos institucionales</td></tr>
        <tr class="border-t border-slate-200"><td class="p-3 font-mono">0–39</td><td class="p-3"><span class="badge badge-CRITICO">CRITICO</span></td><td class="p-3"><span class="semaforo-dot semaforo-ROJO"></span></td><td class="p-3">Intervención inmediata</td></tr>
      </tbody>
    </table>

    <h2 class="font-display font-bold text-2xl mt-8">Índices complementarios</h2>
    <ul class="mt-3 space-y-2 text-slate-700">
      <li><strong>IRI</strong> (Índice de Riesgo Institucional) — opacidad, baja ejecución, sobre-endeudamiento, corrupción percibida y baja participación.</li>
      <li><strong>ITD</strong> (Transparencia Digital) — promedio entre transparencia activa e innovación digital.</li>
      <li><strong>ICDL</strong> (Calidad Democrática Local) — combina legitimidad, participación y transparencia.</li>
    </ul>

    <h2 class="font-display font-bold text-2xl mt-8">Sobre este demo</h2>
    <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-5 mt-3">
      <strong>⚠️ Aviso importante:</strong>
      Los puntajes mostrados en este sitio son <strong>sintéticos</strong>,
      generados deterministicamente a partir de los datos electorales para
      fines de demostración. La <strong>versión completa de SIGEL</strong>
      alimenta estos puntajes con datos reales del scraper LOTAIP, API SERCOP,
      Ministerio de Finanzas, INEC y encuestas ciudadanas verificadas.
      <br><br>
      <strong>Tu propia evaluación</strong>, en cambio, sí usa exactamente la
      misma fórmula INGEL del backend de producción — los 49 tests unitarios
      del motor de scoring están publicados en el repositorio.
    </div>

    <h2 class="font-display font-bold text-2xl mt-8">Código abierto</h2>
    <p class="mt-3">
      SIGEL es <strong>software público libre</strong> bajo licencia AGPL-3.0.
      El código fuente completo (backend NestJS + FastAPI + PostgreSQL/PostGIS +
      Next.js + scrapers + manifiestos K8s + CI/CD) está disponible en
      <a href="https://github.com/ltorresasodicom-debug/ASODICOM" class="text-sigel-primary underline">GitHub</a>.
    </p>
  </div>
  `;
}
