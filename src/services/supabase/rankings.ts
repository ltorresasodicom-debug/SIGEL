// SIGEL — Servicio de rankings (snapshots para analítica longitudinal).
import { supabase } from '@/lib/supabase';
import type { RankingSnapshotRow } from '@/types/domain';

/** Devuelve el snapshot de ranking más reciente, ordenado por posición. */
export async function obtenerRankingSnapshots(): Promise<RankingSnapshotRow[]> {
  const { data, error } = await supabase
    .from('ranking_snapshots')
    .select('*')
    .order('posicion', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
