import { Link } from 'react-router-dom';
import { DIMENSIONES } from '@/evaluation-engine';
import { Card } from '@/components/ui';
import { Button } from '@/components/Button';
import { Dashboard } from '@/features/dashboard';

const FEATURES = [
  ['📋', 'Crea tu evaluación', 'Califica a tu gobierno local en 8 dimensiones y obtén su INGEL.', '/evaluar'],
  ['📊', 'Consulta el ranking', 'Compara los gobiernos locales del Ecuador por desempeño.', '/ranking'],
  ['🗺️', 'Explora el mapa', 'Visualiza el desempeño territorial con coropletas por cantón.', '/mapa'],
  ['🗳️', 'Calculadora de voto', 'Herramienta analítica de intención de voto en 13 preguntas.', '/calculadora'],
] as const;

export function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-sigel-primary via-blue-900 to-sigel-secondary text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
          <div className="max-w-3xl">
            <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest">
              Plataforma ciudadana de evaluación pública
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Evalúa la gestión de tu gobierno local
            </h1>
            <p className="mt-5 max-w-xl text-lg opacity-90">
              Rankings, scoring institucional (INGEL) y evaluación ciudadana de los gobiernos
              autónomos descentralizados del Ecuador.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/evaluar" variant="accent" size="lg">
                Crear mi evaluación
              </Button>
              <Button to="/ranking" variant="inverse" size="lg">
                Ver ranking nacional
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Dashboard />

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight">
          ¿Qué puedes hacer en SIGEL?
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([emoji, titulo, desc, href]) => (
            <Link key={href} to={href}>
              <Card className="h-full transition hover:-translate-y-1 hover:shadow-lg">
                <div className="text-3xl">{emoji}</div>
                <h3 className="mt-3 font-display text-lg font-semibold">{titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 py-16 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight">Metodología SIGEL</h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              El <strong>Índice Nacional de Gestión Local (INGEL)</strong> mide 8 dimensiones de la
              gestión pública con ponderaciones canónicas.
            </p>
            <Link
              to="/metodologia"
              className="mt-6 inline-block font-semibold text-sigel-accent hover:underline"
            >
              Ver metodología completa →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-2.5 text-sm sm:grid-cols-2">
            {DIMENSIONES.map((d) => (
              <div
                key={d.codigo}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="h-2.5 w-8 flex-none rounded-full" style={{ background: d.color }} />
                <span className="flex-1">{d.nombre}</span>
                <span className="font-display text-xs font-bold tabular-nums opacity-80">
                  {(d.peso * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
