// SIGEL — Tipos de dominio compartidos por la capa de UI y servicios.
import type { DimensionCodigo } from '@/evaluation-engine/types';
import type { Database } from './database';

export type GadRow = Database['public']['Tables']['gads']['Row'];
export type EvaluacionRow = Database['public']['Tables']['evaluaciones']['Row'];
export type EvaluacionInsert = Database['public']['Tables']['evaluaciones']['Insert'];
export type IndicadorRow = Database['public']['Tables']['indicadores']['Row'];
export type RankingSnapshotRow = Database['public']['Tables']['ranking_snapshots']['Row'];

// ── Motor real (migración 0002): mediciones objetivas + ranking dinámico ──────
export type MedicionRow = Database['public']['Tables']['mediciones']['Row'];
export type MedicionInsert = Database['public']['Tables']['mediciones']['Insert'];
export type RankingRow = Database['public']['Tables']['rankings']['Row'];
export type RankingInsert = Database['public']['Tables']['rankings']['Insert'];

/** Puntajes 0–100 por dimensión, tal como se guardan en rankings.scores_por_dimension. */
export type ScoresPorDimension = Partial<Record<DimensionCodigo, number>>;

/** Tipo de gobierno local. */
export type TipoGad = 'MUNICIPAL' | 'PROVINCIAL';

/** Fila de ranking lista para la UI. */
export interface RankingItem {
  gadId: string;
  nombre: string;
  provincia: string;
  ingel: number;
  posicion: number;
}
