// SIGEL — Servicio de persistencia de evaluaciones ciudadanas.
import { supabase } from '@/lib/supabase';
import type { EvaluacionInsert, EvaluacionRow } from '@/types/domain';

/** Inserta una evaluación y devuelve la fila creada. */
export async function guardarEvaluacion(data: EvaluacionInsert): Promise<EvaluacionRow> {
  const { data: row, error } = await supabase
    .from('evaluaciones')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row;
}

/** Lista las evaluaciones de un GAD, de la más reciente a la más antigua. */
export async function listarEvaluaciones(gadId: string): Promise<EvaluacionRow[]> {
  const { data, error } = await supabase
    .from('evaluaciones')
    .select('*')
    .eq('gad_id', gadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}
