import { useMemo, useState } from 'react';
import { Badge, Card, ProgressBar } from '@/components/ui';
import { Button } from '@/components/Button';
import { LikertScale } from '@/components/LikertScale';
import type { Nivel } from '@/evaluation-engine/types';

// Modelo de suma ponderada (Teoría del Comportamiento Planificado +
// Inteligencia Afectiva + Marketing Político).
interface Variable {
  n: string;
  w: number;
  neg: boolean;
  qs: number[];
}
const V: Record<string, Variable> = {
  CCP: { n: 'Calidad del contenido', w: 0.22, neg: false, qs: [0, 1] },
  CP: { n: 'Confianza política', w: 0.18, neg: false, qs: [2, 3] },
  PCE: { n: 'Conexión emocional', w: 0.13, neg: false, qs: [4, 5] },
  PACP: { n: 'Autenticidad percibida', w: 0.13, neg: false, qs: [6, 7] },
  MC: { n: 'Manipulación percibida', w: 0.09, neg: true, qs: [8] },
  EPI: { n: 'Eficacia política', w: 0.05, neg: false, qs: [9] },
  EXPOS: { n: 'Exposición digital', w: 0.08, neg: false, qs: [10] },
  NS: { n: 'Normas subjetivas', w: 0.07, neg: false, qs: [11] },
  PP: { n: 'Problemas percibidos', w: 0.05, neg: false, qs: [12] },
};

interface Segmento {
  l: string;
  tono: { bg: string; br: string; fg: string };
  d: string;
}
const VERDE = { bg: '#DCFCE7', br: '#B8E6C8', fg: '#14532D' };
const INFO = { bg: '#DBEAFE', br: '#B8D4F5', fg: '#0C447C' };
const ACC = { bg: '#FFEDD5', br: '#FCD9B0', fg: '#9A3412' };
const AMA = { bg: '#FEF3C7', br: '#FCD34D', fg: '#854D0E' };
const ROJ = { bg: '#FEE2E2', br: '#FCA5A5', fg: '#991B1B' };
const SLA = { bg: '#F1F5F9', br: '#CBD5E1', fg: '#334155' };
const SEGS: Record<string, Segmento> = {
  convencido: { l: 'Votante convencido', tono: VERDE, d: 'Disposición muy favorable: confías en sus propuestas, te conectas emocionalmente y no percibes manipulación.' },
  racional: { l: 'Votante racional', tono: INFO, d: 'Tu apoyo se basa en propuestas y confianza más que en emoción. Decisión sólida y difícil de cambiar.' },
  emocional: { l: 'Votante emocional', tono: ACC, d: 'Te identificas emocionalmente, pero quizás no conoces bien sus propuestas. Revisa su plan de gobierno.' },
  indeciso: { l: 'Votante indeciso', tono: AMA, d: 'Relación moderada: ni te convence del todo ni lo rechazas. Busca más información antes de decidir.' },
  critico: { l: 'Votante crítico', tono: ROJ, d: 'Percibes manipulación o falta de autenticidad; tu desconfianza es alta.' },
  desconectado: { l: 'Votante desconectado', tono: SLA, d: 'No sientes conexión real ni racional ni emocional. Quizás valga explorar otras opciones.' },
};

