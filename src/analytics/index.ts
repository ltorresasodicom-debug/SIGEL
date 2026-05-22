// SIGEL — Capa de analítica territorial y evaluación longitudinal.
// Consume servicios (rankings, evaluaciones, indicadores) y alimenta los
// dashboards comparativos. Preparada para implementación incremental.

import type { RankingSnapshotRow } from '@/types/domain';

/** Variación de posición de un GAD entre dos snapshots de ranking. */
export function variacionPosicion(
  anterior: RankingSnapshotRow,
  actual: RankingSnapshotRow,
): number {
  return anterior.posicion - actual.posicion;
}
