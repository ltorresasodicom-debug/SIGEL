import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { useSigelData } from '@/hooks/useSigelData';
import { Badge, Card, DataBoundary, SemaforoDot } from '@/components/ui';
import { colorPorIngel } from '@/lib/colores';
import type { Gad } from '@/types/sigel';

export function RankingPage() {
  const { data, isLoading, error } = useSigelData();
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<'TODOS' | 'MUNICIPAL' | 'PROVINCIAL'>('TODOS');
  const [provincia, setProvincia] = useState('TODAS');
  const navigate = useNavigate();

  const gads = useMemo(() => data?.gads ?? [], [data]);
  const fuse = useMemo(
    () =>
      new Fuse(gads, {
        keys: ['nombre', 'autoridad', 'provincia', 'canton', 'partido'],
        threshold: 0.32,
        ignoreLocation: true,
      }),
    [gads],
  );
  const provincias = useMemo(
    () => [...new Set(gads.map((g) => g.provincia))].sort(),
    [gads],
  );

  const lista = useMemo(() => {
    let out: Gad[] = q.trim() ? fuse.search(q).map((r) => r.item) : [...gads];
    if (tipo !== 'TODOS') out = out.filter((g) => g.tipo === tipo);
    if (provincia !== 'TODAS') out = out.filter((g) => g.provincia === provincia);
    if (!q.trim()) out.sort((a, b) => b.ingel - a.ingel);
    return out;
  }, [q, tipo, provincia, gads, fuse]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          Ranking Nacional INGEL
        </h1>
        <p className="mt-2 text-lg text-slate-600">
          Los gobiernos locales del Ecuador ordenados por el Índice Nacional de Gestión Local.
        </p>
      </header>

      <DataBoundary loading={isLoading} error={error}>
        <Card className="mb-6">
          <div className="grid gap-3 md:grid-cols-3">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por GAD, autoridad, cantón o partido…"
              aria-label="Buscar en el ranking"
              className="rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
            />
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as typeof tipo)}
              aria-label="Filtrar por tipo de GAD"
              className="rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
            >
              <option value="TODOS">Todos los GADs</option>
              <option value="MUNICIPAL">Solo cantones</option>
              <option value="PROVINCIAL">Solo prefecturas</option>
            </select>
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              aria-label="Filtrar por provincia"
              className="rounded-lg border border-slate-300 px-4 py-2.5 outline-none transition focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
            >
              <option value="TODAS">Todas las provincias</option>
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-3 text-xs text-muted" aria-live="polite">
            Mostrando <strong>{lista.length}</strong> de {gads.length} GADs.
          </p>
        </Card>

        {lista.length === 0 ? (
          <Card className="py-16 text-center text-slate-500">
            No se encontraron resultados. Ajusta la búsqueda o los filtros.
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">GAD</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">Autoridad</th>
                  <th className="hidden px-4 py-3 text-left sm:table-cell">Provincia</th>
                  <th className="px-4 py-3 text-right">INGEL</th>
                  <th className="px-4 py-3 text-center">Nivel</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((g, i) => (
                  <tr
                    key={g.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`Ver perfil de ${g.nombre}`}
                    onClick={() => navigate(`/gad/${g.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/gad/${g.id}`);
                      }
                    }}
                    className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50 focus-visible:bg-slate-50"
                  >
                    <td className="px-4 py-3 tabular-nums text-slate-400">
                      {q.trim() ? '·' : i + 1}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {g.nombre}
                      <div className="text-xs text-muted sm:hidden">{g.provincia}</div>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{g.autoridad}</td>
                    <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{g.provincia}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-display font-extrabold text-sigel-primary">
                        {g.ingel.toFixed(1)}
                      </span>
                      <span className="ml-2 inline-block h-1.5 w-14 overflow-hidden rounded-full bg-slate-200 align-middle">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${Math.min(100, g.ingel)}%`,
                            background: colorPorIngel(g.ingel),
                          }}
                        />
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-2">
                        <Badge nivel={g.nivel} />
                        <SemaforoDot semaforo={g.semaforo} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataBoundary>
    </div>
  );
}
