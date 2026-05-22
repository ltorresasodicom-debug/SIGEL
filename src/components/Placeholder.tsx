interface PlaceholderProps {
  titulo: string;
  descripcion: string;
}

/** Marcador de página reutilizable mientras se portan las vistas. */
export function Placeholder({ titulo, descripcion }: PlaceholderProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">
        {titulo}
      </h1>
      <p className="mt-3 text-lg leading-relaxed text-slate-600">{descripcion}</p>
      <p className="mt-6 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Módulo en construcción. Los cimientos React + TypeScript + Vite ya están listos; esta
        vista se portará según la hoja de ruta de migración.
      </p>
    </section>
  );
}
