// SIGEL — Servicio de rankings.
// - Legacy: ranking_snapshots (0001_init.sql). Se conserva hasta migrar UI.
// - Dinámico: tabla rankings (0002_motor_real.sql). Recalcula desde mediciones
//   usando el motor INGEL (evaluation-engine) y persiste por (gad_id, periodo).
import { supabase } from '@/lib/supabase';
import { computarRanking } from '@/services/rankings/compute';
import { listarMediciones } from './mediciones';
import type {
  RankingInsert,
  RankingRow,
  RankingSnapshotRow,
} from '@/types/domain';
import type { Json } from '@/types/database';

// ── Legacy ────────────────────────────────────────────────────────────────────

/** Devuelve el snapshot de ranking más reciente, ordenado por posición. */
export async function obtenerRankingSnapshots(): Promise<RankingSnapshotRow[]> {
  const { data, error } = await supabase
    .from('ranking_snapshots')
    .select('*')
    .order('posicion', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

// ── Dinámico (tabla rankings) ────────────────────────────────────────────────

/** Lee el ranking de un período, ordenado por posición. */
export async function obtenerRankingDinamico(periodo: string): Promise<RankingRow[]> {
  const { data, error } = await supabase
    .from('rankings')
    .select('*')
    .eq('periodo', periodo)
    .order('posicion', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Histórico de un GAD a través de todos los períodos (más reciente primero). */
export async function obtenerRankingsPorGad(gadId: string): Promise<RankingRow[]> {
  const { data, error } = await supabase
    .from('rankings')
    .select('*')
    .eq('gad_id', gadId)
    .order('periodo', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Recalcula el ranking dinámico para un período a partir de las mediciones:
 *   1) Lee mediciones (opcionalmente filtradas por fuente / rango de fechas).
 *   2) Agrega por GAD × dimensión (promedio de valor_norm).
 *   3) Compone INGEL/nivel/semáforo con el motor (evaluation-engine).
 *   4) Ordena y asigna posición.
 *   5) Upsert idempotente a `public.rankings` por (gad_id, periodo).
 *
 * Requiere rol staff (RLS) o service_role (ETL server-side).
 */
export async function recalcularRankingsDesdeMediciones(
  periodo: string,
  opciones?: { fuente?: string; fechaDesde?: string; fechaHasta?: string },
): Promise<RankingRow[]> {
  const mediciones = await listarMediciones(opciones);
  const filas = computarRanking(mediciones, periodo);
  if (filas.length === 0) return [];

  const inserts: RankingInsert[] = filas.map((f) => ({
    gad_id: f.gad_id,
    periodo: f.periodo,
    score_total: f.score_total,
    scores_por_dimension: f.scores_por_dimension as unknown as Json,
    nivel: f.nivel,
    semaforo: f.semaforo,
    posicion: f.posicion,
  }));

  const { data, error } = await supabase
    .from('rankings')
    .upsert(inserts, { onConflict: 'gad_id,periodo' })
    .select();
  if (error) throw error;
  return data ?? [];
}
