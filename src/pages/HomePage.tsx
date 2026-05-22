import { Link } from 'react-router-dom';

/** Página de inicio. */
export function HomePage() {
  return (
    <>
      <section className="bg-gradient-to-br from-sigel-primary via-blue-900 to-sigel-secondary text-white">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28">
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest">
            Plataforma ciudadana de evaluación pública
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
            Evalúa la gestión de tu gobierno local
          </h1>
          <p className="mt-5 max-w-xl text-lg opacity-90">
            SIGEL Ecuador — rankings, scoring institucional (INGEL) y evaluación ciudadana de los
            gobiernos autónomos descentralizados del país.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/evaluar"
              className="rounded-lg bg-sigel-accent px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Crear mi evaluación
            </Link>
            <Link
              to="/ranking"
              className="rounded-lg border border-white/30 bg-white/10 px-6 py-3 font-semibold transition hover:bg-white/20"
            >
              Ver ranking nacional
            </Link>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12">
        <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Nueva arquitectura React + TypeScript + Vite + Supabase. Las vistas se portan según la
          hoja de ruta de migración.
        </p>
      </section>
    </>
  );
}
