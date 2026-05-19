// SIGEL — Vista metodología
import { DIMENSIONES } from '../ingel.js';

export function viewMetodologia() {
  return /*html*/`
  <div class="max-w-4xl mx-auto px-4 py-10 fade-in">
    <h1 class="font-display font-extrabold text-3xl md:text-4xl tracking-tight">Metodología SIGEL</h1>

    <p class="text-slate-600 text-lg mt-3 leading-relaxed">
      El modelo SIGEL se fundamenta en estándares internacionales de gobierno
      abierto y mejora continua. No es un instrumento sancionador, sino una
      herramienta de evaluación para la <strong>mejora continua de la gestión
      pública local</strong>.
    </p>

    <h2 class="font-display font-bold text-2xl mt-10">Marco conceptual</h2>
    <ul class="mt-3 space-y-1 text-slate-700">
      <li>📘 <strong>ISO 18091</strong> — Sistemas de gestión de calidad en gobiernos locales</li>
      <li>📘 <strong>ISO 9001</strong> — Calidad institucional</li>
      <li>📘 <strong>Modelo Infoparticipa</strong> — Transparencia y acceso a información</li>
      <li>📘 <strong>LOTAIP</strong> — Ley Orgánica de Transparencia y Acceso a Información Pública del Ecuador</li>
      <li>📘 <strong>PHVA</strong> — Planificar-Hacer-Verificar-Actuar (mejora continua)</li>
    </ul>

    <h2 class="font-display font-bold text-2xl mt-10">Fórmula INGEL</h2>
    <div class="bg-slate-900 text-slate-100 rounded-xl p-6 font-mono text-sm my-4 leading-relaxed">
      INGEL = Σ(Dimensión<sub>i</sub> × Ponderación<sub>i</sub>)<br><br>
      Cada dimensión combina:<br>
      &nbsp;&nbsp;60% evaluación objetiva (datos administrativos / scraping)<br>
      &nbsp;&nbsp;25% percepción ciudadana (encuestas Likert 1-5)<br>
      &nbsp;&nbsp;15% análisis experto (panel técnico)
    </div>

    <h2 class="font-display font-bold text-2xl mt-10">Las 8 dimensiones</h2>
    <div class="grid sm:grid-cols-2 gap-3 mt-4">
      ${DIMENSIONES.map(d => /*html*/`
        <div class="card flex items-center gap-4">
          <div class="w-2.5 h-12 rounded-full flex-none" style="background:${d.color}"></div>
          <div class="flex-1 min-w-0">
            <div class="font-semibold">${d.nombre}</div>
            <div class="text-xs text-slate-500">Código: <code class="bg-slate-100 px-1.5 py-0.5 rounded">${d.codigo}</code></div>
          </div>
          <div class="font-display font-extrabold text-2xl text-sigel-primary tabular-nums">${(d.peso * 100).toFixed(0)}%</div>
        </div>
      `).join('')}
    </div>

    <h2 class="font-display font-bold text-2xl mt-10">Clasificación de desempeño</h2>
    <div class="card p-0 overflow-x-auto mt-4">
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">Puntaje</th>
            <th scope="col">Nivel</th>
            <th scope="col">Semáforo</th>
            <th scope="col">Interpretación</th>
          </tr>
        </thead>
        <tbody>
          <tr style="cursor:default"><td data-label="Puntaje" class="num">90–100</td><td data-label="Nivel"><span class="badge badge-EXCELENTE">EXCELENTE</span></td><td data-label="Semáforo"><span class="semaforo-label"><span class="semaforo-dot semaforo-VERDE"></span>Verde</span></td><td data-label="Interpretación">Referente nacional</td></tr>
          <tr style="cursor:default"><td data-label="Puntaje" class="num">75–89</td><td data-label="Nivel"><span class="badge badge-ALTO">ALTO</span></td><td data-label="Semáforo"><span class="semaforo-label"><span class="semaforo-dot semaforo-VERDE"></span>Verde</span></td><td data-label="Interpretación">Buena gestión</td></tr>
          <tr style="cursor:default"><td data-label="Puntaje" class="num">60–74</td><td data-label="Nivel"><span class="badge badge-MEDIO">MEDIO</span></td><td data-label="Semáforo"><span class="semaforo-label"><span class="semaforo-dot semaforo-AMARILLO"></span>Amarillo</span></td><td data-label="Interpretación">Aspectos por mejorar</td></tr>
          <tr style="cursor:default"><td data-label="Puntaje" class="num">40–59</td><td data-label="Nivel"><span class="badge badge-BAJO">BAJO</span></td><td data-label="Semáforo"><span class="semaforo-label"><span class="semaforo-dot semaforo-ROJO"></span>Rojo</span></td><td data-label="Interpretación">Riesgos institucionales</td></tr>
          <tr style="cursor:default"><td data-label="Puntaje" class="num">0–39</td><td data-label="Nivel"><span class="badge badge-CRITICO">CRITICO</span></td><td data-label="Semáforo"><span class="semaforo-label"><span class="semaforo-dot semaforo-ROJO"></span>Rojo</span></td><td data-label="Interpretación">Intervención inmediata</td></tr>
        </tbody>
      </table>
    </div>

    <h2 class="font-display font-bold text-2xl mt-10">Índices complementarios</h2>
    <ul class="mt-3 space-y-2 text-slate-700">
      <li><strong>IRI</strong> (Índice de Riesgo Institucional) — opacidad, baja ejecución, sobre-endeudamiento, corrupción percibida y baja participación.</li>
      <li><strong>ITD</strong> (Transparencia Digital) — promedio entre transparencia activa e innovación digital.</li>
      <li><strong>ICDL</strong> (Calidad Democrática Local) — combina legitimidad, participación y transparencia.</li>
    </ul>

    <h2 class="font-display font-bold text-2xl mt-10">Sobre este demo</h2>
    <div class="bg-amber-50 border border-amber-200 rounded-xl p-6 mt-3 leading-relaxed">
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

    <h2 class="font-display font-bold text-2xl mt-10">Código abierto</h2>
    <p class="mt-3 text-slate-700 leading-relaxed">
      SIGEL es <strong>software público libre</strong> bajo licencia AGPL-3.0.
      El código fuente completo (backend NestJS + FastAPI + PostgreSQL/PostGIS +
      Next.js + scrapers + manifiestos K8s + CI/CD) está disponible en
      <a href="https://github.com/ltorresasodicom-debug/ASODICOM" class="text-sigel-primary underline">GitHub</a>.
    </p>
  </div>
  `;
}
