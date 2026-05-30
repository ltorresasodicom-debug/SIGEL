import { useMemo, useState } from 'react';
import {
  DIMENSIONES_CIUDADANAS,
  agregarDimension,
  calcularIngel,
  calcularIri,
  clasificarNivel,
  semaforizar,
} from '@/evaluation-engine';
import type { DimensionCodigo, Nivel, Semaforo } from '@/evaluation-engine/types';
import { useSigelData } from '@/hooks/useSigelData';
import { filterByQuery } from '@/lib/fuzzy';
import { colorPorIngel } from '@/lib/colores';
import {
  borrarEvaluacionLocal,
  guardarEvaluacionLocal,
  obtenerEvaluaciones,
  type EvaluacionGuardada,
} from '@/services/evaluaciones-local';
import type { DimScoreMap } from '@/types/sigel';
import { Badge, Card, DataBoundary, ProgressBar, SemaforoDot } from '@/components/ui';
import { Button } from '@/components/Button';
import { LikertScale } from '@/components/LikertScale';
import { useGuardarEvaluacion } from '@/features/evaluation';
import { isSupabaseConfigured } from '@/lib/supabase';

const NDIM = DIMENSIONES_CIUDADANAS.length;
const LAST = NDIM + 1;

export function EvaluarPage() {
  const { data, isLoading, error } = useSigelData();
  const [paso, setPaso] = useState(0);
  const [gadId, setGadId] = useState('');
  const [filtro, setFiltro] = useState('');
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [guardadas, setGuardadas] = useState<EvaluacionGuardada[]>(() => obtenerEvaluaciones());
  const [guardada, setGuardada] = useState(false);
  const [guardadaEnNube, setGuardadaEnNube] = useState(false);
  const guardarRemote = useGuardarEvaluacion();

  const gads = useMemo(() => data?.gads ?? [], [data]);
  const gad = gads.find((g) => g.id === gadId);

  const listaGads = useMemo(() => {
    const base = [...gads].sort((a, b) => a.nombre.localeCompare(b.nombre));
    return filterByQuery(base, ['nombre', 'provincia', 'autoridad'], filtro).slice(0, 60);
  }, [gads, filtro]);

  const resultado = useMemo(() => {
    const dims = Object.fromEntries(
      DIMENSIONES_CIUDADANAS.map((d) => [d.id, agregarDimension(d, respuestas)]),
    ) as DimScoreMap;
    const ingel = calcularIngel(dims);
    return {
      dims,
      ingel,
      nivel: (clasificarNivel(ingel) ?? 'CRITICO') as Nivel,
      semaforo: (semaforizar(ingel) ?? 'ROJO') as Semaforo,
      iri: calcularIri({
        transparencia: dims.transparencia,
        finanzas: dims.finanzas,
        endeudamiento: 100 - dims.finanzas,
        corrupcion: 100 - dims.legitimidad,
        participacion: dims.participacion,
      }),
    };
  }, [respuestas]);

  function avanzarDimension(n: number) {
    const dim = DIMENSIONES_CIUDADANAS[n - 1];
    if (!dim) return;
    if (dim.preguntas.some((q) => respuestas[q.id] == null)) {
      setErrMsg('Responde las 3 preguntas antes de continuar.');
      return;
    }
    setErrMsg('');
    setPaso(n === NDIM ? LAST : n + 1);
  }

  async function guardar() {
    // Local siempre: red de seguridad para "Mis evaluaciones" y modo offline.
    guardarEvaluacionLocal({
      gadId,
      respuestas: { ...respuestas },
      dims: resultado.dims,
      ingel: resultado.ingel,
      nivel: resultado.nivel,
      semaforo: resultado.semaforo,
      iri: resultado.iri,
      comentario,
    });
    setGuardadas(obtenerEvaluaciones());

    // Nube si Supabase está configurado; si falla, el local ya cubrió.
    let enNube = false;
    if (isSupabaseConfigured) {
      try {
        await guardarRemote.mutateAsync({
          gad_id: gadId,
          user_id: null,
          respuestas: { ...respuestas },
          dims: resultado.dims,
          ingel: resultado.ingel,
          nivel: resultado.nivel,
          semaforo: resultado.semaforo,
          iri: resultado.iri,
          comentario: comentario || null,
        });
        enNube = true;
      } catch {
        // Silencioso: el guardado local es la red de seguridad.
      }
    }
    setGuardadaEnNube(enNube);
    setGuardada(true);
  }

  function reiniciar() {
    setPaso(0);
    setGadId('');
    setFiltro('');
    setRespuestas({});
    setComentario('');
    setGuardada(false);
    setGuardadaEnNube(false);
    setErrMsg('');
  }

  function eliminar(id: string) {
    if (!confirm('¿Eliminar esta evaluación?')) return;
    borrarEvaluacionLocal(id);
    setGuardadas(obtenerEvaluaciones());
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          📋 Crea tu evaluación
        </h1>
        <p className="mt-2 text-lg leading-relaxed text-slate-600">
          Evalúa a tu gobierno local en 8 temas con preguntas simples del día a día. Tus respuestas
          se guardan solo en tu navegador.
        </p>
      </header>

      <DataBoundary loading={isLoading} error={error}>
        {/* Paso 0 — elegir GAD */}
        {paso === 0 && (
          <>
            <Card>
              <h2 className="mb-1 font-display text-xl font-bold">
                ¿A qué gobierno local vas a evaluar?
              </h2>
              <p className="mb-4 text-sm text-slate-500">Busca tu cantón o provincia.</p>
              <input
                type="search"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Escribe un nombre: «Quito», «Manabí»…"
                className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
              />
              <label htmlFor="ev-gad" className="sr-only">
                Gobierno local
              </label>
              <select
                id="ev-gad"
                size={8}
                value={gadId}
                onChange={(e) => setGadId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sigel-primary"
              >
                {listaGads.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre} — {g.autoridad}
                  </option>
                ))}
              </select>
              {errMsg && paso === 0 && <p className="mt-2 text-sm text-red-700">{errMsg}</p>}
            </Card>
            <Button
              variant="accent"
              size="lg"
              fullWidth
              className="mt-4"
              onClick={() => {
                if (!gadId) {
                  setErrMsg('Elige un gobierno local para comenzar.');
                  return;
                }
                setErrMsg('');
                setPaso(1);
              }}
            >
              Comenzar evaluación →
            </Button>

            <section className="mt-10">
              <h2 className="mb-3 font-display text-xl font-bold">Mis evaluaciones guardadas</h2>
              {guardadas.length === 0 ? (
                <Card className="text-center text-slate-500">
                  Aún no has guardado evaluaciones.
                </Card>
              ) : (
                <div className="space-y-3">
                  {[...guardadas].reverse().map((e) => {
                    const g = gads.find((x) => x.id === e.gadId);
                    return (
                      <Card key={e.id} className="flex flex-wrap items-center gap-3">
                        <div className="min-w-[200px] flex-1">
                          <div className="font-semibold">{g ? g.nombre : 'GAD'}</div>
                          <div className="text-xs text-slate-500">
                            {new Date(e.fecha).toLocaleString('es-EC')} · INGEL{' '}
                            <strong className="text-sigel-primary">{e.ingel.toFixed(1)}</strong>
                          </div>
                        </div>
                        <Badge nivel={e.nivel} />
                        <button
                          type="button"
                          onClick={async () => {
                            const { exportarEvaluacionPdf } = await import('@/lib/pdf');
                            exportarEvaluacionPdf(e, g);
                          }}
                          className="rounded bg-sigel-primary px-3 py-1.5 text-sm font-semibold text-white"
                        >
                          📄 PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(e.id)}
                          aria-label="Eliminar evaluación"
                          className="rounded px-2 py-1.5 text-red-600 hover:bg-red-50"
                        >
                          🗑️
                        </button>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* Pasos 1–8 — dimensiones */}
        {paso >= 1 && paso <= NDIM && <PasoDimension
          indice={paso}
          respuestas={respuestas}
          onResponder={(qid, v) => setRespuestas((r) => ({ ...r, [qid]: v }))}
          onAtras={() => { setErrMsg(''); setPaso(paso - 1); }}
          onSiguiente={() => avanzarDimension(paso)}
          error={errMsg}
        />}

        {/* Paso 9 — resultados */}
        {paso === LAST && (
          <>
            <Card className="text-center">
              <div className="text-xs text-slate-500">Tu evaluación de</div>
              <div className="font-display text-xl font-bold">{gad?.nombre}</div>
              <div className="mt-2 font-display text-6xl font-extrabold tabular-nums text-sigel-primary">
                {resultado.ingel.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500">INGEL ciudadano (0–100)</div>
              <div className="mt-2 flex items-center justify-center gap-3">
                <Badge nivel={resultado.nivel} />
                <SemaforoDot semaforo={resultado.semaforo} label />
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Índice de riesgo institucional (IRI): <strong>{resultado.iri.toFixed(1)}</strong>
              </div>
            </Card>

            <Card className="mt-4">
              <h2 className="mb-3 font-display font-bold">Desglose por dimensión</h2>
              <div className="space-y-4">
                {DIMENSIONES_CIUDADANAS.map((d) => {
                  const v = resultado.dims[d.id as DimensionCodigo];
                  const interp = v >= 60 ? d.interpretacionScore.alta : d.interpretacionScore.baja;
                  return (
                    <div key={d.id}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{d.tituloCiudadano}</span>
                        <span className="font-display font-bold tabular-nums">{v.toFixed(1)}</span>
                      </div>
                      <ProgressBar value={v} color={colorPorIngel(v)} />
                      <p className="mt-1 text-xs text-slate-500">{interp}</p>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="mt-4">
              <label htmlFor="ev-comentario" className="mb-2 block font-semibold">
                Comentario (opcional)
              </label>
              <textarea
                id="ev-comentario"
                rows={3}
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
              />
            </Card>

            {guardada ? (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-sm font-medium text-green-800">
                {guardadaEnNube
                  ? '✓ Evaluación guardada en la nube y en este navegador.'
                  : '✓ Evaluación guardada en tu navegador.'}
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                className="mt-4 text-lg"
                onClick={guardar}
                disabled={guardarRemote.isPending}
              >
                {guardarRemote.isPending ? 'Guardando…' : '💾 Guardar mi evaluación'}
              </Button>
            )}
            <div className="mt-2 flex gap-2">
              <Button variant="secondary" onClick={() => setPaso(NDIM)}>
                ← Atrás
              </Button>
              <Button variant="secondary" className="flex-1" onClick={reiniciar}>
                Evaluar otro GAD
              </Button>
            </div>
          </>
        )}
      </DataBoundary>
    </div>
  );
}

function PasoDimension({
  indice,
  respuestas,
  onResponder,
  onAtras,
  onSiguiente,
  error,
}: {
  indice: number;
  respuestas: Record<string, number>;
  onResponder: (qid: string, v: number) => void;
  onAtras: () => void;
  onSiguiente: () => void;
  error: string;
}) {
  const dim = DIMENSIONES_CIUDADANAS[indice - 1];
  if (!dim) return null;
  const pct = Math.round((indice / NDIM) * 100);

  return (
    <>
      <div className="mb-5">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Dimensión {indice} de {NDIM}</span>
          <span>{pct}%</span>
        </div>
        <ProgressBar value={pct} />
      </div>
      <Card>
        <span className="text-xs uppercase tracking-wider text-slate-400">{dim.dimension}</span>
        <h2 className="font-display text-2xl font-bold tracking-tight">{dim.tituloCiudadano}</h2>
        <p className="mt-2 leading-relaxed text-slate-600">{dim.descripcionCorta}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-sigel-primary">
            Ver explicación completa
          </summary>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{dim.descripcionExpandida}</p>
        </details>
        <p className="mt-3 rounded border-l-2 border-sigel-accent bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <strong>Ejemplo:</strong> {dim.ejemplo}
        </p>
        <div className="mt-2 divide-y divide-slate-100">
          {dim.preguntas.map((q, i) => (
            <div key={q.id} className="py-4">
              <div className="flex gap-2 text-sm font-medium">
                <span className="grid h-6 w-6 flex-none place-items-center rounded bg-slate-100 text-xs font-bold text-sigel-primary">
                  {i + 1}
                </span>
                <span>{q.texto}</span>
              </div>
              <p className="mb-1 mt-1.5 text-xs text-slate-500">{q.helperText}</p>
              <LikertScale
                value={respuestas[q.id] ?? null}
                onChange={(v) => onResponder(q.id, v)}
                ariaLabel={q.texto}
              />
            </div>
          ))}
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </Card>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={onAtras}>
          ← Atrás
        </Button>
        <Button variant="primary" className="flex-1" onClick={onSiguiente}>
          {indice === NDIM ? 'Ver resultados →' : 'Siguiente →'}
        </Button>
      </div>
    </>
  );
}