interface Bloque {
  titulo: string;
  paso: number;
  rango: [number, number];
  items: { texto: string; helper: string }[];
}
const BLOQUES: Bloque[] = [
  {
    titulo: 'Propuestas y confianza',
    paso: 3,
    rango: [0, 3],
    items: [
      { texto: 'Las propuestas del candidato/a son fáciles de entender', helper: 'Sabes qué quiere hacer, sin vaguedad.' },
      { texto: 'Sus propuestas abordan los temas que importan en tu comunidad', helper: 'Vialidad, agua, empleo, seguridad de tu cantón.' },
      { texto: 'Crees que cumplirá lo que promete si gana', helper: 'Hay propuestas concretas y realizables.' },
      { texto: 'Le tienes confianza como líder político', helper: 'Persona seria, capaz y comprometida.' },
    ],
  },
  {
    titulo: 'Vínculo emocional y credibilidad',
    paso: 4,
    rango: [4, 8],
    items: [
      { texto: 'Sientes que te representa y entiende lo que vives', helper: 'Conoce los problemas reales de gente como tú.' },
      { texto: 'Te genera entusiasmo pensar en que gane', helper: 'Sientes esperanza o motivación.' },
      { texto: 'Se muestra como una persona honesta y transparente', helper: 'No oculta información ni cambia su discurso.' },
      { texto: 'Lo que dice y lo que hace van de la mano', helper: 'Mensaje coherente con su conducta.' },
      { texto: 'Usa el miedo, el odio o exageraciones para convencer', helper: 'Asusta con el caos, ataca con mentiras o exagera.' },
    ],
  },
  {
    titulo: 'Tu contexto personal',
    paso: 5,
    rango: [9, 12],
    items: [
      { texto: 'Te sientes capaz de entender la política local y decidir', helper: 'Puedes comparar candidatos y propuestas.' },
      { texto: 'Has visto o escuchado sobre este candidato/a recientemente', helper: 'Te ha llegado información suya.' },
      { texto: 'Las personas que más te importan lo apoyarían', helper: 'Tu familia y allegados lo ven bien.' },
      { texto: 'Habla de los problemas que más te preocupan', helper: 'Seguridad, empleo, economía u otros urgentes.' },
    ],
  },
];

const SELECT_CAMPOS = [
  { id: 'edad', label: 'Rango de edad', opts: ['18 a 25', '26 a 35', '36 a 45', '46 a 60', 'Más de 60'] },
  { id: 'educ', label: 'Nivel de educación', opts: ['Primaria', 'Secundaria', 'Técnica', 'Universitaria', 'Posgrado'] },
  { id: 'genero', label: 'Género', opts: ['Masculino', 'Femenino', 'Otro / Prefiero no decir'] },
  { id: 'ingreso', label: 'Ingreso mensual del hogar', opts: ['Menos de $450', '$450 a $800', '$800 a $1.500', '$1.500 a $3.000', 'Más de $3.000'] },
] as const;

function segmentoDe(vs: Record<string, number>): string {
  const { CCP, CP, PCE, MC } = vs as Record<'CCP' | 'CP' | 'PCE' | 'MC', number>;
  if (CP >= 0.65 && CCP >= 0.65 && PCE >= 0.65 && MC <= 0.35) return 'convencido';
  if (CCP >= 0.6 && CP >= 0.55 && PCE < 0.45) return 'racional';
  if (PCE >= 0.6 && CCP < 0.45) return 'emocional';
  if (MC >= 0.6) return 'critico';
  if (CCP < 0.35 && CP < 0.35 && PCE < 0.35) return 'desconectado';
  return 'indeciso';
}

