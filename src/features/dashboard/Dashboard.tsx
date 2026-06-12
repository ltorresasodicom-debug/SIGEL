// SIGEL — Dashboard principal (panorama nacional data-driven).
import { Link } from 'react-router-dom';
import { useSigelData } from '@/hooks/useSigelData';
import { DIMENSIONES } from '@/evaluation-engine';
import type { Nivel, Semaforo } from '@/evaluation-engine/types';
import { useRankingDinamico } from '@/features/ranking';
import { Badge, Card, DataBoundary, SemaforoDot, Stat } from '@/components/ui';

interface FilaTop {
  id: string;
  nombre: string;
  provincia: string;
  autoridad: string;
  ingel: number;
  nivel: Nivel;
  semaforo: Semaforo;
}

const PERIODO_TOP = '2024';

/**
 * Panel principal de SIGEL: consolida los KPIs institucionales y el Top 5 de
 * gobiernos locales mejor evaluados. Es autónomo (carga sus propios datos) y
 * maneja explícitamente los estados carga → vacío → error → contenido.
 *
 * El Top 5 prefiere `public.rankings` (motor real combinando demo + INEC + DPE);
 * si Supabase no responde o no hay datos, cae al cálculo sintético del cliente.
 */
export function Dashboard() {
  const { data, isLoading, error } = useSigelData();
  const { data: rankingReal } = useRankingDinamico(PERIODO_TOP);
  const stats = data?.stats;
  const sinDatos = data != null && data.gads.length === 0;

  const { top5, fuenteReal } = (() => {
    if (!data) return { top5: [] as FilaTop[], fuenteReal: false };
    if (rankingReal && rankingReal.length >= 5) {
      const byId = new Map(data.gads.map((g) => [g.id, g]));
      const filas: FilaTop[] = [];
      for (const r of rankingReal) {
        const g = byId.get(r.gad_id);
        if (!g) continue;
        filas.push({
          id: g.id,
          nombre: g.nombre,
          provincia: g.provincia,
          autoridad: g.autoridad,
          ingel: Number(r.score_total),
          nivel: r.nivel as Nivel,
          semaforo: r.semaforo as Semaforo,
        });
        if (filas.length === 5) break;
      }
      if (filas.length === 5) return { top5: filas, fuenteReal: true };
    }
    const sintetico: FilaTop[] = [...data.gads]
      .sort((a, b) => b.ingel - a.ingel)
      .slice(0, 5)
      .map((g) => ({
        id: g.id,
        nombre: g.nombre,
        provincia: g.provincia,
        autoridad: g.autoridad,
        ingel: g.ingel,
        nivel: g.nivel,
        semaforo: g.semaforo,
      }));
    return { top5: sintetico, fuenteReal: false };
  })();

  return (
    <section aria-labelledby="dashboard-titulo" className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dashboard-titulo" className="font-display text-3xl font-bold tracking-tight">
            Panorama nacional
          </h2>
          <p className="mt-1 text-slate-600">
            Indicadores institucionales y los gobiernos locales mejor evaluados del país.
          </p>
        </div>
        <Link to="/ranking" className="font-semibold text-sigel-primary hover:underline">
          Ver ranking completo →
        </Link>
      </div>

      <DataBoundary loading={isLoading} error={error}>
        {sinDatos ? (
          <Card className="py-16 text-center">
            <div className="text-4xl" aria-hidden="true">
              📭
            </div>
            <h3 className="mt-3 font-display text-xl font-bold">Aún no hay datos disponibles</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Cuando se carguen los gobiernos locales evaluados, aquí verás los indicadores
              nacionales y el ranking destacado.
            </p>
            <Link
              to="/evaluar"
              className="mt-5 inline-block font-semibold text-sigel-primary hover:underline"
            >
              Crear la primera evaluación →
            </Link>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat value={stats?.municipales ?? '—'} label="Alcaldías" />
              <Stat value={stats?.provinciales ?? '—'} label="Prefecturas" />
              <Stat value={stats ? stats.promedio.toFixed(1) : '—'} label="INGEL promedio" />
              <Stat value={DIMENSIONES.length} label="Dimensiones" />
            </div>

            <div className="mt-10">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="font-display text-xl font-bold tracking-tight">Top 5 nacional</h3>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    fuenteReal
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}
                  title={
                    fuenteReal
                      ? `Calculado por el motor INGEL sobre mediciones reales del período ${PERIODO_TOP}.`
                      : 'Vista preliminar con scores sintéticos. Aplica los seeds y recalcula el ranking para ver datos oficiales.'
                  }
                >
                  {fuenteReal ? `datos oficiales ${PERIODO_TOP}` : 'demo sintético'}
                </span>
              </div>
              <ol className="space-y-2.5">
                {top5.map((g, i) => (
                  <li key={g.id}>
                    <Link
                      to={`/gad/${g.id}`}
                      className="flex items-center gap-4 rounded-xl border border-transparent bg-slate-50 p-4 transition hover:border-slate-200 hover:bg-white hover:shadow-md"
                    >
                      <span
                        className={`grid h-10 w-10 place-items-center rounded-lg font-display text-lg font-extrabold ${
                          i === 0
                            ? 'bg-sigel-accent text-white'
                            : 'border border-slate-200 bg-white text-sigel-primary'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{g.nombre}</div>
                        <div className="truncate text-xs text-slate-500">
                          {g.provincia} · {g.autoridad}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-2xl font-extrabold tabular-nums text-sigel-primary">
                          {g.ingel.toFixed(1)}
                        </div>
                        <Badge nivel={g.nivel} />
                      </div>
                      <SemaforoDot semaforo={g.semaforo} />
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </DataBoundary>
    </section>
  );
}
