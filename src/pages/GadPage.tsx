import { Link, useParams } from 'react-router-dom';
import { useSigelData } from '@/hooks/useSigelData';
import { DIMENSIONES } from '@/evaluation-engine';
import { Badge, Card, DataBoundary, ProgressBar, SemaforoDot } from '@/components/ui';
import { Button } from '@/components/Button';
import { colorPorIngel } from '@/lib/colores';
import type { IndicadorDataset } from '@/types/sigel';

function PanelInec({ titulo, sigla, d }: { titulo: string; sigla: string; d: IndicadorDataset | null }) {
  if (!d) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="font-display font-semibold">{titulo}</div>
        <p className="mt-2 text-sm text-slate-500">Sin reporte INEC para este cantón.</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="font-display font-semibold">{titulo}</div>
          <div className="text-xs text-slate-500">{sigla}</div>
        </div>
        <div
          className="font-display text-3xl font-extrabold tabular-nums"
          style={{ color: colorPorIngel(d.indice ?? 0) }}
        >
          {d.indice != null ? d.indice.toFixed(1) : '—'}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {(
          [
            ['Capacidad institucional', d.institucional],
            ['Operación del servicio', d.operacion],
          ] as const
        ).map(([label, v]) =>
          v == null ? null : (
            <div key={label}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-display font-bold tabular-nums">{v.toFixed(1)}</span>
              </div>
              <ProgressBar value={v} color={colorPorIngel(v)} />
            </div>
          ),
        )}
      </div>
    </div>
  );
}

export function GadPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useSigelData();
  const gad = data?.gads.find((g) => g.id === id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <DataBoundary loading={isLoading} error={error}>
        {!gad ? (
          <div className="py-16 text-center">
            <h1 className="font-display text-2xl font-bold">GAD no encontrado</h1>
            <Link to="/ranking" className="mt-3 inline-block font-semibold text-sigel-primary">
              ← Volver al ranking
            </Link>
          </div>
        ) : (
          <>
            <Link to="/ranking" className="text-sm font-semibold text-sigel-primary hover:underline">
              ← Volver al ranking
            </Link>

            <Card className="mt-4 grid items-center gap-6 md:grid-cols-3">
              <div className="md:col-span-2">
                <span className="text-xs uppercase tracking-widest text-slate-500">{gad.tipo}</span>
                <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">
                  {gad.nombre}
                </h1>
                <p className="mt-1 text-slate-600">{gad.provincia}</p>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500">Autoridad</div>
                    <div className="font-semibold">{gad.autoridad}</div>
                    <div className="text-xs text-slate-500">{gad.cargo}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-slate-500">
                      Partido / Coalición
                    </div>
                    <div className="font-semibold">{gad.partido || '—'}</div>
                    {gad.porcentajeVotos != null && (
                      <div className="text-xs text-slate-500">
                        {(gad.porcentajeVotos * 100).toFixed(1)}% en elecciones 2023
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-6 text-center">
                <div className="text-xs uppercase tracking-widest text-slate-500">INGEL</div>
                <div className="mt-1 font-display text-6xl font-extrabold tabular-nums text-sigel-primary">
                  {gad.ingel.toFixed(1)}
                </div>
                <div className="mt-2 flex items-center justify-center gap-2">
                  <Badge nivel={gad.nivel} />
                  <SemaforoDot semaforo={gad.semaforo} />
                </div>
              </div>
            </Card>

            <Card className="mt-5">
              <h2 className="mb-4 font-display text-xl font-bold">Perfil por dimensión</h2>
              <div className="space-y-4">
                {DIMENSIONES.map((d) => {
                  const v = gad.dims[d.codigo];
                  return (
                    <div key={d.codigo}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: d.color }}
                          />
                          <span className="font-medium">{d.nombre}</span>
                          <span className="text-xs text-slate-400">
                            ({(d.peso * 100).toFixed(0)}%)
                          </span>
                        </span>
                        <span className="font-display font-bold tabular-nums">{v.toFixed(1)}</span>
                      </div>
                      <ProgressBar value={v} color={d.color} />
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="mt-5">
              <h2 className="mb-3 font-display text-xl font-bold">Índices complementarios</h2>
              <div className="grid grid-cols-2 gap-4 text-center md:grid-cols-4">
                {(
                  [
                    ['INGEL', gad.ingel],
                    ['IRI · riesgo', gad.iri],
                    ['Transp. digital', (gad.dims.transparencia + gad.dims.innovacion) / 2],
                    [
                      'Calidad democrática',
                      (gad.dims.legitimidad + gad.dims.participacion + gad.dims.transparencia) / 3,
                    ],
                  ] as const
                ).map(([label, v]) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-4">
                    <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
                    <div className="font-display text-2xl font-bold tabular-nums">
                      {v.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {gad.indicadores && (
              <Card className="mt-5">
                <h2 className="font-display text-xl font-bold">Indicadores oficiales INEC 2024</h2>
                <p className="mb-5 mt-1 text-sm text-slate-500">
                  Gestión de servicios municipales según el Censo de Información Ambiental Económica
                  en GADM 2024. Complementan el INGEL; no lo modifican.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <PanelInec
                    titulo="Residuos sólidos"
                    sigla="GIRS · gestión integral"
                    d={gad.indicadores.girs}
                  />
                  <PanelInec
                    titulo="Agua potable y alcantarillado"
                    sigla="APA · cobertura y operación"
                    d={gad.indicadores.apa}
                  />
                </div>
              </Card>
            )}

            <div className="mt-6 text-center">
              <Button to="/evaluar" variant="accent" size="lg">
                📋 Crear mi evaluación ciudadana
              </Button>
            </div>
          </>
        )}
      </DataBoundary>
    </div>
  );
}
