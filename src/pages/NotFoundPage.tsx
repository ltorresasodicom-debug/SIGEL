import { Link } from 'react-router-dom';

/** Ruta no encontrada (404). */
export function NotFoundPage() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold text-slate-900">404 — Página no encontrada</h1>
      <p className="mt-3 text-slate-600">La ruta solicitada no existe.</p>
      <Link to="/" className="mt-6 inline-block font-semibold text-sigel-primary hover:underline">
        Volver al inicio →
      </Link>
    </section>
  );
}
