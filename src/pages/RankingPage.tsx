import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Fuse from 'fuse.js';
import { useSigelData } from '@/hooks/useSigelData';
import { useRankingDinamico, useRecalcularRankings } from '@/features/ranking';
import { useProfile, esStaff } from '@/hooks/useProfile';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Badge, Card, DataBoundary, SemaforoDot } from '@/components/ui';
import { colorPorIngel } from '@/lib/colores';
import type { Gad } from '@/types/sigel';
import type { Nivel, Semaforo } from '@/evaluation-engine/types';

const PERIODO = '2024';

type FuenteRanking = 'persistido' | 'demo' | 'sin-supabase';

interface FilaRanking {
  gad: Gad;
  ingel: number;
  nivel: Nivel;
  semaforo: Semaforo;
  posicion: number | null;
}

export function RankingPage() {
  const { data, isLoading, error } = useSigelData();
  const { data: rankingsDb = [], isLoading: cargandoDb } = useRankingDinamico(PERIODO);
  const { data: profile } = useProfile();
  const recalcular = useRecalcularRankings(PERIODO);
  const [q, setQ] = useState('');
  const [tipo, setTipo] = useState<'TODOS' | 'MUNICIPAL' | 'PROVINCIAL'>('TODOS');
  const [provincia, setProvincia] = useState('TODAS');
  const navigate = useNavigate();

  const gads = useMemo(() => data?.gads ?? [], [data]);

  const fuente: FuenteRanking = !isSupabaseConfigured
    ? 'sin-supabase'
    : rankingsDb.length > 0
      ? 'persistido'
      : 'demo';

  const filas = useMemo<FilaRanking[]>(() => {
    if (fuente !== 'persistido') {
      return gads.map((g) => ({
        gad: g,
        ingel: g.ingel,
        nivel: g.nivel,
        semaforo: g.semaforo,
        posicion: null,
      }));
    }
    const porId = new Map(gads.map((g) => [g.id, g]));
    return rankingsDb
      .map((r) => {
        const g = porId.get(r.gad_id);
        if (!g) return null;
        return {
          gad: g,
          ingel: Number(r.score_total),
          nivel: r.nivel as Nivel,
          semaforo: r.semaforo as Semaforo,
          posicion: r.posicion,
        };
      })
      .filter((x): x is FilaRanking => x !== null);
  }, [fuente, rankingsDb, gads]);

  const fuse = useMemo(
    () =>
      new Fuse(filas, {
        keys: ['gad.nombre', 'gad.autoridad', 'gad.provincia', 'gad.canton', 'gad.partido'],
        threshold: 0.32,
        ignoreLocation: true,
      }),
    [filas],
  );
  const provincias = useMemo(
    () => [...new Set(gads.map((g) => g.provincia))].sort(),
    [gads],
  );

  const lista = useMemo(() => {
    let out: FilaRanking[] = q.trim() ? fuse.search(q).map((r) => r.item) : [...filas];
    if (tipo !== 'TODOS') out = out.filter((f) => f.gad.tipo === tipo);
    if (provincia !== 'TODAS') out = out.filter((f) => f.gad.provincia === provincia);
    if (!q.trim()) {
      out.sort((a, b) => {
        if (a.posicion != null && b.posicion != null) return a.posicion - b.posicion;
        return b.ingel - a.ingel;
      });
    }
    return out;
  }, [q, tipo, provincia, filas, fuse]);

  const staff = esStaff(profile?.rol);
  const recalcMsg = recalcular.isSuccess
    ? `Recalculado · ${recalcular.data?.length ?? 0} GADs procesados.`
    : recalcular.isError
      ? `Error: ${recalcular.error instanceof Error ? recalcular.error.message : 'desconocido'}`
      : null;

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
        <FuenteBadge fuente={fuente} periodo={PERIODO} cargando={cargandoDb} />

        {fuente === 'demo' && staff && (
          <Card className="mb-4 border-l-4 border-l-amber-400 bg-amber-50">
            <p className="text-sm text-amber-900">
              Aún no se ha calculado el ranking persistido para el período <strong>{PERIODO}</strong>.
              Como miembro del equipo, puedes generarlo ahora desde las mediciones cargadas.
            </p>
          </Card>
        )}

        {staff && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => recalcular.mutate()}
              disabled={recalcular.isPending || !isSupabaseConfigured}
              className="rounded-lg bg-sigel-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sigel-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {recalcular.isPending ? 'Recalculando…' : `Recalcular ranking ${PERIODO}`}
            </button>
            {recalcMsg && (
              <span
                role="status"
                aria-live="polite"
                className={`text-sm ${recalcular.isError ? 'text-rose-700' : 'text-emerald-700'}`}
              >
                {recalcMsg}
              </span>
            )}
          </div>
        )}

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
            Mostrando <strong>{lista.length}</strong> de {filas.length} GADs.
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
                {lista.map((f, i) => {
                  const g = f.gad;
                  const pos = !q.trim() ? f.posicion ?? i + 1 : null;
                  return (
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
                        {pos ?? '·'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {g.nombre}
                        <div className="text-xs text-muted sm:hidden">{g.provincia}</div>
                      </td>
                      <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{g.autoridad}</td>
                      <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{g.provincia}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-display font-extrabold text-sigel-primary">
                          {f.ingel.toFixed(1)}
                        </span>
                        <span className="ml-2 inline-block h-1.5 w-14 overflow-hidden rounded-full bg-slate-200 align-middle">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${Math.min(100, f.ingel)}%`,
                              background: colorPorIngel(f.ingel),
                            }}
                          />
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-2">
                          <Badge nivel={f.nivel} />
                          <SemaforoDot semaforo={f.semaforo} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DataBoundary>
    </div>
  );
}

function FuenteBadge({
  fuente,
  periodo,
  cargando,
}: {
  fuente: FuenteRanking;
  periodo: string;
  cargando: boolean;
}) {
  if (cargando && fuente !== 'sin-supabase') {
    return (
      <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
        Cargando ranking persistido…
      </div>
    );
  }
  const cfg = {
    persistido: {
      txt: `Datos persistidos · período ${periodo}`,
      cls: 'bg-emerald-100 text-emerald-800',
      dot: 'bg-emerald-500',
    },
    demo: {
      txt: 'Datos demo sintéticos · sin recálculo aún',
      cls: 'bg-slate-100 text-slate-700',
      dot: 'bg-slate-400',
    },
    'sin-supabase': {
      txt: 'No conectado a Supabase · datos demo',
      cls: 'bg-amber-100 text-amber-800',
      dot: 'bg-amber-500',
    },
  }[fuente];
  return (
    <div
      className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${cfg.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.txt}
    </div>
  );
}
