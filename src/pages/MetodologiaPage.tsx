import { DIMENSIONES } from '@/evaluation-engine';
import { Badge, Card, SemaforoDot } from '@/components/ui';

const NIVELES = [
  ['90–100', 'EXCELENTE', 'VERDE', 'Referente nacional'],
  ['75–89', 'ALTO', 'VERDE', 'Buena gestión'],
  ['60–74', 'MEDIO', 'AMARILLO', 'Aspectos por mejorar'],
  ['40–59', 'BAJO', 'ROJO', 'Riesgos institucionales'],
  ['0–39', 'CRITICO', 'ROJO', 'Intervención inmediata'],
] as const;

export function MetodologiaPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
        Metodología SIGEL
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-slate-600">
        El modelo SIGEL se fundamenta en estándares internacionales de gobierno abierto y mejora
        continua. No es un instrumento sancionador, sino una herramienta para la mejora de la
        gestión pública local.
      </p>

      <h2 className="mt-10 font-display text-2xl font-bold">Fórmula INGEL</h2>
      <div className="my-4 rounded-xl bg-slate-900 p-6 font-mono text-sm leading-relaxed text-slate-100">
        INGEL = Σ(Dimensión<sub>i</sub> × Ponderación<sub>i</sub>)
        <br />
        <br />
        Cada dimensión combina: 60% evaluación objetiva · 25% percepción ciudadana · 15% análisis
        experto.
      </div>

      <h2 className="mt-10 font-display text-2xl font-bold">Las 8 dimensiones</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {DIMENSIONES.map((d) => (
          <Card key={d.codigo} className="flex items-center gap-4">
            <div className="h-12 w-2.5 flex-none rounded-full" style={{ background: d.color }} />
            <div className="flex-1">
              <div className="font-semibold">{d.nombre}</div>
              <div className="text-xs text-slate-500">
                Código: <code className="rounded bg-slate-100 px-1.5 py-0.5">{d.codigo}</code>
              </div>
            </div>
            <div className="font-display text-2xl font-extrabold tabular-nums text-sigel-primary">
              {(d.peso * 100).toFixed(0)}%
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mt-10 font-display text-2xl font-bold">Clasificación de desempeño</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600">
              <th className="px-4 py-3">Puntaje</th>
              <th className="px-4 py-3">Nivel</th>
              <th className="px-4 py-3">Semáforo</th>
              <th className="px-4 py-3">Interpretación</th>
            </tr>
          </thead>
          <tbody>
            {NIVELES.map(([rango, nivel, semaforo, interp]) => (
              <tr key={nivel} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono">{rango}</td>
                <td className="px-4 py-3">
                  <Badge nivel={nivel} />
                </td>
                <td className="px-4 py-3">
                  <SemaforoDot semaforo={semaforo} label />
                </td>
                <td className="px-4 py-3 text-slate-600">{interp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 p-6 leading-relaxed">
        <strong>⚠️ Aviso:</strong> Los puntajes por dimensión mostrados en rankings y mapa son{' '}
        <strong>sintéticos</strong> (derivados deterministamente de datos electorales) con fines de
        demostración. La <strong>evaluación ciudadana</strong> que tú creas sí usa exactamente la
        fórmula INGEL real del motor de scoring.
      </div>

      <h2 className="mt-10 font-display text-2xl font-bold">Autoría</h2>
      <p className="mt-3 leading-relaxed text-slate-700">
        SIGEL es una iniciativa de <strong>Soc. Luis Adrián Torres E.</strong> — Sociólogo, creador
        y director metodológico. Con el apoyo de ASODICOM y Latam Cifras. Contacto:{' '}
        <a className="text-sigel-primary underline" href="mailto:ltorres.asodicom@gmail.com">
          ltorres.asodicom@gmail.com
        </a>
        .
      </p>
    </div>
  );
}
