import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSigelData } from '@/hooks/useSigelData';
import { DIMENSIONES } from '@/evaluation-engine';
import { Badge, Card, DataBoundary, ProgressBar, SemaforoDot } from '@/components/ui';
import { colorPorIngel } from '@/lib/colores';
import { filterByQuery } from '@/lib/fuzzy';
import type { Gad } from '@/types/sigel';

const MAX = 4;

export function CompararPage() {
  const { data, isLoading, error } = useSigelData();
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [filtro, setFiltro] = useState('');

  const gads = useMemo(() => data?.gads ?? [], [data]);
  const gadsSel = useMemo(
    () =>
      seleccionados
        .map((id) => gads.find((g) => g.id === id))
        .filter((g): g is Gad => g != null),
    [seleccionados, gads],
  );

  const sugerencias = useMemo(() => {
    if (!filtro.trim()) return [];
    return filterByQuery(gads, ['nombre', 'provincia', 'autoridad', 'partido'], filtro)
      .filter((g) => !seleccionados.includes(g.id))
      .slice(0, 8);
  }, [filtro, gads, seleccionados]);

  function agregar(id: string) {
    if (seleccionados.length >= MAX || seleccionados.includes(id)) return;
    setSeleccionados((prev) => [...prev, id]);
    setFiltro('');
  }

  function quitar(id: string) {
    setSeleccionados((prev) => prev.filter((x) => x !== id));
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          🔀 Comparador de gobiernos locales
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Compara hasta {MAX} GADs lado a lado: INGEL, semáforo y desempeño por dimensión.
        </p>
      </header>

      <DataBoundary loading={isLoading} error={error}>
        <Card className="mb-6">
          {gadsSel.length > 0 && (
            <ul className="mb-3 flex flex-wrap gap-2" aria-label="GADs seleccionados">
              {gadsSel.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => quitar(g.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-sigel-primary/30 bg-sigel-primary/5 px-3 py-1.5 text-sm font-medium text-sigel-primary transition hover:bg-sigel-primary/10"
                    aria-label={`Quitar ${g.nombre} de la comparación`}
                  >
                    <SemaforoDot semaforo={g.semaforo} />
                    <span>{g.nombre}</span>
                    <span aria-hidden="true">✕</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {seleccionados.length < MAX ? (
            <div className="relative">
              <label htmlFor="comp-buscar" className="sr-only">
                Buscar GAD para añadir a la comparación
              </label>
              <input
                id="comp-buscar"
                type="search"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder={`Añadir GAD (${seleccionados.length}/${MAX})…`}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
              />
              {sugerencias.length > 0 && (
                <ul
                  className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-line bg-surface shadow-lg"
                  role="listbox"
                  aria-label="Sugerencias de GADs"
                >
                  {sugerencias.map((g) => (
                    <li key={g.id}>
                      <button
                        type="button"
                        onClick={() => agregar(g.id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm transition hover:bg-slate-50"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">{g.nombre}</span>
                          <span className="ml-2 text-xs text-muted">{g.provincia}</span>
                        </span>
                        <span className="flex-none font-display text-sm font-bold tabular-nums text-sigel-primary">
                          {g.ingel.toFixed(1)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Máximo {MAX} GADs alcanzado. Quita uno para añadir otro.
            </p>
          )}
        </Card>

        {gadsSel.length === 0 ? (
          <Card className="py-16 text-center">
            <div className="text-4xl" aria-hidden="true">
              🔍
            </div>
            <h2 className="mt-3 font-display text-xl font-bold">Empieza la comparación</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Busca y añade entre 1 y {MAX} gobiernos locales para verlos lado a lado.
            </p>
          </Card>
        ) : (
          <TablaComparativa gads={gadsSel} />
        )}
      </DataBoundary>
    </div>
  );
}

function TablaComparativa({ gads }: { gads: Gad[] }) {
  const mejor = Math.max(...gads.map((g) => g.ingel));
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-slate-100 text-left text-xs uppercase tracking-wider text-slate-600">
            <th className="px-4 py-3 font-semibold">Dimensión</th>
            {gads.map((g) => (
              <th key={g.id} className="px-4 py-3 font-semibold">
                <Link to={`/gad/${g.id}`} className="block hover:underline">
                  <div className="truncate text-sm font-bold normal-case text-slate-900">
                    {g.nombre}
                  </div>
                  <div className="truncate text-[11px] font-medium normal-case tracking-normal text-muted">
                    {g.provincia} · {g.autoridad}
                  </div>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-line bg-slate-50/50">
            <td className="px-4 py-3 font-semibold text-slate-900">INGEL</td>
            {gads.map((g) => (
              <td key={g.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`font-display text-2xl font-extrabold tabular-nums ${
                      g.ingel === mejor ? 'text-sigel-accent' : 'text-sigel-primary'
                    }`}
                  >
                    {g.ingel.toFixed(1)}
                  </span>
                  <Badge nivel={g.nivel} />
                  <SemaforoDot semaforo={g.semaforo} />
                </div>
              </td>
            ))}
          </tr>
          {DIMENSIONES.map((d) => (
            <tr key={d.codigo} className="border-t border-line">
              <td className="px-4 py-3 align-top">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 flex-none rounded-full"
                    style={{ background: d.color }}
                    aria-hidden="true"
                  />
                  <span className="font-medium">{d.nombre}</span>
                  <span className="text-xs text-muted">({(d.peso * 100).toFixed(0)}%)</span>
                </div>
              </td>
              {gads.map((g) => {
                const v = g.dims[d.codigo];
                return (
                  <td key={g.id} className="px-4 py-3 align-top">
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="font-display font-bold tabular-nums">{v.toFixed(1)}</span>
                    </div>
                    <ProgressBar value={v} color={colorPorIngel(v)} />
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t border-line bg-slate-50/50">
            <td className="px-4 py-3 font-semibold text-slate-900">IRI · riesgo</td>
            {gads.map((g) => (
              <td key={g.id} className="px-4 py-3">
                <span className="font-display text-lg font-bold tabular-nums text-slate-700">
                  {g.iri.toFixed(1)}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
