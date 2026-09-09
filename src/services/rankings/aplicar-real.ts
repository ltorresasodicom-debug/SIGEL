// SIGEL — Sobrepone el ranking real (public.rankings) sobre los GAD sintéticos.
// Capa pura (sin React ni Supabase) para reutilizar en home, mapa y ficha.
import type { Gad } from '@/types/sigel';
import type { Nivel, Semaforo } from '@/evaluation-engine/types';
import type { RankingRow } from '@/types/domain';

export interface RankingRealResult {
  /** GAD con ingel/nivel/semaforo/dims reales donde hay fila; sintéticos si no. */
  gads: Gad[];
  /** true si al menos un GAD recibió datos reales (para el badge de fuente). */
  fuenteReal: boolean;
  /** cuántos GAD quedaron con datos reales. */
  cobertura: number;
}

/**
 * Devuelve una copia de `gads` con `ingel`, `nivel`, `semaforo` (y `dims` si el
 * ranking trae `scores_por_dimension`) sobrescritos por los valores reales de
 * `public.rankings` cuando existe fila para ese GAD; conserva el sintético como
 * fallback. No muta la entrada (los objetos vienen del cache de React Query).
 */
export function aplicarRankingReal(
  gads: Gad[],
  filas: RankingRow[] | undefined,
): RankingRealResult {
  if (!filas || filas.length === 0) {
    return { gads, fuenteReal: false, cobertura: 0 };
  }
  const byId = new Map(filas.map((r) => [r.gad_id, r]));
  let cobertura = 0;
  const merged = gads.map((g) => {
    const r = byId.get(g.id);
    if (!r) return g;
    cobertura++;
    const scores = r.scores_por_dimension as Record<string, number> | null;
    return {
      ...g,
      ingel: Number(r.score_total),
      nivel: r.nivel as Nivel,
      semaforo: r.semaforo as Semaforo,
      dims: scores ? ({ ...g.dims, ...scores } as typeof g.dims) : g.dims,
    };
  });
  return { gads: merged, fuenteReal: cobertura > 0, cobertura };
}
