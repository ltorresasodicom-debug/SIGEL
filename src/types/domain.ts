// SIGEL — Tipos de dominio compartidos por la capa de UI y servicios.
import type { Database } from './database';

export type GadRow = Database['public']['Tables']['gads']['Row'];
export type EvaluacionRow = Database['public']['Tables']['evaluaciones']['Row'];
export type EvaluacionInsert = Database['public']['Tables']['evaluaciones']['Insert'];
export type IndicadorRow = Database['public']['Tables']['indicadores']['Row'];
export type RankingSnapshotRow = Database['public']['Tables']['ranking_snapshots']['Row'];

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