export function CalculadoraPage() {
  const [paso, setPaso] = useState(0);
  const [cname, setCname] = useState('');
  const [cargo, setCargo] = useState('');
  const [datos, setDatos] = useState<Record<string, string>>({});
  const [ans, setAns] = useState<Record<number, number>>({});
  const [err, setErr] = useState('');

  const resultado = useMemo(() => {
    const vs: Record<string, number> = {};
    for (const [k, vv] of Object.entries(V)) {
      const avg = vv.qs.reduce((s, qi) => s + (ans[qi] ?? 0), 0) / vv.qs.length;
      vs[k] = (avg - 1) / 4;
    }
    let raw = 0;
    for (const [k, vv] of Object.entries(V)) {
      const v = vs[k] ?? 0;
      raw += vv.neg ? -(vv.w * v) : vv.w * v;
    }
    const pct = Math.max(0, Math.min(100, Math.round((raw + 0.09) * 100)));
    return { vs, pct, seg: SEGS[segmentoDe(vs)] ?? SEGS.indeciso! };
  }, [ans]);

  function validarBloque(b: Bloque) {
    for (let i = b.rango[0]; i <= b.rango[1]; i++) {
      if (ans[i] == null) {
        setErr('Responde todas las preguntas antes de continuar.');
        return;
      }
    }
    setErr('');
    setPaso(b.paso === 5 ? 6 : b.paso + 1);
  }

  function reiniciar() {
    setPaso(0);
    setCname('');
    setCargo('');
    setDatos({});
    setAns({});
    setErr('');
  }

  const nivelPct: Nivel =
    resultado.pct <= 30 ? 'CRITICO' : resultado.pct <= 60 ? 'MEDIO' : 'EXCELENTE';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">
          🗳️ Calculadora de intención de voto
        </h1>
        <p className="mt-2 text-lg leading-relaxed text-slate-600">
          Responde 13 preguntas cortas sobre un candidato/a. Tus respuestas no salen de tu
          navegador.
        </p>
      </header>

      {paso === 0 && (
        <>
          <Card>
            <h2 className="mb-3 font-display text-xl font-bold">Cómo funciona</h2>
            <ol className="space-y-2 text-sm text-slate-700">
              {[
                'Indica el candidato/a y el cargo al que aspira.',
                'Ingresa algunos datos para contextualizar.',
                'Responde 13 preguntas en escala 1–5, en tres bloques.',
                'Obtén tu índice de intención de voto y perfil de votante.',
              ].map((t, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-slate-100 text-xs font-bold text-sigel-primary">
                    {i + 1}
                  </span>
                  <span>{t}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Button
            variant="accent"
            size="lg"
            fullWidth
            className="mt-4"
            onClick={() => setPaso(1)}
          >
            Iniciar evaluación →
          </Button>
        </>
      )}

      {paso === 1 && (
        <>
          <Card>
            <h2 className="mb-3 font-display text-xl font-bold">¿A quién vas a evaluar?</h2>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Nombre del candidato/a
            </label>
            <input
              type="text"
              value={cname}
              onChange={(e) => setCname(e.target.value)}
              placeholder="Ej: María García"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sigel-primary focus:ring-2 focus:ring-sigel-primary/40"
            />
            <label className="mb-1 block text-sm font-medium text-slate-600">Cargo al que aspira</label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sigel-primary"
            >
              <option value="">Selecciona…</option>
              {['Alcalde/sa', 'Prefecto/a', 'Concejal/a', 'Consejero/a provincial', 'Otro'].map(
                (o) => (
                  <option key={o}>{o}</option>
                ),
              )}
            </select>
            {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
          </Card>
          <Navegacion
            onAtras={() => setPaso(0)}
            onSiguiente={() => {
              if (!cname.trim()) {
                setErr('Ingresa el nombre del candidato/a.');
                return;
              }
              setErr('');
              setPaso(2);
            }}
          />
        </>
      )}

      {paso === 2 && (
        <>
          <Card>
            <h2 className="mb-3 font-display text-xl font-bold">Cuéntanos sobre ti</h2>
            {SELECT_CAMPOS.map((c) => (
              <div key={c.id} className="mb-3">
                <label className="mb-1 block text-sm font-medium text-slate-600">{c.label}</label>
                <select
                  value={datos[c.id] ?? ''}
                  onChange={(e) => setDatos((d) => ({ ...d, [c.id]: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sigel-primary"
                >
                  <option value="">Selecciona…</option>
                  {c.opts.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
            {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
          </Card>
          <Navegacion
            onAtras={() => setPaso(1)}
            onSiguiente={() => {
              if (SELECT_CAMPOS.some((c) => !datos[c.id])) {
                setErr('Completa todos los campos.');
                return;
              }
              setErr('');
              setPaso(3);
            }}
          />
        </>
      )}

      {BLOQUES.map(
        (b) =>
          paso === b.paso && (
            <div key={b.paso}>
              <div className="mb-5">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Bloque {b.paso - 2} de 3</span>
                  <span>{Math.round(((b.paso - 2) / 3) * 100)}%</span>
                </div>
                <ProgressBar value={((b.paso - 2) / 3) * 100} />
              </div>
              <Card>
                <h2 className="font-display text-xl font-bold">{b.titulo}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Responde pensando en <strong>{cname || 'el/la candidato/a'}</strong>.
                </p>
                <div className="mt-2 divide-y divide-slate-100">
                  {b.items.map((it, i) => {
                    const qi = b.rango[0] + i;
                    return (
                      <div key={qi} className="py-4">
                        <div className="text-sm font-medium">{it.texto}</div>
                        <p className="mb-1 mt-1 text-xs text-slate-500">{it.helper}</p>
                        <LikertScale
                          value={ans[qi] ?? null}
                          onChange={(v) => setAns((a) => ({ ...a, [qi]: v }))}
                          ariaLabel={it.texto}
                        />
                      </div>
                    );
                  })}
                </div>
                {err && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {err}
                  </p>
                )}
              </Card>
              <Navegacion
                onAtras={() => {
                  setErr('');
                  setPaso(b.paso - 1);
                }}
                onSiguiente={() => validarBloque(b)}
                textoSiguiente={b.paso === 5 ? 'Ver resultados →' : 'Siguiente →'}
              />
            </div>
          ),
      )}

      {paso === 6 && (
        <>
          <Card className="text-center">
            <div className="text-xs text-slate-500">Resultado para</div>
            <div className="font-display text-xl font-bold">{cname}</div>
            {cargo && <div className="text-xs text-slate-500">Candidato/a a: {cargo}</div>}
            <div
              className="mt-3 font-display text-6xl font-extrabold tabular-nums"
              style={{ color: resultado.pct <= 30 ? '#DC2626' : resultado.pct <= 60 ? '#F59E0B' : '#16A34A' }}
            >
              {resultado.pct}%
            </div>
            <div className="text-xs text-slate-500">Índice de intención de voto</div>
            <div className="mt-2">
              <Badge nivel={nivelPct} />
            </div>
          </Card>

          <Card
            className="mt-4"
            // estilo del segmento
          >
            <div
              className="rounded-lg p-4"
              style={{ background: resultado.seg.tono.bg, border: `1px solid ${resultado.seg.tono.br}` }}
            >
              <div
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: resultado.seg.tono.fg }}
              >
                Segmento de votante
              </div>
              <div className="font-display text-lg font-bold" style={{ color: resultado.seg.tono.fg }}>
                {resultado.seg.l}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{resultado.seg.d}</p>
            </div>
          </Card>

          <Card className="mt-4">
            <h2 className="mb-3 font-display font-bold">Desglose por variable</h2>
            <div className="space-y-3">
              {Object.entries(V)
                .sort((a, b) => b[1].w - a[1].w)
                .map(([k, vv]) => {
                  const v = resultado.vs[k] ?? 0;
                  const perf = vv.neg ? Math.round((1 - v) * 100) : Math.round(v * 100);
                  return (
                    <div key={k}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="text-slate-600">
                          {vv.n}{' '}
                          <span className="text-xs text-slate-400">({Math.round(vv.w * 100)}%)</span>
                        </span>
                        <span className="font-display font-bold tabular-nums">{perf}%</span>
                      </div>
                      <ProgressBar
                        value={perf}
                        color={perf >= 70 ? '#16A34A' : perf >= 40 ? '#F59E0B' : '#DC2626'}
                      />
                    </div>
                  );
                })}
            </div>
            <p className="mt-4 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
              Modelo de suma ponderada con pesos teóricos (Teoría del Comportamiento Planificado,
              Inteligencia Afectiva, Marketing Político). Resultados orientativos.
            </p>
          </Card>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            className="mt-4"
            onClick={reiniciar}
          >
            Evaluar a otro candidato/a →
          </Button>
        </>
      )}
    </div>
  );
}

function Navegacion({
  onAtras,
  onSiguiente,
  textoSiguiente = 'Siguiente →',
}: {
  onAtras: () => void;
  onSiguiente: () => void;
  textoSiguiente?: string;
}) {
  return (
    <div className="mt-4 flex gap-2">
      <Button variant="secondary" onClick={onAtras}>
        ← Atrás
      </Button>
      <Button variant="primary" className="flex-1" onClick={onSiguiente}>
        {textoSiguiente}
      </Button>
    </div>
  );
}
