// SIGEL — Cómputo del ranking dinámico desde mediciones objetivas.
// Capa pura (sin Supabase ni React) para que sea reutilizable y testable.
import { DIMENSIONES, calcularIngel, clasificarNivel, semaforizar } from '@/evaluation-engine';
import type { DimensionCodigo, Nivel, Semaforo } from '@/evaluation-engine/types';
import type { MedicionRow, ScoresPorDimension } from '@/types/domain';

const CODIGOS_VALIDOS = new Set<string>(DIMENSIONES.map((d) => d.codigo));

/**
 * Fila de ranking expresada en tipos de dominio (no `Json`); el adaptador
 * Supabase se encarga de traducirla a `RankingInsert` en el momento del upsert.
 */
export interface RankingFila {
  gad_id: string;
  periodo: string;
  score_total: number;
  scores_por_dimension: ScoresPorDimension;
  nivel: Nivel;
  semaforo: Semaforo;
  posicion: number;
}

/**
 * Agrega mediciones por GAD promediando `valor_norm` (o `valor` si `valor_norm`
 * es null) por dimensión. Descarta filas con dimensión fuera del catálogo.
 */
export function agregarMedicionesPorGad(
  filas: MedicionRow[],
): Map<string, ScoresPorDimension> {
  const acumulado = new Map<string, Map<DimensionCodigo, { suma: number; n: number }>>();
  for (const m of filas) {
    if (!CODIGOS_VALIDOS.has(m.dimension)) continue;
    const dim = m.dimension as DimensionCodigo;
    const valor = m.valor_norm ?? m.valor;
    let porDim = acumulado.get(m.gad_id);
    if (!porDim) {
      porDim = new Map();
      acumulado.set(m.gad_id, porDim);
    }
    const acc = porDim.get(dim) ?? { suma: 0, n: 0 };
    acc.suma += valor;
    acc.n += 1;
    porDim.set(dim, acc);
  }

  const resultado = new Map<string, ScoresPorDimension>();
  for (const [gadId, porDim] of acumulado) {
    const scores: ScoresPorDimension = {};
    for (const [dim, { suma, n }] of porDim) {
      scores[dim] = Math.round((suma / n) * 100) / 100;
    }
    resultado.set(gadId, scores);
  }
  return resultado;
}

/**
 * Construye una fila de ranking (sin posición) usando el motor INGEL ya
 * existente para totalizar, clasificar nivel y semaforizar.
 */
export function construirFilaRanking(
  gadId: string,
  periodo: string,
  scores: ScoresPorDimension,
): Omit<RankingFila, 'posicion'> {
  const ingel = calcularIngel(scores);
  return {
    gad_id: gadId,
    periodo,
    score_total: Math.round(ingel * 100) / 100,
    scores_por_dimension: scores,
    nivel: clasificarNivel(ingel) ?? 'CRITICO',
    semaforo: semaforizar(ingel) ?? 'ROJO',
  };
}

/**
 * Ordena descendentemente por `score_total` y asigna posición 1..N. No muta
 * el input.
 */
export function ordenarYAsignarPosicion(
  filas: Array<Omit<RankingFila, 'posicion'>>,
): RankingFila[] {
  return [...filas]
    .sort((a, b) => b.score_total - a.score_total)
    .map((f, i) => ({ ...f, posicion: i + 1 }));
}

/** Pipeline completo: `MedicionRow[]` + período → ranking listo para persistir. */
export function computarRanking(filas: MedicionRow[], periodo: string): RankingFila[] {
  const porGad = agregarMedicionesPorGad(filas);
  const intermedio = Array.from(porGad, ([gadId, scores]) =>
    construirFilaRanking(gadId, periodo, scores),
  );
  return ordenarYAsignarPosicion(intermedio);
}
